import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

/**
 * 服务端 Supabase 客户端。
 *
 * 用 React 的 cache() 包起来：同一个请求里不管调用多少次 createClient()，
 * 底层只创建一个实例。
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 里不能 set cookie，由 proxy.js 负责刷新
        }
      },
    },
  });
});

/**
 * 读取当前登录用户（只用于展示，不用于鉴权）。
 *
 * ⚠️ 这里用 getSession() 而不是 getUser()，是一个有意的性能取舍：
 *
 *   getUser() → 向 Supabase 发一次网络请求验证 JWT（约 600ms）
 *   getSession() → 从 cookie 里本地解码 JWT（约 0ms）
 *
 * 代价：getSession() 不验证签名，cookie 理论上可以被伪造，
 * 所以它拿到的身份「不能当作权限依据」。
 *
 * 这个项目里没问题，因为真正的鉴权全在数据库的 RLS 上：
 * 任何写操作发给 PostgREST 时都要过 JWT 验签，伪造的 token 直接被 401 拒绝。
 * 页面显示错误的名字无所谓，但改不了数据。
 *
 * 如果哪天你要在服务端做「敏感判断」（比如直接返回私密数据而不经过 RLS），
 * 必须改回 getUser()。
 */
export const getUser = cache(async () => {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
});

/**
 * 取当前用户的资料（含 is_admin）。
 *
 * 现在只有一次网络请求（查 profiles 表），
 * 可以和页面里的其他查询并行发出。
 */
export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, school, is_admin')
    .eq('id', user.id)
    .single();

  return profile ? { ...profile, email: user.email } : null;
});
