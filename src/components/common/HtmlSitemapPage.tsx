import React, { useState, useEffect } from 'react';
import type { Story, Category } from '../../types/story';
import { StoryService } from '../../services/storyService';
import { SeoService } from '../../services/seoService';
import { cleanCategoryBadgeName } from '../../utils/formatters';

interface HtmlSitemapPageProps {
  categories: Category[];
  onSelectStory: (slug: string) => void;
  onSelectCategory: (slug: string) => void;
  onBack: () => void;
}

export const HtmlSitemapPage: React.FC<HtmlSitemapPageProps> = ({
  categories,
  onSelectStory,
  onSelectCategory,
  onBack,
}) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    StoryService.fetchAllLiveStories()
      .then((all) => {
        if (!cancelled) {
          setStories(all);
          SeoService.updateSitemapPageSeo(all.length);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, fn: () => void) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    fn();
  };

  const filtered = filter.trim()
    ? stories.filter((s) =>
        (s.title || '').toLowerCase().includes(filter.trim().toLowerCase())
      )
    : stories;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="pb-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-50">
            සම්පූර්ණ කතා නාමාවලිය
          </h1>
          <p className="text-sm text-zinc-400 tabular-nums">
            මුළු කතා {stories.length.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="sitemap-filter" className="sr-only">
            Filter stories
          </label>
          <input
            id="sitemap-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="නාමාවලියෙන් සොයන්න..."
            className="h-9 px-3 text-xs bg-[#16161a] text-zinc-100 placeholder:text-zinc-500 border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-500"
          />
          <a
            href="/"
            onClick={(e) => handleLink(e, onBack)}
            className="text-xs text-zinc-400 hover:text-zinc-100 shrink-0"
          >
            ← මුල් පිටුව
          </a>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            වර්ගීකරණ
          </h2>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {categories.map((cat) => {
              const slug = cat.slug || cat.id;
              return (
                <a
                  key={slug}
                  href={`/category/${encodeURIComponent(slug)}`}
                  onClick={(e) => handleLink(e, () => onSelectCategory(slug))}
                  className="text-zinc-300 hover:text-amber-400 transition-colors"
                >
                  {cleanCategoryBadgeName(cat.sinhalaName || cat.name)}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          සියලුම කතා ({filtered.length})
        </h2>
        {loading ? (
          <p className="text-sm text-zinc-500 py-8">ලැයිස්තුව පූරණය වෙමින්...</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y divide-zinc-800/60">
            {filtered.map((s) => {
              const storySlug = s.slug || s.id;
              return (
                <li key={s.id || storySlug}>
                  <a
                    href={`/story/${encodeURIComponent(storySlug)}`}
                    onClick={(e) => handleLink(e, () => onSelectStory(storySlug))}
                    className="py-2.5 block text-sm text-zinc-300 hover:text-amber-400 transition-colors truncate"
                  >
                    {s.title}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
