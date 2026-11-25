'use client';

import { useEffect } from 'react';

export const ACCENTS = [
  { id: 'black', color: '#111827', name: '黑色' },
  { id: 'white', color: '#f9fafb', name: '白色' },
  { id: 'red', color: '#ef4444', name: '红色' },
  { id: 'blue', color: '#3b82f6', name: '蓝色' },
  { id: 'green', color: '#22c55e', name: '绿色' },
];

const NICK_MAX = 15;
const BIO_MAX = 300;

/**
 * 底部上滑面板，占屏幕 4/5 高。
 */
export default function ProfileSheet({
  open,
  onClose,
  nickname,
  bio,
  accent,
  onChange,
  onSave,
  saving,
}) {
  // 面板打开时锁住背景滚动，否则在手机上会连带滚动页面
  useEffect(() => {
    if (!open) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  return (
    <div className={`sheet-root${open ? ' is-open' : ''}`} aria-hidden={!open}>
      {/* 遮罩：点它关闭 */}
      <button
        type="button"
        className="sheet-mask"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="关闭"
      />

      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="修改个人信息"
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-body">
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>修改个人信息</h2>
          <p className="tiny muted" style={{ marginBottom: 20 }}>
            这些内容只保存在这台设备的浏览器里
          </p>

          {/* ---------- 昵称 ---------- */}
          <div className="field">
            <label className="label" htmlFor="sheetNick">
              昵称
            </label>
            <input
              id="sheetNick"
              className="input"
              value={nickname}
              maxLength={NICK_MAX}
              onChange={(event) => onChange({ nickname: event.target.value })}
              placeholder="你的昵称"
            />
            <span className="hint" style={{ textAlign: 'right' }}>
              {nickname.length}/{NICK_MAX}
            </span>
          </div>

          {/* ---------- 简介 ---------- */}
          <div className="field">
            <label className="label" htmlFor="sheetBio">
              简介
            </label>
            <textarea
              id="sheetBio"
              className="textarea"
              rows={3}
              value={bio}
              maxLength={BIO_MAX}
              onChange={(event) => onChange({ bio: event.target.value })}
              placeholder="添加简介，字数上限为三百字"
              style={{ '--placeholder-opacity': 0.6 }}
            />
            <span
              className="hint"
              style={{
                textAlign: 'right',
                color: bio.length >= BIO_MAX ? 'var(--danger)' : undefined,
              }}
            >
              {bio.length >= BIO_MAX
                ? `已达上限 ${BIO_MAX} 字，无法继续输入`
                : `${bio.length}/${BIO_MAX}`}
            </span>
          </div>

          {/* ---------- 主题色 ---------- */}
          <div className="field">
            <span className="label">主题颜色</span>
            <div className="accent-row">
              {ACCENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`accent-dot${accent === item.id ? ' is-active' : ''}`}
                  style={{ background: item.color }}
                  onClick={() => onChange({ accent: item.id })}
                  aria-label={item.name}
                  aria-pressed={accent === item.id}
                  title={item.name}
                />
              ))}
            </div>
          </div>

          <div className="sheet-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
