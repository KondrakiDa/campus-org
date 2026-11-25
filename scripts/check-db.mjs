// 诊断：确认共管流程真的在数据库里生效
const BASE = 'https://mihnozlyzuzwlkgzhufq.supabase.co';
const KEY = 'sb_publishable_zOODZIhjr8bPWZ_58M_DkQ_hBeEjOCy';
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function get(path) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers });
  return { status: res.status, body: await res.text() };
}

const { body: members } = await get(
  'org_members?select=user_id,role,created_at,profiles(display_name),orgs(name)'
);

console.log('=== org_members ===');
if (!members || members === '[]') {
  console.log('（空）');
} else {
  for (const m of JSON.parse(members)) {
    const name = m.profiles?.display_name || '?';
    const org = m.orgs?.name || '?';
    console.log(`  ${name.padEnd(20)} role=${m.role.padEnd(6)} 组织=${org}`);
  }
}

const { body: profiles } = await get('profiles?select=display_name,is_admin,created_at');
console.log('\n=== 用户清单 ===');
for (const p of JSON.parse(profiles)) {
  console.log(`  ${p.display_name.padEnd(20)} 管理员=${p.is_admin}`);
}

const { body: posts } = await get('posts?select=id,title,images,created_at&order=created_at.desc');
const postRows = JSON.parse(posts);
console.log(`\n=== 动态 ${postRows.length} 条 ===`);
for (const p of postRows) {
  console.log(`  「${p.title}」 图片 ${p.images?.length || 0} 张`);
}

const { body: comments } = await get('comments?select=body,created_at&order=created_at.desc&limit=5');
const commentRows = JSON.parse(comments);
console.log(`\n=== 评论 ${commentRows.length} 条（最近 5）===`);
for (const c of commentRows) {
  console.log(`  「${c.body.slice(0, 40)}」`);
}
