import Link from 'next/link';

import SetupNotice from '@/components/setup-notice';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient, getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** 去掉会破坏 Supabase 查询语法的字符，防止搜索框被拿来注入 */
function sanitize(input) {
  return String(input || '')
    .replace(/[,()*]/g, ' ')
    .trim()
    .slice(0, 40);
}

export default async function HomePage({ searchParams }) {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const { q } = await searchParams;
  const keyword = sanitize(q);

  const supabase = await createClient();
  const profile = await getProfile().catch(() => null);

  let request = supabase
    .from('orgs')
    .select('id, name, school, intro, logo_url, created_at, posts(count)')
    .order('created_at', { ascending: false })
    .limit(60);

  if (keyword) {
    request = request.or(`name.ilike.%${keyword}%,school.ilike.%${keyword}%`);
  }

  const { data: orgs, error } = await request;

  return (
    <div className="container">
      {/* ============ 头部 ============ */}
      <section style={{ padding: '26px 0 30px' }}>
        <span className="badge badge-accent">跨校 · 学生组织</span>

        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', margin: '14px 0 12px' }}>
          找到你学校的<span className="grad">那些组织</span>
        </h1>

        <p className="muted" style={{ maxWidth: 560, fontSize: 15.5 }}>
          各校社团在这里发布动态、分享校园影像。登录后可以在任意组织的评论区说话。
        </p>

        <form
          action="/"
          method="get"
          className="row"
          style={{ marginTop: 22, maxWidth: 460 }}
        >
          <input
            className="input"
            name="q"
            defaultValue={keyword}
            placeholder="搜组织名或学校，比如「摄影」「浙大」"
            style={{ flex: 1, minWidth: 180 }}
            aria-label="搜索组织"
          />
          <button className="btn btn-primary" type="submit">
            搜索
          </button>
          {keyword && (
            <Link href="/" className="btn btn-ghost btn-sm">
              清除
            </Link>
          )}
        </form>
      </section>

      {/* ============ 错误 ============ */}
      {error && (
        <div className="alert alert-error">
          读取出错：{error.message}
          <br />
          <span className="tiny">
            如果提示 relation &quot;orgs&quot; does not exist，说明还没执行 supabase/schema.sql
          </span>
        </div>
      )}

      {/* ============ 列表 ============ */}
      {!error && (!orgs || orgs.length === 0) && (
        <div className="empty-state">
          {keyword ? (
            <>没找到和「{keyword}」相关的组织，换个词试试。</>
          ) : (
            <>
              还没有任何组织。
              {profile?.is_admin ? (
                <>
                  {' '}
                  <Link href="/org/new" style={{ color: 'var(--brand)' }}>
                    创建第一个 →
                  </Link>
                </>
              ) : (
                <> 等管理员创建后就会出现在这里。</>
              )}
            </>
          )}
        </div>
      )}

      {orgs && orgs.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {orgs.map((org) => {
            const postCount = org.posts?.[0]?.count ?? 0;
            const initial = (org.name || '组').trim().charAt(0);

            return (
              <Link key={org.id} href={`/org/${org.id}`} className="card card-hover">
                <div className="row" style={{ marginBottom: 12 }}>
                  {org.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={org.logo_url}
                      alt=""
                      width={40}
                      height={40}
                      style={{
                        borderRadius: 10,
                        objectFit: 'cover',
                        flex: '0 0 auto',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background:
                          'linear-gradient(135deg, var(--brand), var(--brand-2))',
                        color: '#fff',
                        fontWeight: 700,
                        flex: '0 0 auto',
                      }}
                    >
                      {initial}
                    </div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 16 }}>{org.name}</h3>
                    <span className="tiny muted">{org.school}</span>
                  </div>
                </div>

                <p
                  className="small muted"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 42,
                  }}
                >
                  {org.intro || '这个组织还没有写简介。'}
                </p>

                <div className="row" style={{ marginTop: 14, fontSize: 12 }}>
                  <span className="badge">{postCount} 条动态</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ============ 给管理员的入口 ============ */}
      {profile?.is_admin && (
        <div className="card" style={{ marginTop: 28 }}>
          <div className="between">
            <div>
              <strong style={{ fontSize: 15 }}>你是管理员</strong>
              <p className="tiny muted" style={{ marginTop: 2 }}>
                可以创建自己学校的组织，也可以生成邀请码让别人也成为管理员。
              </p>
            </div>
            <div className="row">
              <Link href="/org/new" className="btn btn-primary btn-sm">
                创建组织
              </Link>
              <Link href="/invites" className="btn btn-ghost btn-sm">
                邀请码
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
