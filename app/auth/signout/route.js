import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * 退出登录。
 * 用 POST 而不是 GET，是为了防止别人用一个 <img src="/auth/signout"> 就把你登出。
 */
export async function POST(request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
