import { describe, expect, it, vi } from 'vitest';

import {
  getDashboardErrorMessage,
  isDashboardConfigurationError,
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

  it('keeps the specific dashboard load error when one is available', () => {
    expect(getDashboardErrorMessage(missingConfigError)).toBe(
      'NEXT_PUBLIC_SUPABASE_URL is not configured',
    );
  });

  it('identifies expected dashboard configuration errors', () => {
    expect(isDashboardConfigurationError(missingConfigError)).toBe(true);
    expect(isDashboardConfigurationError(new Error('network failed'))).toBe(false);
  });
});
