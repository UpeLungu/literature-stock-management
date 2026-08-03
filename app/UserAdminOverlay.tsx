'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

type Role = 'admin' | 'literature_servant' | 'read_only';
type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  congregation_key: string | null;
  active: boolean;
  created_at?: string;
};
type Congregation = { id: string; name: string; active: boolean };

type InviteForm = {
  fullName: string;
  email: string;
  role: Role;
  congregationKey: string;
};

const roleLabels: Record<Role, string> = {
  admin: 'Administrator',
  literature_servant: 'Literature Servant',
  read_only: 'Read-only',
};

const fallbackCongregations: Congregation[] = [
  { id: 'combined', name: 'Long Ridge / Mapepe & Chilanga Central', active: true },
  { id: 'kabulonga', name: 'Kabulonga', active: true },
  { id: 'matero', name: 'Matero', active: true },
];

export default function UserAdminOverlay({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [invite, setInvite] = useState<InviteForm>({ fullName: '', email: '', role: 'literature_servant', congregationKey: '' });

  const congregations = useMemo<Congregation[]>(() => {
    try {
      const raw = localStorage.getItem('lms-admin-v3');
      const parsed = raw ? JSON.parse(raw) : null;
      const saved: Congregation[] = Array.isArray(parsed?.congregations)
        ? (parsed.congregations as Congregation[])
        : fallbackCongregations;
      return saved.filter((item: Congregation) => item.active !== false);
    } catch {
      return fallbackCongregations;
    }
  }, [open]);

  useEffect(() => {
    const handleNavigation = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('nav button');
      if (!button) return;
      setOpen(button.textContent?.trim().toLowerCase() === 'users');
    };
    document.addEventListener('click', handleNavigation);
    return () => document.removeEventListener('click', handleNavigation);
  }, []);

  const getAccessToken = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) throw new Error('Your session has expired. Sign in again.');
    return data.session.access_token;
  };

  const adminRequest = async <T,>(method: 'GET' | 'POST', body?: object): Promise<T> => {
    const token = await getAccessToken();
    const response = await fetch('/api/admin/users', {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json() as { error?: string } & T;
    if (!response.ok) throw new Error(result.error || 'The user administration request failed.');
    return result;
  };

  const loadProfiles = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await adminRequest<{ users: Profile[] }>('GET');
      setProfiles(result.users);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && isAdmin) void loadProfiles();
  }, [open, isAdmin]);

  const updateLocal = (id: string, patch: Partial<Profile>) => {
    setProfiles(current => current.map(profile => profile.id === id ? { ...profile, ...patch } : profile));
  };

  const save = async (profile: Profile) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const activeAdmins = profiles.filter((item: Profile) => item.role === 'admin' && item.active);
    if (profile.id === currentUserId && (!profile.active || profile.role !== 'admin') && activeAdmins.length <= 1) {
      setMessage('You cannot remove or deactivate the only active administrator.');
      return;
    }

    setSavingId(profile.id);
    setMessage('');
    const { error } = await supabase
      .schema('public')
      .from('profiles')
      .update({
        full_name: profile.full_name?.trim() || null,
        role: profile.role,
        congregation_key: profile.role === 'admin' ? null : profile.congregation_key,
        active: profile.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);
    setSavingId(null);
    if (error) {
      setMessage(error.message);
      await loadProfiles();
      return;
    }
    setMessage(`${profile.full_name || profile.email || 'User'} updated successfully.`);
    await loadProfiles();
  };

  const inviteUser = async (event: FormEvent) => {
    event.preventDefault();
    if (invite.role !== 'admin' && !invite.congregationKey) {
      setMessage('Select a congregation for this user.');
      return;
    }
    setWorkingAction('invite');
    setMessage('');
    try {
      const result = await adminRequest<{ message: string }>('POST', {
        action: 'invite',
        email: invite.email,
        fullName: invite.fullName,
        role: invite.role,
        congregationKey: invite.role === 'admin' ? null : invite.congregationKey,
      });
      setMessage(result.message);
      setInvite({ fullName: '', email: '', role: 'literature_servant', congregationKey: '' });
      await loadProfiles();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send the invitation.');
    } finally {
      setWorkingAction(null);
    }
  };

  const sendPasswordReset = async (profile: Profile) => {
    if (!profile.email) {
      setMessage('This account does not have an email address available.');
      return;
    }
    setWorkingAction(`reset:${profile.id}`);
    setMessage('');
    try {
      const result = await adminRequest<{ message: string }>('POST', {
        action: 'reset_password',
        email: profile.email,
      });
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send the password-reset email.');
    } finally {
      setWorkingAction(null);
    }
  };

  const deleteUser = async (profile: Profile) => {
    if (profile.id === currentUserId) {
      setMessage('You cannot delete your own administrator account.');
      return;
    }
    const activeAdmins = profiles.filter(item => item.role === 'admin' && item.active);
    if (profile.role === 'admin' && profile.active && activeAdmins.length <= 1) {
      setMessage('The last active administrator cannot be deleted.');
      return;
    }
    const name = profile.full_name || profile.email || 'this user';
    if (!window.confirm(`Permanently delete ${name}? This removes the login account and cannot be undone.`)) return;

    setWorkingAction(`delete:${profile.id}`);
    setMessage('');
    try {
      const result = await adminRequest<{ message: string }>('POST', {
        action: 'delete_user',
        userId: profile.id,
      });
      setMessage(result.message);
      setProfiles(current => current.filter(item => item.id !== profile.id));
      await loadProfiles();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete the user.');
    } finally {
      setWorkingAction(null);
    }
  };

  if (!open) return null;

  return <section className="userAdminOverlay" aria-label="User administration">
    <div className="userAdminHeader">
      <div>
        <h2>User administration</h2>
        <p>Invite users, assign access and manage their accounts.</p>
      </div>
      {isAdmin && <button className="secondary" onClick={() => void loadProfiles()}>Refresh</button>}
    </div>

    {!isAdmin && <div className="userAdminNotice">Only administrators can manage users.</div>}
    {message && <div className="userAdminNotice">{message}</div>}

    {isAdmin && <form className="userInviteForm" onSubmit={inviteUser}>
      <div>
        <h3>Invite a user</h3>
        <p>Supabase will email the person a secure invitation link.</p>
      </div>
      <label>Full name
        <input required value={invite.fullName} onChange={event => setInvite(current => ({ ...current, fullName: event.target.value }))} />
      </label>
      <label>Email
        <input required type="email" value={invite.email} onChange={event => setInvite(current => ({ ...current, email: event.target.value }))} />
      </label>
      <label>Role
        <select value={invite.role} onChange={event => setInvite(current => ({ ...current, role: event.target.value as Role }))}>
          {(Object.keys(roleLabels) as Role[]).map((role: Role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
        </select>
      </label>
      {invite.role !== 'admin' && <label>Congregation
        <select required value={invite.congregationKey} onChange={event => setInvite(current => ({ ...current, congregationKey: event.target.value }))}>
          <option value="">Select congregation</option>
          {congregations.map((item: Congregation) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>}
      <button disabled={workingAction === 'invite'}>{workingAction === 'invite' ? 'Sending…' : 'Send invitation'}</button>
    </form>}

    {isAdmin && loading && <div className="userAdminNotice">Loading users…</div>}

    {isAdmin && !loading && <div className="userAdminList">
      {profiles.map((profile: Profile) => <article key={profile.id} className="userAdminCard">
        <div className="userIdentity">
          <input
            aria-label="Full name"
            value={profile.full_name || ''}
            onChange={event => updateLocal(profile.id, { full_name: event.target.value })}
          />
          <small>{profile.email || (profile.id === currentUserId ? 'Your account' : 'Registered user')}</small>
        </div>

        <label>Role
          <select value={profile.role} onChange={event => updateLocal(profile.id, { role: event.target.value as Role })}>
            {(Object.keys(roleLabels) as Role[]).map((role: Role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </label>

        <label>Congregation
          <select
            value={profile.congregation_key || ''}
            disabled={profile.role === 'admin'}
            onChange={event => updateLocal(profile.id, { congregation_key: event.target.value || null })}
          >
            <option value="">Not assigned</option>
            {congregations.map((item: Congregation) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>

        <label className="activeControl">
          <input type="checkbox" checked={profile.active} onChange={event => updateLocal(profile.id, { active: event.target.checked })} />
          Active
        </label>

        <div className="userAdminActions">
          <button onClick={() => void save(profile)} disabled={savingId === profile.id || workingAction === `delete:${profile.id}`}>
            {savingId === profile.id ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="secondary" onClick={() => void sendPasswordReset(profile)} disabled={workingAction === `reset:${profile.id}` || workingAction === `delete:${profile.id}`}>
            {workingAction === `reset:${profile.id}` ? 'Sending…' : 'Reset password'}
          </button>
          <button
            type="button"
            className="secondary danger"
            onClick={() => void deleteUser(profile)}
            disabled={profile.id === currentUserId || workingAction === `delete:${profile.id}`}
            title={profile.id === currentUserId ? 'You cannot delete your own account.' : 'Permanently delete this user'}
          >
            {workingAction === `delete:${profile.id}` ? 'Deleting…' : 'Delete user'}
          </button>
        </div>
      </article>)}
      {profiles.length === 0 && <div className="userAdminNotice">No user profiles were found.</div>}
    </div>}
  </section>;
}
