import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Next.js 16 起，middleware 这个约定改名叫 proxy。
 * 职责只有一个：把快过期的登录 cookie 换成新的。
 *
 * 性能要点：这一步每次都要向 Supabase 发一次网络请求（约 250ms）。
 * 所以先看请求里有没有登录 cookie——没有就直接放行，
 * 未登录的访客完全不用等这一次往返。
 */
export async function proxy(request) {
  // 还没配置 Supabase 时直接放行，避免整个网站 500
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  const hasAuthCookie = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
    );

  // 没有任何登录痕迹 → 不可能需要刷新 token
  if (!hasAuthCookie) {
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

  // 先本地读一下 session，看 token 什么时候过期（这一步不发网络请求）。
  // 只有当它「快过期」或「已经过期」时，才值得花 600ms 去 Supabase 换新的。
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // 有 cookie 但读不出有效 session，说明已经失效，交给页面去引导登录
    return response;
  }

  const expiresAt = session.expires_at ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);

  // 距过期还有 60 秒以上 → 这次不用刷新，直接放行
  if (expiresAt - nowSeconds > 60) {
    return response;
  }

  // 快过期了，才真的去 Supabase 刷新（约 600ms，但每小时内只会发生几次）
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
