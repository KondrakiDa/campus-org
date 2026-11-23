import Link from 'next/link';
import { redirect } from 'next/navigation';

import JoinOrgForm from '@/components/join-org-form';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function JoinPage({ searchParams }) {
  if (!isSupabaseConfigured) redirect('/');

  const { code } = await searchParams;
  const profile = await getProfile().catch(() => null);

  const cleanCode = String(code || '').trim().toUpperCase().slice(0, 32);

  if (!cleanCode) {
    return (
      <div className="container" style={{ maxWidth: 460, paddingTop: 50 }}>
        <div className="card">
          <span className="badge badge-warn">链接不完整</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>
            这个邀请链接少了邀请码
          </h1>
          <p className="muted small">
            让对方把完整链接发你，形如 <code>/join?code=ABCD1234</code>。
          </p>
          <Link href="/" className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>
            回到首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 460, paddingTop: 50 }}>
      <div className="card">
        <span className="badge badge-accent">组织邀请</span>

        <h1 style={{ fontSize: 24, margin: '12px 0 8px' }}>
          邀请你共同管理一个组织
        </h1>

        <p className="muted small" style={{ marginBottom: 18 }}>
          接受后你会成为该组织的管理员，可以发布动态、修改资料、删除内容。
        </p>

        <div
          className="card"
          style={{
            padding: '10px 14px',
            marginBottom: 18,
            background: 'var(--bg-soft)',
          }}
        >
          <span className="tiny muted">邀请码</span>
          <p
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 650,
              letterSpacing: '0.12em',
            }}
          >
            {cleanCode}
          </p>
        </div>

        {profile ? (
          <JoinOrgForm code={cleanCode} />
        ) : (
          <div className="alert alert-info">
            请先登录，登录后会自动回到这一页。
            <br />
            <Link
              href={`/login?next=${encodeURIComponent(`/join?code=${cleanCode}`)}`}
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              去登录
            </Link>
            {' · '}
            <Link
              href={`/signup?next=${encodeURIComponent(`/join?code=${cleanCode}`)}`}
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              注册新账号
            </Link>
          </div>
        )}

        <p className="tiny muted" style={{ marginTop: 16 }}>
          每条邀请链接只能用一次。如果提示已用完，让对方重新生成一条。
        </p>
      </div>
    </div>
  );
}
