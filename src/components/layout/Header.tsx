import React, { useState, useEffect } from 'react';
import { Search, Menu, X } from 'lucide-react';
import type { ViewMode } from '../../utils/storyFormatting';

interface HeaderProps {
  activeView: ViewMode;
  searchQuery: string;
  onSearchSubmit: (query: string) => void;
  onNavigate: (path: string) => void;
}

const NAV_ITEMS: { label: string; path: string; matchViews: ViewMode[] }[] = [
  { label: 'නවතම', path: '/', matchViews: ['home'] },
  { label: 'වර්ගීකරණ', path: '/categories', matchViews: ['categories', 'category'] },
  { label: 'ජනප්‍රිය', path: '/popular', matchViews: ['popular'] },
  { label: 'ලේඛනාගාරය', path: '/archives', matchViews: ['archives'] },
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  searchQuery,
  onSearchSubmit,
  onNavigate,
}) => {
  const [draftQuery, setDraftQuery] = useState(searchQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setDraftQuery(searchQuery);
  }, [searchQuery]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onSearchSubmit(draftQuery.trim());
  };

  const handleClearSearch = () => {
    setDraftQuery('');
    onSearchSubmit('');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0e0e10]/95 backdrop-blur-sm border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="flex items-baseline gap-2.5 shrink-0 group focus:outline-none"
        >
          <span className="text-[19px] font-bold tracking-tight text-zinc-50 group-hover:text-amber-400 transition-colors">
            Walkathawa
          </span>
          <span className="hidden sm:inline text-xs text-zinc-500 font-medium">
            වල් කතාව
          </span>
        </a>

        {/* Zone 2: Primary Single-Line Navigation */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = item.matchViews.includes(activeView);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`text-sm font-medium whitespace-nowrap transition-colors py-1 border-b-2 ${
                  isActive
                    ? 'text-zinc-50 border-amber-500'
                    : 'text-zinc-400 border-transparent hover:text-zinc-100'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Search & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <form
            role="search"
            onSubmit={handleSubmit}
            className="hidden sm:flex items-center relative"
          >
            <label htmlFor="header-story-search" className="sr-only">
              කතා සොයන්න
            </label>
            <Search
              className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="header-story-search"
              type="search"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="සොයන්න..."
              className="w-48 lg:w-60 h-9 pl-9 pr-8 text-sm bg-[#16161a] text-zinc-100 placeholder:text-zinc-500 border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-500 transition-colors"
            />
            {draftQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-zinc-800 text-zinc-300 hover:text-zinc-50 hover:border-zinc-700 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800/80 bg-[#0e0e10] px-4 py-4 space-y-4">
          <form role="search" onSubmit={handleSubmit} className="relative sm:hidden">
            <label htmlFor="mobile-story-search" className="sr-only">
              කතා සොයන්න
            </label>
            <Search
              className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="mobile-story-search"
              type="search"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="කතාවක් සොයන්න..."
              className="w-full h-10 pl-9 pr-9 text-sm bg-[#16161a] text-zinc-100 placeholder:text-zinc-500 border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-500"
            />
            {draftQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          <nav aria-label="Mobile navigation" className="flex flex-col divide-y divide-zinc-800/60">
            {NAV_ITEMS.map((item) => {
              const isActive = item.matchViews.includes(activeView);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleLinkClick(e, item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`py-2.5 text-sm font-medium ${
                    isActive ? 'text-amber-400' : 'text-zinc-300 hover:text-zinc-50'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
