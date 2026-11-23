'use client';

import Link from 'next/link';

/**
 * 全局错误边界。
 * 生产环境下 Next 默认只显示一句 "Application error"，
 * 用户会以为网站坏了并且没有任何出路。这里给他一条路。
 */
export default function GlobalError({ error, reset }) {
  return (
    <div
      className="container"
      style={{ maxWidth: 520, paddingTop: 70, textAlign: 'center' }}
    >
      <p style={{ fontSize: 60, margin: 0, lineHeight: 1 }}>⚠️</p>

      <h1 style={{ fontSize: 22, margin: '18px 0 10px' }}>
        页面出了点问题
      </h1>

      <p className="muted small" style={{ marginBottom: 26 }}>
        可能是网络抖动，也可能是数据库暂时连不上。刷新一下通常就好。
      </p>

      <div
        className="row"
        style={{ justifyContent: 'center', gap: 10 }}
      >
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          重试
        </button>
        <Link href="/" className="btn btn-ghost">
          回到首页
        </Link>
      </div>

      {process.env.NODE_ENV === 'development' && error?.message && (
        <pre
          className="tiny muted"
          style={{
            marginTop: 28,
            padding: 14,
            textAlign: 'left',
            background: 'var(--surface-2)',
            borderRadius: 10,
            overflow: 'auto',
            border: '1px solid var(--border)',
          }}
        >
          {error.message}
        </pre>
      )}
    </div>
  );
}
