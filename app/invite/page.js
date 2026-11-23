import { redirect } from 'next/navigation';

import RedeemInviteForm from '@/components/redeem-invite-form';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getProfile } from '@/lib/supabase/server';

export default async function InvitePage() {
  if (!isSupabaseConfigured) redirect('/');

  const profile = await getProfile().catch(() => null);
  if (!profile) redirect('/login');

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>兑换邀请码</h1>
      <p className="muted small" style={{ marginBottom: 24 }}>
        输入管理员给你的邀请码，你就会成为管理员，可以创建自己的组织。
      </p>

      <div className="card">
        {profile.is_admin ? (
          <>
            <span className="badge badge-accent">你已经是管理员</span>
            <p className="small muted" style={{ marginTop: 10 }}>
              再兑换一次不会有什么变化，也不会浪费邀请码的名额。
            </p>
            <hr className="divider" />
          </>
        ) : null}

        <RedeemInviteForm />
      </div>

      <p className="tiny muted" style={{ marginTop: 16 }}>
        邀请码是一次性的（或限量），用完即失效。拿不到码说明对方还没发，问一下就行。
      </p>
    </div>
  );
}
