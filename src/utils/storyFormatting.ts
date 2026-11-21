import type { Story, Category } from '../types/story';
import type { StaticPageSlug } from '../components/common/StaticPage';

export type ViewMode =
  | 'home'
  | 'category'
  | 'popular'
  | 'archives'
  | 'profile'
  | 'search'
  | 'reader'
  | 'amp-reader'
  | 'categories'
  | 'sitemap'
  | 'static'
  | 'not-found'
  | 'admin';

export interface ParsedRouteState {
  viewMode: ViewMode;
  staticSlug: StaticPageSlug;
  selectedStorySlug: string | null;
  selectedCategory: string;
  selectedAuthor: string;
  searchQuery: string;
  sortBy: 'latest' | 'popular' | 'oldest';
  currentPage: number;
  canonicalReplacePath?: string;
}

export function resolveRouteState(rawPathname: string, rawSearch: string): ParsedRouteState {
  const fallback: ParsedRouteState = {
    viewMode: 'home',
    staticSlug: 'privacy-policy',
    selectedStorySlug: null,
    selectedCategory: 'all',
    selectedAuthor: 'Walkathawa',
    searchQuery: '',
    sortBy: 'latest',
    currentPage: 1,
  };

  let path = '/';
  try {
    path = decodeURIComponent(rawPathname || '/').replace(/\/+$/, '') || '/';
  } catch {
    path = (rawPathname || '/').replace(/\/+$/, '') || '/';
  }

  const searchParams = new URLSearchParams(rawSearch || '');
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const validPage = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const qParam = (searchParams.get('s') || searchParams.get('q') || '').trim();

  if (path === '/admin' || path.startsWith('/admin/')) {
    return { ...fallback, viewMode: 'admin', searchQuery: qParam };
  }
  if (path === '/' || path === '') {
    return { ...fallback, viewMode: 'home', currentPage: validPage, searchQuery: qParam };
  }
  const homePageMatch = path.match(/^\/page\/(\d+)$/);
  if (homePageMatch) {
    const pNum = Math.max(1, parseInt(homePageMatch[1], 10) || 1);
    return {
      ...fallback,
      viewMode: 'home',
      currentPage: pNum,
      searchQuery: qParam,
      canonicalReplacePath: pNum === 1 ? '/' : undefined,
    };
  }
  if (path === '/popular' || /^\/popular\/page\/(\d+)$/.test(path)) {
    const popMatch = path.match(/^\/popular\/page\/(\d+)$/);
    const pNum = popMatch ? Math.max(1, parseInt(popMatch[1], 10) || 1) : validPage;
    return {
      ...fallback,
      viewMode: 'popular',
      sortBy: 'popular',
      currentPage: pNum,
      searchQuery: qParam,
      canonicalReplacePath: popMatch && pNum === 1 ? '/popular' : undefined,
    };
  }
  if (
    path === '/archives' ||
    path === '/archiveposts' ||
    /^\/archives\/page\/(\d+)$/.test(path)
  ) {
    const archMatch = path.match(/^\/archives\/page\/(\d+)$/);
    const pNum = archMatch ? Math.max(1, parseInt(archMatch[1], 10) || 1) : validPage;
    return {
      ...fallback,
      viewMode: 'archives',
      currentPage: pNum,
      searchQuery: qParam,
      canonicalReplacePath: archMatch && pNum === 1 ? '/archives' : undefined,
    };
  }
  if (path === '/search') {
    return { ...fallback, viewMode: 'search', currentPage: validPage, searchQuery: qParam };
  }
  if (
    path.startsWith('/profile/') ||
    path.startsWith('/followers/') ||
    path.startsWith('/following/')
  ) {
    const author = path.replace(/^\/(profile|followers|following)\//, '').trim() || 'Walkathawa';
    return {
      ...fallback,
      viewMode: 'profile',
      selectedAuthor: author,
      currentPage: validPage,
      searchQuery: qParam,
    };
  }
  if (path === '/categories' || path === '/collections') {
    return { ...fallback, viewMode: 'categories', searchQuery: qParam };
  }
  if (path === '/sitemap') {
    return { ...fallback, viewMode: 'sitemap', searchQuery: qParam };
  }
  if (path.startsWith('/page/')) {
    const pSlug = (path.replace('/page/', '').trim() || 'privacy-policy') as StaticPageSlug;
    return { ...fallback, viewMode: 'static', staticSlug: pSlug, searchQuery: qParam };
  }
  if (
    path === '/about' ||
    path === '/privacy' ||
    path === '/terms' ||
    path === '/contact' ||
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password'
  ) {
    return {
      ...fallback,
      viewMode: 'static',
      staticSlug: path.replace('/', '') as StaticPageSlug,
      searchQuery: qParam,
    };
  }
  if (
    path.startsWith('/category/') ||
    path.startsWith('/categories/') ||
    path.startsWith('/collections/')
  ) {
    const catRest = path.replace(/^\/(category|categories|collections)\//, '').trim();
    const catPageMatch = catRest.match(/^(.+?)\/page\/(\d+)$/);
    const catSlug = (catPageMatch ? catPageMatch[1] : catRest).trim();
    const catPage = catPageMatch
      ? Math.max(1, parseInt(catPageMatch[2], 10) || 1)
      : validPage;
    if (catSlug) {
      const encodedCat = encodeURIComponent(catSlug);
      const needsCanonical =
        !path.startsWith('/category/') || (Boolean(catPageMatch) && catPage === 1);
      return {
        ...fallback,
        viewMode: 'category',
        selectedCategory: catSlug,
        currentPage: catPage,
        searchQuery: qParam,
        canonicalReplacePath: needsCanonical
          ? catPage > 1
            ? `/category/${encodedCat}/page/${catPage}`
            : `/category/${encodedCat}`
          : undefined,
      };
    }
  }
  if (path.startsWith('/posts/') || path.startsWith('/story/')) {
    const isAmp = path.endsWith('/amp');
    const slug = path
      .replace(/^\/(posts|story)\//, '')
      .replace(/\/amp$/, '')
      .trim();
    if (slug) {
      return {
        ...fallback,
        viewMode: isAmp ? 'amp-reader' : 'reader',
        selectedStorySlug: slug,
        searchQuery: qParam,
        canonicalReplacePath: path.startsWith('/posts/')
          ? `/story/${encodeURIComponent(slug)}${isAmp ? '/amp' : ''}`
          : undefined,
      };
    }
  }

  return { ...fallback, viewMode: 'not-found', searchQuery: qParam };
}

export function splitStoryParagraphs(rawContent: string): string[] {
  const cleaned = String(rawContent || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  if (!cleaned) return [];

  const blocks = cleaned
    .split(/\r?\n\s*\r?\n|\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (blocks.length > 1) return blocks;

  const sentences = cleaned
    .replace(/([.!?।])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length <= 3) return [cleaned];

  const grouped: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    grouped.push(sentences.slice(i, i + 3).join(' '));
  }
  return grouped;
}

export function getStoryExcerpt(story: Partial<Story>, maxLength = 135): string {
  const raw = (story.shortDescription || story.description || story.fullContent || story.content || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength).replace(/\s+\S*$/, '').trim()}…`;
}

export function getStoryAuthorName(story: Partial<Story>): string {
  if (!story.author) return 'Walkathawa';
  if (typeof story.author === 'string') return story.author.trim() || 'Walkathawa';
  return story.author.name?.trim() || 'Walkathawa';
}

export function getCategoryLabel(story: Partial<Story>, categories: Category[] = []): string {
  const catKey = (story.category || story.categoryId || '').toLowerCase();
  const match = categories.find(
    (c) =>
      (c.slug || '').toLowerCase() === catKey || (c.id || '').toLowerCase() === catKey
  );
  if (match) {
    return (match.sinhalaName || match.name).replace(/\s*\([^)]*\)/g, '').trim();
  }
  const fallback = (story.categoryName || story.category || 'සිංහල කතා')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
  return fallback || 'සිංහල කතා';
}
