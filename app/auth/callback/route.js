import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * 邮箱确认 / 魔法链接的回跳地址。
 * 用户点了邮件里的链接，Supabase 会带一个 code 跳到这里，
 * 我们拿 code 换一个真正的登录 session。
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  // 防止有人把 next 做成跳到外部站点的钓鱼链接
  const safeNext = next.startsWith('/') ? next : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
