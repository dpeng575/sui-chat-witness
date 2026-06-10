'use client';

import { useEffect, useState } from 'react';
import type { Dictionary, Locale } from '../lib/i18n';
import {
  getSupabaseBrowserClient,
  getCurrentUserAsync,
  signInWithGoogle,
  signOut,
  type AppUser,
} from '../lib/supabase';

interface AuthButtonProps {
  dict: Dictionary;
  locale: Locale;
}

export function AuthButton({ dict, locale }: AuthButtonProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUserAsync(supabase);
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        if (session?.user) {
          const currentUser = await getCurrentUserAsync(supabase);
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

  const handleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    await signInWithGoogle(supabase, locale);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await signOut(supabase);
  };

  if (loading) {
    return <span>...</span>;
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        {dict.nav.signIn}
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
      {user.email && <span className="text-sm text-gray-700">{user.email}</span>}
      <button
        onClick={handleSignOut}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
      >
        {dict.nav.signOut}
      </button>
    </div>
  );
}
