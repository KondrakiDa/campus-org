# 组织汇 · 跨校学生组织平台

一个真实可上线的学生组织平台：管理员用邀请码获得身份，创建自己学校的组织，
发布动态和校园照片，所有人可以在组织评论区讨论。

技术栈：**Next.js 15 + Supabase + Tailwind 无关的纯 CSS**，可部署到 Vercel。

---

## 一、它能做什么

| 功能 | 谁可以 | 状态 |
|---|---|---|
| 浏览组织 / 动态 / 图片 | 所有人（包括没登录的） | ✅ |
| 注册账号 | 所有人 | ✅ |
| 在组织评论区发言 | 登录用户 | ✅ |
| 创建组织 | 管理员 | ✅ |
| 发布动态、上传图片 | 该组织的管理员 | ✅ |
| 生成邀请码 | 管理员 | ✅ |
| 兑换邀请码升级为管理员 | 登录用户 | ✅ |
| 删除评论 | 评论作者 / 该组织管理员 | ✅ |

---

## 二、五步跑起来

### 第 1 步 · 建 Supabase 项目

1. 打开 <https://supabase.com>，注册（用 GitHub 或邮箱都行）
2. New project → 起个名字 → 选一个离你近的区域（新加坡 / 东京）
3. 等它初始化完成（约 2 分钟）

### 第 2 步 · 建数据库

1. 左侧菜单 → **SQL Editor** → New query
2. 打开本项目里的 `supabase/schema.sql`，**整段复制粘贴进去**
3. 点 **Run**（或者按 Ctrl+Enter）

看到 `Success. No rows returned` 就是成功了。
这个脚本可以重复执行，改坏了重跑一遍即可。

### 第 3 步 · 拿密钥

左侧 **Project Settings → API**，复制两个值：

- `Project URL`（形如 `https://abcdefg.supabase.co`）
- `anon` / `public` 那个 key（**不是** service_role 那个）

### 第 4 步 · 填配置

把 `.env.local.example` 复制一份，改名成 `.env.local`，填进去：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_key
```

> ⚠️ `service_role` key 绝对不能放进这里。它绕过所有权限，泄露等于把数据库交出去。

### 第 5 步 · 启动

```powershell
cd campus-org
npm run dev
```

打开 <http://localhost:3000>。

---

## 三、把自己变成第一个管理员

注册一个账号，然后在 Supabase 的 SQL Editor 里执行（把邮箱换成你注册用的）：

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = '你的邮箱@example.com');
```

然后**刷新页面**，导航栏会出现「创建组织」和「邀请码」。

从此你就能：
- 创建任意学校的组织
- 生成邀请码发给别人，别人兑换后也成为管理员（人数不限）

---

## 四、新手最容易卡住的三件事

### 1. 注册后登录不了，提示邮箱未确认

Supabase 默认开启邮箱确认。学习阶段建议先关掉：

**Authentication → Providers → Email → 把 "Confirm email" 关掉 → Save**

上线前再打开。

### 2. 建组织报错 `new row violates row-level security policy`

说明你这个账号还不是管理员。执行第三节那条 SQL。

### 3. 改了 `.env.local` 没生效

`NEXT_PUBLIC_` 开头的变量在**启动时**读取。必须 `Ctrl+C` 停掉，再 `npm run dev`。

---

## 五、数据库长什么样

```
profiles            用户资料（is_admin 就是管理员开关）
  │
orgs                组织（name, school, intro, logo_url）
  │
org_members         谁能管这个组织（一个组织可多人，多对多）
  │
posts               组织的动态（title, body, images[]）
  │
comments            评论（post_id 为空 = 评论整个组织）
  │
invite_codes        邀请码（code, max_uses, used_count）
```

### 权限为什么做在数据库里

你的需求里有这么一条：**只有管理员能删自己组织的内容**。

如果只在前端写 `if (isAdmin) 显示删除按钮`，那么任何人打开开发者工具、
改一行 JS、或者直接拿浏览器请求接口，就能删掉别人的数据。

所以这个项目把规则写在数据库的 **RLS（行级安全）** 里。举几个例子：

