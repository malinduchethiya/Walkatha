export interface Story {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  excerpt?: string;
  content?: string;
  fullContent?: string;
  wordCount?: number;
  category: string;
  categoryName?: string;
  categoryId?: string;
  tags: string[];
  coverImage?: string;
  views: number;
  likes?: number;
  readingTime?: number;
  readTime?: string;
  author?: string | { name: string; avatar?: string };
  featured?: boolean;
  published?: boolean;
  uploadDate?: string;
  uploadedDate?: string;
  updatedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function toW3CDatetime(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function resolveStoryTimestamps(story: Partial<Story> | Record<string, any>): {
  lastmod: string | null;
  datePublished: string | null;
  dateModified: string | null;
  source: 'updatedAt' | 'createdAt' | 'none';
} {
  const rawUpdated = story.updatedAt || story.updatedDate;
  const rawCreated = story.createdAt || story.uploadDate || story.uploadedDate;

  const updatedW3C = toW3CDatetime(rawUpdated);
  const createdW3C = toW3CDatetime(rawCreated);

  if (updatedW3C) {
    return {
      lastmod: updatedW3C,
      datePublished: createdW3C || updatedW3C,
      dateModified: updatedW3C,
      source: 'updatedAt',
    };
  }

  if (createdW3C) {
    return {
      lastmod: createdW3C,
      datePublished: createdW3C,
      dateModified: createdW3C,
      source: 'createdAt',
    };
  }

  return {
    lastmod: null,
    datePublished: null,
    dateModified: null,
    source: 'none',
  };
}

export function hasSubstantiveStoryChanges(
  existing: Partial<Story> | Record<string, any>,
  incoming: Partial<Story> | Record<string, any>
): boolean {
  const norm = (v: unknown) => String(v || '').trim();
  if ( incoming.title !== undefined && norm(incoming.title) !== norm(existing.title)) return true;
  if (
    (incoming.fullContent !== undefined || incoming.content !== undefined) &&
    norm(incoming.fullContent || incoming.content) !== norm(existing.fullContent || existing.content)
  ) {
    return true;
  }
  if (
    incoming.shortDescription !== undefined &&
    norm(incoming.shortDescription) !== norm(existing.shortDescription)
  ) {
    return true;
  }
  if (incoming.coverImage !== undefined && norm(incoming.coverImage) !== norm(existing.coverImage)) {
    return true;
  }
  if (incoming.category !== undefined && norm(incoming.category) !== norm(existing.category)) {
    return true;
  }
  return false;
}

export interface Category {
  id: string;
  name: string;
  sinhalaName?: string;
  slug?: string;
  description?: string;
  storyCount?: number;
  icon?: string;
}

export type ReadingTheme = 'light' | 'dark' | 'sepia';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface StoryQueryParams {
  category?: string;
  search?: string;
  sortBy?: 'latest' | 'popular' | 'oldest';
  page?: number;
  limit?: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  totalPages: number;
  currentPage: number;
}
