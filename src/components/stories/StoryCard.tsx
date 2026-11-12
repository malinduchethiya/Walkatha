import React, { useState, useEffect } from 'react';
import { Story } from '../../types/story';
import { triggerStoryAd, AD_SMARTLINK_URL } from '../../utils/adTrigger';

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

  useEffect(() => {
    setImgSrc(
      story.coverImage && story.coverImage.trim() ? story.coverImage : FALLBACK_COVER
    );
  }, [story.coverImage]);

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
    triggerStoryAd();
    onSelect(story.slug);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return;
    e.preventDefault();
    triggerStoryAd();
    onSelect(story.slug);
  };

  return (
    <article
      style={{ border: 'none', boxShadow: 'none' }}
      className="group min-w-0 w-full bg-white dark:bg-[#111a33] rounded-xl overflow-hidden flex flex-col border-0 shadow-none outline-none ring-0 hover:bg-slate-50 dark:hover:bg-[#15203d] transition-colors"
    >
      {/* Thumbnail Image linked to story + triggers ad tab */}
      <a
        href={AD_SMARTLINK_URL}
        onClick={handleImageClick}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative w-full aspect-[16/10] bg-slate-100 dark:bg-[#0d152b] overflow-hidden shrink-0 cursor-pointer"
      >
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            if (imgSrc !== FALLBACK_COVER) {
              setImgSrc(FALLBACK_COVER);
            }
          }}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
      </a>

      {/* Clean Card Content */}
      <div className="p-2.5 sm:p-3.5 flex flex-col flex-1 justify-between gap-1.5">
        <div className="space-y-1">
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
            <p className="hidden sm:line-clamp-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
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
