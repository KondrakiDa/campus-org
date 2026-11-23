'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

const MAX_LOGO_MB = 2;

export default function EditOrgForm({ org }) {
  const router = useRouter();

  const [name, setName] = useState(org.name || '');
  const [school, setSchool] = useState(org.school || '');
  const [intro, setIntro] = useState(org.intro || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(org.logo_url || '');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('头像必须是图片文件');
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setError(`头像不能超过 ${MAX_LOGO_MB}MB`);
      return;
    }

    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const supabase = createClient();
      let logoUrl = org.logo_url || null;

      // ---------- 有新头像就先传 ----------
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() || 'jpg';
        // 路径必须以 orgId 开头，Storage 的 RLS 靠它判断你是不是这个组织的管理员
        const path = `${org.id}/logo-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('org-media')
          .upload(path, logoFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          setError(`头像上传失败：${translateError(uploadError)}`);
          return;
        }

        const { data: publicUrl } = supabase.storage
          .from('org-media')
          .getPublicUrl(path);

        logoUrl = publicUrl.publicUrl;
      }

      // ---------- 更新组织 ----------
      const { error: updateError } = await supabase
        .from('orgs')
        .update({
          name: name.trim(),
          school: school.trim(),
          intro: intro.trim(),
          logo_url: logoUrl,
        })
        .eq('id', org.id);

      if (updateError) {
        setError(translateError(updateError));
        return;
      }

      setNotice('已保存');
      setLogoFile(null);
      router.refresh();
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {/* ---------- 头像 ---------- */}
      <div className="field">
        <label className="label">组织头像</label>

        <div className="row" style={{ gap: 14 }}>
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreview}
              alt=""
              width={64}
              height={64}
              style={{
                borderRadius: 14,
                objectFit: 'cover',
                border: '1px solid var(--border)',
              }}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 64,
                height: 64,
                borderRadius: 14,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                fontSize: 24,
              }}
            >
              🏫
            </div>
          )}

          <div style={{ flex: 1, minWidth: 160 }}>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
            />
            <span className="hint">建议正方形，{MAX_LOGO_MB}MB 以内</span>
          </div>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="orgName">
          组织名称 <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          id="orgName"
          className="input"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="orgSchool">
          所属学校 <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          id="orgSchool"
          className="input"
          required
          maxLength={60}
          value={school}
          onChange={(e) => setSchool(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="orgIntro">
          组织简介
        </label>
        <textarea
          id="orgIntro"
          className="textarea"
          rows={5}
          maxLength={500}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
        />
        <span className="hint">{intro.length}/500</span>
      </div>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : null}
        {loading ? '保存中…' : '保存修改'}
      </button>
    </form>
  );
}
