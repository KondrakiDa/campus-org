'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

export default function JoinOrgForm({ code }) {
  const router = useRouter();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      // 数据库函数负责：校验码、扣次数、把你加进 org_members
      const { data, error: rpcError } = await supabase.rpc('redeem_org_invite', {
        p_code: code,
      });

      if (rpcError) {
        setError(translateError(rpcError));
        return;
      }

      router.push(`/org/${data.org_id}`);
      router.refresh();
    } catch (err) {
      setError(err.message || '加入失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleJoin}
        disabled={loading}
      >
        {loading ? <span className="spinner" /> : null}
        {loading ? '加入中…' : '确认加入'}
      </button>
    </div>
  );
}
