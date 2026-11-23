import Link from 'next/link';

import { SETUP_HINT } from '@/lib/supabase/config';

/**
 * 还没配置 Supabase 时显示这个，而不是让页面报 500。
 * 新手第一次打开项目，十有八九会先撞上这个页面。
 */
export default function SetupNotice() {
  return (
    <div className="container" style={{ maxWidth: 640, paddingTop: 40 }}>
      <div className="card">
        <span className="badge badge-warn">还没连接数据库</span>

        <h1 style={{ fontSize: 26, margin: '14px 0 8px' }}>
          差最后一步就能跑了
        </h1>

        <p className="muted small" style={{ marginBottom: 20 }}>
          这个网站的数据存在 Supabase 里，需要你先建一个免费项目，
          把地址和密钥填进配置文件。
        </p>

        <ol className="stack" style={{ paddingLeft: 20, margin: 0 }}>
          {SETUP_HINT.map((step) => (
            <li key={step} className="small">
              {step}
            </li>
          ))}
        </ol>

        <hr className="divider" />

        <p className="tiny muted">
          配置改完之后必须重启开发服务器才会生效，
          因为 <code>NEXT_PUBLIC_</code> 开头的变量是在启动时读取的。
        </p>
      </div>
    </div>
  );
}
