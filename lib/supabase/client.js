import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config';

/**
 * 浏览器端 Supabase 客户端。
 * 在客户端组件（'use client'）里使用。
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 还没配置，请先填写 .env.local');
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
