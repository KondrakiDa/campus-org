'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { translateError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/client';

export default function CreateOrgForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [intro, setIntro] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      // 这里不需要手动判断「是不是管理员」——
      // 数据库的 RLS 规则会拒绝非管理员的插入，那段判断在 schema.sql 里
      const { data, error: insertError } = await supabase
        .from('orgs')
        .insert({
          name: name.trim(),
          school: school.trim(),
          intro: intro.trim(),
          created_by: user.id,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(translateError(insertError));
        return;
      }

      router.push(`/org/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label className="label" htmlFor="name">
          组织名称 <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          id="name"
          className="input"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="比如：光影摄影社"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="school">
          所属学校 <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          id="school"
          className="input"
          required
          maxLength={60}
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="比如：浙江大学"
        />
        <span className="hint">填写全称，别人搜「浙大」不一定搜得到。</span>
      </div>

      <div className="field">
        <label className="label" htmlFor="intro">
          组织简介
        </label>
        <textarea
          id="intro"
          className="textarea"
          rows={4}
          maxLength={500}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="你们是谁、做什么、怎么加入…"
        />
      </div>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : null}
        {loading ? '创建中…' : '创建组织'}
      </button>
    </form>
  );
}
