import { redirect } from 'next/navigation';

import CreateOrgForm from '@/components/create-org-form';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getProfile } from '@/lib/supabase/server';

export default async function NewOrgPage() {
  if (!isSupabaseConfigured) {
    redirect('/');
  }

  const profile = await getProfile().catch(() => null);

  if (!profile) {
    redirect('/login');
  }

  // 只有管理员能建组织。这只是「友好的前置提示」，
  // 真正的拦截在数据库的 RLS 里，绕不过去。
  if (!profile.is_admin) {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card">
          <span className="badge badge-warn">需要管理员身份</span>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>
            你还不能创建组织
          </h1>
          <p className="muted small">
            目前只有管理员可以创建组织。找一位管理员要一个邀请码，
            兑换后你也会成为管理员。
          </p>
          <a href="/invite" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
            去兑换邀请码
          </a>
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
