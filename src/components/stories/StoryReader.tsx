import React, { useState, useEffect, useRef } from 'react';
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
  const [isFrozen, setIsFrozen] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? !document.hidden : true;
  });

  const hiddenStartTimeRef = useRef<number | null>(null);
  const totalAdTimeMsRef = useRef<number>(0);

  useEffect(() => {
    // Reset countdown and ad time for each story slug
    setCountdown(10);
    setIsAdGateUnlocked(false);
    totalAdTimeMsRef.current = 0;

    const isCurrentlyHidden = typeof document !== 'undefined' ? document.hidden : false;
    setIsFrozen(!isCurrentlyHidden);

    if (isCurrentlyHidden) {
      hiddenStartTimeRef.current = Date.now();
    } else {
      hiddenStartTimeRef.current = null;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away to the advertisement tab -> resume countdown
        hiddenStartTimeRef.current = Date.now();
        setIsFrozen(false);
      } else {
        // User returned to the story tab -> freeze countdown
        if (hiddenStartTimeRef.current) {
          const elapsed = Date.now() - hiddenStartTimeRef.current;
          totalAdTimeMsRef.current += elapsed;
          hiddenStartTimeRef.current = null;
        }
        setIsFrozen(true);

        const currentTotal = totalAdTimeMsRef.current;
        const remaining = Math.max(0, Math.ceil((10000 - currentTotal) / 1000));
        setCountdown(remaining);
        if (currentTotal >= 10000) {
          setIsAdGateUnlocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic check while hidden to keep countdown updated and unlock once 10s is reached
    const interval = setInterval(() => {
      let currentTotal = totalAdTimeMsRef.current;
      if (typeof document !== 'undefined' && document.hidden && hiddenStartTimeRef.current) {
        currentTotal += Date.now() - hiddenStartTimeRef.current;
      }
      const remaining = Math.max(0, Math.ceil((10000 - currentTotal) / 1000));
      setCountdown(remaining);

      if (currentTotal >= 10000) {
        setIsAdGateUnlocked(true);
        clearInterval(interval);
      }
    }, 250);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
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
    const progressPercent = Math.min(100, Math.max(0, ((10 - countdown) / 10) * 100));
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div
          className={`bg-[#111a33] border ${
            isFrozen ? 'border-amber-500/50 shadow-amber-950/30' : 'border-blue-500/40 shadow-blue-900/30'
          } rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden transition-all duration-300`}
        >
          {/* Top glowing accent */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 ${
              isFrozen
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400'
                : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400'
            }`}
          />

          {/* Status Badge */}
          {isFrozen ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>⏸️ කාල ගණනය නතර වී ඇත • COUNTDOWN FROZEN</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>⏱️ දැන්වීම් කාලය ගණනය වෙමින් පවතී • COUNTING IN AD TAB</span>
            </div>
          )}

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {isFrozen
                ? 'දැන්වීම් ටැබ් එක වෙත මාරු වන්න'
                : 'දැන්වීම් ටැබ් එකේ තත්පර 10ක් රැඳී සිටින්න'}
            </h1>
            <p className={`text-sm font-semibold ${isFrozen ? 'text-amber-300' : 'text-slate-300'}`}>
              {isFrozen
                ? 'ඔබ මෙම පිටුවේ සිටින විට කාල ගණනය නතර වේ (Countdown is frozen on this tab)'
                : 'Please stay on the advertisement tab for 10 seconds'}
            </p>
            <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed pt-1">
              {isFrozen
                ? `කතාව විවෘත වීමට කරුණාකර දැන්වීම් ටැබ් එක වෙත මාරු වී එහි ඉතිරි තත්පර ${countdown} රැඳී සිටින්න. ඔබ දැන්වීම් ටැබ් එකේ සිටින විට පමණක් කාලය ගණනය වේ.`
                : 'දැන්වීම් ටැබ් එකේ රැඳී සිටින කාලය ගණනය වේ. තත්පර 10 සම්පූර්ණ වූ පසු කතාව ස්වයංක්‍රීයව විවෘත වේ.'}
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
                  stroke={isFrozen ? '#f59e0b' : '#3b82f6'}
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-300 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-extrabold font-mono ${isFrozen ? 'text-amber-400' : 'text-white'}`}>
                  {countdown}
                </span>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${isFrozen ? 'text-amber-300' : 'text-blue-400'}`}>
                  {isFrozen ? 'නතර විය / FROZEN' : 'තත්පර / SEC'}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md bg-[#0a1022] rounded-full h-2.5 mt-4 overflow-hidden border border-[#1e2d52]">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ease-linear ${
                  isFrozen
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isFrozen && (
              <span className="text-[11px] text-amber-400 font-semibold mt-2.5 flex items-center justify-center gap-1.5">
                <span>⏸️</span>
                <span>කාල ගණනය නතර වී ඇත — දැන්වීම් ටැබ් එකට ගිය විට නැවත ආරම්භ වේ</span>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {countdown > 0 ? (
              <button
                type="button"
                onClick={() => triggerStoryAd()}
                className={`w-full sm:w-auto px-7 py-3.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all shadow-lg inline-flex items-center justify-center gap-2 cursor-pointer ${
                  isFrozen
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-orange-900/40 animate-pulse'
                    : 'bg-[#1e3a8a] hover:bg-blue-700 shadow-blue-900/30'
                }`}
              >
                <span>↗️</span>
                <span>දැන්වීම් ටැබ් එක විවෘත කරන්න (Open & Switch to Ad Tab)</span>
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
              <span>ඉහත බොත්තම ඔබා විවෘත වන දැන්වීම් ටැබ් එකේ තත්පර 10ක් රැඳී සිටින්න.</span>
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
