import Link from 'next/link';

/**
 * 把页码压缩成「1 … 4 5 6 … 20」这种形式。
 * 总页数少的时候直接全列出，多了才折叠。
 */
function buildPageNumbers(current, total) {
  const wanted = new Set([1, total, current, current - 1, current + 1]);
  const numbers = [...wanted]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const result = [];
  let previous = 0;

  for (const n of numbers) {
    if (previous && n - previous > 1) result.push('…');
    result.push(n);
    previous = n;
  }

  return result;
}

/**
 * 分页控件。
 *
 * 全部是 <Link>，没有 onClick、没有状态——因为分页本质上是「换一个 URL」。
 * 这样带来的好处：浏览器前进/后退能用、链接能分享、刷新不丢、被搜索引擎收录。
 */
export default function Pagination({ page, totalPages, hrefForPage, label }) {
  if (!totalPages || totalPages <= 1) return null;

  const items = buildPageNumbers(page, totalPages);

  return (
    <nav className="pager" aria-label={label || '分页导航'}>
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className="pager-btn" rel="prev">
          ← 上一页
        </Link>
      ) : (
        <span className="pager-btn is-disabled">← 上一页</span>
      )}

      {items.map((item, index) =>
        item === '…' ? (
          <span key={`gap-${index}`} className="pager-gap">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefForPage(item)}
            className={`pager-btn${item === page ? ' is-active' : ''}`}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className="pager-btn" rel="next">
          下一页 →
        </Link>
      ) : (
        <span className="pager-btn is-disabled">下一页 →</span>
      )}
    </nav>
  );
}
