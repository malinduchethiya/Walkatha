import React from 'react';
import { Story, Category } from '../../types/story';
import { StoryCard } from './StoryCard';
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
      <h1 className="sr-only">සිංහල වැල කතා | වල් කතා සහ වැල කතා 2026</h1>

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
        <div className="story-grid-2col grid grid-cols-2 lg:grid-cols-3 gap-x-3.5 gap-y-4 sm:gap-x-5 sm:gap-y-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="min-w-0 w-full h-56 sm:h-64 rounded-xl bg-white dark:bg-[#111a33] border border-slate-200 dark:border-[#1e2d52] p-3 sm:p-4 animate-pulse"
            />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white dark:bg-[#111a33] border border-slate-200 dark:border-[#1e2d52] rounded-lg p-8 text-center">
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
        <div className="space-y-5 sm:space-y-6">
          {storyChunks.map((chunk, chunkIdx) => (
            <React.Fragment key={`story-chunk-${chunkIdx}`}>
              <div className="story-grid-2col grid grid-cols-2 lg:grid-cols-3 gap-x-3.5 gap-y-4 sm:gap-x-5 sm:gap-y-5">
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
    </div>
  );
};
