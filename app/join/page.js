import { Suspense } from 'react';

import JoinContent from '@/components/join-content';

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="container empty-state">正在加载…</div>}>
      <JoinContent />
    </Suspense>
  );
}
