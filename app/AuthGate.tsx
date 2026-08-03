'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

type Profile = {
  id: string;
  full_name: string | null;
  role: 'admin' | 'literature_servant' | 'read_only';
  congregation_key: string | null;
  active: boolean;
};

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage('Supabase environment variables are not configured.');
      setLoading(false);
      return;
    }

    let active = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .schema('public')
        .from('profiles')
        .select('id,full_name,role,congregation_key,active')
        .eq('id', userId)
        .single();

      if (!active) return;
      if (error) {
        setProfile(null);
        setMessage('Your profile is not ready. Run the Phase 1 Supabase migration, then sign in again.');
      } else {
        setProfile(data as Profile);
        setMessage('');
      }
    };

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
      if (nextSession) void loadProfile(nextSession.user.id);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setWorking(true);
    setMessage('');

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      setWorking(false);
      if (error) return setMessage(error.message);
      setMessage('Account created. Check your email if confirmation is enabled, then sign in.');
      setMode('login');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setWorking(false);
    if (error) setMessage(error.message);
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
  };

  if (loading) {
    return <main className="authShell"><section className="authCard"><h1>Literature Management System</h1><p>Loading your account…</p></section></main>;
  }

  if (!session) {
    return <main className="authShell">
      <section className="authCard">
        <div className="authBrand"><span>LMS</span><div><strong>Literature Stock</strong><small>Management System</small></div></div>
        <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <p>{mode === 'login' ? 'Use your assigned account to continue.' : 'The first registered account becomes the administrator.'}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Full name<input required value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" /></label>}
          <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
          <label>Password<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {message && <div className="authMessage">{message}</div>}
          <button disabled={working}>{working ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="authSwitch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>
          {mode === 'login' ? 'Create the first account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>;
  }

  if (!profile) {
    return <main className="authShell"><section className="authCard"><h1>Profile setup required</h1><p>{message || 'Your account exists, but the profile record is not available.'}</p><button onClick={signOut}>Sign out</button></section></main>;
  }

  if (!profile.active) {
    return <main className="authShell"><section className="authCard"><h1>Account inactive</h1><p>Contact the administrator to reactivate your account.</p><button onClick={signOut}>Sign out</button></section></main>;
  }

  if (profile.role !== 'admin' && !profile.congregation_key) {
    return <main className="authShell"><section className="authCard"><h1>Awaiting congregation assignment</h1><p>Your account is active, but an administrator must assign your congregation before you can access stock records.</p><button onClick={signOut}>Sign out</button></section></main>;
  }

  return <>
    <div className="accountPill"><span>{profile.full_name || session.user.email}</span><small>{profile.role.replace('_', ' ')}</small><button onClick={signOut}>Sign out</button></div>
    {children}
  </>;
}
