-- =====================================================================
--  增量迁移 003：限流 + 举报 + 封禁
--
--  用法：Supabase SQL Editor → New Query → 整段粘贴 → Run
--  可重复执行。
--
--  设计原则：所有规则写在数据库里。前端只是显示错误信息，
--  即使有人绕过界面直接调 API，这些检查依然生效。
-- =====================================================================

-- =====================================================================
--  1. 封禁字段
-- =====================================================================
alter table public.profiles
  add column if not exists is_banned boolean not null default false;

alter table public.profiles
  add column if not exists banned_reason text;

alter table public.profiles
  add column if not exists banned_at timestamptz;

create or replace function public.is_banned(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_banned from public.profiles where id = p_user),
    false
  );
$$;

-- =====================================================================
--  2. 限流触发器
--     每个函数先查封禁，再查频率，都没问题才放行插入
-- =====================================================================

-- ---------- 发动态：10 分钟 3 条 ----------
create or replace function public.check_rate_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if public.is_banned(auth.uid()) then
    raise exception '这个账号已被限制，暂时不能发布内容';
  end if;

  select count(*) into v_count
  from public.posts
  where created_by = auth.uid()
    and created_at > now() - interval '10 minutes';

  if v_count >= 3 then
    raise exception '发得太频繁了，10 分钟内最多 3 条动态';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.check_rate_posts();

-- ---------- 发评论：10 分钟 10 条 ----------
create or replace function public.check_rate_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if public.is_banned(auth.uid()) then
    raise exception '这个账号已被限制，暂时不能发表评论';
  end if;

  select count(*) into v_count
  from public.comments
  where author_id = auth.uid()
    and created_at > now() - interval '10 minutes';

  if v_count >= 10 then
    raise exception '评论太快了，10 分钟内最多 10 条';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.check_rate_comments();

-- ---------- 建组织：每天 3 个 ----------
create or replace function public.check_rate_orgs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if public.is_banned(auth.uid()) then
    raise exception '这个账号已被限制，暂时不能创建组织';
  end if;

  select count(*) into v_count
  from public.orgs
  where created_by = auth.uid()
    and created_at > now() - interval '1 day';

  if v_count >= 3 then
    raise exception '今天创建的组织有点多，明天再来吧（每人每天最多 3 个）';
  end if;

  return new;
end;
$$;

drop trigger if exists orgs_rate_limit on public.orgs;
create trigger orgs_rate_limit
  before insert on public.orgs
  for each row execute function public.check_rate_orgs();

-- ---------- 生成全站邀请码：每天 5 个 ----------
create or replace function public.check_rate_invite_codes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if public.is_banned(auth.uid()) then
    raise exception '这个账号已被限制，暂时不能生成邀请码';
  end if;

  select count(*) into v_count
  from public.invite_codes
  where created_by = auth.uid()
    and created_at > now() - interval '1 day';

  if v_count >= 5 then
    raise exception '今天生成的全站邀请码到上限了（每天 5 个）';
  end if;

  return new;
end;
$$;

drop trigger if exists invite_codes_rate_limit on public.invite_codes;
create trigger invite_codes_rate_limit
  before insert on public.invite_codes
  for each row execute function public.check_rate_invite_codes();

-- =====================================================================
--  3. 举报
-- =====================================================================
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  -- post / comment / org
  target_type text not null check (target_type in ('post', 'comment', 'org')),
  target_id   uuid not null,
  reason      text not null check (char_length(trim(reason)) between 2 and 200),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  -- pending / resolved / dismissed
  status      text not null default 'pending'
                check (status in ('pending', 'resolved', 'dismissed')),
  handled_by  uuid references public.profiles(id),
  handled_at  timestamptz,
  created_at  timestamptz not null default now(),
  -- 同一个人对同一条内容只能举报一次，避免刷举报
  unique (target_type, target_id, reporter_id)
);

create index if not exists reports_status_idx
  on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- 谁都能举报，但必须是自己发起的
drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self" on public.reports
  for insert with check (reporter_id = auth.uid());

-- 举报人能看见自己报的
drop policy if exists "reports_read_self" on public.reports;
create policy "reports_read_self" on public.reports
  for select using (reporter_id = auth.uid());

-- 管理员能看全部
drop policy if exists "reports_read_admin" on public.reports;
create policy "reports_read_admin" on public.reports
  for select using (public.is_admin(auth.uid()));

-- =====================================================================
--  4. 管理员处理举报（标记完成 / 驳回）
-- =====================================================================
create or replace function public.resolve_report(
  p_report uuid,
  p_action text,        -- 'resolved' 或 'dismissed'
  p_delete_target boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception '只有管理员能处理举报';
  end if;

  if p_action not in ('resolved', 'dismissed') then
    raise exception '处理结果只能是 resolved 或 dismissed';
  end if;

  select * into v_report from public.reports where id = p_report for update;
  if not found then
    raise exception '举报不存在';
  end if;

  -- 如果要求连内容一起删
  if p_delete_target then
    if v_report.target_type = 'post' then
      delete from public.posts where id = v_report.target_id;
    elsif v_report.target_type = 'comment' then
      delete from public.comments where id = v_report.target_id;
    elsif v_report.target_type = 'org' then
      delete from public.orgs where id = v_report.target_id;
    end if;
  end if;

  update public.reports
     set status = p_action,
         handled_by = auth.uid(),
         handled_at = now()
   where id = p_report;

  return jsonb_build_object('ok', true);
end;
$$;

-- =====================================================================
--  5. 封禁 / 解封用户
-- =====================================================================
create or replace function public.ban_user(p_user uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception '只有管理员能封禁用户';
  end if;

  if p_user = auth.uid() then
    raise exception '不能封禁自己';
  end if;

  update public.profiles
     set is_banned = true,
         banned_reason = p_reason,
         banned_at = now()
   where id = p_user;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.unban_user(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception '只有管理员能解除封禁';
  end if;

  update public.profiles
     set is_banned = false,
         banned_reason = null,
         banned_at = null
   where id = p_user;

  return jsonb_build_object('ok', true);
end;
$$;

-- =====================================================================
--  6. 查询：某条内容被举报了几次（做「3 次自动隐藏」用）
-- =====================================================================
create or replace function public.report_count(p_type text, p_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.reports
  where target_type = p_type and target_id = p_id and status = 'pending';
$$;
