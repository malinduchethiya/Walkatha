import React from 'react';
import { Category } from '../../types/story';

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
    <footer className="w-full bg-[#0b1224] border-t border-[#1c2b4f] mt-8 transition-colors">
      <div className="w-full px-2 sm:px-3 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400">
          <div>
            <div className="text-sm font-bold text-white mb-2">
              Walkathawa (වල් කතාව)
            </div>
            <p className="leading-relaxed">
              Walkathawa (වල් කතාව) is a place to read Sinhala stories online. Discover new Sinhala
              katha, romantic stories, fictional stories, and short stories updated regularly.
            </p>
          </div>

          <div>
            <div className="text-sm font-bold text-white mb-2">
              වර්ගීකරණ (Categories)
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

        {/* §9: Footer link list on every page: Privacy Policy, Terms and Conditions, Send Your Story, Disclaimer */}
        <div className="pt-4 border-t border-[#1c2b4f] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span>© {new Date().getFullYear()} Walkathawa.</span>
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
              rel="nofollow"
              onClick={(e) => handleLink(e, '/admin')}
              className="hover:underline text-slate-400"
            >
              Admin
            </a>
          </div>
          <span className="text-slate-400 font-medium">
            Walkathawa (වල් කතාව)
          </span>
        </div>
      </div>
    </footer>
  );
};


