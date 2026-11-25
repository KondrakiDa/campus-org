'use client';

import Link from 'next/link';

import { useAuth } from '@/components/auth-provider';
import CreateOrgForm from '@/components/create-org-form';

export default function NewOrgPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="container empty-state">正在加载…</div>;
  }

  if (!profile) {
    return (
      <div className="container" style={{ maxWidth: 520, paddingTop: 50 }}>
        <div className="card">
          <span className="badge badge-warn">需要登录</span>
          <h1 style={{ fontSize: 20, margin: '12px 0 8px' }}>请先登录</h1>
          <Link
            href={`/login?next=${encodeURIComponent('/org/new')}`}
            className="btn btn-primary btn-sm"
            style={{ marginTop: 14 }}
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  // 只有管理员能建组织。这只是「友好的前置提示」，
  // 真正的拦截在数据库的 RLS 里，绕不过去。
  if (!profile.is_admin) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card">
          <span className="badge badge-warn">需要管理员身份</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>你还不能创建组织</h1>
          <p className="muted small">
            目前只有管理员可以创建组织。找一位管理员要一个邀请码，兑换后你也会成为管理员。
          </p>
          <Link
            href="/invite"
            className="btn btn-primary btn-sm"
            style={{ marginTop: 16 }}
          >
            去兑换邀请码
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>创建组织</h1>
      <p className="muted small" style={{ marginBottom: 24 }}>
        创建后你就是这个组织的管理员，可以发布动态、上传图片。
      </p>

      <div className="card">
        <CreateOrgForm />
      </div>
    </div>
  );
}
