'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

export default function RedeemInviteForm() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    const clean = code.trim().toUpperCase();

    if (!clean) {
      setError('请输入邀请码');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // 调用数据库函数：它负责校验、扣减次数、把你的 is_admin 打开
      const { data, error: rpcError } = await supabase.rpc('redeem_invite', {
        p_code: clean,
      });

      if (rpcError) {
        setError(translateError(rpcError));
        return;
      }

      setNotice(data?.message || '兑换成功，你现在是管理员了');
      setCode('');
      router.refresh();
    } catch (err) {
      setError(err.message || '兑换失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && (
        <div className="alert alert-success">
          {notice} —— 刷新一下页面，导航栏会多出「创建组织」和「邀请码」。
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="code">
          邀请码
        </label>
        <input
          id="code"
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="粘贴管理员给你的码"
          style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
        />
      </div>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : null}
        {loading ? '兑换中…' : '兑换'}
      </button>
    </form>
  );
}
