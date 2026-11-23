'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { initialOf, timeAgo } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

/**
 * 组织评论区。
 *
 * 游客能看（comments 表 SELECT 对所有开放），
 * 但提交框只有登录后才出现，数据库也会拒绝未登录的写入。
 */
export default function CommentSection({
  orgId,
  initialComments,
  currentUserId,
  canModerate,
}) {
  const router = useRouter();

  const [comments, setComments] = useState(initialComments || []);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const text = body.trim();

    if (!text) return;

    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('登录状态过期了，请重新登录');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          org_id: orgId,
          body: text,
          author_id: user.id,
        })
        .select('id, body, created_at, author_id, profiles(display_name)')
        .single();

      if (insertError) {
        setError(translateError(insertError));
        return;
      }

      setComments((prev) => [data, ...prev]);
      setBody('');
      router.refresh();
    } catch (err) {
      setError(err.message || '发布失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(commentId) {
    if (!confirm('删除这条评论？')) return;

    setDeletingId(commentId);
    setError('');

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) {
        setError(translateError(deleteError));
        return;
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      router.refresh();
    } catch (err) {
      setError(err.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <div className="between" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 18 }}>讨论</h2>
        <span className="tiny muted">{comments.length} 条</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {currentUserId ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: 18 }}>
          <textarea
            className="textarea"
            rows={3}
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="说点什么…"
          />
          <div className="between" style={{ marginTop: 8 }}>
            <span className="tiny muted">{body.length}/1000</span>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={loading || !body.trim()}
            >
              {loading ? '发布中…' : '发布'}
            </button>
          </div>
        </form>
      ) : (
        <div className="alert alert-info">
          游客可以看评论。想参与讨论请先{' '}
          <a href="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>
            登录
          </a>
          。
        </div>
      )}

      {comments.length === 0 ? (
        <div className="empty-state">还没有人发言，来做第一个。</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="stack">
          {comments.map((comment) => {
            const name = comment.profiles?.display_name || '匿名';
            const isAuthor = comment.author_id === currentUserId;
            const canDelete = isAuthor || canModerate;

            return (
              <li
                key={comment.id}
                className="card"
                style={{ padding: '14px 16px', display: 'flex', gap: 12 }}
              >
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    flex: '0 0 auto',
                  }}
                >
                  {initialOf(name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 2 }}>
                    <strong style={{ fontSize: 13.5 }}>{name}</strong>
                    <span className="tiny muted">{timeAgo(comment.created_at)}</span>
                  </div>

                  <p
                    className="small"
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {comment.body}
                  </p>
                </div>

                {canDelete && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                  >
                    {deletingId === comment.id ? '…' : '删除'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
