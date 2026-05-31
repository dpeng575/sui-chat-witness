import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser, signOut, User } from '../lib/supabase';

// const DEV_MODE = import.meta.env.DEV;
const DEV_MODE = false;



// 开发模式：模拟用户
const MOCK_USER: User = {
  id: 'dev-user-id',
  email: 'dev@example.com',
  name: '开发用户',
  avatarUrl: '',
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化时检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (DEV_MODE) {
        // 开发模式：检查 local storage 中的模拟登录状态
        const { devLoggedIn } = await chrome.storage.local.get('devLoggedIn');
        if (devLoggedIn) {
          setUser(MOCK_USER);
          setLoading(false);
          return;
        }
      }

      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth 登录
  const signInWithGoogle = useCallback(async () => {
    // 开发模式：模拟登录
    if (DEV_MODE) {
      await chrome.storage.local.set({ devLoggedIn: true });
      setUser(MOCK_USER);
      return;
    }

    try {
      const nonce = crypto.randomUUID();
      const redirectURL = chrome.identity.getRedirectURL();
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

      const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authURL.searchParams.set('client_id', clientId);
      authURL.searchParams.set('response_type', 'id_token');
      authURL.searchParams.set('redirect_uri', redirectURL);
      authURL.searchParams.set('scope', 'openid email profile');
      authURL.searchParams.set('nonce', nonce);

      const responseURL = await chrome.identity.launchWebAuthFlow({
        url: authURL.toString(),
        interactive: true,
      });

      if (!responseURL) {
        throw new Error('Auth flow cancelled');
      }

      // 从 URL 中提取 id_token
      const params = new URLSearchParams(responseURL.split('#')[1]);
      const idToken = params.get('id_token');

      if (!idToken) {
        throw new Error('No id_token received');
      }

      // 步骤 3：登录 Supabase
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        nonce: nonce,
      });

      if (supabaseError) throw supabaseError;

      await checkAuth();
      return supabaseData;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, []);

  // 登出
  const handleSignOut = useCallback(async () => {
    try {
      if (DEV_MODE) {
        await chrome.storage.local.remove('devLoggedIn');
        setUser(null);
        return;
      }

      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, []);

  return {
    user,
    loading,
    signInWithGoogle,
    signOut: handleSignOut,
    refreshUser: checkAuth,
  };
}
