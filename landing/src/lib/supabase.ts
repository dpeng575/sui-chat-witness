import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicConfig } from './config';

export type AppUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!publicConfig.supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  if (!publicConfig.supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured');
  }

  if (!browserClient) {
    browserClient = createClient(
      publicConfig.supabaseUrl,
      publicConfig.supabasePublishableKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  return browserClient;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const { data: { user } } = await getSupabaseBrowserClient().auth.getUser();
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.full_name || user.user_metadata?.name,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

export async function signInWithGoogle(locale: string) {
  const redirectTo = `${window.location.origin}/${locale}/dashboard`;
  const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await getSupabaseBrowserClient().auth.signOut();
  if (error) throw error;
}
