'use client';

import { useEffect, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import {
  getCurrentUser,
  signInWithGoogle,
  signOut,
  getSupabaseBrowserClient,
  type AppUser,
} from '@/lib/supabase';

export function AuthButton({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = getSupabaseBrowserClient().auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        if (session?.user) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <span
        role="status"
        aria-label="Loading authentication state"
        className="text-sm text-slate-500"
      >
        ...
      </span>
    );
  }

  if (!user) {
    return (
      <button
        onClick={() => signInWithGoogle(locale)}
        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        {dictionary.nav.signIn}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.avatarUrl && (
        <img
          src={user.avatarUrl}
          alt={user.name || 'User avatar'}
          className="w-8 h-8 rounded-full"
        />
      )}
      {user.email && (
        <span className="text-sm text-slate-700" aria-label={user.email}>
          {user.email}
        </span>
      )}
      <button
        onClick={() => signOut()}
        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
      >
        {dictionary.nav.signOut}
      </button>
    </div>
  );
}
