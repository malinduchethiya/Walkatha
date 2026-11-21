import type { Story, Category } from '../types/story';
import type { ViewMode } from './storyFormatting';

export interface InitialStoryPayload {
  story: Story;
  prevStory?: Story | null;
  nextStory?: Story | null;
  relatedStories?: Story[];
}

export interface InitialGalleryPayload {
  viewMode: ViewMode;
  selectedCategory: string;
  currentPage: number;
  totalStories: number;
  totalPages: number;
  stories: Story[];
  categories: Category[];
}

function normalizeSlugKey(raw: string | undefined | null): string {
  const cleaned = String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  try {
    return decodeURIComponent(cleaned).toLowerCase();
  } catch {
    return cleaned.toLowerCase();
  }
}

export function parseInitialStoryPayload(
  rawJson: string | null | undefined,
  requestedSlug: string
): InitialStoryPayload | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson) as InitialStoryPayload;
    if (!parsed || !parsed.story) return null;
    const reqKey = normalizeSlugKey(requestedSlug);
    const storySlugKey = normalizeSlugKey(parsed.story.slug);
    const storyIdKey = normalizeSlugKey(parsed.story.id);
    if (!reqKey || (reqKey !== storySlugKey && reqKey !== storyIdKey)) {
      return null;
    }
    return {
      story: parsed.story,
      prevStory: parsed.prevStory ?? null,
      nextStory: parsed.nextStory ?? null,
      relatedStories: Array.isArray(parsed.relatedStories) ? parsed.relatedStories : [],
    };
  } catch {
    return null;
  }
}

export function parseInitialGalleryPayload(
  rawJson: string | null | undefined,
  viewMode: ViewMode,
  selectedCategory: string,
  currentPage: number
): InitialGalleryPayload | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson) as InitialGalleryPayload;
    if (!parsed || !Array.isArray(parsed.stories) || parsed.stories.length === 0) return null;
    if (parsed.viewMode !== viewMode) return null;
    if (
      normalizeSlugKey(parsed.selectedCategory || 'all') !==
      normalizeSlugKey(selectedCategory || 'all')
    ) {
      return null;
    }
    if ((Number(parsed.currentPage) || 1) !== currentPage) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readInitialStoryFromDocument(requestedSlug: string): InitialStoryPayload | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById('__INITIAL_STORY__');
  return parseInitialStoryPayload(el?.textContent, requestedSlug);
}

export function readInitialGalleryFromDocument(
  viewMode: ViewMode,
  selectedCategory: string,
  currentPage: number
): InitialGalleryPayload | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById('__INITIAL_GALLERY__');
  return parseInitialGalleryPayload(el?.textContent, viewMode, selectedCategory, currentPage);
}
