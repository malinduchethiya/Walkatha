import React, { useEffect } from 'react';
import { SeoService } from '../../services/seoService';

interface NotFoundPageProps {
  onGoHome: () => void;
  onBrowseCategories: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onGoHome,
  onBrowseCategories,
}) => {
  useEffect(() => {
    SeoService.updateNotFoundSeo();
  }, []);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, fn: () => void) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    fn();
  };

  return (
    <section className="max-w-lg mx-auto px-4 sm:px-6 py-20 text-center space-y-5">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">404</p>
      <h1 className="text-2xl font-bold text-zinc-50">පිටුව හමු නොවීය</h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        ඔබ සෙවූ පිටුව හෝ කතාව ඉවත් කර ඇති හෝ ලිපිනය වැරදි විය හැක.
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <a
          href="/"
          onClick={(e) => handleLink(e, onGoHome)}
          className="px-4 py-2 text-xs font-medium rounded-md bg-zinc-100 text-zinc-950 hover:bg-white transition-colors"
        >
          මුල් පිටුවට යන්න
        </a>
        <a
          href="/categories"
          onClick={(e) => handleLink(e, onBrowseCategories)}
          className="px-4 py-2 text-xs font-medium rounded-md border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition-colors"
        >
          වර්ගීකරණ බලන්න
        </a>
      </div>
    </section>
  );
};
