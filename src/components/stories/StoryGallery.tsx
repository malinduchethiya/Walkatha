import React from 'react';
import { Story, Category } from '../../types/story';
import { StoryCard } from './StoryCard';
import { HOME_FAQ_ENTRIES } from '../../services/seoService';
import {
  TripleInlineBanners320x50,
  NativeBannerAd,
  SMART_LINK_URL,
} from '../common/AdUnits';

interface StoryGalleryProps {
  stories: Story[];
  totalStories: number;
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  onSelectStory: (slug: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: 'latest' | 'popular' | 'oldest';
  onSortChange: (sort: 'latest' | 'popular' | 'oldest') => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export const StoryGallery: React.FC<StoryGalleryProps> = ({
  stories,
  totalStories,
  categories,
  selectedCategory,
  onSelectCategory,
  onSelectStory,
  onSearchChange,
  sortBy,
  onSortChange,
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}) => {
  const getVisiblePages = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1];
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);

    if (start > 2) {
      items.push('ellipsis-start');
    }
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    if (end < totalPages - 1) {
      items.push('ellipsis-end');
    }
    items.push(totalPages);
    return items;
  };

  const visiblePages = getVisiblePages();

  const getPageUrl = (page: number) => {
    const base =
      selectedCategory && selectedCategory !== 'all'
        ? `/category/${encodeURIComponent(selectedCategory)}`
        : '/';
    return page > 1 ? `${base}?page=${page}` : base;
  };

  // Chunk stories in blocks of 6 (3 rows x 2 columns on mobile, 2 rows x 3 columns on desktop)
  // so the native banner appears cleanly after every 3 rows of stories without partial rows.
  const storyChunks: Story[][] = [];
  for (let i = 0; i < stories.length; i += 6) {
    storyChunks.push(stories.slice(i, i + 6));
  }

  return (
    <div className="space-y-5">
      <style>{`
        .story-grid-2col {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          column-gap: 12px !important;
          row-gap: 14px !important;
          width: 100% !important;
        }
        @media (min-width: 640px) {
          .story-grid-2col {
            column-gap: 16px !important;
            row-gap: 18px !important;
          }
        }
        @media (min-width: 1024px) {
          .story-grid-2col {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            column-gap: 20px !important;
            row-gap: 22px !important;
          }
        }
      `}</style>
      <h1 className="sr-only">
        සිංහල වැල කතා | Sinhala Wal Katha &amp; Wela Katha 2026 - අලුත්ම වල් කතා සහ වැල කතා එකතුව
      </h1>

      {/* Sorting option, Story Count & Smart Link below header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={SMART_LINK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
          >
            🔥 විශේෂ සිංහල වැල කතා එකතුව (Special Stories) →
          </a>
          {totalStories > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              • සම්පූර්ණ කතා {totalStories} (පිටුව {currentPage}/{totalPages})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="sort-select"
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            පෙළගැස්ම:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'latest' | 'popular' | 'oldest')}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-[#243763] bg-white dark:bg-[#111a33] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="latest">අලුත්ම කතා (Latest)</option>
            <option value="popular">ජනප්‍රියම (Popular)</option>
            <option value="oldest">පැරණිම (Oldest)</option>
          </select>
        </div>
      </div>

      {/* Stories Grid: 2 columns on mobile, 3 columns on desktop with clear vertical & horizontal spacing */}
      {isLoading ? (
        <div className="story-grid-2col grid grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              style={{ border: 'none' }}
              className="min-w-0 w-full h-52 sm:h-60 rounded-xl bg-white dark:bg-[#111a33] border-0 p-3 animate-pulse"
            />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white dark:bg-[#111a33] rounded-xl p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            ඔබ සෙවූ කතාව හමු නොවීය. සියලුම සිංහල වැල කතා පිරික්සන්න.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onSelectCategory('all');
            }}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[#1e3a8a] text-white hover:bg-blue-800 cursor-pointer"
          >
            සියලුම කතා පෙන්වන්න
          </button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {storyChunks.map((chunk, chunkIdx) => (
            <React.Fragment key={`story-chunk-${chunkIdx}`}>
              <div className="story-grid-2col grid grid-cols-2 lg:grid-cols-3">
                {chunk.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onSelect={onSelectStory}
                    onSelectCategory={onSelectCategory}
                  />
                ))}
              </div>

              {/* Native Banner in between every 3 rows of stories */}
              {chunkIdx < storyChunks.length - 1 && (
                <div className="py-1">
                  <NativeBannerAd slotIndex={chunkIdx} />
                </div>
              )}

              {/* Keep the single middle 3x 320x50 banner strip at the midpoint */}
              {chunkIdx === Math.floor((storyChunks.length - 1) / 2) && (
                <TripleInlineBanners320x50 label="gallery-middle" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Crawlable Pagination showing all pages up to totalPages */}
      {totalPages > 1 && (
        <nav
          aria-label="පිටු අංකනය"
          className="flex items-center justify-center gap-1.5 pt-4 flex-wrap"
        >
          {currentPage > 1 && (
            <a
              href={getPageUrl(currentPage - 1)}
              rel="prev"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onPageChange(currentPage - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#1e2d52] bg-white dark:bg-[#111a33] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162347]"
            >
              ← කලින්
            </a>
          )}

          {visiblePages.map((item) =>
            typeof item === 'string' ? (
              <span
                key={item}
                className="px-2 py-1.5 text-xs text-slate-400 select-none"
              >
                ...
              </span>
            ) : (
              <a
                key={item}
                href={getPageUrl(item)}
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    onPageChange(item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                  item === currentPage
                    ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                    : 'bg-white dark:bg-[#111a33] border-slate-200 dark:border-[#1e2d52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162347]'
                }`}
              >
                {item}
              </a>
            )
          )}

          {currentPage < totalPages && (
            <a
              href={getPageUrl(currentPage + 1)}
              rel="next"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onPageChange(currentPage + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#1e2d52] bg-white dark:bg-[#111a33] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162347]"
            >
              ඊළඟ →
            </a>
          )}
        </nav>
      )}

      {/* Semantic On-Page SEO Topic Cluster, Category Hub & FAQ Section */}
      <section
        aria-label="සිංහල වැල කතා සහ වල් කතා විස්තරය"
        className="mt-8 pt-6 border-t border-slate-200/60 dark:border-[#1a2747] space-y-5 text-xs text-slate-600 dark:text-slate-400"
      >
        <div className="bg-white dark:bg-[#111a33] rounded-xl p-4 sm:p-5 space-y-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            අලුත්ම සිංහල වැල කතා 2026 | Sinhala Wal Katha, Wela Katha &amp; Walkatha9 එකතුව
          </h2>
          <p className="leading-relaxed">
            <strong>Walkathawa (walkathawa.site)</strong> යනු ශ්‍රී ලංකාවේ ජනප්‍රියම සහ විශාලතම{' '}
            <strong>සිංහල වැල කතා (Sinhala Wal Katha)</strong>, <strong>වල් කතා (Wal Katha)</strong>,{' '}
            <strong>වැල කතා (Wela Katha)</strong> සහ <strong>Walkatha9</strong> සම්පූර්ණ කතා එකතුවයි.
            දිනපතා යාවත්කාලීන වන අලුත්ම වල් කතා 2026 (New Sinhala Wal Katha 2026), අම්මා වල් කතා,
            වයිෆ් / බිරිඳ කතා (Wife Wal Katha), අක්කා මල්ලි කතා (Akka Malli Katha), නැන්දා සහ ඇන්ටි කතා
            (Aunty &amp; Nanda Wal Katha), ටීචර් කතා (Teacher Katha) මෙන්ම පාසල් සහ කැම්පස් වැල කතා
            (School &amp; Campus Katha) 600කට අධික ප්‍රමාණයක් මෙහිදී නොමිලේ කියවිය හැක.
          </p>

          {categories && categories.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                ජනප්‍රිය සිංහල වල් කතා වර්ගීකරණ (Top Sinhala Wal Katha Categories):
              </h3>
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
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#162347] text-blue-700 dark:text-blue-300 hover:underline font-medium"
                    >
                      {cat.sinhalaName || cat.name}
                    </a>
                  );
                })}
                <a
                  href="/sitemap"
                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#162347] text-slate-700 dark:text-slate-300 hover:underline font-medium"
                >
                  සියලුම කතා නාමාවලිය (All Stories A–Z) →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Visible FAQ block matching Schema.org FAQPage */}
        <div className="bg-white dark:bg-[#111a33] rounded-xl p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            නිතර අසන ප්‍රශ්න (Sinhala Wal Katha FAQ)
          </h2>
          <div className="space-y-3">
            {HOME_FAQ_ENTRIES.map((faq, idx) => (
              <div key={idx} className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {faq.question}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

