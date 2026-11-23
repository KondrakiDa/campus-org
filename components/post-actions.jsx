'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

/**
 * 动态的删除按钮。
 * 只有组织管理员看得到——但即使有人伪造前端，
 * 数据库的 RLS 也会拒绝非成员的删除请求。
 */
export default function PostActions({ postId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm('删除这条动态？删除后不可恢复。')) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) {
        window.alert(translateError(error));
        return;
      }

      router.refresh();
    } catch (err) {
      window.alert(err.message || '删除失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-danger btn-sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? '删除中…' : '删除'}
    </button>
  );
}
