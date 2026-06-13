import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseBrowserClient, signInWithGoogle } from '../lib/supabase';

type AuthSubscription = {
  unsubscribe: () => void;
};

type AuthStateChangeHandler = Parameters<SupabaseClient['auth']['onAuthStateChange']>[0];

type SetupAuthStateSubscriptionOptions = {
  getClient?: () => SupabaseClient;
  onAuthStateChange: AuthStateChangeHandler;
  setStatus: (status: string | null) => void;
  setLoading: (loading: boolean) => void;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function getDashboardErrorMessage(error: unknown): string {
  return getErrorMessage(error, 'Failed to load records. Please try again.');
}

export function isDashboardConfigurationError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('NEXT_PUBLIC_SUPABASE_');
}

export function safelySetupAuthStateSubscription({
  getClient = getSupabaseBrowserClient,
  onAuthStateChange,
  setStatus,
  setLoading,
}: SetupAuthStateSubscriptionOptions): AuthSubscription | null {
  try {
    const {
      data: { subscription },
    } = getClient().auth.onAuthStateChange(onAuthStateChange);

    return subscription;
  } catch (error) {
    setStatus(getErrorMessage(error, 'Failed to initialize authentication.'));
    setLoading(false);
    return null;
  }
}

export async function safelySignInWithGoogle(
  locale: string,
  setStatus: (status: string | null) => void,
  signIn = signInWithGoogle,
): Promise<void> {
  setStatus(null);

  try {
    await signIn(locale);
  } catch (error) {
    setStatus(getErrorMessage(error, 'Failed to sign in. Please try again.'));
  }
}
