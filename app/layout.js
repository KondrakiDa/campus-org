import { AuthProvider } from '@/components/auth-provider';
import NavBar from '@/components/nav-bar';

import './globals.css';

export const metadata = {
  title: '组织汇 · 校园学生组织平台',
  description: '各校学生组织在这里发布动态、分享校园影像，并互相交流。',
};

export default function RootLayout({ children }) {
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
        <AuthProvider>
          <NavBar />

          <main className="page">{children}</main>

          <footer className="container" style={{ paddingBottom: 40 }}>
            <hr className="divider" />
            <p className="small muted">
              组织汇 · 一个跨校学生组织的展示与交流平台
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
