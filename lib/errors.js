/**
 * 把 Supabase 返回的英文错误翻成用户看得懂的话。
 * 不认识的错误原样返回，方便排查。
 */
const MAP = [
  ['Invalid login credentials', '邮箱或密码不正确'],
  ['Email not confirmed', '邮箱还没确认，请先去邮箱点确认链接（或在 Supabase 后台临时关闭邮箱确认）'],
  ['User already registered', '这个邮箱已经注册过了，直接登录试试'],
  ['Password should be at least 6 characters', '密码至少 6 位'],
  ['Password is too short', '密码太短了，至少 6 位'],
  ['Unable to validate email address', '邮箱格式看起来不对'],
  ['Email rate limit exceeded', '请求太频繁，等几分钟再试'],
  ['Signups not allowed', '当前项目关闭了注册，去 Supabase 后台打开'],
  ['new row violates row-level security policy', '你没有权限做这个操作（被数据库规则拦下了）'],
  ['duplicate key value violates unique constraint', '这个值已经被占用了，换一个试试'],
  ['请先登录', '请先登录后再使用邀请码'],
];

export function translateError(error) {
  if (!error) return '';
  const raw = error.message || String(error);

  for (const [needle, zh] of MAP) {
    if (raw.includes(needle)) return zh;
  }
  return raw;
}
