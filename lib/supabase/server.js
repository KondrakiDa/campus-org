import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

/**
 * 服务端 Supabase 客户端。
 * 在 Server Component / Route Handler / Server Action 里使用。
 *
 * 它靠 cookie 读取当前登录用户，所以每个请求拿到的身份是准确的。
 */
export async function createClient() {
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
          // 在 Server Component 里调用 set 会抛错，这是正常的。
          // 真正的刷新由 middleware 负责，这里忽略即可。
        }
      },
    },
  });
}

/**
 * 取当前登录用户，没有就返回 null。页面里用这个判断登录态。
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * 取当前用户的资料（含 is_admin）。
 */
export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, school, is_admin')
    .eq('id', user.id)
    .single();

  return profile ? { ...profile, email: user.email } : null;
}
