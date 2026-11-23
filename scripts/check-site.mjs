// 临时诊断：验证 Vercel 线上站点是否正常连上数据库
const url = 'https://campus-org.vercel.app/';

try {
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();

  console.log('HTTP', res.status);
  console.log('长度', html.length, '字符');

  if (html.includes('差最后一步')) {
    console.log('❌ 环境变量没有生效（页面显示配置引导）');
  } else if (html.includes('还没有任何组织')) {
    console.log('✅ 已连接数据库，首页渲染空组织列表');
  } else if (html.includes('组织汇')) {
    console.log('⚠ 页面渲染成功，但没匹配到预期文案');
  } else {
    console.log('内容前 400 字符:');
    console.log(html.slice(0, 400));
  }

  // 顺便看看标题
  const title = html.match(/<title>(.*?)<\/title>/);
  if (title) console.log('页面标题:', title[1]);
} catch (error) {
  console.log('请求失败:', error.message);
}
