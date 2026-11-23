import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Next.js 16 起，middleware 这个约定改名叫 proxy。
 * 职责不变：刷新登录 cookie。
 *
 * 登录状态存在 cookie 里，但 cookie 有有效期。
 * 每次请求经过这里，Supabase 会把快过期的 token 换成新的。
 * 少了它，用户会莫名其妙地被登出。
 */
export async function proxy(request) {
  // 还没配置 Supabase 时直接放行，避免整个网站 500
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // 关键：一定要 await，否则 cookie 可能来不及写回
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * 跳过静态资源和图片，只在真正需要身份的请求上跑，
     * 否则每个图片请求都查一次数据库，又慢又费额度。
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
