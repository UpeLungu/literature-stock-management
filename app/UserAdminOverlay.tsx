'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

type Role = 'admin' | 'literature_servant' | 'read_only';
type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  congregation_key: string | null;
  active: boolean;
  created_at?: string;
};
type Congregation = { id: string; name: string; active: boolean };

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
  const [message, setMessage] = useState('');

  const congregations = useMemo(() => {
    try {
      const raw = localStorage.getItem('lms-admin-v3');
      const parsed = raw ? JSON.parse(raw) : null;
      const saved = Array.isArray(parsed?.congregations) ? parsed.congregations : fallbackCongregations;
      return saved.filter((item: Congregation) => item.active !== false);
    } catch {
      return fallbackCongregations;
    }
  }, [open]);

  useEffect(() => {
    const handleNavigation = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('nav button');
      if (!button) return;
      const label = button.textContent?.trim().toLowerCase();
      setOpen(label === 'users');
    };
    document.addEventListener('click', handleNavigation);
    return () => document.removeEventListener('click', handleNavigation);
  }, []);

  const loadProfiles = async () => {
    if (!isAdmin) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true);
    setMessage('');
    const { data, error } = await supabase
      .schema('public')
      .from('profiles')
      .select('id,full_name,role,congregation_key,active,created_at')
      .order('created_at', { ascending: true });
    setLoading(false);
    if (error) return setMessage(error.message);
    setProfiles((data || []) as Profile[]);
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

    const activeAdmins = profiles.filter(item => item.role === 'admin' && item.active);
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
    if (error) return setMessage(error.message);
    setMessage(`${profile.full_name || 'User'} updated successfully.`);
    void loadProfiles();
  };

  if (!open) return null;

  return <section className="userAdminOverlay" aria-label="User administration">
    <div className="userAdminHeader">
      <div>
        <h2>User administration</h2>
        <p>Assign roles, congregations and account access.</p>
      </div>
      {isAdmin && <button className="secondary" onClick={() => void loadProfiles()}>Refresh</button>}
    </div>

    {!isAdmin && <div className="userAdminNotice">Only administrators can manage users.</div>}
    {isAdmin && loading && <div className="userAdminNotice">Loading users…</div>}
    {message && <div className="userAdminNotice">{message}</div>}

    {isAdmin && !loading && <div className="userAdminList">
      {profiles.map(profile => <article key={profile.id} className="userAdminCard">
        <div className="userIdentity">
          <input
            aria-label="Full name"
            value={profile.full_name || ''}
            onChange={event => updateLocal(profile.id, { full_name: event.target.value })}
          />
          <small>{profile.id === currentUserId ? 'Your account' : 'Registered user'}</small>
        </div>

        <label>Role
          <select value={profile.role} onChange={event => updateLocal(profile.id, { role: event.target.value as Role })}>
            {(Object.keys(roleLabels) as Role[]).map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </label>

        <label>Congregation
          <select
            value={profile.congregation_key || ''}
            disabled={profile.role === 'admin'}
            onChange={event => updateLocal(profile.id, { congregation_key: event.target.value || null })}
          >
            <option value="">Not assigned</option>
            {congregations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>

        <label className="activeControl">
          <input type="checkbox" checked={profile.active} onChange={event => updateLocal(profile.id, { active: event.target.checked })} />
          Active
        </label>

        <button onClick={() => void save(profile)} disabled={savingId === profile.id}>
          {savingId === profile.id ? 'Saving…' : 'Save changes'}
        </button>
      </article>)}
      {profiles.length === 0 && <div className="userAdminNotice">No user profiles were found.</div>}
    </div>}
  </section>;
}
