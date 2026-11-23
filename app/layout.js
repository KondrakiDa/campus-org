import Link from 'next/link';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getProfile } from '@/lib/supabase/server';

import './globals.css';

export const metadata = {
  title: '组织汇 · 校园学生组织平台',
  description: '各校学生组织在这里发布动态、分享校园影像，并互相交流。',
};

export default async function RootLayout({ children }) {
  let profile = null;

  // 没配置 Supabase 时不要抛错，让页面自己给出配置指引
  if (isSupabaseConfigured) {
    try {
      profile = await getProfile();
    } catch {
      profile = null;
    }
  }

  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <body>
        <header className="site-nav">
          <div className="container site-nav-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">团</span>
              <span className="brand-text">组织汇</span>
            </Link>

            <nav className="nav-links">
              <Link href="/">组织</Link>

              {profile?.is_admin && (
                <>
                  <Link href="/org/new">创建组织</Link>
                  <Link href="/invites">邀请码</Link>
                </>
              )}

              {profile ? (
                <>
                  <span className="badge badge-brand" title={profile.email}>
                    {profile.display_name}
                    {profile.is_admin && ' · 管理员'}
                  </span>

                  <form action="/auth/signout" method="post">
                    <button type="submit" className="btn btn-ghost btn-sm">
                      退出
                    </button>
                  </form>
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

        <main className="page">{children}</main>

        <footer className="container" style={{ paddingBottom: 40 }}>
          <hr className="divider" />
          <p className="small muted">
            组织汇 · 一个跨校学生组织的展示与交流平台
          </p>
        </footer>
      </body>
    </html>
  );
}
