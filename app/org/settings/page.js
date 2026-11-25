import { Suspense } from 'react';

import OrgSettingsContent from '@/components/org-settings-content';

export default function OrgSettingsPage() {
  return (
    <Suspense fallback={<div className="container empty-state">正在加载…</div>}>
      <OrgSettingsContent />
    </Suspense>
  );
}
