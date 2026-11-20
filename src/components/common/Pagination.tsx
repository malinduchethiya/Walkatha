import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath?: string;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  basePath = '/',
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const buildPageHref = (page: number): string => {
    const cleanBase = basePath === '/' ? '/' : basePath.replace(/\/+$/, '');
    return page <= 1 ? cleanBase : `${cleanBase}?page=${page}`;
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, page: number) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getVisiblePages = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav
      aria-label="Pagination"
      className="pt-8 mt-10 border-t border-zinc-800/80 flex items-center justify-between gap-4"
    >
      {currentPage > 1 ? (
        <a
          href={buildPageHref(currentPage - 1)}
          rel="prev"
          onClick={(e) => handleClick(e, currentPage - 1)}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-zinc-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>පෙර</span>
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600 select-none">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span>පෙර</span>
        </span>
      )}

      <div className="flex items-center gap-1">
        {visiblePages.map((entry, idx) =>
          entry === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-2 text-xs text-zinc-600 select-none">
              …
            </span>
          ) : (
            <a
              key={entry}
              href={buildPageHref(entry)}
              onClick={(e) => handleClick(e, entry)}
              aria-current={entry === currentPage ? 'page' : undefined}
              className={`min-w-[34px] h-8 px-2 inline-flex items-center justify-center rounded text-xs font-medium tabular-nums transition-colors ${
                entry === currentPage
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              {entry}
            </a>
          )
        )}
      </div>

      {currentPage < totalPages ? (
        <a
          href={buildPageHref(currentPage + 1)}
          rel="next"
          onClick={(e) => handleClick(e, currentPage + 1)}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-zinc-50 transition-colors"
        >
          <span>මීළඟ</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600 select-none">
          <span>මීළඟ</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
};
