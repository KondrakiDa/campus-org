/**
 * Supabase 配置检查。
 * 没配置时不要直接崩溃，而是让页面显示一个「去配置」的提示页，
 * 否则新手看到一个空白页会完全不知道发生了什么。
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('你的项目ID') &&
    SUPABASE_URL.startsWith('https://')
);

export const SETUP_HINT = [
  '① 去 https://supabase.com 注册并新建一个项目',
  '② Project Settings → API，复制 Project URL 和 anon public key',
  '③ 在项目根目录把 .env.local.example 复制成 .env.local，填进去',
  '④ 打开 Supabase 的 SQL Editor，把 supabase/schema.sql 整段执行一遍',
  '⑤ 重启开发服务器：Ctrl+C 然后 npm run dev',
];
