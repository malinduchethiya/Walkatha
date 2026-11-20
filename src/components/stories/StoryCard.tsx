import React, { useState } from 'react';
import type { Story, Category } from '../../types/story';
import { formatSinhalaTimeAgo } from '../../utils/formatters';
import { getStoryExcerpt, getCategoryLabel } from '../../utils/storyFormatting';

interface StoryCardProps {
  story: Story;
  categories: Category[];
  onSelectStory: (slug: string) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  categories,
  onSelectStory,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const storySlug = story.slug || story.id;
  const href = `/story/${encodeURIComponent(storySlug)}`;
  const categoryLabel = getCategoryLabel(story, categories);
  const timeLabel = formatSinhalaTimeAgo(story.uploadDate || story.createdAt);
  const readMins = story.readingTime || 5;
  const excerpt = getStoryExcerpt(story, 125);
  const hasValidCover = Boolean(story.coverImage && story.coverImage.trim() && !imageFailed);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelectStory(storySlug);
  };

  return (
    <article className="group flex flex-col">
      <a
        href={href}
        onClick={handleClick}
        className="flex flex-col h-full focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded-md"
      >
        <div className="aspect-video w-full overflow-hidden rounded-md bg-[#16161a] border border-zinc-800/80 mb-3">
          {hasValidCover ? (
            <img
              src={story.coverImage}
              alt={story.title}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full flex items-end p-4 bg-[#16161a]">
              <span className="text-xs font-medium text-zinc-500 line-clamp-1">
                {categoryLabel}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 truncate">
            <span className="text-amber-500/90 font-medium truncate">{categoryLabel}</span>
            {timeLabel && (
              <>
                <span aria-hidden="true" className="text-zinc-600">
                  ·
                </span>
                <span className="shrink-0">{timeLabel}</span>
              </>
            )}
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span className="shrink-0 tabular-nums">මිනි. {readMins}</span>
          </div>

          <h2 className="text-[15px] font-semibold leading-snug text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-2">
            {story.title}
          </h2>

          {excerpt && (
            <p className="text-[13px] leading-relaxed text-zinc-400 line-clamp-2">
              {excerpt}
            </p>
          )}
        </div>
      </a>
    </article>
  );
};
