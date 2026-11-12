import React, { useState, useEffect } from 'react';
import { Story } from '../../types/story';
import { StoryService } from '../../services/storyService';
import { SeoService } from '../../services/seoService';
import { NativeBanner, StoryBanner468 } from '../common/NativeBanner';
import { triggerStoryAd, AD_SMARTLINK_URL } from '../../utils/adTrigger';

interface StoryReaderProps {
  slug: string;
  onBack: () => void;
  onSelectStory: (slug: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectAuthor?: (authorName: string) => void;
  isAmp?: boolean;
}

const FALLBACK_COVER = '/icon.png';

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

  // 10-second Advertisement Gate State
  const [countdown, setCountdown] = useState<number>(10);
  const [isAdGateUnlocked, setIsAdGateUnlocked] = useState<boolean>(false);

  useEffect(() => {
    // Reset countdown and lock for each story view
    setCountdown(10);
    setIsAdGateUnlocked(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsAdGateUnlocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
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

  // 10-Second Advertisement Wait Loading Screen
  if (!isAdGateUnlocked) {
    const progressPercent = ((10 - countdown) / 10) * 100;
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-[#111a33] border border-blue-500/40 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Top glowing accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>දැන්වීම් පරීක්ෂාව • ADVERTISEMENT GATE</span>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              දැන්වීම් ටැබ් එකේ තත්පර 10ක් රැඳී සිටින්න
            </h1>
            <p className="text-sm font-medium text-slate-300">
              Please wait in the advertisement tab for 10 seconds
            </p>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed pt-1">
              නව දැන්වීම් ටැබ් එක විවෘත විය. සම්පූර්ණ කතාව නොමිලේ කියවීම සඳහා කරුණාකර තත්පර 10ක් රැඳී සිටින්න...
            </p>
          </div>

          {/* Animated Countdown Ring */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#1e2d52"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-white font-mono">{countdown}</span>
                <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">තත්පර / sec</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md bg-[#0a1022] rounded-full h-2.5 mt-4 overflow-hidden border border-[#1e2d52]">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {countdown > 0 ? (
              <button
                type="button"
                onClick={() => triggerStoryAd()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1e3a8a] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-900/30 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>↗️</span>
                <span>දැන්වීම් ටැබ් එක නැවත විවෘත කරන්න (Open Ad Tab)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdGateUnlocked(true)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-900/40 inline-flex items-center justify-center gap-2 cursor-pointer animate-pulse"
              >
                <span>📖</span>
                <span>කතාව විවෘතයි — දැන් කියවන්න (Read Story Now)</span>
              </button>
            )}

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>දැන්වීම් ටැබ් එක විවෘත නොවූයේ නම් ඉහත බොත්තම ක්ලික් කරන්න.</span>
            </div>
          </div>

          {/* Story preview card */}
          <div className="mt-6 pt-6 border-t border-[#1e2d52] flex items-center gap-4 text-left bg-[#0d152b] p-3.5 rounded-xl">
            <img
              src={imgSrc}
              alt=""
              className="w-16 h-16 rounded-lg object-cover shrink-0 border border-[#1e2d52]"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-blue-400 font-semibold truncate">
                {story.categoryName || story.category || 'සිංහල කතාව'}
              </div>
              <div className="text-sm font-bold text-white truncate">{story.title}</div>
              <div className="text-xs text-slate-400 line-clamp-1">
                {story.shortDescription || story.description || ''}
              </div>
            </div>
          </div>
        </div>
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

  if (isAmp) {
    return (
      <div className="max-w-3xl mx-auto py-6">
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
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        <article className="bg-[#111a33] border border-[#1e2d52] rounded-lg overflow-hidden">
          <a
            href={AD_SMARTLINK_URL}
            onClick={() => triggerStoryAd()}
            target="_blank"
            rel="noopener noreferrer"
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
                      triggerStoryAd();
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
                      triggerStoryAd();
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
