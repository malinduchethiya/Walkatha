import React, { useState, useEffect } from 'react';
import { Story } from '../../types/story';
import { StoryService } from '../../services/storyService';
import { SeoService } from '../../services/seoService';

const SMARTLINK_URL = 'https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd';

const AD_FEED_HTML = `<div class="ad-468">
    <script>
      atOptions = {
        'key' : '41fe3a7c5be5b71cd4620d5d0fc4e600',
        'format' : 'iframe',
        'height' : 60,
        'width' : 468,
        'params' : {}
      };
    </script>
    <script data-cfasync="false" src="https://brijmohan.org/22/41fe3a7c5be5b71cd4620d5d0fc4e600"></script>
  </div>`;

const AD_SIDEBAR_HTML = `<div class="ad-160">
    <script>
      atOptions = {
        'key' : '05ee890ed059b98d213910f338ece6d0',
        'format' : 'iframe',
        'height' : 600,
        'width' : 160,
        'params' : {}
      };
    </script>
    <script data-cfasync="false" src="https://brijmohan.org/22/05ee890ed059b98d213910f338ece6d0"></script>
  </div>`;

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

  if (initial.length > 5) {
    return initial;
  }

  // If raw content has fewer than 6 newline-separated blocks, split sentences into paragraphs so > 5 paragraphs exist
  const sentences = (rawContent || '')
    .replace(/([.!?।])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length > 5) {
    return sentences;
  }

  // Pad from existing sentences if story text is very short so count($paragraphs) > 5 holds
  const padded = [...(sentences.length > 0 ? sentences : ['සිංහල කතාව'])];
  while (padded.length <= 5) {
    padded.push(padded[padded.length - 1]);
  }
  return padded;
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
  const [relatedStories, setRelatedStories] = useState<Story[]>([]);
  const [prevStory, setPrevStory] = useState<Story | null>(null);
  const [randomStory, setRandomStory] = useState<Story | null>(null);
  const [nextStory, setNextStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

          const [related, allStories] = await Promise.all([
            StoryService.getRelatedStories(fetched, 5),
            StoryService.fetchAllLiveStories(),
          ]);

          if (!active) return;
          setRelatedStories(related.slice(0, 5));

          const idx = allStories.findIndex(
            (s) => s.id === fetched.id || s.slug === fetched.slug
          );
          const prev = idx > 0 ? allStories[idx - 1] : allStories[allStories.length - 1] || null;
          const next =
            idx >= 0 && idx < allStories.length - 1 ? allStories[idx + 1] : allStories[0] || null;
          const pool = allStories.filter((s) => s.slug !== fetched.slug);
          const rand =
            pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : fetched;

          setPrevStory(prev);
          setRandomStory(rand);
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
      <div className="max-w-5xl mx-auto py-8 space-y-4">
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

  // §7: AMP loads none of the five Adsterra units
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
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Article Column */}
      <div className="lg:col-span-8 space-y-6">
        <article className="bg-[#111a33] border border-[#1e2d52] rounded-lg overflow-hidden">
          <div className="w-full aspect-[16/9] max-h-96 bg-[#0d152b] overflow-hidden border-b border-[#1e2d52]">
            <img
              src={imgSrc}
              alt={story.title}
              decoding="async"
              onError={() => {
                if (imgSrc !== FALLBACK_COVER) {
                  setImgSrc(FALLBACK_COVER);
                }
              }}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-5 sm:p-8">
            <header className="pb-5 mb-6 border-b border-[#1e2d52] space-y-2.5">
              {/* Category chips immediately above H1 */}
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

              {/* Single H1 containing post title with no brand text */}
              <h1 className="text-xl sm:text-3xl font-bold text-white leading-snug">
                {story.title}
              </h1>

              {/* Author byline linking to /profile/{URL_ENCODED_NAME} */}
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

            {/* §6: Article body paragraphs with 468x60 ad-feed after 3rd paragraph ($i === 2 && count($paragraphs) > 5), outside [data-reading-content] */}
            <div className="space-y-4 text-base sm:text-lg leading-relaxed text-slate-200 select-text">
              {paragraphs.map((para, i) => (
                <React.Fragment key={i}>
                  <p data-reading-content className="leading-[1.95] tracking-normal break-words">
                    {para}
                  </p>
                  {i === 2 && paragraphs.length > 5 && (
                    <div
                      className="card border-one betads embed-responsive my-4"
                      dangerouslySetInnerHTML={{ __html: AD_FEED_HTML }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* §5 Smartlink #1 inside Telegram <blockquote> at end of story body as closing sentence */}
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
              <p>
                <a
                  href={SMARTLINK_URL}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="text-blue-400 hover:underline font-semibold"
                >
                  තවත් කතා කියවන්න →
                </a>
              </p>
            </blockquote>

            {/* Article footer with 3 navigation buttons in order: Previous, Random, Next + Smartlink #3 right-aligned */}
            <footer className="mt-8 pt-6 border-t border-[#1e2d52] space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <a
                  href={prevStory ? `/posts/${encodeURIComponent(prevStory.slug)}` : '/'}
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
                  href={randomStory ? `/posts/${encodeURIComponent(randomStory.slug)}` : '/'}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey && randomStory) {
                      e.preventDefault();
                      onSelectStory(randomStory.slug);
                    }
                  }}
                  className="px-3 py-2.5 rounded-lg bg-[#1e3a8a] hover:bg-blue-700 text-center text-xs sm:text-sm font-semibold text-white transition-colors"
                >
                  Random
                </a>
                <a
                  href={nextStory ? `/posts/${encodeURIComponent(nextStory.slug)}` : '/'}
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
              <div className="flex justify-end">
                <a
                  href={SMARTLINK_URL}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="text-xs font-semibold text-blue-400 hover:underline"
                >
                  තවත් කතා →
                </a>
              </div>
            </footer>
          </div>
        </article>
      </div>

      {/* §1 & §2: Sidebar: Banner 160x600 between nav trio and related cards, then 5 related cards, then §5 Smartlink #2 */}
      <aside className="lg:col-span-4 space-y-4">
        <div
          className="card border-one embed-responsive mb-3 bg-[#111a33] border border-[#1e2d52] rounded-lg"
          dangerouslySetInnerHTML={{ __html: AD_SIDEBAR_HTML }}
        />

        <div className="bg-[#111a33] border border-[#1e2d52] rounded-lg p-4 space-y-3">
          <div className="text-sm font-bold text-white border-b border-[#1e2d52] pb-2">
            Related Stories
          </div>
          <div className="space-y-3">
            {relatedStories.slice(0, 5).map((rel) => {
              const relUrl = `/posts/${encodeURIComponent(rel.slug)}`;
              const relThumb =
                rel.coverImage && rel.coverImage.trim() ? rel.coverImage : FALLBACK_COVER;
              return (
                <a
                  key={rel.id}
                  href={relUrl}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      onSelectStory(rel.slug);
                    }
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[#0d152b] hover:bg-[#162347] transition-colors"
                >
                  <img
                    src={relThumb}
                    alt={rel.title}
                    loading="lazy"
                    className="w-16 h-12 object-cover rounded shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-100 line-clamp-2">
                      {rel.title}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* §5 Smartlink #2: Sidebar, directly beneath the five related cards */}
          <div className="pt-2 border-t border-[#1e2d52]">
            <a
              href={SMARTLINK_URL}
              target="_blank"
              rel="nofollow sponsored noopener"
              className="text-xs font-semibold text-blue-400 hover:underline inline-block"
            >
              තවත් Wal Katha →
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
};
