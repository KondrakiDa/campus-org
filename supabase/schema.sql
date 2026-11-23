-- =====================================================================
--  校园组织平台 · 数据库结构
--  用法：Supabase 控制台 → SQL Editor → 新建查询 → 整段粘贴 → Run
--  这个脚本可以重复执行（用了 if not exists / or replace / drop policy if exists）
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
--  1. profiles —— 用户资料，扩展 auth.users
-- =====================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '新同学',
  school       text,
  -- 全局管理员：能建组织、能发邀请码。第一个管理员由你在 SQL 里手动打开。
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- 注册时自动建一条 profile（否则用户没有资料行）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  2. orgs —— 学生组织
-- =====================================================================
create table if not exists public.orgs (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null default encode(gen_random_bytes(6), 'hex'),
  name       text not null check (char_length(trim(name)) between 1 and 60),
  school     text not null check (char_length(trim(school)) between 1 and 60),
  intro      text not null default '',
  logo_url   text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists orgs_school_idx on public.orgs (school);

-- 建组织时，自动把创建者登记为该组织的管理员
create or replace function public.add_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_members (org_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

-- =====================================================================
--  3. org_members —— 谁能管理哪个组织（一个组织可多人共管）
-- =====================================================================
create table if not exists public.org_members (
  org_id     uuid not null references public.orgs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists org_members_user_idx on public.org_members (user_id);

drop trigger if exists org_creator_member on public.orgs;
create trigger org_creator_member
  after insert on public.orgs
  for each row execute function public.add_creator_as_member();

-- =====================================================================
--  4. posts —— 组织的推文
-- =====================================================================
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs(id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 120),
  body       text not null default '' check (char_length(body) <= 5000),
  -- 图片存在 Supabase Storage，这里只存公开 URL
  images     text[] not null default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_org_created_idx
  on public.posts (org_id, created_at desc);

-- =====================================================================
--  5. comments —— 评论区
--     post_id 为空 = 评论整个组织；有值 = 评论某条推文
-- =====================================================================
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 1000),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists comments_org_idx  on public.comments (org_id, created_at desc);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- =====================================================================
--  6. invite_codes —— 邀请码：用它把自己升级成管理员
-- =====================================================================
create table if not exists public.invite_codes (
  code       text primary key,
  created_by uuid not null references public.profiles(id) on delete cascade,
  note       text,
  max_uses   int  not null default 1 check (max_uses > 0),
  used_count int  not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================
--  7. 辅助函数（判断身份，供 RLS 复用）
-- =====================================================================
create or replace function public.is_admin(p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = p_user), false);
$$;

create or replace function public.is_org_member(p_org uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and user_id = p_user
  );
$$;

-- =====================================================================
--  8. 用邀请码兑换管理员身份
--     security definer：以数据库所有者身份执行，才能读别人的码、改自己的 is_admin
-- =====================================================================
create or replace function public.redeem_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.invite_codes%rowtype;
begin
  if auth.uid() is null then
    raise exception '请先登录后再使用邀请码';
  end if;

  select * into v_code
  from public.invite_codes
  where code = trim(upper(p_code))
  for update;                        -- 加锁，防止两个人同时用最后一个名额

  if not found then
    raise exception '邀请码不存在';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception '这个邀请码已经过期了';
  end if;

  if v_code.used_count >= v_code.max_uses then
    raise exception '这个邀请码已经被用完了';
  end if;

  update public.invite_codes
     set used_count = used_count + 1
   where code = v_code.code;

  update public.profiles
     set is_admin = true
   where id = auth.uid();

  return jsonb_build_object('ok', true, 'message', '你现在是管理员了');
end;
$$;

-- =====================================================================
--  9. 行级安全（RLS）—— 权限的真正防线
--     即使有人绕过前端直接调 API，数据库这一层也会拒绝
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.orgs         enable row level security;
alter table public.org_members  enable row level security;
alter table public.posts        enable row level security;
alter table public.comments     enable row level security;
alter table public.invite_codes enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 关键：用户只能改名字和学校，不能自己把 is_admin 改成 true。
-- 列级权限比 RLS 更细，能精确挡住这一列。
revoke update on public.profiles from anon, authenticated;
grant  update (display_name, school) on public.profiles to authenticated;

-- ---------- orgs ----------
drop policy if exists "orgs_read_all" on public.orgs;
create policy "orgs_read_all" on public.orgs
  for select using (true);

drop policy if exists "orgs_insert_admin_only" on public.orgs;
create policy "orgs_insert_admin_only" on public.orgs
  for insert with check (
    auth.uid() = created_by
    and public.is_admin(auth.uid())
  );

drop policy if exists "orgs_update_members" on public.orgs;
create policy "orgs_update_members" on public.orgs
  for update using (public.is_org_member(id, auth.uid()))
  with check (public.is_org_member(id, auth.uid()));

drop policy if exists "orgs_delete_owner" on public.orgs;
create policy "orgs_delete_owner" on public.orgs
  for delete using (
    exists (
      select 1 from public.org_members m
      where m.org_id = id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- ---------- org_members ----------
drop policy if exists "members_read_all" on public.org_members;
create policy "members_read_all" on public.org_members
  for select using (true);

drop policy if exists "members_insert_by_member" on public.org_members;
create policy "members_insert_by_member" on public.org_members
  for insert with check (public.is_org_member(org_id, auth.uid()));

drop policy if exists "members_delete_by_member" on public.org_members;
create policy "members_delete_by_member" on public.org_members
  for delete using (
    public.is_org_member(org_id, auth.uid())
    and user_id <> auth.uid()               -- 不能把自己踢出去，避免组织没人管
  );

-- ---------- posts ----------
drop policy if exists "posts_read_all" on public.posts;
create policy "posts_read_all" on public.posts
  for select using (true);

drop policy if exists "posts_insert_org_member" on public.posts;
create policy "posts_insert_org_member" on public.posts
  for insert with check (
    public.is_org_member(org_id, auth.uid())
    and created_by = auth.uid()
  );

drop policy if exists "posts_update_org_member" on public.posts;
create policy "posts_update_org_member" on public.posts
  for update using (public.is_org_member(org_id, auth.uid()));

drop policy if exists "posts_delete_org_member" on public.posts;
create policy "posts_delete_org_member" on public.posts
  for delete using (public.is_org_member(org_id, auth.uid()));

-- ---------- comments ----------
drop policy if exists "comments_read_all" on public.comments;
create policy "comments_read_all" on public.comments
  for select using (true);

-- 游客能看，但必须登录才能写
drop policy if exists "comments_insert_logged_in" on public.comments;
create policy "comments_insert_logged_in" on public.comments
  for insert with check (auth.uid() = author_id);

drop policy if exists "comments_delete_author_or_admin" on public.comments;
create policy "comments_delete_author_or_admin" on public.comments
  for delete using (
    auth.uid() = author_id
    or public.is_org_member(org_id, auth.uid())
  );

-- ---------- invite_codes ----------
-- 只能看到自己发的码，别人的码看不见，防止被翻出来盗用
drop policy if exists "invites_read_own" on public.invite_codes;
create policy "invites_read_own" on public.invite_codes
  for select using (created_by = auth.uid());

drop policy if exists "invites_insert_admin" on public.invite_codes;
create policy "invites_insert_admin" on public.invite_codes
  for insert with check (
    created_by = auth.uid()
    and public.is_admin(auth.uid())
  );

-- =====================================================================
--  10. Storage —— 组织图片
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('org-media', 'org-media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'org-media');

-- 上传路径必须是 {org_id}/文件名，且你必须是该组织的管理员
drop policy if exists "media_upload_by_org_member" on storage.objects;
create policy "media_upload_by_org_member" on storage.objects
  for insert with check (
    bucket_id = 'org-media'
    and exists (
      select 1 from public.org_members m
      where m.user_id = auth.uid()
        and m.org_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "media_delete_by_org_member" on storage.objects;
create policy "media_delete_by_org_member" on storage.objects
  for delete using (
    bucket_id = 'org-media'
    and exists (
      select 1 from public.org_members m
      where m.user_id = auth.uid()
        and m.org_id::text = (storage.foldername(name))[1]
    )
  );

-- =====================================================================
--  11. 把你自己的账号变成第一个管理员
--     先注册一个账号，再执行下面这句（把邮箱换成你的）
-- =====================================================================
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = '你的邮箱@example.com');
