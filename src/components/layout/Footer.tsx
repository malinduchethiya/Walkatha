import React from 'react';
import { Category } from '../../types/story';
import { TripleInlineBanners320x50, SMART_LINK_URL } from '../common/AdUnits';

interface FooterProps {
  categories: Category[];
  onSelectCategory: (slug: string) => void;
  onNavigateStatic: (page: 'about' | 'privacy' | 'terms' | 'contact' | 'admin' | 'sitemap' | 'categories') => void;
}

export const Footer: React.FC<FooterProps> = ({
  categories,
  onSelectCategory,
  onNavigateStatic,
}) => {
  return (
    <footer className="bg-white dark:bg-[#0b1224] border-t border-slate-200 dark:border-[#1c2b4f] mt-12 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Three 320x50 Banners in Footer */}
        <TripleInlineBanners320x50 label="footer" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Walkathawa — සිංහල වැල කතා | Sinhala Wal Katha &amp; Wela Katha 2026
            </h2>
            <p className="leading-relaxed">
              ශ්‍රී ලංකාවේ විශාලතම සිංහල වැල කතා (Sinhala Wal Katha), වල් කතා, Wela Katha, Walkatha9,
              අම්මා වල් කතා 2026, අක්කා මල්ලි කතා, ඇන්ටි කතා සහ පවුලේ වැල කතා එකතුව. දිනපතා අලුත් වන
              රසවත් සිංහල කතා 600කට වැඩි ප්‍රමාණයක් නොමිලේ කියවන්න.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              සිංහල වල් කතා වර්ගීකරණ (Quick Categories &amp; Directory)
            </h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {categories.map((cat) => {
                const slug = cat.slug || cat.id;
                return (
                  <a
                    key={cat.id}
                    href={`/category/${encodeURIComponent(slug)}`}
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        onSelectCategory(slug);
                      }
                    }}
                    className="hover:underline text-blue-700 dark:text-blue-400 font-medium"
                  >
                    {cat.sinhalaName || cat.name}
                  </a>
                );
              })}
              <a
                href="/sitemap"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    onNavigateStatic('sitemap');
                  }
                }}
                className="hover:underline text-blue-700 dark:text-blue-400 font-medium"
              >
                සම්පූර්ණ කතා නාමාවලිය (HTML Sitemap)
              </a>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-[#1c2b4f] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <p>© {new Date().getFullYear()} Walkathawa. සියලුම හිමිකම් ඇවිරිණි.</p>
            <a
              href="/sitemap"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onNavigateStatic('sitemap');
                }
              }}
              className="hover:underline text-slate-400"
            >
              All Stories
            </a>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-slate-400"
            >
              XML Sitemap
            </a>
            <a
              href="/about"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onNavigateStatic('about');
                }
              }}
              className="hover:underline text-slate-400"
            >
              About
            </a>
            <a
              href="/privacy"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onNavigateStatic('privacy');
                }
              }}
              className="hover:underline text-slate-400"
            >
              Privacy
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onNavigateStatic('terms');
                }
              }}
              className="hover:underline text-slate-400"
            >
              Terms
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onNavigateStatic('admin');
                }
              }}
              className="hover:underline text-slate-400"
            >
              Admin
            </a>
          </div>
          <a
            href={SMART_LINK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 dark:text-blue-400 hover:underline font-medium"
          >
            සිංහල වැල කතා • වල් කතා • වැල කතා • Sinhala Wal Katha 2026
          </a>
        </div>
      </div>
    </footer>
  );
};

