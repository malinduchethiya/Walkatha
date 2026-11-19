import { Story, Category, resolveStoryTimestamps } from '../types/story';
import { isSearchEngineCrawler } from '../utils/botDetection';

export const SITE_URL = 'https://www.walkathawa.site';
export const SITE_NAME = 'Walkathawa';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/icon.png`;

export const HOME_FAQ_ENTRIES: { question: string; answer: string }[] = [];

export function formatCleanTitle(rawTitle: string): string {
  const cleaned = rawTitle
    .replace(/\s*[–|-]\s*(Sinhala\s+)?(Wal|Wela|Wala|Sex)\s+Katha.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const suffix = ' | Walkathawa';
  if (cleaned.length + suffix.length <= 60) {
    return `${cleaned}${suffix}`;
  }
  return `${cleaned.slice(0, Math.max(10, 57 - suffix.length)).trim()}...${suffix}`;
}

export function formatCleanDescription(rawDesc: string, fallbackTitle?: string): string {
  const cleaned = (rawDesc || '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 35) {
    const base = fallbackTitle
      ? `${fallbackTitle} — සිංහල කතා Walkathawa වෙතින් නොමිලේ කියවන්න.`
      : 'Walkathawa (වල් කතාව) — අලුත්ම සිංහල කතා, ආදර කතා සහ කෙටි කතා එකතුව නොමිලේ කියවන්න.';
    return base.slice(0, 158);
  }
  if (cleaned.length <= 158) return cleaned;
  return `${cleaned.slice(0, 155).replace(/\s+\S*$/, '')}...`;
}

export class SeoService {
  private static setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
    if (typeof document === 'undefined') return;
    let element = document.querySelector(
      `meta[${attrName}="${attrValue}"]`
    ) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  }

  private static removeMetaTag(attrName: 'name' | 'property', attrValue: string) {
    if (typeof document === 'undefined') return;
    const element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  private static setRobots(robotsValue: string | null) {
    if (!robotsValue) {
      this.removeMetaTag('name', 'robots');
      return;
    }
    this.setMetaTag('name', 'robots', robotsValue);
  }

  private static setLinkRel(rel: string, href: string | null) {
    if (typeof document === 'undefined') return;
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!href) {
      if (link && link.parentNode) {
        link.parentNode.removeChild(link);
      }
      return;
    }
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private static setCanonical(url: string) {
    this.setLinkRel('canonical', url);
  }

  private static setJsonLd(id: string, schemaData: Record<string, any>) {
    if (typeof document === 'undefined') return;
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaData);
  }

  static ensureHeadClosingScript(enabled = true) {
    if (!enabled || typeof document === 'undefined' || !document.head) return;
    if (isSearchEngineCrawler()) return;
    const src = 'https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e';
    let script = document.head.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('data-cfasync', 'false');
      script.src = src;
    }
    if (document.head.lastElementChild !== script) {
      document.head.appendChild(script);
    }
  }

  static updateHomeSeo(
    category?: Category | null,
    page = 1,
    stories: Story[] = [],
    totalPages = 1
  ) {
    const isCategory = Boolean(category && category.slug && category.slug !== 'all');
    const categoryLabel = category?.sinhalaName || category?.name || category?.slug || '';
    const title = isCategory
      ? page > 1
        ? `${categoryLabel} — පිටුව ${page} | Walkathawa`
        : `${categoryLabel} | Walkathawa`
      : page > 1
      ? `Walkathawa (වල් කතාව) — පිටුව ${page}`
      : 'Walkathawa (වල් කතාව) | Sinhala Stories Online';

    const description = formatCleanDescription(
      isCategory
        ? `${categoryLabel} — සිංහල කතා එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.`
        : 'Walkathawa (වල් කතාව) — අලුත්ම සිංහල කතා, ආදර කතා සහ කෙටි කතා එකතුව නොමිලේ කියවන්න.'
    );

    const basePath = isCategory
      ? `${SITE_URL}/category/${encodeURIComponent(category!.slug || category!.id)}`
      : `${SITE_URL}/`;
    const canonicalUrl =
      page > 1
        ? isCategory
          ? `${basePath}?page=${page}`
          : `${SITE_URL}/?page=${page}`
        : basePath;

    const prevUrl =
      page > 1
        ? page === 2
          ? basePath
          : isCategory
          ? `${basePath}?page=${page - 1}`
          : `${SITE_URL}/?page=${page - 1}`
        : null;
    const nextUrl =
      page < totalPages
        ? isCategory
          ? `${basePath}?page=${page + 1}`
          : `${SITE_URL}/?page=${page + 1}`
        : null;

    if (typeof document !== 'undefined') {
      document.title = title;
    }

    this.removeMetaTag('name', 'keywords');
    this.setRobots(null);
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('property', 'og:type', 'website');
    this.setMetaTag('property', 'og:site_name', SITE_NAME);
    this.setMetaTag('property', 'og:title', title);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:image', DEFAULT_OG_IMAGE);
    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', title);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('name', 'twitter:image', DEFAULT_OG_IMAGE);

    this.setCanonical(canonicalUrl);
    this.setLinkRel('prev', prevUrl);
    this.setLinkRel('next', nextUrl);

    const itemListElements = stories.slice(0, 20).map((story, idx) => ({
      '@type': 'ListItem',
      position: (page - 1) * 20 + idx + 1,
      name: story.title,
      url: `${SITE_URL}/story/${encodeURIComponent(story.slug)}`,
    }));

    this.setJsonLd('structured-data-jsonld', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: `${SITE_URL}/`,
          name: SITE_NAME,
          inLanguage: 'si-LK',
          description,
        },
        {
          '@type': 'CollectionPage',
          '@id': `${canonicalUrl}#collection`,
          url: canonicalUrl,
          name: title,
          description,
          inLanguage: 'si-LK',
          isPartOf: { '@id': `${SITE_URL}/#website` },
        },
        ...(itemListElements.length > 0
          ? [
              {
                '@type': 'ItemList',
                '@id': `${canonicalUrl}#itemlist`,
                numberOfItems: itemListElements.length,
                itemListElement: itemListElements,
              },
            ]
          : []),
      ],
    });
    this.ensureHeadClosingScript(true);
  }

  static updateStorySeo(story: Story, _relatedStories: Story[] = []) {
    const title = formatCleanTitle(story.title);
    const bodyText = story.fullContent || story.content || '';
    const description = formatCleanDescription(
      story.shortDescription || story.description || bodyText.slice(0, 145),
      story.title
    );
    const canonicalUrl = `${SITE_URL}/story/${encodeURIComponent(story.slug)}`;
    const imageUrl =
      story.coverImage && story.coverImage.startsWith('http')
        ? story.coverImage
        : DEFAULT_OG_IMAGE;

    const { datePublished, dateModified } = resolveStoryTimestamps(story);
    const wordCount = story.wordCount || (bodyText ? bodyText.split(/\s+/).length : 950);
    const readingMinutes = story.readingTime || Math.max(3, Math.ceil(wordCount / 180));

    if (typeof document !== 'undefined') {
      document.title = title;
    }

    this.removeMetaTag('name', 'keywords');
    this.setRobots(null);
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('property', 'og:type', 'article');
    this.setMetaTag('property', 'og:site_name', SITE_NAME);
    this.setMetaTag('property', 'og:title', title);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:image', imageUrl);
    if (datePublished) {
      this.setMetaTag('property', 'article:published_time', datePublished);
    }
    if (dateModified) {
      this.setMetaTag('property', 'article:modified_time', dateModified);
    }

    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', title);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('name', 'twitter:image', imageUrl);

    this.setCanonical(canonicalUrl);
    this.setLinkRel('prev', null);
    this.setLinkRel('next', null);

    const articleNode: Record<string, any> = {
      '@type': 'Article',
      '@id': `${canonicalUrl}#article`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
      },
      headline: story.title,
      name: story.title,
      description,
      inLanguage: 'si-LK',
      wordCount,
      timeRequired: `PT${readingMinutes}M`,
      articleSection: story.categoryName || story.category || 'සිංහල කතා',
      image: [imageUrl],
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: `${SITE_URL}/`,
      },
      publisher: {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_OG_IMAGE,
        },
      },
    };

    this.setJsonLd('structured-data-jsonld', {
      '@context': 'https://schema.org',
      '@graph': [
        articleNode,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'මුල් පිටුව',
              item: `${SITE_URL}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: story.categoryName || story.category || 'සිංහල කතා',
              item: `${SITE_URL}/category/${encodeURIComponent(story.category || 'romantic')}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: story.title,
              item: canonicalUrl,
            },
          ],
        },
      ],
    });
    this.ensureHeadClosingScript(true);
  }

  static updateCategoriesSeo(_categories: Category[] = []) {
    this.updateStaticPageSeo(
      'වර්ගීකරණ',
      '/categories',
      'Walkathawa සිංහල කතා වර්ගීකරණ එකතුව පිරික්සන්න.'
    );
  }

  static updatePopularSeo() {
    this.updateStaticPageSeo(
      'ජනප්‍රිය කතා',
      '/popular',
      'Walkathawa වෙබ් අඩවියේ වැඩිපුරම කියවන ජනප්‍රිය සිංහල කතා එකතුව.'
    );
  }

  static updateArchivesSeo() {
    this.updateStaticPageSeo(
      'ලේඛනාගාරය',
      '/archives',
      'Walkathawa සිංහල කතා ලේඛනාගාරය — පැරණි හා අලුත් කතා සියල්ල.'
    );
  }

  static updateProfileSeo(authorName: string) {
    this.updateStaticPageSeo(
      authorName,
      `/profile/${encodeURIComponent(authorName)}`,
      `${authorName} විසින් Walkathawa හි පළ කරන ලද සිංහල කතා එකතුව.`
    );
  }

  static updateSearchSeo() {
    this.updateNoIndexSeo('සෙවුම් ප්‍රතිඵල', '/search');
  }

  static updateNotFoundSeo() {
    this.updateNoIndexSeo('404 — පිටුව හමු නොවීය', '/404');
  }

  static updateNoIndexSeo(pageTitle: string, canonicalPath?: string) {
    const title = `${pageTitle} | Walkathawa`;
    if (typeof document !== 'undefined') document.title = title;
    this.removeMetaTag('name', 'keywords');
    this.setRobots('noindex, nofollow');
    this.setLinkRel('prev', null);
    this.setLinkRel('next', null);
    if (canonicalPath && canonicalPath !== '/404') {
      const canonicalUrl = `${SITE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
      this.setCanonical(canonicalUrl);
    }
    this.ensureHeadClosingScript(true);
  }

  static updateStaticPageSeo(pageTitle: string, canonicalPath: string, customDescription?: string) {
    const title = `${pageTitle} | Walkathawa`;
    const description =
      customDescription ||
      `${pageTitle} — Walkathawa (වල් කතාව) සිංහල කතා වෙබ් අඩවිය.`;
    const canonicalUrl = `${SITE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    if (typeof document !== 'undefined') document.title = title;
    this.removeMetaTag('name', 'keywords');
    this.setRobots(null);
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('property', 'og:type', 'website');
    this.setMetaTag('property', 'og:site_name', SITE_NAME);
    this.setMetaTag('property', 'og:title', title);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:image', DEFAULT_OG_IMAGE);
    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', title);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('name', 'twitter:image', DEFAULT_OG_IMAGE);
    this.setCanonical(canonicalUrl);
    this.setLinkRel('prev', null);
    this.setLinkRel('next', null);
    this.ensureHeadClosingScript(true);
  }

  static updateSitemapPageSeo(_totalStories = 613) {
    this.updateStaticPageSeo(
      'සම්පූර්ණ කතා නාමාවලිය',
      '/sitemap',
      'Walkathawa වෙබ් අඩවියේ සියලුම සිංහල කතා සහ වර්ගීකරණ එකම පිටුවකින්.'
    );
  }
}
