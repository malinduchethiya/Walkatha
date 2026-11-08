import React from 'react';
import { Story, Category } from '../../types/story';
import { StoryCard } from './StoryCard';
import { NativeBanner, StoryBanner468 } from '../common/NativeBanner';

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
  pageKind?: 'home' | 'category' | 'popular' | 'archives' | 'profile' | 'search';
  headingText?: string;
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
  pageKind = 'home',
  headingText,
}) => {
  const isStrictHome =
    pageKind === 'home' && (!selectedCategory || selectedCategory === 'all');

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
    if (pageKind === 'popular') return page > 1 ? `/popular?page=${page}` : '/popular';
    if (pageKind === 'archives') return page > 1 ? `/archives?page=${page}` : '/archives';
    const base =
      selectedCategory && selectedCategory !== 'all'
        ? `/category/${encodeURIComponent(selectedCategory)}`
        : '/';
    return page > 1 ? `${base}?page=${page}` : base;
  };

  const h1Label =
    headingText ||
    (isStrictHome
      ? 'Wal Katha - Sinhala Wal Katha & Wela Katha'
      : `Wal Katha - ${selectedCategory}`);

  // 3 columns x 5 rows = 15 stories per page
  const displayedStories = stories.slice(0, 15);

  return (
    <div className="space-y-5">
      <h1 className="sr-only">{h1Label}</h1>

      {/* Sorting option & Story Count below header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {totalStories > 0 && (
            <span className="text-xs text-slate-400">
              සම්පූර්ණ කතා {totalStories} (පිටුව {currentPage}/{totalPages})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-medium text-slate-400">
            පෙළගැස්ම:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'latest' | 'popular' | 'oldest')}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#243763] bg-[#111a33] text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="latest">අලුත්ම කතා (Latest)</option>
            <option value="popular">ජනප්‍රියම (Popular)</option>
            <option value="oldest">පැරණිම (Oldest)</option>
          </select>
        </div>
      </div>

      {/* 468x60 Banner in free space above the 3x5 gallery grid */}
      <StoryBanner468 refreshKey={`top-${pageKind}-${selectedCategory}-${currentPage}`} />

      {/* Stories Grid: 3 columns x 5 rows (15 items) */}
      {isLoading ? (
        <div className="story-grid-3x5 grid grid-cols-3 gap-3 sm:gap-5">
          {Array.from({ length: 15 }).map((_, idx) => (
            <div
              key={idx}
              className="min-w-0 w-full h-52 sm:h-60 rounded-xl bg-[#111a33] p-3 animate-pulse"
            />
          ))}
        </div>
      ) : displayedStories.length === 0 ? (
        <div className="bg-[#111a33] rounded-xl p-8 text-center">
          <p className="text-sm text-slate-300 mb-3">
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
        <div className="story-grid-3x5 grid grid-cols-3 gap-3 sm:gap-5">
          {displayedStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onSelect={onSelectStory}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      )}

      {/* Free space below the 3x5 grid: 468x60 Banner + Native Banner */}
      <StoryBanner468 refreshKey={`bottom-${pageKind}-${selectedCategory}-${currentPage}`} />
      <NativeBanner refreshKey={`${pageKind}-${selectedCategory}-${currentPage}`} />

      {/* Paginator Row */}
      <nav
        aria-label="පිටු අංකනය"
        className="flex items-center justify-center gap-2 pt-4 flex-wrap"
      >
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {totalPages > 1 && currentPage > 1 && (
            <a
              href={getPageUrl(currentPage - 1)}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onPageChange(currentPage - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-[#1e2d52] bg-[#111a33] text-slate-200 hover:bg-[#162347]"
            >
              ← කලින්
            </a>
          )}

          {totalPages > 1 &&
            visiblePages.map((item) =>
              typeof item === 'string' ? (
                <span key={item} className="px-2 py-1.5 text-xs text-slate-400 select-none">
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
                      : 'bg-[#111a33] border-[#1e2d52] text-slate-200 hover:bg-[#162347]'
                  }`}
                >
                  {item}
                </a>
              )
            )}

          {totalPages > 1 && currentPage < totalPages && (
            <a
              href={getPageUrl(currentPage + 1)}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onPageChange(currentPage + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-[#1e2d52] bg-[#111a33] text-slate-200 hover:bg-[#162347]"
            >
              ඊළඟ →
            </a>
          )}
        </div>
      </nav>
    </div>
  );
};
