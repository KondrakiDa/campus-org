import { redirect } from 'next/navigation';

import ProfileView from '@/components/profile-view';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  if (!isSupabaseConfigured) redirect('/');

  const profile = await getProfile().catch(() => null);

  if (!profile) {
    redirect(`/login?next=${encodeURIComponent('/profile')}`);
  }

  return (
    <ProfileView displayName={profile.display_name} email={profile.email} />
  );
}
