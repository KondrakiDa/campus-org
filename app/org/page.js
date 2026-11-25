import { Suspense } from 'react';

import OrgContent from '@/components/org-content';

export default function OrgPage() {
  return (
    <Suspense fallback={<div className="container empty-state">正在加载…</div>}>
      <OrgContent />
    </Suspense>
  );
}
