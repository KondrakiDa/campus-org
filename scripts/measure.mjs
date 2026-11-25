// 测量各页面响应时间（先预热，再测 3 次取中位数）
const BASE = 'http://localhost:3000';
const ORG = '1611e4cd-0b67-4182-985e-7b50f3c01a2e';

const pages = [
  ['首页', '/'],
  ['组织页', `/org/${ORG}`],
  ['登录页', '/login'],
  ['设置页', `/org/${ORG}/settings`],
  ['静态资源(favicon)', '/favicon.ico'],
];

async function timeOnce(path) {
  const start = performance.now();
  const res = await fetch(BASE + path, { redirect: 'manual' });
  await res.text();
  return { ms: performance.now() - start, status: res.status };
}

for (const [label, path] of pages) {
  // 预热：让 Next 编译完这个路由
  await timeOnce(path).catch(() => {});

  const samples = [];
  for (let i = 0; i < 3; i += 1) {
    const r = await timeOnce(path).catch(() => ({ ms: NaN, status: 'ERR' }));
    samples.push(r.ms);
  }

  samples.sort((a, b) => a - b);
  const median = samples[1];
  const status = (await timeOnce(path).catch(() => ({ status: 'ERR' }))).status;

  console.log(
    `${label.padEnd(18)} 中位数 ${median.toFixed(0).padStart(6)} ms   (${samples
      .map((s) => s.toFixed(0))
      .join(' / ')})  HTTP ${status}`
  );
}
