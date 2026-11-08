import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { StoryGallery } from './components/stories/StoryGallery';
import { StoryReader } from './components/stories/StoryReader';
import { CategoriesPage } from './components/categories/CategoriesPage';
import { StaticPage, StaticPageSlug } from './components/common/StaticPage';
import { HtmlSitemapPage } from './components/common/HtmlSitemapPage';
import { NotFoundPage } from './components/common/NotFoundPage';
import { AdminRoot } from './components/admin/AdminRoot';
import { Story, Category } from './types/story';
import { StoryService } from './services/storyService';
import { SeoService } from './services/seoService';
import { testConnection } from './firebase';

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

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [staticSlug, setStaticSlug] = useState<StaticPageSlug>('privacy-policy');
  const [selectedStorySlug, setSelectedStorySlug] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('WalKatha');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'oldest'>('latest');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [stories, setStories] = useState<Story[]>([]);
  const [totalStories, setTotalStories] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isInitialRouteRef = useRef<boolean>(true);

  useEffect(() => {
    testConnection();
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const POPUNDER_SRC = 'https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e';
    const existing = document.head.querySelector(`script[src="${POPUNDER_SRC}"]`);

    if (isInitialRouteRef.current) {
      isInitialRouteRef.current = false;
      // On initial page load, leave the existing <head> script untouched so it finishes loading natively
      if (!existing && (viewMode === 'home' || viewMode === 'reader')) {
        const script = document.createElement('script');
        script.setAttribute('data-cfasync', 'false');
        script.src = POPUNDER_SRC;
        document.head.appendChild(script);
      }
    } else if (viewMode === 'home' || viewMode === 'reader') {
      // On SPA navigation to home or a story page, create a fresh <script> node right before </head>
      // so the browser executes the popunder script for the new page view
      if (existing) {
        existing.remove();
      }
      const script = document.createElement('script');
      script.setAttribute('data-cfasync', 'false');
      script.src = POPUNDER_SRC;
      document.head.appendChild(script);
    }

    const SOCIALBAR_SRC = 'https://brijmohan.org/14/c05ac7bd55736617f6c7021ffa7f49da';
    const existingSocial = document.body.querySelector(`script[src="${SOCIALBAR_SRC}"]`);
    if (!existingSocial) {
      const socialScript = document.createElement('script');
      socialScript.setAttribute('data-cfasync', 'false');
      socialScript.src = SOCIALBAR_SRC;
      document.body.appendChild(socialScript);
    }
  }, [viewMode, selectedStorySlug, currentPage]);

  const parseRoute = useCallback(() => {
    const path = decodeURIComponent(window.location.pathname).replace(/\/+$/, '') || '/';
    const searchParams = new URLSearchParams(window.location.search);
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const validPage = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
    const qParam = searchParams.get('s') || searchParams.get('q') || '';

    if (qParam) {
      setSearchQuery(qParam);
    }

    if (path === '/admin' || path.startsWith('/admin/')) {
      setViewMode('admin');
      return;
    }

    if (path === '/' || path === '') {
      setViewMode('home');
      setSelectedStorySlug(null);
      setSelectedCategory('all');
      setCurrentPage(validPage);
      return;
    }

    if (path === '/popular') {
      setViewMode('popular');
      setSelectedStorySlug(null);
      setSelectedCategory('all');
      setSortBy('popular');
      setCurrentPage(validPage);
      return;
    }

    if (path === '/archives' || path === '/archiveposts') {
      setViewMode('archives');
      setSelectedStorySlug(null);
      setSelectedCategory('all');
      setCurrentPage(validPage);
      return;
    }

    if (path === '/search') {
      setViewMode('search');
      setSelectedStorySlug(null);
      setSelectedCategory('all');
      setCurrentPage(validPage);
      return;
    }

    if (path.startsWith('/profile/') || path.startsWith('/followers/') || path.startsWith('/following/')) {
      const author = path.replace(/^\/(profile|followers|following)\//, '').trim() || 'WalKatha';
      setSelectedAuthor(author);
      setViewMode('profile');
      setSelectedStorySlug(null);
      setSelectedCategory('all');
      setCurrentPage(validPage);
      return;
    }

    if (path === '/categories') {
      setViewMode('categories');
      setSelectedStorySlug(null);
      return;
    }

    if (path === '/sitemap') {
      setViewMode('sitemap');
      setSelectedStorySlug(null);
      return;
    }

    if (path.startsWith('/page/')) {
      const pSlug = path.replace('/page/', '').trim() as StaticPageSlug;
      setStaticSlug(pSlug || 'privacy-policy');
      setViewMode('static');
      return;
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
      setStaticSlug(path.replace('/', '') as StaticPageSlug);
      setViewMode('static');
      return;
    }

    if (path.startsWith('/category/')) {
      const catSlug = path.replace('/category/', '').trim();
      if (catSlug) {
        setViewMode('category');
        setSelectedStorySlug(null);
        setSelectedCategory(catSlug);
        setCurrentPage(validPage);
        return;
      }
    }

    if (path.startsWith('/posts/') || path.startsWith('/story/')) {
      const isAmp = path.endsWith('/amp');
      const slug = path
        .replace(/^\/(posts|story)\//, '')
        .replace(/\/amp$/, '')
        .trim();
      if (slug) {
        setSelectedStorySlug(slug);
        setViewMode(isAmp ? 'amp-reader' : 'reader');
        return;
      }
    }

    setViewMode('not-found');
  }, []);

  useEffect(() => {
    parseRoute();
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

  const fetchStoriesList = useCallback(async () => {
    if (!isGalleryView) return;
    setIsLoading(true);
    try {
      const result = await StoryService.getStories({
        category: viewMode === 'category' && selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery,
        sortBy: viewMode === 'popular' ? 'popular' : sortBy,
        page: currentPage,
        limit: 15,
      });

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
      setStories([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    isGalleryView,
    viewMode,
    selectedCategory,
    selectedAuthor,
    searchQuery,
    sortBy,
    currentPage,
    categories,
  ]);

  useEffect(() => {
    fetchStoriesList();
  }, [fetchStoriesList]);

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
      <AdminRoot
        onBackToPublic={() => {
          refreshAllFromFirestore();
          navigateTo('/');
        }}
        onViewStoryPublic={(slug) => handleSelectStory(slug)}
        onDataChanged={refreshAllFromFirestore}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090e1d] text-slate-100">
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

      <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-5 py-6">
        <main className="w-full">
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
            <CategoriesPage
              categories={categories}
              onSelectCategory={handleSelectCategory}
              onBack={() => navigateTo('/')}
            />
          )}

          {viewMode === 'sitemap' && (
            <HtmlSitemapPage
              categories={categories}
              onSelectStory={handleSelectStory}
              onSelectCategory={handleSelectCategory}
              onBack={() => navigateTo('/')}
            />
          )}

          {viewMode === 'static' && (
            <StaticPage page={staticSlug} onBack={() => navigateTo('/')} />
          )}

          {viewMode === 'not-found' && (
            <NotFoundPage
              onGoHome={() => navigateTo('/')}
              onBrowseCategories={() => navigateTo('/categories')}
            />
          )}
        </main>
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
