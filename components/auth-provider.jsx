'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  refresh: () => {},
});

/**
 * 全局登录状态。
 *
 * 静态化之后，服务端拿不到 cookie，所以登录状态只能在浏览器里维护：
 * 页面挂载时读一次 Supabase 的本地 session，之后靠 onAuthStateChange 跟踪变化。
 *
 * 代价：首屏会有一瞬间把用户显示成「未登录」，等 session 读出来才变成已登录。
 * 这是纯客户端应用绕不开的。
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    if (!isSupabaseConfigured) return;

    const supabase = createClient();

    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, school, is_admin')
      .eq('id', nextUser.id)
      .single();

    setProfile(data || null);
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const nextUser = session?.user ?? null;
    setUser(nextUser);
    await loadProfile(nextUser);
    setLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let alive = true;
    const supabase = createClient();

    refresh().catch(() => {
      if (alive) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      loadProfile(nextUser).catch(() => {});
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [refresh, loadProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
