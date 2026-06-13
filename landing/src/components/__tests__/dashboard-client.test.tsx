import { describe, expect, it, vi } from 'vitest';

import {
  safelySetupAuthStateSubscription,
  safelySignInWithGoogle,
} from '../dashboard-auth';

const missingConfigError = new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');

describe('dashboard missing Supabase config handling', () => {
  it('does not create an auth subscription when the Supabase client is unavailable', () => {
    const setStatus = vi.fn();
    const setLoading = vi.fn();
    const onAuthStateChange = vi.fn();

    const subscription = safelySetupAuthStateSubscription({
      getClient: () => {
        throw missingConfigError;
      },
      onAuthStateChange,
      setStatus,
      setLoading,
    });

    expect(subscription).toBeNull();
    expect(onAuthStateChange).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith('NEXT_PUBLIC_SUPABASE_URL is not configured');
    expect(setLoading).toHaveBeenCalledWith(false);
  });

  it('sets status instead of rejecting when Google sign-in cannot get a Supabase client', async () => {
    const setStatus = vi.fn();
    const signIn = vi.fn(async () => {
      throw missingConfigError;
    });

    await expect(safelySignInWithGoogle('zh', setStatus, signIn)).resolves.toBeUndefined();

    expect(signIn).toHaveBeenCalledWith('zh');
    expect(setStatus).toHaveBeenCalledWith('NEXT_PUBLIC_SUPABASE_URL is not configured');
  });
});
