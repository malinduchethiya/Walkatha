import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { StoryGallery } from './components/stories/StoryGallery';
import { StoryReader } from './components/stories/StoryReader';
import type { StaticPageSlug } from './components/common/StaticPage';
import type { Story, Category } from './types/story';
import { StoryService } from './services/storyService';
import { SeoService } from './services/seoService';
import { testConnection } from './firebase';
import { resolveRouteState, type ViewMode } from './utils/storyFormatting';
import { readInitialGalleryFromDocument } from './utils/initialData';
import { BannerAd, SIDE_BANNER_CONFIG, SIDE_BANNER_SLOTS } from './components/common/BannerAd';

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

function getLocationRoute() {
  if (typeof window === 'undefined') {
    return resolveRouteState('/', '');
  }
  const resolved = resolveRouteState(window.location.pathname, window.location.search);
  if (resolved.canonicalReplacePath) {
    window.history.replaceState({}, '', resolved.canonicalReplacePath);
  }
  return resolved;
}

export function App() {
  const initialRoute = getLocationRoute();

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

  const initialGallery = readInitialGalleryFromDocument(
    initialRoute.viewMode,
    initialRoute.selectedCategory,
    initialRoute.currentPage
  );

  const [stories, setStories] = useState<Story[]>(() => initialGallery?.stories || []);
  const [totalStories, setTotalStories] = useState<number>(
    () => initialGallery?.totalStories || 0
  );
  const [totalPages, setTotalPages] = useState<number>(() => initialGallery?.totalPages || 1);
  const [categories, setCategories] = useState<Category[]>(
    () => initialGallery?.categories || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialGallery);

  useEffect(() => {
    testConnection();
    document.documentElement.setAttribute('lang', 'si');
    document.documentElement.classList.add('dark');
  }, []);

  const parseRoute = useCallback(() => {
    const resolved = getLocationRoute();
    setViewMode(resolved.viewMode);
    setStaticSlug(resolved.staticSlug);
    setSelectedStorySlug(resolved.selectedStorySlug);
    setSelectedCategory(resolved.selectedCategory);
    setSelectedAuthor(resolved.selectedAuthor);
    setSearchQuery(resolved.searchQuery);
    setSortBy(resolved.sortBy);
    setCurrentPage(resolved.currentPage);
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
      const hydratedMatch = readInitialGalleryFromDocument(
        viewMode,
        selectedCategory,
        currentPage
      );
      if (!hydratedMatch || sortBy !== 'latest' || Boolean(searchQuery)) {
        setIsLoading(true);
      }
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
          SeoService.updatePopularSeo(currentPage, result.totalPages || 1);
        } else if (viewMode === 'archives') {
          SeoService.updateArchivesSeo(currentPage, result.totalPages || 1);
        } else if (viewMode === 'profile') {
          SeoService.updateProfileSeo(selectedAuthor);
        } else if (viewMode === 'search') {
          SeoService.updateSearchSeo();
        }
      } catch {
        if (!isCancelled() && !hydratedMatch) setStories([]);
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
    if (!catSlug || catSlug === 'all') {
      navigateTo('/');
    } else {
      navigateTo(`/category/${encodeURIComponent(catSlug)}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (viewMode === 'search' && searchQuery) {
      const qs = new URLSearchParams({ s: searchQuery });
      if (newPage > 1) qs.set('page', String(newPage));
      navigateTo(`/search?${qs.toString()}`);
      return;
    }
    if (viewMode === 'profile') {
      const base = `/profile/${encodeURIComponent(selectedAuthor)}`;
      navigateTo(newPage > 1 ? `${base}?page=${newPage}` : base);
      return;
    }
    let baseUrl = '/';
    if (viewMode === 'category' && selectedCategory && selectedCategory !== 'all') {
      baseUrl = `/category/${encodeURIComponent(selectedCategory)}`;
    } else if (viewMode === 'popular') {
      baseUrl = '/popular';
    } else if (viewMode === 'archives') {
      baseUrl = '/archives';
    }
    const targetUrl =
      newPage <= 1
        ? baseUrl
        : baseUrl === '/'
        ? `/page/${newPage}`
        : `${baseUrl}/page/${newPage}`;
    navigateTo(targetUrl);
  };

  const handleSearchSubmit = (query: string) => {
    if (query) {
      navigateTo(`/search?s=${encodeURIComponent(query)}`);
    } else {
      navigateTo('/');
    }
  };

  const refreshAllFromFirestore = useCallback(async () => {
    try {
      const cats = await StoryService.getCategories(true);
      setCategories(cats);
    } catch {
      // ignore
    }
    void loadGalleryStories();
  }, [loadGalleryStories]);

  if (viewMode === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#0e0e10]" />}>
        <AdminRoot
          onBackToPublic={() => {
            void refreshAllFromFirestore();
            navigateTo('/');
          }}
          onViewStoryPublic={handleSelectStory}
          onDataChanged={refreshAllFromFirestore}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-[#0e0e10] text-zinc-100">
      <Header
        activeView={viewMode}
        searchQuery={searchQuery}
        onSearchSubmit={handleSearchSubmit}
        onNavigate={navigateTo}
      />

      <div className="flex-1 w-full flex items-start justify-center gap-4 px-2 sm:px-4">
        <aside
          aria-label="Left side banners"
          data-testid="left-banner-rail"
          className="hidden xl:flex flex-col items-center gap-4 shrink-0 w-[160px] pt-8 pb-8"
        >
          {SIDE_BANNER_SLOTS.map((idx) => (
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
              selectedAuthor={selectedAuthor}
              onSelectCategory={handleSelectCategory}
              onSelectStory={handleSelectStory}
              searchQuery={searchQuery}
              onClearSearch={() => navigateTo('/')}
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
              categories={categories}
              isAmp={viewMode === 'amp-reader'}
              onBack={() => navigateTo('/')}
              onSelectStory={handleSelectStory}
              onSelectCategory={handleSelectCategory}
              onSelectAuthor={(author) => navigateTo(`/profile/${encodeURIComponent(author)}`)}
            />
          )}

          {viewMode === 'categories' && (
            <Suspense fallback={<div className="py-12" />}>
              <CategoriesPage
                categories={categories}
                onSelectCategory={handleSelectCategory}
                onBack={() => navigateTo('/')}
              />
            </Suspense>
          )}

          {viewMode === 'sitemap' && (
            <Suspense fallback={<div className="py-12" />}>
              <HtmlSitemapPage
                categories={categories}
                onSelectStory={handleSelectStory}
                onSelectCategory={handleSelectCategory}
                onBack={() => navigateTo('/')}
              />
            </Suspense>
          )}

          {viewMode === 'static' && (
            <Suspense fallback={<div className="py-12" />}>
              <StaticPage page={staticSlug} onBack={() => navigateTo('/')} />
            </Suspense>
          )}

          {viewMode === 'not-found' && (
            <Suspense fallback={<div className="py-12" />}>
              <NotFoundPage
                onGoHome={() => navigateTo('/')}
                onBrowseCategories={() => navigateTo('/categories')}
              />
            </Suspense>
          )}
        </main>

        <aside
          aria-label="Right side banners"
          data-testid="right-banner-rail"
          className="hidden xl:flex flex-col items-center gap-4 shrink-0 w-[160px] pt-8 pb-8"
        >
          {SIDE_BANNER_SLOTS.map((idx) => (
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
        onNavigatePath={navigateTo}
      />
    </div>
  );
}

export default App;
