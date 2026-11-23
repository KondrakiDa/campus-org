'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(translateError(signInError));
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 30 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>登录</h1>
      <p className="muted small" style={{ marginBottom: 24 }}>
        登录后才能在组织评论区发言。
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="email">
            邮箱
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            密码
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? '登录中…' : '登录'}
        </button>
      </form>

      <p className="small muted" style={{ marginTop: 20, textAlign: 'center' }}>
        还没有账号？{' '}
        <Link href="/signup" style={{ color: 'var(--brand)' }}>
          注册一个
        </Link>
      </p>
    </div>
  );
}
