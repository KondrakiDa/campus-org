'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

// 去掉了容易看错的 I / O / 0 / 1，方便手抄和念给别人
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 8) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

export default function GenerateInvite({ initialInvites }) {
  const router = useRouter();

  const [invites, setInvites] = useState(initialInvites || []);
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setCreated(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('登录状态过期了，请重新登录');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('invite_codes')
        .insert({
          code: randomCode(),
          created_by: user.id,
          note: note.trim() || null,
          max_uses: Number(maxUses) || 1,
        })
        .select('*')
        .single();

      if (insertError) {
        setError(translateError(insertError));
        return;
      }

      setInvites((prev) => [data, ...prev]);
      setCreated(data.code);
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCreated(code);
    } catch {
      setError('复制失败，请手动选中复制');
    }
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}

      {created && (
        <div className="alert alert-success">
          已生成：<strong style={{ letterSpacing: '0.12em' }}>{created}</strong>
          <br />
          <span className="tiny">
            把这个码给对方，对方在「兑换邀请码」页面输入后就成了管理员。
          </span>
        </div>
      )}

      <form onSubmit={handleCreate} className="card" style={{ marginBottom: 24 }}>
        <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
          <div className="field" style={{ marginBottom: 0, flex: '0 0 140px' }}>
            <label className="label" htmlFor="maxUses">
              可用次数
            </label>
            <input
              id="maxUses"
              className="input"
              type="number"
              min={1}
              max={50}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <label className="label" htmlFor="note">
              备注（只给你自己看）
            </label>
            <input
              id="note"
              className="input"
              maxLength={60}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="比如：给摄影社的小林"
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '生成中…' : '生成邀请码'}
          </button>
        </div>
      </form>

      <h2 style={{ fontSize: 17, marginBottom: 12 }}>我发出的邀请码</h2>

      {invites.length === 0 ? (
        <div className="empty-state">还没有生成过邀请码。</div>
      ) : (
        <div className="stack">
          {invites.map((invite) => {
            const used = invite.used_count ?? 0;
            const max = invite.max_uses ?? 1;
            const exhausted = used >= max;

            return (
              <div key={invite.code} className="card" style={{ padding: '14px 16px' }}>
                <div className="between">
                  <div className="row" style={{ gap: 10 }}>
                    <code
                      style={{
                        fontSize: 15,
                        letterSpacing: '0.12em',
                        fontWeight: 650,
                      }}
                    >
                      {invite.code}
                    </code>

                    <span className={`badge ${exhausted ? 'badge-warn' : 'badge-accent'}`}>
                      {used}/{max} 已用
                    </span>

                    {invite.note && (
                      <span className="tiny muted">{invite.note}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyCode(invite.code)}
                  >
                    复制
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
