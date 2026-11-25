import { Suspense } from 'react';

import HomeContent from '@/components/home-content';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="container empty-state">正在加载…</div>}>
      <HomeContent />
    </Suspense>
  );
}
