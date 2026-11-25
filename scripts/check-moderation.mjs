// 验证 003 迁移是否生效
const BASE = 'https://mihnozlyzuzwlkgzhufq.supabase.co';
const KEY = 'sb_publishable_zOODZIhjr8bPWZ_58M_DkQ_hBeEjOCy';
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function probe(label, path) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers });
  const text = await res.text();
  const ok = res.status === 200;
  console.log(`${ok ? '✓' : '✗'} ${label.padEnd(28)} HTTP ${res.status}`);

  if (ok) {
    try {
      const rows = JSON.parse(text);
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`    字段: ${Object.keys(rows[0]).join(', ')}`);
      }
    } catch {
      /* 忽略 */
    }
  } else {
    console.log(`    ${text.slice(0, 140)}`);
  }
}

console.log('=== 003 迁移验证 ===\n');

// 表存在性：能查就说明表在
await probe('reports 表', 'reports?select=id&limit=1');

// 新字段：查不存在的列会返回 400
await probe('profiles.is_banned', 'profiles?select=id,is_banned&limit=1');
await probe('profiles.banned_reason', 'profiles?select=id,banned_reason&limit=1');
await probe('profiles.banned_at', 'profiles?select=id,banned_at&limit=1');

// 原有数据是否还在
await probe('orgs 数据', 'orgs?select=id,name&limit=5');
await probe('posts 数据', 'posts?select=id,title&limit=5');

// 新函数：调 RPC 看是否 404（函数不存在会返回 404）
const rpcNames = ['resolve_report', 'ban_user', 'unban_user', 'report_count'];
console.log('\n=== 新增函数（调用不带参数，预期是参数错误而不是 404）===');
for (const fn of rpcNames) {
  const res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const text = await res.text();
  // 函数存在但参数不对 → 400/404? PostgREST 返回 404 表示函数不存在
  const exists = res.status !== 404;
  console.log(`${exists ? '✓' : '✗'} ${fn.padEnd(20)} HTTP ${res.status} ${exists ? '' : '（函数不存在）'}`);
  if (!exists) console.log(`    ${text.slice(0, 120)}`);
}
