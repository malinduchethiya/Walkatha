import React from 'react';
import type { Story, Category } from '../../types/story';
import { StoryCard } from './StoryCard';
import { Pagination } from '../common/Pagination';
import { cleanCategoryBadgeName } from '../../utils/formatters';
import type { ViewMode } from '../../utils/storyFormatting';

interface StoryGalleryProps {
  stories: Story[];
  totalStories: number;
  categories: Category[];
  selectedCategory: string;
  selectedAuthor?: string;
  onSelectCategory: (catSlug: string) => void;
  onSelectStory: (slug: string) => void;
  searchQuery: string;
  onClearSearch: () => void;
  sortBy: 'latest' | 'popular' | 'oldest';
  onSortChange: (sort: 'latest' | 'popular' | 'oldest') => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  pageKind: ViewMode;
}

export const StoryGallery: React.FC<StoryGalleryProps> = ({
  stories,
  totalStories,
  categories,
  selectedCategory,
  selectedAuthor = 'Walkathawa',
  onSelectCategory,
  onSelectStory,
  searchQuery,
  onClearSearch,
  sortBy,
  onSortChange,
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
  pageKind,
}) => {
  const activeCatObj =
    selectedCategory && selectedCategory !== 'all'
      ? categories.find(
          (c) =>
            (c.slug || '').toLowerCase() === selectedCategory.toLowerCase() ||
            (c.id || '').toLowerCase() === selectedCategory.toLowerCase()
        )
      : null;

  let heading = 'නවතම කතා';
  let subheading: string | undefined;
  let paginationBase = '/';

  if (pageKind === 'category') {
    heading = activeCatObj
      ? cleanCategoryBadgeName(activeCatObj.sinhalaName || activeCatObj.name)
      : selectedCategory;
    subheading = activeCatObj?.description;
    paginationBase = `/category/${encodeURIComponent(selectedCategory)}`;
  } else if (pageKind === 'popular') {
    heading = 'ජනප්‍රිය කතා';
    paginationBase = '/popular';
  } else if (pageKind === 'archives') {
    heading = 'ලේඛනාගාරය';
    paginationBase = '/archives';
  } else if (pageKind === 'profile') {
    heading = selectedAuthor;
    paginationBase = `/profile/${encodeURIComponent(selectedAuthor)}`;
  } else if (pageKind === 'search') {
    heading = searchQuery ? `“${searchQuery}” සෙවුම් ප්‍රතිඵල` : 'සෙවුම් ප්‍රතිඵල';
    paginationBase = '/search';
  }

  const handleCatLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelectCategory(slug);
  };

  const showCategoryStrip =
    (pageKind === 'home' || pageKind === 'category') && categories.length > 0;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Page Title & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-50">
            {heading}
          </h1>
          {subheading ? (
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">{subheading}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 text-xs text-zinc-400">
          {!isLoading && (
            <span className="tabular-nums">
              කතා {totalStories.toLocaleString()}
            </span>
          )}

          {pageKind !== 'popular' && (
            <div className="flex items-center gap-2">
              <label htmlFor="story-sort-select" className="sr-only">
                Sort stories
              </label>
              <select
                id="story-sort-select"
                value={sortBy}
                onChange={(e) =>
                  onSortChange(e.target.value as 'latest' | 'popular' | 'oldest')
                }
                className="h-8 px-2.5 text-xs bg-[#16161a] text-zinc-200 border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-500 cursor-pointer"
              >
                <option value="latest">නවතම</option>
                <option value="popular">ජනප්‍රිය</option>
                <option value="oldest">පැරණි</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Minimal Unboxed Category Filter Strip */}
      {showCategoryStrip && (
        <nav
          aria-label="Category filter"
          className="no-scrollbar flex items-center gap-5 overflow-x-auto py-3.5 border-b border-zinc-800/60 text-xs"
        >
          <a
            href="/"
            onClick={(e) => handleCatLinkClick(e, 'all')}
            aria-current={selectedCategory === 'all' ? 'page' : undefined}
            className={`whitespace-nowrap pb-0.5 transition-colors ${
              selectedCategory === 'all'
                ? 'text-amber-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            සියල්ල
          </a>
          {categories.map((cat) => {
            const slug = cat.slug || cat.id;
            const isSelected = selectedCategory.toLowerCase() === slug.toLowerCase();
            return (
              <a
                key={slug}
                href={`/category/${encodeURIComponent(slug)}`}
                onClick={(e) => handleCatLinkClick(e, slug)}
                aria-current={isSelected ? 'page' : undefined}
                className={`whitespace-nowrap pb-0.5 transition-colors ${
                  isSelected
                    ? 'text-amber-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {cleanCategoryBadgeName(cat.sinhalaName || cat.name)}
              </a>
            );
          })}
        </nav>
      )}

      {/* Stories Grid */}
      <div className="pt-7">
        {isLoading ? (
          <div
            aria-busy="true"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-9"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video w-full rounded-md bg-zinc-900 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-zinc-900 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-zinc-900 animate-pulse" />
                <div className="h-3 w-full rounded bg-zinc-900 animate-pulse" />
              </div>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="py-16 text-center space-y-4 border border-zinc-800/80 rounded-md bg-[#16161a]/50">
            <p className="text-sm text-zinc-300">
              {searchQuery
                ? `“${searchQuery}” සඳහා කතා කිසිවක් හමු නොවීය.`
                : 'මෙම කොටසේ දැනට කතා කිසිවක් නොමැත.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {searchQuery && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="px-4 py-2 text-xs font-medium rounded-md bg-zinc-100 text-zinc-950 hover:bg-white transition-colors cursor-pointer"
                >
                  සෙවුම ඉවත් කරන්න
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="px-4 py-2 text-xs font-medium rounded-md border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition-colors cursor-pointer"
              >
                සියලුම කතා බලන්න
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              data-testid="story-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-6 gap-y-9"
            >
              {stories.map((story) => (
                <StoryCard
                  key={story.id || story.slug}
                  story={story}
                  categories={categories}
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath={paginationBase}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
    </section>
  );
};
