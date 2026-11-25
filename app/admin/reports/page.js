import Link from 'next/link';
import { redirect } from 'next/navigation';

import ReportQueue from '@/components/report-queue';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient, getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  if (!isSupabaseConfigured) redirect('/');

  const profile = await getProfile().catch(() => null);

  if (!profile) {
    redirect(`/login?next=${encodeURIComponent('/admin/reports')}`);
  }

  if (!profile.is_admin) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card">
          <span className="badge badge-warn">没有权限</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>
            只有管理员能看举报队列
          </h1>
          <Link href="/" className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>
            回到首页
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: reports } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, status, created_at, reporter_id, profiles(display_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = reports || [];

  // 按类型收集 id，批量查内容，避免一条一条查（那样要 100 次请求）
  const postIds = rows.filter((r) => r.target_type === 'post').map((r) => r.target_id);
  const commentIds = rows.filter((r) => r.target_type === 'comment').map((r) => r.target_id);
  const orgIds = rows.filter((r) => r.target_type === 'org').map((r) => r.target_id);

  const [postsResult, commentsResult, orgsResult] = await Promise.all([
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
      ? supabase
          .from('orgs')
          .select('id, name, school, created_by')
          .in('id', orgIds)
      : Promise.resolve({ data: [] }),
  ]);

  const postMap = new Map((postsResult.data || []).map((p) => [p.id, p]));
  const commentMap = new Map((commentsResult.data || []).map((c) => [c.id, c]));
  const orgMap = new Map((orgsResult.data || []).map((o) => [o.id, o]));

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
        link = `/org/${post.org_id}`;
      }
    } else if (report.target_type === 'comment') {
      const comment = commentMap.get(report.target_id);
      if (comment) {
        excerpt = comment.body.slice(0, 120);
        authorId = comment.author_id;
        authorName = comment.profiles?.display_name || '未知';
        link = `/org/${comment.org_id}`;
      }
    } else {
      const org = orgMap.get(report.target_id);
      if (org) {
        excerpt = `${org.name}（${org.school}）`;
        authorId = org.created_by;
        authorName = '组织创建者';
        link = `/org/${org.id}`;
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
        待处理 {enriched.length} 条。处理完会从队列里消失。
      </p>

      <ReportQueue items={enriched} />
    </div>
  );
}
