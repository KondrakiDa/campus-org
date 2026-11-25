// 逐个测量每类 Supabase 查询的往返耗时，找出到底是哪一句慢
const BASE = 'https://mihnozlyzuzwlkgzhufq.supabase.co';
const KEY = 'sb_publishable_zOODZIhjr8bPWZ_58M_DkQ_hBeEjOCy';
const ORG = '1611e4cd-0b67-4182-985e-7b50f3c01a2e';
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function timeIt(label, path) {
  // 预热一次，避免首次 TLS 握手计入
  await fetch(`${BASE}/rest/v1/${path}`, { headers }).then((r) => r.text()).catch(() => {});

  const samples = [];
  for (let i = 0; i < 3; i += 1) {
    const start = performance.now();
    await fetch(`${BASE}/rest/v1/${path}`, { headers }).then((r) => r.text());
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  console.log(`${label.padEnd(34)} ${samples[1].toFixed(0).padStart(5)} ms`);
}

console.log('=== 单次查询往返耗时（中位数）===\n');

await timeIt('profiles（无过滤）', 'profiles?select=display_name&limit=1');
await timeIt('orgs 单条', `orgs?select=id,name&id=eq.${ORG}`);
await timeIt('org_members + 关联 profiles', `org_members?select=user_id,profiles(display_name)&org_id=eq.${ORG}`);
await timeIt('posts 普通 10 条', `posts?select=id,title&org_id=eq.${ORG}&limit=10`);
await timeIt('posts 带 profiles 关联', `posts?select=id,title,profiles(display_name)&org_id=eq.${ORG}&limit=10`);
await timeIt('posts 带 count=exact', `posts?select=id,title&org_id=eq.${ORG}&limit=10&offset=0`);
await timeIt('comments + 关联（200 条）', `comments?select=id,body,profiles(display_name)&org_id=eq.${ORG}&limit=200`);
