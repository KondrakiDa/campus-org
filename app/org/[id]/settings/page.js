import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import EditOrgForm from '@/components/edit-org-form';
import MemberManager from '@/components/member-manager';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient, getProfile } from '@/lib/supabase/server';

export default async function OrgSettingsPage({ params }) {
  if (!isSupabaseConfigured) notFound();

  const { id } = await params;
  const profile = await getProfile().catch(() => null);

  if (!profile) redirect('/login');

  const supabase = await createClient();

  const { data: org } = await supabase
    .from('orgs')
    .select('id, name, school, intro, logo_url')
    .eq('id', id)
    .single();

  if (!org) notFound();

  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, role, profiles(display_name)')
    .eq('org_id', id);

  const membership = members?.find((m) => m.user_id === profile.id);

  if (!membership) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card">
          <span className="badge badge-warn">没有权限</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>
            只有该组织的管理员能修改资料
          </h1>
          <p className="muted small">
            你目前不是「{org.name}」的管理员。
          </p>
          <Link
            href={`/org/${org.id}`}
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
        <Link href={`/org/${org.id}`} style={{ color: 'var(--brand)' }}>
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
        members={members || []}
        currentUserId={profile.id}
      />
    </div>
  );
}
