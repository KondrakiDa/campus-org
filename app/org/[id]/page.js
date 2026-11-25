import Link from 'next/link';
import { notFound } from 'next/navigation';

import CommentSection from '@/components/comment-section';
import Pagination from '@/components/pagination';
import PostActions from '@/components/post-actions';
import ReportButton from '@/components/report-button';
import { initialOf, timeAgo } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient, getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

export default async function OrgPage({ params, searchParams }) {
  if (!isSupabaseConfigured) notFound();

  const { id } = await params;
  const { page: pageParam } = await searchParams;

  // 页码永远从 1 开始，非法值一律当成 1
  const currentPage = Math.max(1, Number.parseInt(pageParam, 10) || 1);
  const rangeFrom = (currentPage - 1) * PAGE_SIZE;
  const rangeTo = rangeFrom + PAGE_SIZE - 1;

  // 简单校验，避免把乱七八糟的字符串塞进查询
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) notFound();

  const supabase = await createClient();

  // 五个查询全部同时发出。
  // 以前是「先查组织 → 再查用户 → 再并行查三张表」，
  // 串行两轮就要多等 500ms。现在合成一轮，只等最慢的那个。
  const [orgResult, profile, postsResult, commentsResult, membersResult] =
    await Promise.all([
      supabase
        .from('orgs')
        .select('id, name, school, intro, logo_url, created_at')
        .eq('id', id)
        .single(),

      getProfile().catch(() => null),

      supabase
        .from('posts')
        // count: 'exact' 会额外返回总条数，用来算总页数
        .select('id, title, body, images, created_at, profiles(display_name)', {
          count: 'exact',
        })
        .eq('org_id', id)
        .order('created_at', { ascending: false })
        // range 是「含头含尾」的区间，只取当前页那 10 条
        .range(rangeFrom, rangeTo),

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

  const org = orgResult.data;
  if (!org) notFound();

  const { data: comments } = commentsResult;
  const { data: members } = membersResult;

  const posts = postsResult.data;
  const postTotal = postsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(postTotal / PAGE_SIZE));

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

                  <div className="row" style={{ gap: 6 }}>
                    <ReportButton
                      targetType="post"
                      targetId={post.id}
                      loggedIn={Boolean(profile)}
                    />
                    {isMember && <PostActions postId={post.id} />}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {currentPage > 1 && (!posts || posts.length === 0) && (
          <div className="empty-state">
            这一页没有内容了。
            {totalPages > 1 && (
              <>
                {' '}
                <Link
                  href={`/org/${org.id}${totalPages > 1 ? `?page=${totalPages}` : ''}`}
                  style={{ color: 'var(--brand)' }}
                >
                  跳到最后一页 →
                </Link>
              </>
            )}
          </div>
        )}

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          label="动态分页"
          hrefForPage={(target) =>
            `/org/${org.id}${target === 1 ? '' : `?page=${target}`}`
          }
        />
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
