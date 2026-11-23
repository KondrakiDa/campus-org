'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() || undefined },
        },
      });

      if (signUpError) {
        setError(translateError(signUpError));
        return;
      }

      // 如果项目开着「邮箱确认」，注册后不会立刻有 session
      if (data?.user && !data.session) {
        setNotice('注册成功！请去邮箱点确认链接，然后再回来登录。');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 30 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>注册</h1>
      <p className="muted small" style={{ marginBottom: 24 }}>
        任何人都可以注册。想成为管理员需要邀请码。
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="name">
            昵称
          </label>
          <input
            id="name"
            className="input"
            type="text"
            maxLength={20}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="别人会看到这个名字"
          />
        </div>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? '注册中…' : '注册'}
        </button>
      </form>

      <p className="small muted" style={{ marginTop: 20, textAlign: 'center' }}>
        已有账号？{' '}
        <Link href="/login" style={{ color: 'var(--brand)' }}>
          直接登录
        </Link>
      </p>
    </div>
  );
}
