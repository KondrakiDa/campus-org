import Link from 'next/link';
import { notFound } from 'next/navigation';

import CommentSection from '@/components/comment-section';
import PostActions from '@/components/post-actions';
import { initialOf, timeAgo } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient, getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OrgPage({ params }) {
  if (!isSupabaseConfigured) notFound();

  const { id } = await params;

  // 简单校验，避免把乱七八糟的字符串塞进查询
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) notFound();

  const supabase = await createClient();

  const { data: org } = await supabase
    .from('orgs')
    .select('id, name, school, intro, logo_url, created_at')
    .eq('id', id)
    .single();

  if (!org) notFound();

  const profile = await getProfile().catch(() => null);

  const [{ data: posts }, { data: comments }, { data: members }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, body, images, created_at, profiles(display_name)')
      .eq('org_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('comments')
      .select('id, body, created_at, author_id, profiles(display_name)')
      .eq('org_id', id)
      .is('post_id', null)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('org_members')
      .select('user_id, role, profiles(display_name)')
      .eq('org_id', id),
  ]);

  const isMember = Boolean(
    profile && members?.some((m) => m.user_id === profile.id)
  );

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      {/* ============ 组织头部 ============ */}
      <section className="card" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gap: 14, marginBottom: 14 }}>
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt=""
              width={56}
              height={56}
              style={{ borderRadius: 13, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 56,
                height: 56,
                borderRadius: 13,
                background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
                color: '#fff',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {initialOf(org.name)}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 24 }}>{org.name}</h1>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <span className="badge">{org.school}</span>
              <span className="tiny muted">
                {(members?.length || 0)} 位管理员
              </span>
            </div>
          </div>

          {isMember && (
            <div className="row" style={{ gap: 8 }}>
              <Link href={`/org/${org.id}/settings`} className="btn btn-ghost btn-sm">
                设置
              </Link>
              <Link href={`/org/${org.id}/new-post`} className="btn btn-primary btn-sm">
                发动态
              </Link>
            </div>
          )}
        </div>

        <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>
          {org.intro || '这个组织还没有写简介。'}
        </p>

        {members && members.length > 0 && (
          <>
            <hr className="divider" />
            <div className="row" style={{ gap: 6 }}>
              <span className="tiny muted">管理员：</span>
              {members.map((m) => (
                <span key={m.user_id} className="badge">
                  {m.profiles?.display_name || '未知'}
                  {m.role === 'owner' && ' · 创建者'}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ============ 动态 ============ */}
      <section>
        <div className="between" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 18 }}>动态</h2>
          <span className="tiny muted">{posts?.length || 0} 条</span>
        </div>

        {!posts || posts.length === 0 ? (
          <div className="empty-state">
            {isMember ? (
              <>
                还没有动态。{' '}
                <Link
                  href={`/org/${org.id}/new-post`}
                  style={{ color: 'var(--brand)' }}
                >
                  发第一条 →
                </Link>
              </>
            ) : (
              '这个组织还没发布内容。'
            )}
          </div>
        ) : (
          <div className="stack" style={{ gap: 14 }}>
            {posts.map((post) => (
              <article key={post.id} className="card">
                <div className="between" style={{ marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16 }}>{post.title}</h3>
                  <span className="tiny muted">{timeAgo(post.created_at)}</span>
                </div>

                {post.body && (
                  <p
                    className="small"
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {post.body}
                  </p>
                )}

                {post.images?.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        post.images.length === 1
                          ? '1fr'
                          : 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    {post.images.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        style={{
                          width: '100%',
                          borderRadius: 10,
                          objectFit: 'cover',
                          maxHeight: post.images.length === 1 ? 420 : 160,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="between" style={{ marginTop: 10, gap: 10 }}>
                  <span className="tiny muted">
                    由 {post.profiles?.display_name || '管理员'} 发布
                  </span>

                  {isMember && <PostActions postId={post.id} />}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ============ 评论区 ============ */}
      <CommentSection
        orgId={org.id}
        initialComments={comments || []}
        currentUserId={profile?.id || null}
        canModerate={isMember}
      />

      <div style={{ marginTop: 32 }}>
        <Link href="/" className="btn btn-ghost btn-sm">
          ← 回到所有组织
        </Link>
      </div>
    </div>
  );
}
