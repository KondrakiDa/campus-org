import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import NewPostForm from '@/components/new-post-form';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient, getProfile } from '@/lib/supabase/server';

export default async function NewPostPage({ params }) {
  if (!isSupabaseConfigured) notFound();

  const { id } = await params;
  const profile = await getProfile().catch(() => null);

  if (!profile) redirect('/login');

  const supabase = await createClient();

  const { data: org } = await supabase
    .from('orgs')
    .select('id, name')
    .eq('id', id)
    .single();

  if (!org) notFound();

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', id)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (!membership) {
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
          <Link href={`/org/${org.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>
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
