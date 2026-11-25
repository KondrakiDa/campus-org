'use client';

import { useEffect, useState } from 'react';

import { PREF_KEYS, readPref } from '@/lib/prefs';

/**
 * 圆头像。
 *
 * 头像存在 localStorage 里，服务端渲染时读不到，
 * 所以首屏先显示昵称首字，挂载后再换成图片（会有极短的一下切换）。
 *
 * 同一个页面里可能有多个头像（导航栏、个人页），
 * 改头像时派发一个自定义事件，让它们一起更新。
 */
export default function UserAvatar({ name, size = 32, ring = false }) {
  const [src, setSrc] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setSrc(readPref(PREF_KEYS.avatar));
    sync();
    setMounted(true);

    window.addEventListener('org:avatar-changed', sync);
    return () => window.removeEventListener('org:avatar-changed', sync);
  }, []);

  const initial = (name || '匿').trim().charAt(0).toUpperCase() || '匿';

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    flex: '0 0 auto',
    objectFit: 'cover',
    display: 'block',
  };

  if (mounted && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="头像"
        style={{
          ...baseStyle,
          border: ring ? '2px solid var(--border-strong)' : '1px solid var(--border)',
        }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        ...baseStyle,
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
        color: '#fff',
        fontSize: size * 0.42,
        fontWeight: 600,
        border: ring ? '2px solid var(--border-strong)' : '1px solid var(--border)',
        userSelect: 'none',
      }}
    >
      {initial}
    </span>
  );
}
