import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser, signOut, User } from '../lib/supabase';
import { prepareZkLogin, finalizeZkLogin, logoutZkLogin } from '../lib/zklogin';

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
  const [zkLoginAddress, setZkLoginAddress] = useState<string | null>(null);

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

      // 检查是否有 zkLogin 地址
      if (currentUser) {
        try {
          const zkAddr = await import('../lib/zklogin').then(m => m.getZkLoginAddress());
          setZkLoginAddress(zkAddr);
        } catch (e) {
          console.log('No zkLogin session found');
        }
      }
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
      // 步骤 1：准备 zkLogin，获取 nonce
      const zkNonce = prepareZkLogin();

      // 步骤 2：使用 Chrome Identity API 发起 OAuth，使用 zkLogin 的 nonce
      const redirectURL = chrome.identity.getRedirectURL();
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

      const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authURL.searchParams.set('client_id', clientId);
      authURL.searchParams.set('response_type', 'id_token');
      authURL.searchParams.set('redirect_uri', redirectURL);
      authURL.searchParams.set('scope', 'openid email profile');
      authURL.searchParams.set('nonce', zkNonce); // 使用 zkLogin 的 nonce！

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
        nonce: zkNonce,
      });

      if (supabaseError) throw supabaseError;

      // 步骤 4：完成 zkLogin（获取证明等）
      try {
        const zkAddr = await finalizeZkLogin(idToken);
        setZkLoginAddress(zkAddr);
        console.log('zkLogin success:', zkAddr);
      } catch (zkErr) {
        console.error('zkLogin failed (but Supabase logged in):', zkErr);
        // 即使 zkLogin 失败，Supabase 还是能正常用的
      }

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
        setZkLoginAddress(null);
        return;
      }

      await signOut();
      await logoutZkLogin();
      setUser(null);
      setZkLoginAddress(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, []);

  return {
    user,
    zkLoginAddress,
    loading,
    signInWithGoogle,
    signOut: handleSignOut,
    refreshUser: checkAuth,
  };
}
