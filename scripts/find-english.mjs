// 检查 HTML 属性里的英文：title、placeholder、alt、aria-label、meta
const BASE = 'http://localhost:3000';
const ORG = '1611e4cd-0b67-4182-985e-7b50f3c01a2e';

const pages = [
  ['/', '/'],
  ['组织页', `/org/${ORG}`],
  ['登录', '/login'],
  ['注册', '/signup'],
  ['邀请码', '/invites'],
  ['兑换', '/join?code=TEST'],
  ['建组织', '/org/new'],
  ['设置', `/org/${ORG}/settings`],
  ['404', '/this-page-does-not-exist'],
];

const ATTRS = ['title', 'placeholder', 'alt', 'aria-label', 'content'];

for (const [label, path] of pages) {
  const res = await fetch(BASE + path, { redirect: 'follow' });
  const html = await res.text();

  const found = new Set();

  // <title>...</title>
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) found.add(`[标题] ${titleMatch[1]}`);

  // 属性里的值
  for (const attr of ATTRS) {
    const re = new RegExp(`${attr}="([^"]*)"`, 'gi');
    for (const m of html.matchAll(re)) {
      const value = m[1].trim();
      if (value && /[A-Za-z]{2,}/.test(value) && !value.startsWith('/') && !value.startsWith('_next')) {
        found.add(`[${attr}] ${value.slice(0, 70)}`);
      }
    }
  }

  console.log(`\n=== ${label} (${path})  HTTP ${res.status} ===`);
  if (found.size === 0) {
    console.log('  属性里也没有英文');
  } else {
    for (const f of [...found].slice(0, 12)) console.log('  ', f);
  }
}
