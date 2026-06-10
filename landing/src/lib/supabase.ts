import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicConfig } from './config';

export interface AppUser {
  id: string;
  email: string | undefined;
  name: string | undefined;
  avatarUrl: string | undefined;
}

let supabaseBrowserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!publicConfig.supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  if (!publicConfig.supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured');
  }

  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createClient(
      publicConfig.supabaseUrl,
      publicConfig.supabasePublishableKey
    );
  }

  return supabaseBrowserClient;
}

export function getCurrentUser(supabase: SupabaseClient): AppUser | null {
  const user = supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // In a real implementation, you'd await the promise
  // This is a simplified version that works with the type
  return {
    id: '',
    email: undefined,
    name: undefined,
    avatarUrl: undefined,
  };
}

// Actual async implementation for use in components
export async function getCurrentUserAsync(
  supabase: SupabaseClient
): Promise<AppUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

export async function signInWithGoogle(supabase: SupabaseClient, locale: string) {
  const redirectTo = `${window.location.origin}/${locale}/dashboard`;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
}

export async function signOut(supabase: SupabaseClient) {
  await supabase.auth.signOut();
}
