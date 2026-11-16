import React from 'react';
import { Story } from '../../types/story';

interface StoryCardProps {
  story: Story;
  onSelect: (slug: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onSelect,
  onSelectCategory,
}) => {
  const storyUrl = `/story/${encodeURIComponent(story.slug)}`;
  const categorySlug = story.category || 'romantic';
  const categoryLabel = story.categoryName || story.category || 'සිංහල කතා';
  const excerpt =
    story.shortDescription ||
    story.description ||
    (story.fullContent ? `${story.fullContent.slice(0, 120)}...` : '');

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return;
    e.preventDefault();
    const fullStoryUrl = `${window.location.origin}${storyUrl}`;
    if (
      typeof window.__triggerStoryPopunderSwap === 'function' &&
      window.__triggerStoryPopunderSwap(fullStoryUrl, story.slug)
    ) {
      return;
    }
    onSelect(story.slug);
  };

  return (
    <article
      data-intended-url={storyUrl}
      style={{ border: 'none', boxShadow: 'none' }}
      className="group min-w-0 w-full bg-white dark:bg-[#111a33] rounded-xl overflow-hidden flex flex-col border-0 shadow-none outline-none ring-0 hover:bg-slate-50 dark:hover:bg-[#15203d] transition-colors"
    >
      {/* Clean Card Content (no story image) */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px]">
            <a
              href={`/category/${encodeURIComponent(categorySlug)}`}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  if (onSelectCategory) onSelectCategory(categorySlug);
                }
              }}
              className="font-semibold text-blue-700 dark:text-blue-400 hover:underline truncate"
            >
              {categoryLabel}
            </a>
          </div>

          <h2 className="text-[13px] sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 leading-snug line-clamp-2">
            <a href={storyUrl} onClick={handleCardClick} className="hover:underline">
              {story.title}
            </a>
          </h2>

          {excerpt && (
            <p className="hidden sm:line-clamp-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {excerpt}
            </p>
          )}
        </div>

        <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-blue-700 dark:text-blue-400">
          <a href={storyUrl} onClick={handleCardClick} className="hover:underline">
            කතාව කියවන්න →
          </a>
        </div>
      </div>
    </article>
  );
};

