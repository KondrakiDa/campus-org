import { Suspense } from 'react';

import NewPostContent from '@/components/new-post-content';

export default function NewPostPage() {
  return (
    <Suspense fallback={<div className="container empty-state">正在加载…</div>}>
      <NewPostContent />
    </Suspense>
  );
}
