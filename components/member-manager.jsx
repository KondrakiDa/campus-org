'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { initialOf } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

// 去掉容易看错的 I / O / 0 / 1
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 8) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

export default function MemberManager({ orgId, members, currentUserId }) {
  const router = useRouter();

  const [list, setList] = useState(members || []);
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreateInvite() {
    setError('');
    setNotice('');
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

      const code = randomCode();

      const { error: insertError } = await supabase.from('org_invites').insert({
        code,
        org_id: orgId,
        created_by: user.id,
        max_uses: 1,
      });

      if (insertError) {
        setError(translateError(insertError));
        return;
      }

      setInviteLink(`${window.location.origin}/join?code=${code}`);
    } catch (err) {
      setError(err.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotice('链接已复制，发给对方就行');
    } catch {
      setError('复制失败，请手动选中复制');
    }
  }

  async function handleRemove(userId, name) {
    if (!window.confirm(`把「${name}」移出管理员？对方将失去发布和删除内容的权限。`)) {
      return;
    }

    setError('');

    try {
      const supabase = createClient();

      const { error: rpcError } = await supabase.rpc('remove_org_member', {
        p_org: orgId,
        p_user: userId,
      });

      if (rpcError) {
        setError(translateError(rpcError));
        return;
      }

      setList((prev) => prev.filter((m) => m.user_id !== userId));
      router.refresh();
    } catch (err) {
      setError(err.message || '移除失败');
    }
  }

  return (
    <section>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px' }} className="stack">
        {list.map((member) => {
          const name = member.profiles?.display_name || '未知用户';
          const isSelf = member.user_id === currentUserId;

          return (
            <li
              key={member.user_id}
              className="row"
              style={{
                justifyContent: 'space-between',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            >
              <div className="row" style={{ gap: 10 }}>
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {initialOf(name)}
                </span>

                <span className="small">{name}</span>

                {member.role === 'owner' && (
                  <span className="badge badge-brand">创建者</span>
                )}
                {isSelf && <span className="badge">你</span>}
              </div>

              {!isSelf && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemove(member.user_id, name)}
                >
                  移除
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {inviteLink ? (
        <div className="alert alert-success">
          <p style={{ marginBottom: 8 }}>把下面这条链接发给对方：</p>
          <code
            style={{
              display: 'block',
              padding: '8px 10px',
              background: 'var(--bg-soft)',
              borderRadius: 8,
              fontSize: 12,
              overflowWrap: 'anywhere',
              marginBottom: 10,
            }}
          >
            {inviteLink}
          </code>
          <button type="button" className="btn btn-soft btn-sm" onClick={handleCopy}>
            复制链接
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateInvite}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? '生成中…' : '生成邀请链接'}
          </button>

          <p className="tiny muted" style={{ marginTop: 10 }}>
            对方打开链接并确认后，就会成为这个组织的管理员，可以发动态、改资料。
            每条链接只能用一次。
          </p>
        </div>
      )}
    </section>
  );
}
