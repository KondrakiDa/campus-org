'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import ProfileSheet from '@/components/profile-sheet';
import UserAvatar from '@/components/user-avatar';
import {
  PREF_KEYS,
  fileToCompressedDataUrl,
  readPref,
  writePref,
} from '@/lib/prefs';

/** 把主题色写到 <html data-accent="..."> 上，CSS 变量会跟着切换 */
export function applyAccent(accent) {
  document.documentElement.setAttribute('data-accent', accent);
}

export default function ProfileView({ displayName, email }) {
  const fileInputRef = useRef(null);

  const [nickname, setNickname] = useState(displayName || '');
  const [bio, setBio] = useState('');
  const [accent, setAccent] = useState('blue');

  // 抽屉里的草稿：点取消能还原，不会污染已保存的值
  const [draft, setDraft] = useState({ nickname: '', bio: '', accent: 'blue' });
  const [open, setOpen] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);

  // 首屏之后读 localStorage（服务端拿不到）
  useEffect(() => {
    setNickname(readPref(PREF_KEYS.nickname) || displayName || '');
    setBio(readPref(PREF_KEYS.bio));
    setAccent(readPref(PREF_KEYS.accent) || 'blue');
  }, [displayName]);

  function openSheet() {
    setDraft({ nickname, bio, accent });
    setError('');
    setNotice('');
    setOpen(true);
  }

  function closeSheet() {
    // 取消时把预览恢复成已保存的主题色
    applyAccent(accent);
    setOpen(false);
  }

  function handleDraftChange(patch) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      // 主题色要立刻可见，所以直接应用
      if (patch.accent) applyAccent(patch.accent);
      return next;
    });
  }

  function handleSave() {
    try {
      const cleanNick = draft.nickname.trim().slice(0, 15);
      const cleanBio = draft.bio.slice(0, 300);

      writePref(PREF_KEYS.nickname, cleanNick);
      writePref(PREF_KEYS.bio, cleanBio);
      writePref(PREF_KEYS.accent, draft.accent);

      setNickname(cleanNick);
      setBio(cleanBio);
      setAccent(draft.accent);
      applyAccent(draft.accent);

      setOpen(false);
      setNotice('已保存');
    } catch (err) {
      setError('保存失败，浏览器的本地存储可能已满');
    }
  }

  async function handlePickAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setNotice('');
    setUploading(true);

    try {
      const dataUrl = await fileToCompressedDataUrl(file, 256);
      writePref(PREF_KEYS.avatar, dataUrl);
      // 通知页面里所有头像组件立即刷新
      window.dispatchEvent(new Event('org:avatar-changed'));
      setNotice('头像已更新');
    } catch (err) {
      setError(err.message || '头像处理失败');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {/* ---------- 大头像 ---------- */}
      <div style={{ textAlign: 'center', padding: '18px 0 8px' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="avatar-trigger"
          aria-label="点击更换头像"
          disabled={uploading}
        >
          <UserAvatar name={nickname} size={104} ring />
          <span className="avatar-badge">
            {uploading ? '…' : '更换'}
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePickAvatar}
          hidden
        />

        <p className="tiny muted" style={{ marginTop: 10 }}>
          点击头像可以换一张
        </p>
      </div>

      {/* ---------- 昵称（只读） ---------- */}
      <div className="card" style={{ marginTop: 18, padding: '16px 18px' }}>
        <div className="between">
          <div style={{ minWidth: 0 }}>
            <p className="tiny muted">昵称</p>
            <p style={{ fontSize: 17, fontWeight: 600 }}>{nickname || '未设置'}</p>
          </div>
          <span className="badge">只读</span>
        </div>

        {bio && (
          <>
            <hr className="divider" style={{ margin: '14px 0' }} />
            <p className="tiny muted">简介</p>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
              {bio}
            </p>
          </>
        )}

        {email && (
          <>
            <hr className="divider" style={{ margin: '14px 0' }} />
            <p className="tiny muted">邮箱</p>
            <p className="small muted">{email}</p>
          </>
        )}
      </div>

      {/* ---------- 修改个人信息入口 ---------- */}
      <button
        type="button"
        className="card row-btn"
        onClick={openSheet}
        style={{ width: '100%', textAlign: 'left', marginTop: 12 }}
      >
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 550 }}>
            修改个人信息
          </span>
          <span className="tiny muted">昵称、简介、主题颜色</span>
        </span>
        <span className="chevron" aria-hidden="true">
          ›
        </span>
      </button>

      <div style={{ marginTop: 24 }}>
        <Link href="/" className="btn btn-ghost btn-sm">
          ← 返回
        </Link>
      </div>

      <ProfileSheet
        open={open}
        onClose={closeSheet}
        nickname={draft.nickname}
        bio={draft.bio}
        accent={draft.accent}
        onChange={handleDraftChange}
        onSave={handleSave}
        saving={false}
      />
    </div>
  );
}
