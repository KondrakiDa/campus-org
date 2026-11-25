'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import EditOrgForm from '@/components/edit-org-form';
import MemberManager from '@/components/member-manager';
import { createClient } from '@/lib/supabase/client';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function OrgSettingsContent() {
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();

  const id = searchParams.get('id') || '';

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!UUID_PATTERN.test(id)) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const [orgResult, membersResult] = await Promise.all([
        supabase
          .from('orgs')
          .select('id, name, school, intro, logo_url')
          .eq('id', id)
          .single(),
        supabase
          .from('org_members')
          .select('user_id, role, profiles(display_name)')
          .eq('org_id', id),
      ]);

      setOrg(orgResult.data || null);
      setMembers(membersResult.data || []);
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

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
            href={`/login?next=${encodeURIComponent(`/org/settings?id=${id}`)}`}
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

  const isMember = members.some((m) => m.user_id === profile.id);

  if (!isMember) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card">
          <span className="badge badge-warn">没有权限</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>
            只有该组织的管理员能修改资料
          </h1>
          <p className="muted small">你目前不是「{org.name}」的管理员。</p>
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
      {error && <div className="alert alert-error">{error}</div>}

      <p className="tiny muted" style={{ marginBottom: 6 }}>
        <Link href={`/org?id=${org.id}`} style={{ color: 'var(--brand)' }}>
          {org.name}
        </Link>{' '}
        / 设置
      </p>

      <h1 style={{ fontSize: 26, marginBottom: 6 }}>组织设置</h1>
      <p className="muted small" style={{ marginBottom: 24 }}>
        这里改的内容会立刻对所有人可见。
      </p>

      <div className="card">
        <EditOrgForm org={org} />
      </div>

      <hr className="divider" />

      <h2 style={{ fontSize: 18, marginBottom: 6 }}>管理员</h2>
      <p className="muted small" style={{ marginBottom: 18 }}>
        这个组织的所有管理员都能发布内容、修改资料。一个人忙不过来时，可以把同事加进来。
      </p>

      <MemberManager
        orgId={org.id}
        members={members}
        currentUserId={profile.id}
      />
    </div>
  );
}
