// 临时诊断脚本：用公开钥匙读 profiles 表，确认注册用户和触发器是否正常
const BASE = 'https://mihnozlyzuzwlkgzhufq.supabase.co';
const KEY = 'sb_publishable_zOODZIhjr8bPWZ_58M_DkQ_hBeEjOCy';

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function get(path) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers });
  const text = await res.text();
  return { status: res.status, body: text };
}

const profiles = await get('profiles?select=id,display_name,is_admin,created_at&order=created_at.desc');
console.log('=== profiles ===');
console.log('HTTP', profiles.status);
console.log(profiles.body);

const orgs = await get('orgs?select=id,name&limit=5');
console.log('=== orgs ===');
console.log('HTTP', orgs.status);
console.log(orgs.body);
