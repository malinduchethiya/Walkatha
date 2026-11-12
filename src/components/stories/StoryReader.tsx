import React, { useState, useEffect, useRef } from 'react';
import { Story } from '../../types/story';
import { StoryService } from '../../services/storyService';
import { SeoService } from '../../services/seoService';
import { NativeBanner, StoryBanner468 } from '../common/NativeBanner';

interface StoryReaderProps {
  slug: string;
  onBack: () => void;
  onSelectStory: (slug: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectAuthor?: (authorName: string) => void;
  isAmp?: boolean;
}

const FALLBACK_COVER = '/icon.png';
const STORY_IMAGE_LINK = 'https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd';
const REOPEN_STORAGE_KEY = 'walkathawa_reopened_story';

declare global {
  interface Window {
    __triggerStoryPopunderSwap?: (
      storyUrl: string,
      storySlug?: string,
      explicitAdUrl?: string
    ) => boolean;
    __triggerStoryReaderPopunderSwap?: (
      storyUrl: string,
      storySlug?: string,
      explicitAdUrl?: string
    ) => boolean;
    __canTriggerPopunderSwap?: () => boolean;
    __canTriggerStoryReaderPopunderSwap?: () => boolean;
    __storyContentAlreadySwapped?: boolean;
  }
}

export function splitStoryParagraphs(rawContent: string): string[] {
  const initial = (rawContent || '')
    .split(/\n\s*\n|\r\n\s*\r\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (initial.length > 1) {
    return initial;
  }

  const sentences = (rawContent || '')
    .replace(/([.!?।])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length > 0 ? sentences : ['සිංහල කතාව'];
}

export const StoryReader: React.FC<StoryReaderProps> = ({
  slug,
  onBack,
  onSelectStory,
  onSelectCategory,
  onSelectAuthor,
  isAmp = false,
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK_COVER);
  const [prevStory, setPrevStory] = useState<Story | null>(null);
  const [nextStory, setNextStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isRedirectingThisTabRef = useRef<boolean>(false);
  const pendingScrollYRef = useRef<number | null>(null);

  useEffect(() => {
    isRedirectingThisTabRef.current = false;
    window.__storyContentAlreadySwapped = false;

    try {
      const raw = localStorage.getItem(REOPEN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.ts === 'number' && Date.now() - parsed.ts < 8000) {
          if (typeof parsed.scrollY === 'number' && parsed.scrollY > 0) {
            pendingScrollYRef.current = parsed.scrollY;
          }
          localStorage.removeItem(REOPEN_STORAGE_KEY);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [slug]);

  useEffect(() => {
    let active = true;

    const loadStory = async () => {
      setIsLoading(true);
      try {
        const fetched = await StoryService.getStoryBySlug(slug);
        if (!active) return;

        if (fetched) {
          setStory(fetched);
          setImgSrc(
            fetched.coverImage && fetched.coverImage.trim()
              ? fetched.coverImage
              : FALLBACK_COVER
          );
          SeoService.updateStorySeo(fetched);

          const allStories = await StoryService.fetchAllLiveStories();
          if (!active) return;

          const idx = allStories.findIndex(
            (s) => s.id === fetched.id || s.slug === fetched.slug
          );
          const prev = idx > 0 ? allStories[idx - 1] : allStories[allStories.length - 1] || null;
          const next =
            idx >= 0 && idx < allStories.length - 1 ? allStories[idx + 1] : allStories[0] || null;

          setPrevStory(prev);
          setNextStory(next);
        } else {
          setStory(null);
        }
      } catch {
        if (active) setStory(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadStory();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!isLoading && story && pendingScrollYRef.current !== null) {
      const targetY = pendingScrollYRef.current;
      pendingScrollYRef.current = null;
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
      });
    }
  }, [isLoading, story]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-4">
        <div className="h-8 w-2/3 rounded bg-[#111a33] animate-pulse" />
        <div className="h-96 rounded-lg bg-[#111a33] border border-[#1e2d52] animate-pulse" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center bg-[#111a33] border border-[#1e2d52] rounded-lg p-6">
        <h1 className="text-lg font-bold text-white mb-2">Story Not Found</h1>
        <p className="text-xs text-slate-300 mb-4">
          ඔබ සෙවූ කතාව දැනට ලබාගත නොහැක. වෙනත් සිංහල වැල කතාවක් තෝරාගන්න.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-md bg-[#1e3a8a] text-white text-xs font-semibold cursor-pointer"
        >
          මුල් පිටුවට යන්න
        </button>
      </div>
    );
  }

  const rawContent = story.fullContent || story.content || story.shortDescription || '';
  const paragraphs = splitStoryParagraphs(rawContent);

  const primaryCatSlug = story.category || 'amma-putha';
  const primaryCatLabel = story.categoryName || story.category || 'අම්ම පුතා';
  const secondaryCatSlug = story.tags && story.tags[0] ? story.tags[0] : null;
  const authorName: string =
    typeof story.author === 'string'
      ? story.author || 'WalKatha'
      : story.author?.name || 'WalKatha';
  const encodedAuthor = encodeURIComponent(authorName);
  const fullStoryPageUrl = `${window.location.origin}/story/${encodeURIComponent(story.slug)}`;

  const handleStoryContentTouchOrClick = () => {
    if (isRedirectingThisTabRef.current) return;

    if (typeof window.__triggerStoryReaderPopunderSwap === 'function') {
      const triggered = window.__triggerStoryReaderPopunderSwap(
        fullStoryPageUrl,
        story.slug,
        STORY_IMAGE_LINK
      );
      if (triggered) {
        isRedirectingThisTabRef.current = true;
        window.__storyContentAlreadySwapped = true;
      }
    }
  };

  if (isAmp) {
    return (
      <div
        className="max-w-3xl mx-auto py-6"
        onClickCapture={handleStoryContentTouchOrClick}
        onTouchEndCapture={handleStoryContentTouchOrClick}
      >
        <article className="bg-[#111a33] border border-[#1e2d52] rounded-lg p-6 space-y-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{story.title}</h1>
          <div className="space-y-4 text-base leading-relaxed text-slate-200">
            {paragraphs.map((para, idx) => (
              <p key={idx} data-reading-content>
                {para}
              </p>
            ))}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div
      className="max-w-4xl mx-auto"
      onClickCapture={handleStoryContentTouchOrClick}
      onTouchEndCapture={handleStoryContentTouchOrClick}
    >
      <div className="space-y-6">
        <article className="bg-[#111a33] border border-[#1e2d52] rounded-lg overflow-hidden">
          <a
            href={ fullStoryPageUrl }
            onClick={(e) => {
              e.preventDefault();
              handleStoryContentTouchOrClick();
            }}
            className="block w-full aspect-[16/9] max-h-96 bg-[#0d152b] overflow-hidden border-b border-[#1e2d52]"
          >
            <img
              src={imgSrc}
              alt={story.title}
              decoding="async"
              onError={() => {
                if (imgSrc !== FALLBACK_COVER) {
                  setImgSrc(FALLBACK_COVER);
                }
              }}
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
            />
          </a>

          <div className="p-5 sm:p-8">
            <header className="pb-5 mb-6 border-b border-[#1e2d52] space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/category/${encodeURIComponent(primaryCatSlug)}`}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      onSelectCategory(primaryCatSlug);
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-[#162347] text-blue-300 text-xs font-semibold hover:underline"
                >
                  {primaryCatLabel}
                </a>
                {secondaryCatSlug && secondaryCatSlug !== primaryCatLabel && (
                  <a
                    href={`/category/${encodeURIComponent(secondaryCatSlug)}`}
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        onSelectCategory(secondaryCatSlug);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-[#162347] text-blue-300 text-xs font-semibold hover:underline"
                  >
                    {secondaryCatSlug}
                  </a>
                )}
              </div>

              <h1 className="text-xl sm:text-3xl font-bold text-white leading-snug">
                {story.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                <span>By</span>
                <a
                  href={`/profile/${encodedAuthor}`}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey && onSelectAuthor) {
                      e.preventDefault();
                      onSelectAuthor(authorName);
                    }
                  }}
                  className="text-blue-400 hover:underline font-medium"
                >
                  {authorName}
                </a>
                {story.uploadDate && (
                  <>
                    <span>•</span>
                    <time dateTime={story.uploadDate}>
                      {new Date(story.uploadDate).toLocaleDateString('si-LK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </>
                )}
              </div>
            </header>

            <div className="space-y-4 text-base sm:text-lg leading-relaxed text-slate-200 select-text">
              {paragraphs.map((para, i) => {
                const insertAfterIndex = paragraphs.length >= 3 ? 1 : 0;
                return (
                  <React.Fragment key={i}>
                    <p
                      data-reading-content
                      className="leading-[1.95] tracking-normal break-words"
                    >
                      {para}
                    </p>
                    {i === insertAfterIndex && (
                      <StoryBanner468 refreshKey={`${story.slug}-p2`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <blockquote className="mt-6 p-4 rounded-lg bg-[#0d152b] border-l-4 border-blue-500 text-xs sm:text-sm text-slate-300 space-y-1">
              <p>
                අලුත්ම සිංහල වැල කතා දිනපතා එසැණින් කියවීමට අපගේ Telegram නාලිකාව සමඟ එක්වන්න:{' '}
                <a
                  href="https://t.me/walkathawa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline font-semibold"
                >
                  https://t.me/walkathawa
                </a>
              </p>
            </blockquote>

            {/* Free space below story body: 468x60 Banner + Native Banner */}
            <StoryBanner468 refreshKey={`${story.slug}-bottom`} className="mt-6" />
            <NativeBanner refreshKey={story.slug} className="mt-4" />

            <footer className="mt-8 pt-6 border-t border-[#1e2d52] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={prevStory ? `/story/${encodeURIComponent(prevStory.slug)}` : '/'}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey && prevStory) {
                      e.preventDefault();
                      onSelectStory(prevStory.slug);
                    }
                  }}
                  className="px-3 py-2.5 rounded-lg bg-[#162347] hover:bg-[#1e2f5e] text-center text-xs sm:text-sm font-semibold text-white transition-colors"
                >
                  Previous
                </a>
                <a
                  href={nextStory ? `/story/${encodeURIComponent(nextStory.slug)}` : '/'}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey && nextStory) {
                      e.preventDefault();
                      onSelectStory(nextStory.slug);
                    }
                  }}
                  className="px-3 py-2.5 rounded-lg bg-[#162347] hover:bg-[#1e2f5e] text-center text-xs sm:text-sm font-semibold text-white transition-colors"
                >
                  Next
                </a>
              </div>
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
};
