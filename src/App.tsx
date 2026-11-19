import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { StoryGallery } from './components/stories/StoryGallery';
import { StoryReader } from './components/stories/StoryReader';
import type { StaticPageSlug } from './components/common/StaticPage';
import { Story, Category } from './types/story';
import { StoryService } from './services/storyService';
import { SeoService } from './services/seoService';
import { testConnection } from './firebase';
import { BannerAd, SIDE_BANNER_CONFIG } from './components/common/BannerAd';

const CategoriesPage = lazy(() =>
  import('./components/categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
);
const StaticPage = lazy(() =>
  import('./components/common/StaticPage').then((m) => ({ default: m.StaticPage }))
);
const HtmlSitemapPage = lazy(() =>
  import('./components/common/HtmlSitemapPage').then((m) => ({ default: m.HtmlSitemapPage }))
);
const NotFoundPage = lazy(() =>
  import('./components/common/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);
const AdminRoot = lazy(() =>
  import('./components/admin/AdminRoot').then((m) => ({ default: m.AdminRoot }))
);

type ViewMode =
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

interface ParsedRouteState {
  viewMode: ViewMode;
  staticSlug: StaticPageSlug;
  selectedStorySlug: string | null;
  selectedCategory: string;
  selectedAuthor: string;
  searchQuery: string;
  sortBy: 'latest' | 'popular' | 'oldest';
  currentPage: number;
}

function resolveRouteFromLocation(): ParsedRouteState {
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

  if (typeof window === 'undefined') return fallback;

  let path = '/';
  try {
    path = decodeURIComponent(window.location.pathname).replace(/\/+$/, '') || '/';
  } catch {
    path = window.location.pathname.replace(/\/+$/, '') || '/';
  }
  const searchParams = new URLSearchParams(window.location.search);
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const validPage = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const qParam = searchParams.get('s') || searchParams.get('q') || '';

  if (path === '/admin' || path.startsWith('/admin/')) {
    return { ...fallback, viewMode: 'admin', searchQuery: qParam };
  }
  if (path === '/' || path === '') {
    return { ...fallback, viewMode: 'home', currentPage: validPage, searchQuery: qParam };
  }
  if (path === '/popular') {
    return {
      ...fallback,
      viewMode: 'popular',
      sortBy: 'popular',
      currentPage: validPage,
      searchQuery: qParam,
    };
  }
  if (path === '/archives' || path === '/archiveposts') {
    return { ...fallback, viewMode: 'archives', currentPage: validPage, searchQuery: qParam };
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
    const catSlug = path.replace(/^\/(category|categories|collections)\//, '').trim();
    if (catSlug) {
      if (!path.startsWith('/category/')) {
        window.history.replaceState({}, '', `/category/${encodeURIComponent(catSlug)}`);
      }
      return {
        ...fallback,
        viewMode: 'category',
        selectedCategory: catSlug,
        currentPage: validPage,
        searchQuery: qParam,
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
      if (path.startsWith('/posts/')) {
        window.history.replaceState(
          {},
          '',
          `/story/${encodeURIComponent(slug)}${isAmp ? '/amp' : ''}`
        );
      }
      return {
        ...fallback,
        viewMode: isAmp ? 'amp-reader' : 'reader',
        selectedStorySlug: slug,
        searchQuery: qParam,
      };
    }
  }

  return { ...fallback, viewMode: 'not-found', searchQuery: qParam };
}

export function App() {
  const initialRoute = resolveRouteFromLocation();

  const [viewMode, setViewMode] = useState<ViewMode>(() => initialRoute.viewMode);
  const [staticSlug, setStaticSlug] = useState<StaticPageSlug>(() => initialRoute.staticSlug);
  const [selectedStorySlug, setSelectedStorySlug] = useState<string | null>(
    () => initialRoute.selectedStorySlug
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => initialRoute.selectedCategory
  );
  const [selectedAuthor, setSelectedAuthor] = useState<string>(() => initialRoute.selectedAuthor);
  const [searchQuery, setSearchQuery] = useState<string>(() => initialRoute.searchQuery);
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'oldest'>(() => initialRoute.sortBy);
  const [currentPage, setCurrentPage] = useState<number>(() => initialRoute.currentPage);

  const [stories, setStories] = useState<Story[]>([]);
  const [totalStories, setTotalStories] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    testConnection();
    document.documentElement.setAttribute('lang', 'si');
    document.documentElement.classList.add('dark');
  }, []);

  const parseRoute = useCallback(() => {
    const resolved = resolveRouteFromLocation();
    setViewMode(resolved.viewMode);
    setStaticSlug(resolved.staticSlug);
    setSelectedStorySlug(resolved.selectedStorySlug);
    setSelectedCategory(resolved.selectedCategory);
    setSelectedAuthor(resolved.selectedAuthor);
    if (resolved.searchQuery) {
      setSearchQuery(resolved.searchQuery);
    }
    setSortBy(resolved.sortBy);
    setCurrentPage(resolved.currentPage);

    if (resolved.viewMode === 'admin') {
      SeoService.updateNoIndexSeo('Admin', '/admin');
    } else if (resolved.viewMode === 'not-found') {
      SeoService.updateNotFoundSeo();
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'admin') {
      SeoService.updateNoIndexSeo('Admin', '/admin');
    } else if (viewMode === 'not-found') {
      SeoService.updateNotFoundSeo();
    }
  }, [viewMode]);

  useEffect(() => {
    const handlePopState = () => parseRoute();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseRoute]);

  useEffect(() => {
    StoryService.getCategories()
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
  }, []);

  const isGalleryView =
    viewMode === 'home' ||
    viewMode === 'category' ||
    viewMode === 'popular' ||
    viewMode === 'archives' ||
    viewMode === 'profile' ||
    viewMode === 'search';

  const loadGalleryStories = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!isGalleryView) return;
      setIsLoading(true);
      try {
        const result = await StoryService.getStories({
          category:
            viewMode === 'category' && selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery,
          sortBy: viewMode === 'popular' ? 'popular' : sortBy,
          page: currentPage,
          limit: 20,
        });

        if (isCancelled()) return;

        setStories(result.data);
        setTotalStories(result.total);
        setTotalPages(result.totalPages || 1);

        if (viewMode === 'home') {
          SeoService.updateHomeSeo(null, currentPage, result.data, result.totalPages || 1);
        } else if (viewMode === 'category') {
          const activeCategoryObj =
            categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory) || {
              id: selectedCategory,
              slug: selectedCategory,
              name: selectedCategory,
              sinhalaName: selectedCategory,
            };
          SeoService.updateHomeSeo(
            activeCategoryObj,
            currentPage,
            result.data,
            result.totalPages || 1
          );
        } else if (viewMode === 'popular') {
          SeoService.updatePopularSeo();
        } else if (viewMode === 'archives') {
          SeoService.updateArchivesSeo();
        } else if (viewMode === 'profile') {
          SeoService.updateProfileSeo(selectedAuthor);
        } else if (viewMode === 'search') {
          SeoService.updateSearchSeo();
        }
      } catch {
        if (!isCancelled()) setStories([]);
      } finally {
        if (!isCancelled()) setIsLoading(false);
      }
    },
    [
      isGalleryView,
      viewMode,
      selectedCategory,
      selectedAuthor,
      searchQuery,
      sortBy,
      currentPage,
      categories,
    ]
  );

  const fetchStoriesList = useCallback(() => {
    void loadGalleryStories();
  }, [loadGalleryStories]);

  useEffect(() => {
    let cancelled = false;
    void loadGalleryStories(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadGalleryStories]);

  const navigateTo = (url: string) => {
    window.history.pushState({}, '', url);
    parseRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStory = (slug: string) => {
    navigateTo(`/story/${encodeURIComponent(slug)}`);
  };

  const handleSelectCategory = (catSlug: string) => {
    setSearchQuery('');
    if (!catSlug || catSlug === 'all') {
      navigateTo('/');
    } else {
      navigateTo(`/category/${encodeURIComponent(catSlug)}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    let baseUrl = '/';
    if (viewMode === 'category' && selectedCategory && selectedCategory !== 'all') {
      baseUrl = `/category/${encodeURIComponent(selectedCategory)}`;
    } else if (viewMode === 'popular') {
      baseUrl = '/popular';
    } else if (viewMode === 'archives') {
      baseUrl = '/archives';
    } else if (viewMode === 'profile') {
      baseUrl = `/profile/${encodeURIComponent(selectedAuthor)}`;
    }
    const targetUrl = newPage > 1 ? `${baseUrl}?page=${newPage}` : baseUrl;
    window.history.pushState({}, '', targetUrl);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
    if (q.trim()) {
      setViewMode('search');
      window.history.pushState({}, '', `/search?s=${encodeURIComponent(q)}`);
    } else {
      setViewMode('home');
      window.history.pushState({}, '', '/');
    }
  };

  const refreshAllFromFirestore = useCallback(async () => {
    try {
      const cats = await StoryService.getCategories(true);
      setCategories(cats);
    } catch {
      // ignore
    }
    fetchStoriesList();
  }, [fetchStoriesList]);

  if (viewMode === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#090e1d]" />}>
        <AdminRoot
          onBackToPublic={() => {
            refreshAllFromFirestore();
            navigateTo('/');
          }}
          onViewStoryPublic={(slug) => handleSelectStory(slug)}
          onDataChanged={refreshAllFromFirestore}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-[#090e1d] text-slate-100">
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        theme="dark"
        onToggleTheme={() => {}}
        onGoHome={() => {
          setSearchQuery('');
          navigateTo('/');
        }}
        onOpenCategoriesPage={() => navigateTo('/categories')}
      />

      <div className="flex-1 w-full px-2 sm:px-3 py-4 flex items-start justify-center gap-3">
        <aside
          aria-label="Left side banners"
          className="hidden xl:flex flex-col items-center gap-4 shrink-0 w-[160px]"
        >
          {[0, 1, 2, 3].map((idx) => (
            <BannerAd
              key={`left-side-${idx}`}
              slotId={`left-side-${idx}`}
              {...SIDE_BANNER_CONFIG}
            />
          ))}
        </aside>

        <main className="flex-1 min-w-0">
          {isGalleryView && (
            <StoryGallery
              stories={stories}
              totalStories={totalStories}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              onSelectStory={handleSelectStory}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              sortBy={sortBy}
              onSortChange={(newSort) => {
                setSortBy(newSort);
                setCurrentPage(1);
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isLoading={isLoading}
              pageKind={viewMode}
            />
          )}

          {(viewMode === 'reader' || viewMode === 'amp-reader') && selectedStorySlug && (
            <StoryReader
              slug={selectedStorySlug}
              isAmp={viewMode === 'amp-reader'}
              onBack={() => navigateTo('/')}
              onSelectStory={handleSelectStory}
              onSelectCategory={handleSelectCategory}
              onSelectAuthor={(author) => navigateTo(`/profile/${encodeURIComponent(author)}`)}
            />
          )}

          {viewMode === 'categories' && (
            <Suspense fallback={<div className="py-8" />}>
              <CategoriesPage
                categories={categories}
                onSelectCategory={handleSelectCategory}
                onBack={() => navigateTo('/')}
              />
            </Suspense>
          )}

          {viewMode === 'sitemap' && (
            <Suspense fallback={<div className="py-8" />}>
              <HtmlSitemapPage
                categories={categories}
                onSelectStory={handleSelectStory}
                onSelectCategory={handleSelectCategory}
                onBack={() => navigateTo('/')}
              />
            </Suspense>
          )}

          {viewMode === 'static' && (
            <Suspense fallback={<div className="py-8" />}>
              <StaticPage page={staticSlug} onBack={() => navigateTo('/')} />
            </Suspense>
          )}

          {viewMode === 'not-found' && (
            <Suspense fallback={<div className="py-8" />}>
              <NotFoundPage
                onGoHome={() => navigateTo('/')}
                onBrowseCategories={() => navigateTo('/categories')}
              />
            </Suspense>
          )}
        </main>

        <aside
          aria-label="Right side banners"
          className="hidden xl:flex flex-col items-center gap-4 shrink-0 w-[160px]"
        >
          {[0, 1, 2, 3].map((idx) => (
            <BannerAd
              key={`right-side-${idx}`}
              slotId={`right-side-${idx}`}
              {...SIDE_BANNER_CONFIG}
            />
          ))}
        </aside>
      </div>

      <Footer
        categories={categories}
        onSelectCategory={handleSelectCategory}
        onNavigatePath={(path) => navigateTo(path)}
      />
    </div>
  );
}

export default App;

