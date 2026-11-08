import React, { useEffect, useState } from 'react';
import { Story, Category } from '../../types/story';
import { StoryService } from '../../services/storyService';
import { SeoService } from '../../services/seoService';

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
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    StoryService.fetchAllLiveStories()
      .then((stories) => {
        if (!active) return;
        setAllStories(stories);
        SeoService.updateSitemapPageSeo(stories.length);
      })
      .catch(() => {
        if (active) setAllStories([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[#111a33] rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-white">
            Wal Katha — Complete Sitemap
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Wal Katha වෙබ් අඩවියේ ඇති සියලුම සිංහල වැල කතා, වල් කතා සහ Wela Katha ({allStories.length}) එකම පිටුවකින්.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#162347] text-slate-200 hover:bg-[#1e2f5e] cursor-pointer"
        >
          ← මුල් පිටුවට
        </button>
      </div>

      <section className="bg-[#111a33] rounded-xl p-5 space-y-3">
        <div className="text-sm sm:text-base font-bold text-white">
          1. ප්‍රධාන වර්ගීකරණ (Story Categories)
        </div>
        <div className="flex flex-wrap gap-2">
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
                className="px-3 py-1.5 rounded-lg bg-[#162347] text-xs font-semibold text-blue-300 hover:underline"
              >
                {cat.sinhalaName || cat.name}
              </a>
            );
          })}
        </div>
      </section>

      <section className="bg-[#111a33] rounded-xl p-5 space-y-3">
        <div className="text-sm sm:text-base font-bold text-white">
          2. සියලුම සිංහල වැල කතා ලැයිස්තුව ({allStories.length} Stories)
        </div>
        {isLoading ? (
          <p className="text-xs text-slate-500">කතා ලැයිස්තුව පූරණය වෙමින් පවතී...</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {allStories.map((story) => (
              <li key={story.id} className="truncate">
                <a
                  href={`/posts/${encodeURIComponent(story.slug)}`}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      onSelectStory(story.slug);
                    }
                  }}
                  className="text-blue-400 hover:underline"
                >
                  • {story.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
