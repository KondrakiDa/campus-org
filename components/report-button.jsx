'use client';

import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

const REASONS = [
  '垃圾广告或刷屏',
  '辱骂、攻击他人',
  '违法违规内容',
  '与平台无关的引流',
  '其他问题',
];

/**
 * 举报按钮。
 *
 * 同一份组件用在动态和评论上，靠 targetType 区分。
 * 数据库里有唯一约束：同一个人对同一条内容只能举报一次，
 * 重复提交会被拒绝。
 */
export default function ReportButton({ targetType, targetId, loggedIn }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!loggedIn) return null;

  async function handleSubmit() {
    setError('');
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

      const finalReason =
        reason === '其他问题' ? customReason.trim() : reason;

      if (finalReason.length < 2) {
        setError('请写一句原因');
        return;
      }

      const { error: insertError } = await supabase.from('reports').insert({
        target_type: targetType,
        target_id: targetId,
        reason: finalReason.slice(0, 200),
        reporter_id: user.id,
      });

      if (insertError) {
        // 唯一约束冲突说明已经举报过
        if (insertError.code === '23505') {
          setError('你已经举报过这条内容了');
        } else {
          setError(translateError(insertError));
        }
        return;
      }

      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err.message || '举报失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="link-quiet"
        onClick={() => {
          setOpen(true);
          setDone(false);
        }}
        title="举报这条内容"
      >
        {done ? '已举报' : '举报'}
      </button>

      {open && (
        <div className="dialog-mask" onClick={() => setOpen(false)}>
          <div
            className="dialog-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="举报内容"
          >
            <h3 style={{ fontSize: 17, marginBottom: 4 }}>举报这条内容</h3>
            <p className="tiny muted" style={{ marginBottom: 16 }}>
              举报会进入管理员队列，处理前对方不会被通知
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="stack" style={{ gap: 8 }}>
              {REASONS.map((item) => (
                <label key={item} className="radio-row">
                  <input
                    type="radio"
                    name={`reason-${targetId}`}
                    checked={reason === item}
                    onChange={() => setReason(item)}
                  />
                  <span className="small">{item}</span>
                </label>
              ))}
            </div>

            {reason === '其他问题' && (
              <input
                className="input"
                style={{ marginTop: 10 }}
                maxLength={100}
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                placeholder="具体是什么问题？"
              />
            )}

            <div className="sheet-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? '提交中…' : '提交举报'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