```sql
-- 只有该组织的管理员才能发动态
create policy "posts_insert_org_member" on public.posts
  for insert with check (public.is_org_member(org_id, auth.uid()));

-- 用户不能自己把 is_admin 改成 true（这是列级权限，比 RLS 还细）
revoke update on public.profiles from anon, authenticated;
grant  update (display_name, school) on public.profiles to authenticated;
```

意思是：**就算前端被完全绕过，数据库这一层也不会让你越权。**

---

## 六、目录结构

```
campus-org/
├─ app/
│  ├─ layout.js                 全局布局 + 导航
│  ├─ page.js                   首页：组织列表 + 搜索
│  ├─ globals.css               全部样式，配色在顶部变量里
│  ├─ login/page.js             登录
│  ├─ signup/page.js            注册
│  ├─ invite/page.js            兑换邀请码
│  ├─ invites/page.js           管理员生成邀请码
│  ├─ auth/
│  │  ├─ callback/route.js      邮箱确认回跳
│  │  └─ signout/route.js       退出登录
│  └─ org/
│     ├─ new/page.js            创建组织
│     └─ [id]/
│        ├─ page.js             组织详情 + 评论区
│        └─ new-post/page.js    发动态
├─ components/                  可复用的界面零件
├─ lib/
│  ├─ supabase/                 客户端、服务端连接
│  ├─ errors.js                 英文报错翻中文
│  └─ format.js                 时间格式化
├─ supabase/schema.sql          ★ 数据库结构 + 权限规则
└─ middleware.js                刷新登录状态
```

---

## 七、想改什么，改哪里

| 想改 | 去哪 |
|---|---|
| 网站名字「组织汇」 | `app/layout.js` 里的 `brand-text` 和 `metadata` |
| 主色调 | `app/globals.css` 顶部的 `--brand` / `--brand-2` |
| 首页标题文案 | `app/page.js` |
| 最多传几张图 | `components/new-post-form.jsx` 的 `MAX_IMAGES` |
| 图片大小上限 | 同上，`MAX_FILE_MB`（还要在 Supabase Storage 里调） |
| 一个组织能发多少条 | `app/org/[id]/page.js` 里的 `.limit(50)` |

---

## 八、部署到公网

1. 把代码推到 GitHub（新建仓库，`git init` → `git add .` → 提交 → push）
2. 打开 <https://vercel.com>，用 GitHub 登录
3. Import 这个仓库
4. **Environment Variables** 里填那两行 `NEXT_PUBLIC_SUPABASE_*`
5. Deploy

之后每次 `git push`，Vercel 会自动重新部署。

部署完记得回 Supabase 改两个地方：

- **Authentication → URL Configuration**：Site URL 改成你的 Vercel 域名
- **Authentication → URL Configuration → Redirect URLs**：加上 `https://你的域名/auth/callback`

> 国内访问 Vercel 的免费域名可能不稳定。长期要稳定访问，需要国内服务器 + 域名 + 备案。

---

## 九、还没做，但你可以接着做

按重要性排序：

1. **组织资料编辑** —— 现在建完就改不了名和简介，需要一个管理页
2. **动态的编辑和删除** —— 数据库规则已经允许，但界面还没做按钮
3. **上传组织头像** —— `logo_url` 字段已经留好
4. **把别人加进组织当管理员** —— `org_members` 表支持，缺一个邀请界面
5. **翻页** —— 现在组织最多 60 个、动态最多 50 条，多了要加
6. **举报和审核** —— 有人发垃圾内容时你需要手段

每一项都可以独立做，做完就是一个完整的迭代。

---

## 十、安全清单（上线前逐条确认）

- [ ] `service_role` key 没有出现在任何前端代码或环境变量里
- [ ] `.env.local` 没有被提交到 Git（`.gitignore` 已经排除）
- [ ] Supabase 里已经把 Site URL 改成正式域名
- [ ] 邮箱确认已重新打开
- [ ] 图片上传大小限制在 Supabase Storage 里也设了
- [ ] 试过用普通账号访问别人的组织管理页，确认被拦住
