'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { timeAgo } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

const TYPE_LABEL = {
  post: '动态',
  comment: '评论',
  org: '组织',
};

export default function ReportQueue({ items, onChanged }) {
  const router = useRouter();

  const [list, setList] = useState(items || []);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function afterChange() {
    // 静态站点没有服务端可刷新，优先用父组件传进来的重新加载
    if (typeof onChanged === 'function') {
      onChanged();
    } else {
      router.refresh();
    }
  }

  async function handleResolve(report, action, deleteTarget) {
    const confirmText = deleteTarget
      ? '确认删除这条内容？删除后不可恢复。'
      : '确认驳回这条举报？内容会保留。';

    if (!window.confirm(confirmText)) return;

    setError('');
    setBusyId(report.id);

    try {
      const supabase = createClient();

      const { error: rpcError } = await supabase.rpc('resolve_report', {
        p_report: report.id,
        p_action: action,
        p_delete_target: deleteTarget,
      });

      if (rpcError) {
        setError(translateError(rpcError));
        return;
      }

      setList((prev) => prev.filter((r) => r.id !== report.id));
      afterChange();
    } catch (err) {
      setError(err.message || '处理失败');
    } finally {
      setBusyId(null);
    }
  }

  async function handleBan(authorId, authorName) {
    const reason = window.prompt(
      `封禁「${authorName}」？\n\n封禁后他仍然能浏览，但无法发布任何内容。\n填写理由（可以不填）：`
    );

    // 点取消返回 null
    if (reason === null) return;

    setError('');

    try {
      const supabase = createClient();

      const { error: rpcError } = await supabase.rpc('ban_user', {
        p_user: authorId,
        p_reason: reason || null,
      });

      if (rpcError) {
        setError(translateError(rpcError));
        return;
      }

      window.alert(`已封禁「${authorName}」`);
      afterChange();
    } catch (err) {
      setError(err.message || '封禁失败');
    }
  }

  if (list.length === 0) {
    return <div className="empty-state">队列是空的，暂时没有需要处理的内容。</div>;
  }

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stack" style={{ gap: 14 }}>
        {list.map((report) => (
          <div key={report.id} className="card">
            <div className="between" style={{ marginBottom: 10 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="badge badge-warn">
                  {TYPE_LABEL[report.target_type] || report.target_type}
                </span>
                <span className="tiny muted">{timeAgo(report.created_at)}</span>
              </div>

              {report.link && (
                <Link href={report.link} className="tiny" style={{ color: 'var(--brand)' }}>
                  查看原文 →
                </Link>
              )}
            </div>

            <p
              className="small"
              style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginBottom: 10 }}
            >
              {report.excerpt}
            </p>

            <div
              className="card"
              style={{ padding: '10px 12px', background: 'var(--surface-2)' }}
            >
              <p className="tiny muted" style={{ marginBottom: 4 }}>
                举报原因
              </p>
              <p className="small">{report.reason}</p>
              <p className="tiny muted" style={{ marginTop: 6 }}>
                由 {report.reporterName} 举报 · 作者 {report.authorName}
              </p>
            </div>

            <div className="row" style={{ marginTop: 14, gap: 8 }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => handleResolve(report, 'resolved', true)}
                disabled={busyId === report.id}
              >
                删除内容
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => handleResolve(report, 'dismissed', false)}
                disabled={busyId === report.id}
              >
                驳回举报
              </button>

              {report.authorId && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleBan(report.authorId, report.authorName)}
                >
                  封禁作者
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
