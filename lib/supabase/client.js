import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config';

/**
 * 浏览器端 Supabase 客户端（全局单例）。
 *
 * 静态化之后没有服务端，所有数据访问都在浏览器里发生。
 * 必须是单例：每次 new 一个客户端会导致多个 auth 实例互相踢掉 session。
 */
let cached = null;

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 还没配置，请先填写 .env.local');
  }

  if (!cached) {
    cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return cached;
}
