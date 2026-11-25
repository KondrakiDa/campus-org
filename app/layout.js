import Link from 'next/link';

import UserAvatar from '@/components/user-avatar';
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
    <html
      lang="zh-CN"
      data-theme="dark"
      data-accent="blue"
      suppressHydrationWarning
    >
      <head>
        {/*
          在页面渲染前就把主题色贴上，避免刷新时先闪一下默认蓝再变。
          这段脚本必须内联在 head 里，不能放进组件——那样太晚。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var a=localStorage.getItem('org_v1_accent');if(a)document.documentElement.setAttribute('data-accent',a);}catch(e){}",
          }}
        />
      </head>
      <body>
        <header className="site-nav">
          <div className="container site-nav-inner">
            <div className="brand">
              {/* 头像 → 个人信息页；没登录时去登录页 */}
              <Link
                href={profile ? '/profile' : '/login'}
                className="brand-avatar"
                aria-label={profile ? '个人信息' : '登录'}
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
