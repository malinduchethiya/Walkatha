import React from 'react';
import { Category } from '../../types/story';
import { StoryBanner468 } from '../common/NativeBanner';

interface FooterProps {
  categories: Category[];
  onSelectCategory: (slug: string) => void;
  onNavigatePath: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  categories,
  onSelectCategory,
  onNavigatePath,
}) => {
  const handleLink = (e: React.MouseEvent, targetPath: string) => {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onNavigatePath(targetPath);
    }
  };

  return (
    <footer className="bg-[#0b1224] border-t border-[#1c2b4f] mt-12 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <StoryBanner468 refreshKey="footer-banner-top" className="my-1" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400">
          <div>
            <div className="text-sm font-bold text-white mb-2">
              Wal Katha - Sinhala Wal Katha &amp; Wela Katha
            </div>
            <p className="leading-relaxed">
              ශ්‍රී ලංකාවේ විශාලතම සිංහල වැල කතා (Sinhala Wal Katha), වල් කතා, Wela Katha, Walkatha9,
              අම්මා වල් කතා 2026, අක්කා මල්ලි කතා, ඇන්ටි කතා සහ පවුලේ වැල කතා එකතුව. දිනපතා අලුත් වන
              රසවත් සිංහල කතා 600කට වැඩි ප්‍රමාණයක් නොමිලේ කියවන්න.
            </p>
          </div>

          <div>
            <div className="text-sm font-bold text-white mb-2">
              සිංහල වල් කතා වර්ගීකරණ (Categories)
            </div>
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
                    className="hover:underline text-blue-400 font-medium"
                  >
                    {cat.sinhalaName || cat.name}
                  </a>
                );
              })}
              <a
                href="/popular"
                onClick={(e) => handleLink(e, '/popular')}
                className="hover:underline text-blue-400 font-medium"
              >
                Popular
              </a>
              <a
                href="/archives"
                onClick={(e) => handleLink(e, '/archives')}
                className="hover:underline text-blue-400 font-medium"
              >
                Archives
              </a>
              <a
                href="/categories"
                onClick={(e) => handleLink(e, '/categories')}
                className="hover:underline text-blue-400 font-medium"
              >
                Categories
              </a>
            </div>
          </div>
        </div>

        <StoryBanner468 refreshKey="footer-banner-bottom" className="my-1" />

        {/* §9: Footer link list on every page: Privacy Policy, Terms and Conditions, Send Your Story, Disclaimer */}
        <div className="pt-4 border-t border-[#1c2b4f] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span>© {new Date().getFullYear()} Wal Katha.</span>
            <a
              href="/page/privacy-policy"
              onClick={(e) => handleLink(e, '/page/privacy-policy')}
              className="hover:underline text-slate-300"
            >
              Privacy Policy
            </a>
            <a
              href="/page/terms-and-conditions"
              onClick={(e) => handleLink(e, '/page/terms-and-conditions')}
              className="hover:underline text-slate-300"
            >
              Terms and Conditions
            </a>
            <a
              href="/page/send-your-story"
              onClick={(e) => handleLink(e, '/page/send-your-story')}
              className="hover:underline text-slate-300"
            >
              Send Your Story
            </a>
            <a
              href="/page/disclaimer"
              onClick={(e) => handleLink(e, '/page/disclaimer')}
              className="hover:underline text-slate-300"
            >
              Disclaimer
            </a>
            <a
              href="/admin"
              onClick={(e) => handleLink(e, '/admin')}
              className="hover:underline text-slate-400"
            >
              Admin
            </a>
          </div>
          <span className="text-slate-400 font-medium">
            Wal Katha - Sinhala Wal Katha &amp; Wela Katha
          </span>
        </div>
      </div>
    </footer>
  );
};

