'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import CommentSection from '@/components/comment-section';
import Pagination from '@/components/pagination';
import PostActions from '@/components/post-actions';
import ReportButton from '@/components/report-button';
import { initialOf, timeAgo } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

const PAGE_SIZE = 10;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function OrgContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const id = searchParams.get('id') || '';
  const currentPage = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);

  const [org, setOrg] = useState(null);
  const [posts, setPosts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [comments, setComments] = useState([]);
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!UUID_PATTERN.test(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const supabase = createClient();
      const rangeFrom = (currentPage - 1) * PAGE_SIZE;
      const rangeTo = rangeFrom + PAGE_SIZE - 1;

      // 五个查询同时发出，只等最慢的那个
      const [orgResult, postsResult, commentsResult, membersResult] =
        await Promise.all([
          supabase
            .from('orgs')
            .select('id, name, school, intro, logo_url, created_at')
            .eq('id', id)
            .single(),

          supabase
            .from('posts')
            .select('id, title, body, images, created_at, profiles(display_name)', {
              count: 'exact',
            })
            .eq('org_id', id)
            .order('created_at', { ascending: false })
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

      if (!orgResult.data) {
        setNotFound(true);
        return;
      }

      setOrg(orgResult.data);
      setPosts(postsResult.data || []);
      setComments(commentsResult.data || []);
      setMembers(membersResult.data || []);

      const total = postsResult.count ?? 0;
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="container empty-state">正在加载…</div>;
  }

  if (notFound) {
    return (
      <div className="container" style={{ maxWidth: 520, paddingTop: 60, textAlign: 'center' }}>
        <p className="grad" style={{ fontSize: 60, fontWeight: 750, margin: 0, lineHeight: 1 }}>
          404
        </p>
        <h1 style={{ fontSize: 20, margin: '16px 0 10px' }}>找不到这个组织</h1>
        <p className="muted small" style={{ marginBottom: 22 }}>
          可能是组织已被删除，或者链接不完整。
        </p>
        <Link href="/" className="btn btn-primary">
          回到所有组织
        </Link>
      </div>
    );
  }

  if (!org) return null;

  const isMember = Boolean(
    profile && members.some((m) => m.user_id === profile.id)
  );

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      {error && <div className="alert alert-error">{error}</div>}

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
              <span className="tiny muted">{members.length} 位管理员</span>
            </div>
          </div>

          {isMember && (
            <div className="row" style={{ gap: 8 }}>
              <Link href={`/org/settings?id=${org.id}`} className="btn btn-ghost btn-sm">
                设置
              </Link>
              <Link href={`/org/new-post?id=${org.id}`} className="btn btn-primary btn-sm">
                发动态
              </Link>
            </div>
          )}
        </div>

        <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>
          {org.intro || '这个组织还没有写简介。'}
        </p>

        {members.length > 0 && (
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
          <span className="tiny muted">{posts.length} 条</span>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state">
            {isMember ? (
              <>
                还没有动态。{' '}
                <Link href={`/org/new-post?id=${org.id}`} style={{ color: 'var(--brand)' }}>
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
                  <p className="small" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
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
                    {isMember && <PostActions postId={post.id} onDeleted={load} />}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          label="动态分页"
          hrefForPage={(target) =>
            `/org?id=${org.id}${target === 1 ? '' : `&page=${target}`}`
          }
        />
      </section>

      {/* ============ 评论区 ============ */}
      <CommentSection
        orgId={org.id}
        initialComments={comments}
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
