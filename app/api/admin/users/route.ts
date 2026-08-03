import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type AdminAction = 'invite' | 'reset_password' | 'delete_user';
type Role = 'admin' | 'literature_servant' | 'read_only';

type AdminRequestBody = {
  action?: AdminAction;
  email?: string;
  fullName?: string;
  role?: Role;
  congregationKey?: string | null;
  userId?: string;
};

function getConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !serviceKey) return null;
  return { url, publicKey, serviceKey };
}

async function authorizeAdministrator(request: NextRequest) {
  const configuration = getConfiguration();
  if (!configuration) {
    return { error: NextResponse.json({ error: 'Server-side Supabase administration is not configured.' }, { status: 503 }) };
  }

  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: 'Authentication is required.' }, { status: 401 }) };

  const publicClient = createClient(configuration.url, configuration.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await publicClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: 'Your session is invalid or expired.' }, { status: 401 }) };
  }

  const adminClient = createClient(configuration.url, configuration.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .schema('public')
    .from('profiles')
    .select('role,active')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin' || profile.active !== true) {
    return { error: NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 }) };
  }

  return { adminClient, user: userData.user };
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdministrator(request);
  if ('error' in authorization) return authorization.error;

  const { data: authData, error: authError } = await authorization.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { data: existingProfiles, error: existingError } = await authorization.adminClient
    .schema('public')
    .from('profiles')
    .select('id');
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

  const existingIds = new Set((existingProfiles || []).map(profile => profile.id));
  const missingProfiles = authData.users
    .filter(user => !existingIds.has(user.id))
    .map(user => ({
      id: user.id,
      full_name: String(user.user_metadata?.full_name || user.email || 'Unnamed user'),
      role: 'literature_servant' as Role,
      congregation_key: null,
      active: true,
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    }));

  if (missingProfiles.length > 0) {
    const { error: repairError } = await authorization.adminClient
      .schema('public')
      .from('profiles')
      .upsert(missingProfiles, { onConflict: 'id' });
    if (repairError) return NextResponse.json({ error: repairError.message }, { status: 400 });
  }

  const { data: profiles, error: profileError } = await authorization.adminClient
    .schema('public')
    .from('profiles')
    .select('id,full_name,role,congregation_key,active,created_at')
    .order('created_at', { ascending: true });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  const emailById = new Map(authData.users.map(user => [user.id, user.email || '']));
  const users = (profiles || []).map(profile => ({ ...profile, email: emailById.get(profile.id) || '' }));
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdministrator(request);
  if ('error' in authorization) return authorization.error;

  let body: AdminRequestBody;
  try {
    body = await request.json() as AdminRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (body.action === 'delete_user') {
    const userId = body.userId?.trim();
    if (!userId) return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    if (userId === authorization.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own administrator account.' }, { status: 400 });
    }

    const { data: target, error: targetError } = await authorization.adminClient
      .schema('public')
      .from('profiles')
      .select('role,active,full_name')
      .eq('id', userId)
      .single();
    if (targetError || !target) {
      return NextResponse.json({ error: 'The selected user profile could not be found.' }, { status: 404 });
    }

    if (target.role === 'admin' && target.active === true) {
      const { count, error: countError } = await authorization.adminClient
        .schema('public')
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('active', true);
      if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });
      if ((count || 0) <= 1) {
        return NextResponse.json({ error: 'The last active administrator cannot be deleted.' }, { status: 400 });
      }
    }

    const { error: deleteAuthError } = await authorization.adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });

    const { error: deleteProfileError } = await authorization.adminClient
      .schema('public')
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (deleteProfileError) {
      return NextResponse.json({ error: `Authentication account deleted, but profile cleanup failed: ${deleteProfileError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: `${target.full_name || 'User'} was permanently deleted.` });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });

  if (body.action === 'reset_password') {
    const redirectTo = `${request.nextUrl.origin}/`;
    const { error } = await authorization.adminClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: `Password-reset email sent to ${email}.` });
  }

  if (body.action !== 'invite') {
    return NextResponse.json({ error: 'Unsupported administration action.' }, { status: 400 });
  }

  const role: Role = body.role || 'literature_servant';
  const fullName = body.fullName?.trim() || email;
  const congregationKey = role === 'admin' ? null : body.congregationKey || null;
  const redirectTo = `${request.nextUrl.origin}/`;

  const { data, error } = await authorization.adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data.user) return NextResponse.json({ error: 'Supabase did not return the invited user.' }, { status: 400 });

  const { error: updateError } = await authorization.adminClient
    .schema('public')
    .from('profiles')
    .upsert({
      id: data.user.id,
      full_name: fullName,
      role,
      congregation_key: congregationKey,
      active: true,
      created_at: data.user.created_at,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({ message: `Invitation sent to ${email}.` });
}
