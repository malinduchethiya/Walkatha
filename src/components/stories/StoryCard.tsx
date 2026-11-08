import React, { useState } from 'react';
import { Story } from '../../types/story';

interface StoryCardProps {
  story: Story;
  onSelect: (slug: string) => void;
  onSelectCategory?: (category: string) => void;
}

const FALLBACK_COVER = '/icon.png';

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onSelect,
  onSelectCategory,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(
    story.coverImage && story.coverImage.trim() ? story.coverImage : FALLBACK_COVER
  );

  const excerpt =
    story.shortDescription ||
    story.description ||
    (story.fullContent ? `${story.fullContent.slice(0, 140)}...` : '');

  const storyHref = `/story/${encodeURIComponent(story.slug)}`;
  const categorySlug = story.category || 'romantic';

  return (
    <article
      style={{ border: 'none' }}
      className="min-w-0 w-full h-full bg-white dark:bg-[#111a33] rounded-xl border-0 shadow-sm hover:shadow-md dark:hover:bg-[#15203f] transition-all flex flex-col justify-between overflow-hidden"
    >
      <div className="min-w-0">
        <a
          href={storyHref}
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              onSelect(story.slug);
            }
          }}
          className="block relative aspect-[16/10] w-full bg-slate-100 dark:bg-[#0d152b] overflow-hidden"
        >
          <img
            src={imgSrc}
            alt={story.title}
            loading="lazy"
            decoding="async"
            onError={() => {
              if (imgSrc !== FALLBACK_COVER) {
                setImgSrc(FALLBACK_COVER);
              }
            }}
            className="w-full h-full object-cover block"
          />
        </a>

        <div className="p-2.5 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1 text-[11px] sm:text-xs min-w-0">
            <a
              href={`/category/${encodeURIComponent(categorySlug)}`}
              onClick={(e) => {
                if (onSelectCategory && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onSelectCategory(categorySlug);
                }
              }}
              className="font-semibold text-blue-700 dark:text-blue-400 hover:underline truncate"
            >
              {story.categoryName || story.category || 'සිංහල කතා'}
            </a>
          </div>

          <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1 sm:mb-1.5 leading-snug line-clamp-2 break-words">
            <a
              href={storyHref}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  onSelect(story.slug);
                }
              }}
              className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            >
              {story.title}
            </a>
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed break-words">
            {excerpt}
          </p>
        </div>
      </div>

      <div
        style={{ borderTop: 'none' }}
        className="px-2.5 sm:px-4 pb-2.5 sm:pb-3 pt-1 flex items-center justify-end text-[11px] sm:text-xs min-w-0"
      >
        <a
          href={storyHref}
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              onSelect(story.slug);
            }
          }}
          className="font-semibold text-blue-700 dark:text-blue-400 hover:underline shrink-0"
        >
          කියවන්න →
        </a>
      </div>
    </article>
  );
};

export default StoryCard;
