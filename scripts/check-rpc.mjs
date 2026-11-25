// 用正确参数调用 RPC：函数不存在返回 404，函数存在但权限/参数不对会返回 400
const BASE = 'https://mihnozlyzuzwlkgzhufq.supabase.co';
const KEY = 'sb_publishable_zOODZIhjr8bPWZ_58M_DkQ_hBeEjOCy';
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

const tests = [
  ['ban_user', { p_user: FAKE_UUID, p_reason: 'test' }],
  ['unban_user', { p_user: FAKE_UUID }],
  ['resolve_report', { p_report: FAKE_UUID, p_action: 'dismissed', p_delete_target: false }],
  ['report_count', { p_type: 'post', p_id: FAKE_UUID }],
];

for (const [fn, body] of tests) {
  const res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();

  let verdict;
  if (res.status === 404) {
    verdict = '✗ 函数不存在';
  } else if (res.status === 400) {
    // 函数存在，只是被业务逻辑挡住（比如不是管理员）
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      /* 原样输出 */
    }
    verdict = `✓ 函数存在（被拒绝：${message.slice(0, 40)}）`;
  } else if (res.status === 200) {
    verdict = '✓ 函数存在且调用成功';
  } else {
    verdict = `? HTTP ${res.status}`;
  }

  console.log(`${fn.padEnd(16)} ${res.status}  ${verdict}`);
}
