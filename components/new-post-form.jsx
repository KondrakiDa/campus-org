'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

const MAX_FILE_MB = 5;
const MAX_IMAGES = 4;

export default function NewPostForm({ orgId }) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFiles(event) {
    const picked = Array.from(event.target.files || []);

    for (const file of picked) {
      if (!file.type.startsWith('image/')) {
        setError('只能上传图片文件');
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`单张图片不能超过 ${MAX_FILE_MB}MB`);
        return;
      }
    }

    if (files.length + picked.length > MAX_IMAGES) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }

    setError('');
    setFiles((prev) => [...prev, ...picked]);
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
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

      // ---------- 1. 先传图片 ----------
      const urls = [];

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        setProgress(`上传图片 ${i + 1}/${files.length}…`);

        // 路径必须以 orgId 开头：Storage 的 RLS 靠这个判断你是不是该组织的管理员
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${orgId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('org-media')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          setError(`图片上传失败：${translateError(uploadError)}`);
          return;
        }

        const { data: publicUrl } = supabase.storage
          .from('org-media')
          .getPublicUrl(path);

        urls.push(publicUrl.publicUrl);
      }

      // ---------- 2. 再写帖子 ----------
      setProgress('保存中…');

      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({
          org_id: orgId,
          title: title.trim(),
          body: body.trim(),
          images: urls,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(translateError(insertError));
        return;
      }

      router.push(`/org/${orgId}`);
      router.refresh();
      return data;
    } catch (err) {
      setError(err.message || '发布失败');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label className="label" htmlFor="title">
          标题 <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          id="title"
          className="input"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="比如：本周六的校园写生，欢迎来"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="body">
          正文
        </label>
        <textarea
          id="body"
          className="textarea"
          rows={6}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="想说点什么…"
        />
        <span className="hint">{body.length}/5000</span>
      </div>

      <div className="field">
        <label className="label" htmlFor="images">
          图片（最多 {MAX_IMAGES} 张，单张 {MAX_FILE_MB}MB 内）
        </label>
        <input
          id="images"
          className="input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
        />

        {files.length > 0 && (
          <div className="row" style={{ marginTop: 8 }}>
            {files.map((file, index) => (
              <span key={`${file.name}-${index}`} className="badge">
                {file.name}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  style={{
                    border: 0,
                    background: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: 2,
                  }}
                  aria-label={`移除 ${file.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : null}
        {loading ? progress || '处理中…' : '发布动态'}
      </button>
    </form>
  );
}
