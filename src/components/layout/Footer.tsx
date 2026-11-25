import React from 'react';
import type { Category } from '../../types/story';
import { cleanCategoryBadgeName } from '../../utils/formatters';

interface FooterProps {
  categories: Category[];
  onSelectCategory: (slug: string) => void;
  onNavigatePath: (path: string) => void;
}

const INFO_LINKS = [
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
  { label: 'Send Story', path: '/page/send-your-story' },
  { label: 'Privacy', path: '/page/privacy-policy' },
  { label: 'Terms', path: '/page/terms-and-conditions' },
  { label: 'Disclaimer', path: '/page/disclaimer' },
  { label: 'Sitemap', path: '/sitemap' },
];

export const Footer: React.FC<FooterProps> = ({
  categories,
  onSelectCategory,
  onNavigatePath,
}) => {
  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigatePath(path);
  };

  const handleCat = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelectCategory(slug);
  };

  return (
    <footer className="border-t border-zinc-800/80 bg-[#0e0e10] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-1.5 max-w-sm">
            <a
              href="/"
              onClick={(e) => handleNav(e, '/')}
              className="text-base font-bold text-zinc-100 hover:text-amber-400 transition-colors"
            >
              Walkathawa
            </a>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Walkathawa (වල් කතාව) — අලුත්ම Sinhala wal katha, wela katha සහ walkatha එකතුව. 18+ ප්‍රබන්ධ සාහිත්‍යය.
            </p>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">
              {categories.map((cat) => {
                const slug = cat.slug || cat.id;
                return (
                  <a
                    key={slug}
                    href={`/category/${encodeURIComponent(slug)}`}
                    onClick={(e) => handleCat(e, slug)}
                    className="hover:text-zinc-100 transition-colors"
                  >
                    {cleanCategoryBadgeName(cat.sinhalaName || cat.name)}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-500">
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
            {INFO_LINKS.map((link) => (
              <a
                key={link.path}
                href={link.path}
                onClick={(e) => handleNav(e, link.path)}
                className="hover:text-zinc-200 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <p className="shrink-0">© {new Date().getFullYear()} Walkathawa</p>
        </div>
      </div>
    </footer>
  );
};
