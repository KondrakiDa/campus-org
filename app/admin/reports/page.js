'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import ReportQueue from '@/components/report-queue';
import { createClient } from '@/lib/supabase/client';

export default function AdminReportsPage() {
  const { profile, loading: authLoading } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { data: reports, error: reportError } = await supabase
        .from('reports')
        .select(
          'id, target_type, target_id, reason, status, created_at, reporter_id, profiles(display_name)'
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100);

      if (reportError) {
        setError(reportError.message);
        return;
      }

      const rows = reports || [];

      // 按类型收集 id，批量查内容，避免一条一条查
      const postIds = rows.filter((r) => r.target_type === 'post').map((r) => r.target_id);
      const commentIds = rows.filter((r) => r.target_type === 'comment').map((r) => r.target_id);
      const orgIds = rows.filter((r) => r.target_type === 'org').map((r) => r.target_id);

      const [postsRes, commentsRes, orgsRes] = await Promise.all([
        postIds.length
          ? supabase
              .from('posts')
              .select('id, title, body, created_by, org_id, profiles(display_name)')
              .in('id', postIds)
          : Promise.resolve({ data: [] }),
        commentIds.length
          ? supabase
              .from('comments')
              .select('id, body, author_id, org_id, profiles(display_name)')
              .in('id', commentIds)
          : Promise.resolve({ data: [] }),
        orgIds.length
          ? supabase.from('orgs').select('id, name, school, created_by').in('id', orgIds)
          : Promise.resolve({ data: [] }),
      ]);

      const postMap = new Map((postsRes.data || []).map((p) => [p.id, p]));
      const commentMap = new Map((commentsRes.data || []).map((c) => [c.id, c]));
      const orgMap = new Map((orgsRes.data || []).map((o) => [o.id, o]));

      const enriched = rows.map((report) => {
        let excerpt = '（内容已被删除）';
        let authorId = null;
        let authorName = '未知';
        let link = null;

        if (report.target_type === 'post') {
          const post = postMap.get(report.target_id);
          if (post) {
            excerpt = post.title + (post.body ? ` — ${post.body.slice(0, 80)}` : '');
            authorId = post.created_by;
            authorName = post.profiles?.display_name || '未知';
            link = `/org?id=${post.org_id}`;
          }
        } else if (report.target_type === 'comment') {
          const comment = commentMap.get(report.target_id);
          if (comment) {
            excerpt = comment.body.slice(0, 120);
            authorId = comment.author_id;
            authorName = comment.profiles?.display_name || '未知';
            link = `/org?id=${comment.org_id}`;
          }
        } else {
          const org = orgMap.get(report.target_id);
          if (org) {
            excerpt = `${org.name}（${org.school}）`;
            authorId = org.created_by;
            authorName = '组织创建者';
            link = `/org?id=${org.id}`;
          }
        }

        return {
          ...report,
          excerpt,
          authorId,
          authorName,
          link,
          reporterName: report.profiles?.display_name || '匿名',
        };
      });

      setItems(enriched);
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.is_admin) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, profile, load]);

  if (authLoading || loading) {
    return <div className="container empty-state">正在加载…</div>;
  }

  if (!profile) {
    return (
      <div className="container" style={{ maxWidth: 520, paddingTop: 50 }}>
        <div className="card">
          <span className="badge badge-warn">需要登录</span>
          <h1 style={{ fontSize: 20, margin: '12px 0 8px' }}>请先登录</h1>
          <Link href="/login" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (!profile.is_admin) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card">
          <span className="badge badge-warn">没有权限</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>只有管理员能看举报队列</h1>
          <Link href="/" className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>
            回到首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <p className="tiny muted" style={{ marginBottom: 6 }}>
        <Link href="/" style={{ color: 'var(--brand)' }}>
          首页
        </Link>{' '}
        / 管理
      </p>

      <h1 style={{ fontSize: 26, marginBottom: 6 }}>举报队列</h1>
      <p className="muted small" style={{ marginBottom: 24 }}>
        待处理 {items.length} 条。处理完会从队列里消失。
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <ReportQueue items={items} onChanged={load} />
    </div>
  );
}
