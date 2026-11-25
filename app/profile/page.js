'use client';

import Link from 'next/link';

import { useAuth } from '@/components/auth-provider';
import ProfileView from '@/components/profile-view';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="container empty-state">正在加载…</div>;
  }

  if (!user) {
    return (
      <div className="container" style={{ maxWidth: 460, paddingTop: 50 }}>
        <div className="card">
          <span className="badge badge-warn">需要登录</span>
          <h1 style={{ fontSize: 20, margin: '12px 0 8px' }}>请先登录</h1>
          <Link
            href={`/login?next=${encodeURIComponent('/profile/')}`}
            className="btn btn-primary btn-sm"
            style={{ marginTop: 14 }}
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return <ProfileView displayName={profile?.display_name} email={user.email} />;
}
