'use client';

import Link from 'next/link';

import { useAuth } from '@/components/auth-provider';
import UserAvatar from '@/components/user-avatar';
import { createClient } from '@/lib/supabase/client';

export default function NavBar() {
  const { user, profile, loading } = useAuth();

  async function handleSignOut() {
    try {
      await createClient().auth.signOut();
    } finally {
      // 静态站点没有 /auth/signout 这个接口，退出后直接回首页
      window.location.href = '/';
    }
  }

  return (
    <header className="site-nav">
      <div className="container site-nav-inner">
        <div className="brand">
          <Link
            href={user ? '/profile' : '/login'}
            className="brand-avatar"
            aria-label={user ? '个人信息' : '登录'}
          >
            <UserAvatar name={profile?.display_name} size={32} />
          </Link>
          <Link href="/" className="brand-text">
            组织汇
          </Link>
        </div>

        <nav className="nav-links">
          <Link href="/">组织</Link>

          {profile?.is_admin && (
            <>
              <Link href="/org/new">创建组织</Link>
              <Link href="/invites">邀请码</Link>
              <Link href="/admin/reports">管理</Link>
            </>
          )}

          {loading ? null : user ? (
            <>
              <span className="badge badge-brand" title={user.email}>
                {profile?.display_name || '我'}
                {profile?.is_admin && ' · 管理员'}
              </span>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleSignOut}
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                登录
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
