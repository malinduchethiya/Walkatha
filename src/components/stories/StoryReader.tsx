import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Story, Category } from '../../types/story';
import { StoryService } from '../../services/storyService';
import { SeoService } from '../../services/seoService';
import { formatSinhalaDate } from '../../utils/formatters';
import {
  splitStoryParagraphs,
  getStoryAuthorName,
  getCategoryLabel,
} from '../../utils/storyFormatting';
import { readInitialStoryFromDocument } from '../../utils/initialData';
import { formatStoryImageAlt, getCategoryAnchorText } from '../../config/seoMetadata';

interface StoryReaderProps {
  slug: string;
  categories: Category[];
  isAmp?: boolean;
  onBack: () => void;
  onSelectStory: (slug: string) => void;
  onSelectCategory: (catSlug: string) => void;
  onSelectAuthor: (author: string) => void;
}

const FONT_SIZES = ['text-[16px]', 'text-[17.5px]', 'text-[19px]', 'text-[21px]'] as const;

export const StoryReader: React.FC<StoryReaderProps> = ({
  slug,
  categories,
  onBack,
  onSelectStory,
  onSelectCategory,
  onSelectAuthor,
}) => {
  const initialPayload = readInitialStoryFromDocument(slug);

  const [story, setStory] = useState<Story | null>(() => initialPayload?.story || null);
  const [relatedStories, setRelatedStories] = useState<Story[]>(
    () => initialPayload?.relatedStories || []
  );
  const [prevStory, setPrevStory] = useState<Story | null>(
    () => initialPayload?.prevStory || null
  );
  const [nextStory, setNextStory] = useState<Story | null>(
    () => initialPayload?.nextStory || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialPayload?.story);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [coverFailed, setCoverFailed] = useState<boolean>(false);
  const [fontScaleIdx, setFontScaleIdx] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    setNotFound(false);
    setCoverFailed(false);

    const embedded = readInitialStoryFromDocument(slug);
    if (embedded && embedded.story) {
      setStory(embedded.story);
      setPrevStory(embedded.prevStory || null);
      setNextStory(embedded.nextStory || null);
      setRelatedStories(embedded.relatedStories || []);
      setIsLoading(false);
      SeoService.updateStorySeo(embedded.story);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);

    async function load() {
      try {
        const fetched = await StoryService.getStoryBySlug(slug);
        if (cancelled) return;

        if (!fetched) {
          setStory(null);
          setNotFound(true);
          SeoService.updateNotFoundSeo();
          return;
        }

        setStory(fetched);
        SeoService.updateStorySeo(fetched);

        const [allStories, related] = await Promise.all([
          StoryService.fetchAllLiveStories(),
          StoryService.getRelatedStories(fetched, 6),
        ]);
        if (cancelled) return;

        setRelatedStories(related);
        const idx = allStories.findIndex(
          (s) => s.id === fetched.id || s.slug === fetched.slug
        );
        if (idx >= 0) {
          setPrevStory(idx > 0 ? allStories[idx - 1] : null);
          setNextStory(idx < allStories.length - 1 ? allStories[idx + 1] : null);
        } else {
          setPrevStory(null);
          setNextStory(null);
        }
      } catch {
        if (!cancelled) {
          setNotFound(true);
          SeoService.updateNotFoundSeo();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, fn: () => void) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    fn();
  };

  if (isLoading) {
    return (
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-10 space-y-6" aria-busy="true">
        <div className="h-3 w-36 bg-zinc-900 rounded animate-pulse" />
        <div className="h-8 w-5/6 bg-zinc-900 rounded animate-pulse" />
        <div className="aspect-video w-full bg-zinc-900 rounded-md animate-pulse" />
        <div className="space-y-3 pt-2">
          <div className="h-4 w-full bg-zinc-900 rounded animate-pulse" />
          <div className="h-4 w-11/12 bg-zinc-900 rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-zinc-900 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !story) {
    return (
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-zinc-100">කතාව හමු නොවීය</h1>
        <p className="text-sm text-zinc-400">
          ඔබ සෙවූ කතාව ඉවත් කර ඇති හෝ ලිපිනය වැරදි විය හැක.
        </p>
        <div className="pt-2">
          <a
            href="/"
            onClick={(e) => handleLink(e, onBack)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md bg-zinc-100 text-zinc-950 hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            මුල් පිටුවට යන්න
          </a>
        </div>
      </div>
    );
  }

  const categorySlug = story.category || story.categoryId || 'romantic';
  const categoryLabel = getCategoryLabel(story, categories);
  const authorName = getStoryAuthorName(story);
  const formattedDate = formatSinhalaDate(story.uploadDate || story.createdAt);
  const readMins = story.readingTime || 5;
  const paragraphs = splitStoryParagraphs(
    story.fullContent || story.content || story.shortDescription || story.description || ''
  );
  const showCover = Boolean(story.coverImage && story.coverImage.trim() && !coverFailed);

  return (
    <article className="max-w-[700px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400 mb-6">
        <a
          href="/"
          onClick={(e) => handleLink(e, onBack)}
          className="hover:text-zinc-100 transition-colors"
        >
          මුල් පිටුව
        </a>
        <span aria-hidden="true" className="text-zinc-600">
          /
        </span>
        <a
          href={`/category/${encodeURIComponent(categorySlug)}`}
          onClick={(e) => handleLink(e, () => onSelectCategory(categorySlug))}
          className="text-amber-500/90 hover:text-amber-400 transition-colors"
        >
          {getCategoryAnchorText(categorySlug, categoryLabel)}
        </a>
      </nav>

      {/* Story Header */}
      <header className="space-y-4 pb-6 border-b border-zinc-800/80">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50 leading-snug">
          {story.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/profile/${encodeURIComponent(authorName)}`}
              onClick={(e) => handleLink(e, () => onSelectAuthor(authorName))}
              className="text-zinc-300 hover:text-zinc-50 font-medium transition-colors"
            >
              {authorName}
            </a>
            {formattedDate && (
              <>
                <span aria-hidden="true" className="text-zinc-600">
                  ·
                </span>
                <time dateTime={story.uploadDate || story.createdAt}>{formattedDate}</time>
              </>
            )}
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span className="tabular-nums">මිනිත්තු {readMins} ක කියවීමක්</span>
          </div>

          {/* Minimal Reading Text Size Controls */}
          <div className="flex items-center gap-1" role="group" aria-label="Text size">
            <button
              type="button"
              onClick={() => setFontScaleIdx((i) => Math.max(0, i - 1))}
              disabled={fontScaleIdx === 0}
              aria-label="Decrease text size"
              className="px-2 py-1 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-50 hover:border-zinc-700 disabled:opacity-35 cursor-pointer"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontScaleIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
              disabled={fontScaleIdx === FONT_SIZES.length - 1}
              aria-label="Increase text size"
              className="px-2 py-1 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-50 hover:border-zinc-700 disabled:opacity-35 cursor-pointer"
            >
              A+
            </button>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {showCover && (
        <figure className="my-7 overflow-hidden rounded-md border border-zinc-800/80 bg-[#16161a]">
          <img
            src={story.coverImage}
            alt={formatStoryImageAlt(story.title, categoryLabel, categorySlug)}
            onError={() => setCoverFailed(true)}
            className="w-full aspect-video object-cover"
          />
        </figure>
      )}

      {/* Story Prose */}
      <div className={`story-prose ${FONT_SIZES[fontScaleIdx]} text-zinc-200 space-y-6 my-8`}>
        {paragraphs.length > 0 ? (
          paragraphs.map((para, index) => (
            <p key={index} data-reading-content="">
              {para}
            </p>
          ))
        ) : (
          <p className="text-zinc-400">මෙම කතාවේ අන්තර්ගතය ලබා ගැනීමට නොහැකි විය.</p>
        )}
      </div>

      {/* Minimal In-Page SEO Context & Internal Category Links + Telegram Notice */}
      <div className="my-10 py-5 border-t border-b border-zinc-800/80 text-xs sm:text-sm text-zinc-400 leading-relaxed space-y-2.5">
        <p>
          මෙම කතාව{' '}
          <a
            href={`/category/${encodeURIComponent(categorySlug)}`}
            onClick={(e) => handleLink(e, () => onSelectCategory(categorySlug))}
            className="text-zinc-200 hover:text-amber-400 underline underline-offset-2"
          >
            {getCategoryAnchorText(categorySlug, categoryLabel)}
          </a>{' '}
          එකතුවට අයත් sinhala wal katha සහ sinhala wela katha නිර්මාණයකි. තවත් අලුත්ම{' '}
          <a
            href="/category/%E0%B6%85%E0%B6%B8%E0%B7%8A%E0%B6%B8%E0%B7%8F-%E0%B6%B4%E0%B7%94%E0%B6%AD%E0%B7%8F"
            onClick={(e) => handleLink(e, () => onSelectCategory('අම්මා-පුතා'))}
            className="text-zinc-300 hover:text-amber-400"
          >
            amma wal katha
          </a>
          ,{' '}
          <a
            href="/category/wife"
            onClick={(e) => handleLink(e, () => onSelectCategory('wife'))}
            className="text-zinc-300 hover:text-amber-400"
          >
            wife wal katha
          </a>
          ,{' '}
          <a
            href="/category/thaththa-duwa"
            onClick={(e) => handleLink(e, () => onSelectCategory('thaththa-duwa'))}
            className="text-zinc-300 hover:text-amber-400"
          >
            thaththa duwa
          </a>
          ,{' '}
          <a
            href="/category/akka-malli"
            onClick={(e) => handleLink(e, () => onSelectCategory('akka-malli'))}
            className="text-zinc-300 hover:text-amber-400"
          >
            akka wal katha
          </a>{' '}
          සහ{' '}
          <a
            href="/categories"
            onClick={(e) => handleLink(e, onBack)}
            className="text-zinc-300 hover:text-amber-400"
          >
            walkatha වර්ගීකරණ
          </a>{' '}
          නොමිලේ කියවන්න.
        </p>
        <p>
          අලුත්ම wal katha 2026 හා wela katha දිනපතා එසැණින් කියවීමට Telegram නාලිකාව සමඟ එක්වන්න:{' '}
          <a
            href="https://t.me/walkathawa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline font-medium"
          >
            t.me/walkathawa
          </a>
        </p>
      </div>

      {/* Previous / Next Story Navigation */}
      {(prevStory || nextStory) && (
        <nav
          aria-label="Adjacent stories"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2"
        >
          <div>
            {prevStory && (
              <a
                href={`/story/${encodeURIComponent(prevStory.slug || prevStory.id)}`}
                onClick={(e) => handleLink(e, () => onSelectStory(prevStory.slug || prevStory.id))}
                className="block p-4 rounded-md border border-zinc-800/80 hover:border-zinc-700 bg-[#16161a]/60 transition-colors"
              >
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 mb-1">
                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  පෙර කතාව
                </span>
                <p className="text-sm font-medium text-zinc-200 line-clamp-1">
                  {prevStory.title}
                </p>
              </a>
            )}
          </div>
          <div>
            {nextStory && (
              <a
                href={`/story/${encodeURIComponent(nextStory.slug || nextStory.id)}`}
                onClick={(e) => handleLink(e, () => onSelectStory(nextStory.slug || nextStory.id))}
                className="block p-4 rounded-md border border-zinc-800/80 hover:border-zinc-700 bg-[#16161a]/60 transition-colors sm:text-right"
              >
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 mb-1 sm:justify-end">
                  මීළඟ කතාව
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-zinc-200 line-clamp-1">
                  {nextStory.title}
                </p>
              </a>
            )}
          </div>
        </nav>
      )}

      {/* Related Stories — Compact Editorial List */}
      {relatedStories.length > 0 && (
        <section className="mt-12 pt-8 border-t border-zinc-800/80">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">
            තවත් Sinhala Wal Katha හා Wela Katha කියවන්න
          </h2>
          <ul className="divide-y divide-zinc-800/70">
            {relatedStories.map((rel) => {
              const relSlug = rel.slug || rel.id;
              return (
                <li key={rel.id || relSlug}>
                  <a
                    href={`/story/${encodeURIComponent(relSlug)}`}
                    onClick={(e) => handleLink(e, () => onSelectStory(relSlug))}
                    className="py-3 flex items-baseline justify-between gap-4 group"
                  >
                    <span className="text-sm text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                      {rel.title}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
                      මිනි. {rel.readingTime || 5}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
};
