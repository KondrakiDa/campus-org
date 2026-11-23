-- =====================================================================
--  增量迁移：组织级邀请码（让别人一起管理你的组织）
--
--  用法：Supabase SQL Editor → 新建查询 → 粘贴 → Run
--  可以重复执行。
--
--  背景：schema.sql 里的 invite_codes 是「全站管理员」的码，
--  这张新表是「某个组织」的码，两者不同：
--    · 全站管理员码 → 能建组织
--    · 组织邀请码   → 能管某一个组织
-- =====================================================================

create table if not exists public.org_invites (
  code       text primary key,
  org_id     uuid not null references public.orgs(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  note       text,
  max_uses   int  not null default 1 check (max_uses > 0),
  used_count int  not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_invites_org_idx
  on public.org_invites (org_id, created_at desc);

alter table public.org_invites enable row level security;

-- 只有该组织的成员能看见自己组织的码
drop policy if exists "org_invites_read_members" on public.org_invites;
create policy "org_invites_read_members" on public.org_invites
  for select using (public.is_org_member(org_id, auth.uid()));

-- 只有该组织的成员能生成码
drop policy if exists "org_invites_insert_members" on public.org_invites;
create policy "org_invites_insert_members" on public.org_invites
  for insert with check (
    public.is_org_member(org_id, auth.uid())
    and created_by = auth.uid()
  );

-- 兑换之后可以作废
drop policy if exists "org_invites_delete_members" on public.org_invites;
create policy "org_invites_delete_members" on public.org_invites
  for delete using (public.is_org_member(org_id, auth.uid()));

-- =====================================================================
--  兑换组织邀请码：把自己加进该组织的管理员名单
--  security definer：兑换者此时还不是成员，走 RLS 会被 org_members 的策略挡住
-- =====================================================================
create or replace function public.redeem_org_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.org_invites%rowtype;
  v_org_name text;
begin
  if auth.uid() is null then
    raise exception '请先登录';
  end if;

  select * into v_code
  from public.org_invites
  where code = trim(upper(p_code))
  for update;

  if not found then
    raise exception '邀请码不存在';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception '邀请码已过期';
  end if;

  if v_code.used_count >= v_code.max_uses then
    raise exception '邀请码已用完';
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (v_code.org_id, auth.uid(), 'admin')
  on conflict (org_id, user_id) do nothing;

  update public.org_invites
     set used_count = used_count + 1
   where code = v_code.code;

  select name into v_org_name from public.orgs where id = v_code.org_id;

  return jsonb_build_object(
    'ok', true,
    'org_id', v_code.org_id,
    'org_name', v_org_name
  );
end;
$$;

-- =====================================================================
--  把某个成员移出组织（只能移除别人，不能移除自己）
-- =====================================================================
create or replace function public.remove_org_member(p_org uuid, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '请先登录';
  end if;

  if p_user = auth.uid() then
    raise exception '不能把自己移出组织';
  end if;

  if not public.is_org_member(p_org, auth.uid()) then
    raise exception '你不是这个组织的管理员';
  end if;

  delete from public.org_members
   where org_id = p_org and user_id = p_user;

  return jsonb_build_object('ok', true);
end;
$$;
