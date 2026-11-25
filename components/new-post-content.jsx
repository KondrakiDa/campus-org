'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import NewPostForm from '@/components/new-post-form';
import { createClient } from '@/lib/supabase/client';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function NewPostContent() {
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();

  const id = searchParams.get('id') || '';

  const [org, setOrg] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !profile || !UUID_PATTERN.test(id)) {
      if (!authLoading) setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      const supabase = createClient();

      const [orgResult, memberResult] = await Promise.all([
        supabase.from('orgs').select('id, name').eq('id', id).single(),
        supabase
          .from('org_members')
          .select('role')
          .eq('org_id', id)
          .eq('user_id', profile.id)
          .maybeSingle(),
      ]);

      if (!alive) return;

      setOrg(orgResult.data || null);
      setIsMember(Boolean(memberResult.data));
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [authLoading, profile, id]);

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
            href={`/login?next=${encodeURIComponent(`/org/new-post?id=${id}`)}`}
            className="btn btn-primary btn-sm"
            style={{ marginTop: 14 }}
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (!org) {
    return <div className="container empty-state">找不到这个组织。</div>;
  }

  if (!isMember) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card">
          <span className="badge badge-warn">不是你管理的组织</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>
            只有该组织的管理员才能发布内容
          </h1>
          <p className="muted small">
            你目前不是「{org.name}」的管理员。如果确实需要，请让该组织的管理员把你加进去。
          </p>
          <Link
            href={`/org?id=${org.id}`}
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 16 }}
          >
            回到组织页面
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <p className="tiny muted" style={{ marginBottom: 6 }}>
        发布到 {org.name}
      </p>
      <h1 style={{ fontSize: 26, marginBottom: 20 }}>发一条动态</h1>

      <div className="card">
        <NewPostForm orgId={org.id} />
      </div>
    </div>
  );
}
