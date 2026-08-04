'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';
import UserAdminOverlay from './UserAdminOverlay';

type Profile = {
  id: string;
  full_name: string | null;
  role: 'admin' | 'literature_servant' | 'read_only';
  congregation_key: string | null;
  active: boolean;
};

const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileConfirmedMissing, setProfileConfirmedMissing] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState('');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  const storeProfile = (nextProfile: Profile | null) => {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage('Supabase environment variables are not configured.');
      setLoading(false);
      return;
    }

    let active = true;

    const loadProfile = async (userId: string, preserveExisting = false) => {
      const existingProfile = profileRef.current;
      if (!preserveExisting || existingProfile?.id !== userId) setProfileLoading(true);
      setProfileConfirmedMissing(false);

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = await supabase
          .schema('public')
          .from('profiles')
          .select('id,full_name,role,congregation_key,active')
          .eq('id', userId)
          .maybeSingle();

        if (!active) return;

        if (!error && data) {
          storeProfile(data as Profile);
          setMessage('');
          setProfileLoading(false);
          setProfileConfirmedMissing(false);
          return;
        }

        if (attempt < 2) await wait(350 * (attempt + 1));
      }

      if (!active) return;

      // A valid profile already loaded in this browser must remain visible during
      // token refreshes, app resume events, and temporary network interruptions.
      if (profileRef.current?.id === userId) {
        setProfileLoading(false);
        return;
      }

      storeProfile(null);
      setProfileLoading(false);
      setProfileConfirmedMissing(true);
      setMessage('Your profile record is not available. Contact an administrator if this account should already be active.');
    };

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(nextSession);

      if (!nextSession) {
        storeProfile(null);
        setProfileConfirmedMissing(false);
        setProfileLoading(false);
        return;
      }

      const sameUserProfile = profileRef.current?.id === nextSession.user.id;
      void loadProfile(nextSession.user.id, sameUserProfile);
    });

    const refreshOnResume = () => {
      if (document.visibilityState !== 'visible') return;
      const currentSession = sessionStorage.getItem('lms-profile-refresh-user');
      const currentProfile = profileRef.current;
      if (currentProfile && currentSession === currentProfile.id) {
        void loadProfile(currentProfile.id, true);
      }
    };

    document.addEventListener('visibilitychange', refreshOnResume);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', refreshOnResume);
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profile?.id) sessionStorage.setItem('lms-profile-refresh-user', profile.id);
    else sessionStorage.removeItem('lms-profile-refresh-user');
  }, [profile?.id]);

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

  const updateRecoveredPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (recoveryPassword.length < 6) return setMessage('The password must contain at least 6 characters.');
    if (recoveryPassword !== confirmRecoveryPassword) return setMessage('The passwords do not match.');
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setWorking(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
    setWorking(false);
    if (error) return setMessage(error.message);
    setPasswordRecovery(false);
    setRecoveryPassword('');
    setConfirmRecoveryPassword('');
    setMessage('Password updated successfully.');
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
  };

  if (loading) {
    return <main className="authShell"><section className="authCard"><h1>Literature Management System</h1><p>Loading your account…</p></section></main>;
  }

  if (passwordRecovery && session) {
    return <main className="authShell">
      <section className="authCard">
        <div className="authBrand"><span>LMS</span><div><strong>Literature Stock</strong><small>Management System</small></div></div>
        <h1>Set a new password</h1>
        <p>Enter the new password you will use to sign in.</p>
        <form onSubmit={updateRecoveredPassword}>
          <label>New password<input required minLength={6} type="password" value={recoveryPassword} onChange={event => setRecoveryPassword(event.target.value)} autoComplete="new-password" /></label>
          <label>Confirm password<input required minLength={6} type="password" value={confirmRecoveryPassword} onChange={event => setConfirmRecoveryPassword(event.target.value)} autoComplete="new-password" /></label>
          {message && <div className="authMessage">{message}</div>}
          <button disabled={working}>{working ? 'Updating…' : 'Update password'}</button>
        </form>
      </section>
    </main>;
  }

  if (!session) {
    return <main className="authShell">
      <section className="authCard">
        <div className="authBrand"><span>LMS</span><div><strong>Literature Stock</strong><small>Management System</small></div></div>
        <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <p>{mode === 'login' ? 'Use your assigned account to continue.' : 'The first registered account becomes the administrator.'}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Full name<input required value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" /></label>}
          <label>Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
          <label>Password<input required minLength={6} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {message && <div className="authMessage">{message}</div>}
          <button disabled={working}>{working ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="authSwitch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>
          {mode === 'login' ? 'Create the first account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>;
  }

  if (!profile && profileLoading) {
    return <main className="authShell"><section className="authCard"><h1>Literature Management System</h1><p>Refreshing your account…</p></section></main>;
  }

  if (!profile && profileConfirmedMissing) {
    return <main className="authShell"><section className="authCard"><h1>Profile setup required</h1><p>{message}</p><button onClick={signOut}>Sign out</button></section></main>;
  }

  if (!profile) {
    return <main className="authShell"><section className="authCard"><h1>Literature Management System</h1><p>Restoring your session…</p></section></main>;
  }

  if (!profile.active) {
    return <main className="authShell"><section className="authCard"><h1>Account inactive</h1><p>Contact the administrator to reactivate your account.</p><button onClick={signOut}>Sign out</button></section></main>;
  }

  if (profile.role !== 'admin' && !profile.congregation_key) {
    return <main className="authShell"><section className="authCard"><h1>Awaiting congregation assignment</h1><p>Your account is active, but an administrator must assign your congregation before you can access stock records.</p><button onClick={signOut}>Sign out</button></section></main>;
  }

  return <>
    <div className="accountBar">
      <div className="accountIdentity">
        <strong>{profile.full_name || session.user.email}</strong>
        <span>{profile.role.replace('_', ' ')}</span>
      </div>
      <button onClick={signOut}>Sign out</button>
    </div>
    <UserAdminOverlay currentUserId={profile.id} isAdmin={profile.role === 'admin'} />
    {children}
  </>;
}
