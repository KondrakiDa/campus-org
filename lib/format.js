/** 把时间戳变成「3 分钟前」这种人话 */
export function timeAgo(value) {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return '';

  const diff = Math.floor((Date.now() - ts) / 1000);

  if (diff < 45) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;

  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** 取名字首字做头像 */
export function initialOf(name) {
  return String(name || '匿').trim().charAt(0).toUpperCase();
}
