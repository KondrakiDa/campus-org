// 绕过 DNS：直接连 IP，用 SNI + Host 头声明真实域名
import https from 'node:https';

const HOST = 'campus-org.vercel.app';
const IPS = ['64.29.17.131', '64.29.17.15', '76.76.21.21'];

function probe(ip) {
  return new Promise((resolve) => {
    const req = https.request(
      {
        host: ip,              // 直接连 IP，不查 DNS
        port: 443,
        path: '/',
        method: 'GET',
        servername: HOST,      // TLS SNI 发真实域名，证书才能对上
        headers: { Host: HOST, 'User-Agent': 'Mozilla/5.0' },
        timeout: 12000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ ip, ok: true, status: res.statusCode, body }));
      }
    );

    req.on('error', (err) => resolve({ ip, ok: false, error: `${err.code} ${err.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ ip, ok: false, error: 'TIMEOUT' }); });
    req.end();
  });
}

for (const ip of IPS) {
  const result = await probe(ip);

  if (!result.ok) {
    console.log(`${ip}  ->  连接失败: ${result.error}`);
    continue;
  }

  const { status, body } = result;
  let verdict = `未知内容（${body.length} 字符）`;

  if (body.includes('还没有任何组织')) verdict = '✅ 站点完全正常，环境变量已生效';
  else if (body.includes('差最后一步')) verdict = '⚠ 站点能开，但环境变量没生效';
  else if (status === 404) verdict = '❌ 404，部署不存在或域名不对';

  console.log(`${ip}  ->  HTTP ${status}  ${verdict}`);
}
