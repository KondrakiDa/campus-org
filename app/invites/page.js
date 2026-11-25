'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import GenerateInvite from '@/components/generate-invite';
import { createClient } from '@/lib/supabase/client';

export default function InvitesPage() {
  const { profile, loading: authLoading } = useAuth();

  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!profile?.is_admin) {
      setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      const supabase = createClient();
      // RLS 只允许看到自己发的码，不需要额外加过滤
      const { data } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!alive) return;
      setInvites(data || []);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [authLoading, profile]);

  if (authLoading || loading) {
    return <div className="container empty-state">正在加载…</div>;
  }

  if (!profile) {
    return (
      <div className="container" style={{ maxWidth: 520, paddingTop: 50 }}>
        <div className="card">
          <span className="badge badge-warn">需要登录</span>
          <h1 style={{ fontSize: 20, margin: '12px 0 8px' }}>请先登录</h1>
          <Link
            href={`/login?next=${encodeURIComponent('/invites/')}`}
            className="btn btn-primary btn-sm"
            style={{ marginTop: 14 }}
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (!profile.is_admin) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card">
          <span className="badge badge-warn">需要管理员身份</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>
            只有管理员能生成邀请码
          </h1>
          <p className="muted small">
            先用别人给你的邀请码升级成管理员，之后你就能继续邀请其他人。
          </p>
          <Link href="/invite" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
            去兑换邀请码
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>邀请码</h1>
      <p className="muted small" style={{ marginBottom: 24 }}>
        发一个码给对方，对方兑换后就会成为管理员，可以创建自己学校的组织。管理员没有人数上限。
      </p>

      <GenerateInvite initialInvites={invites} />

      <hr className="divider" />

      <p className="tiny muted">
        提示：你只能看到自己发出的码。别人发出的码你看不见，也猜不到——
        这是数据库层面的隔离，不是靠界面隐藏。
      </p>
    </div>
  );
}
