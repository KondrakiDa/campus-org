import Link from 'next/link';

/**
 * 全局 404 页面。
 * 没有它，用户点到一个失效链接会看到 Next.js 默认的英文报错，
 * 显得这个站很业余。
 */
export default function NotFound() {
  return (
    <div
      className="container"
      style={{ maxWidth: 520, paddingTop: 70, textAlign: 'center' }}
    >
      <p
        className="grad"
        style={{ fontSize: 72, fontWeight: 750, margin: 0, lineHeight: 1 }}
      >
        404
      </p>

      <h1 style={{ fontSize: 22, margin: '18px 0 10px' }}>
        这个页面不存在
      </h1>

      <p className="muted small" style={{ marginBottom: 26 }}>
        可能是组织已经被删除，或者链接复制得不完整。
      </p>

      <Link href="/" className="btn btn-primary">
        回到所有组织
      </Link>
    </div>
  );
}
