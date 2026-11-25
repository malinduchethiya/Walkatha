import { Story, Category, resolveStoryTimestamps } from '../types/story';
import {
  SITE_ORIGIN,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  buildCanonicalUrl,
} from '../config/site';
import {
  HOME_SEO,
  getCategorySeoCopy,
  formatStorySeoTitle,
} from '../config/seoMetadata';

export const SITE_URL = SITE_ORIGIN;
export { SITE_NAME, DEFAULT_OG_IMAGE };

export const HOME_FAQ_ENTRIES: { question: string; answer: string }[] = [];

export function formatCleanTitle(rawTitle: string, categorySlug?: string): string {
  return formatStorySeoTitle(rawTitle, categorySlug);
}

export function formatCleanDescription(rawDesc: string, fallbackTitle?: string): string {
  const cleaned = (rawDesc || '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 45) {
    const base = fallbackTitle
      ? `${fallbackTitle} — Sinhala wal katha & wela katha Walkathawa වෙතින් නොමිලේ කියවන්න.`
      : HOME_SEO.description;
    return base.slice(0, 158);
  }
  if (cleaned.length <= 158) return cleaned;
  return `${cleaned.slice(0, 155).replace(/\s+\S*$/, '')}...`;
}

export class SeoService {
  private static setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
    if (typeof document === 'undefined') return;
    const matches = Array.from(
      document.head.querySelectorAll(`meta[${attrName}="${attrValue}"]`)
    ) as HTMLMetaElement[];
    let element = matches[0] || null;
    for (let i = 1; i < matches.length; i++) {
      matches[i].parentNode?.removeChild(matches[i]);
    }
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  }

  private static removeMetaTag(attrName: 'name' | 'property', attrValue: string) {
    if (typeof document === 'undefined') return;
    const matches = Array.from(
      document.head.querySelectorAll(`meta[${attrName}="${attrValue}"]`)
    );
    for (const element of matches) {
      element.parentNode?.removeChild(element);
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
    const matches = Array.from(
      document.head.querySelectorAll(`link[rel="${rel}"]`)
    ) as HTMLLinkElement[];
    if (!href) {
      for (const m of matches) {
        m.parentNode?.removeChild(m);
      }
      return;
    }
    let link = matches[0] || null;
    for (let i = 1; i < matches.length; i++) {
      matches[i].parentNode?.removeChild(matches[i]);
    }
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private static setCanonical(url: string | null) {
    this.setLinkRel('canonical', url);
  }

  private static setJsonLd(id: string, schemaData: Record<string, any>) {
    if (typeof document === 'undefined') return;
    const existing = Array.from(
      document.head.querySelectorAll('script[type="application/ld+json"]')
    ) as HTMLScriptElement[];
    let script = (document.getElementById(id) as HTMLScriptElement | null) || existing[0] || null;
    for (const el of existing) {
      if (el !== script) {
        el.parentNode?.removeChild(el);
      }
    }
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.id = id;
    script.textContent = JSON.stringify(schemaData);
  }

  static updateHomeSeo(
    category?: Category | null,
    page = 1,
    stories: Story[] = [],
    totalPages = 1
  ) {
    const isCategory = Boolean(category && category.slug && category.slug !== 'all');
    const categoryLabel = category?.sinhalaName || category?.name || category?.slug || '';
    const catSeo = isCategory ? getCategorySeoCopy(category!.slug || category!.id, categoryLabel) : null;
    const title = isCategory && catSeo
      ? page > 1
        ? `${catSeo.shortBase} — පිටුව ${page} | Walkathawa`
        : `${catSeo.titleBase} | Walkathawa`
      : page > 1
      ? `Sinhala Wal Katha & Wela Katha — පිටුව ${page} | Walkathawa`
      : HOME_SEO.title;

    const description = formatCleanDescription(
      isCategory && catSeo
        ? page > 1
          ? `${catSeo.shortBase} පිටුව ${page} — අලුත්ම sinhala wal katha, wela katha සහ sinhala wela katha Walkathawa වෙතින් නොමිලේ කියවන්න.`
          : catSeo.description
        : page > 1
        ? `Walkathawa (වල් කතාව) පිටුව ${page} — අලුත්ම sinhala wal katha, wela katha, sinhala wela katha, walkatha සහ sinhala wal නොමිලේ කියවන්න.`
        : HOME_SEO.description
    );

    const routePath = isCategory
      ? `/category/${encodeURIComponent(category!.slug || category!.id)}`
      : '/';
    const basePath = buildCanonicalUrl(routePath, 1);
    const canonicalUrl = buildCanonicalUrl(routePath, page);

    const prevUrl = page > 1 ? buildCanonicalUrl(routePath, page - 1) : null;
    const nextUrl = page < totalPages ? buildCanonicalUrl(routePath, page + 1) : null;

    if (typeof document !== 'undefined') {
      document.title = title;
    }

    this.removeMetaTag('name', 'keywords');
    this.removeMetaTag('property', 'article:published_time');
    this.removeMetaTag('property', 'article:modified_time');
    this.setRobots('index, follow, max-image-preview:large');
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
      url: `${SITE_ORIGIN}/story/${encodeURIComponent(story.slug)}`,
    }));

    const graphNodes: Record<string, any>[] = [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_OG_IMAGE,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`,
        name: SITE_NAME,
        inLanguage: 'si-LK',
        description,
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      },
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: 'si-LK',
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      },
    ];

    if (isCategory) {
      graphNodes.push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: categoryLabel, item: basePath },
        ],
      });
    }

    if (itemListElements.length > 0) {
      graphNodes.push({
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#itemlist`,
        numberOfItems: itemListElements.length,
        itemListElement: itemListElements,
      });
    }

    this.setJsonLd('structured-data-jsonld', {
      '@context': 'https://schema.org',
      '@graph': graphNodes,
    });
  }

  static updateStorySeo(story: Story, _relatedStories: Story[] = []) {
    const title = formatCleanTitle(story.title, story.category);
    const bodyText = story.fullContent || story.content || '';
    const description = formatCleanDescription(
      story.shortDescription || story.description || bodyText.slice(0, 145),
      story.title
    );
    const canonicalUrl = buildCanonicalUrl(`/story/${encodeURIComponent(story.slug)}`);
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
    this.setRobots('index, follow, max-image-preview:large');
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('property', 'og:type', 'article');
    this.setMetaTag('property', 'og:site_name', SITE_NAME);
    this.setMetaTag('property', 'og:title', title);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:image', imageUrl);
    if (datePublished) {
      this.setMetaTag('property', 'article:published_time', datePublished);
    } else {
      this.removeMetaTag('property', 'article:published_time');
    }
    if (dateModified) {
      this.setMetaTag('property', 'article:modified_time', dateModified);
    } else {
      this.removeMetaTag('property', 'article:modified_time');
    }

    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', title);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('name', 'twitter:image', imageUrl);

    this.setCanonical(canonicalUrl);
    this.setLinkRel('prev', null);
    this.setLinkRel('next', null);

    const articleNode: Record<string, any> = {
      '@type': 'BlogPosting',
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
      articleSection: story.categoryName || story.category || 'Sinhala Wal Katha',
      keywords: [
        'sinhala wal katha',
        'wela katha',
        'sinhala wela katha',
        'walkatha',
        'wal katha',
        'sinhala wal',
        story.categoryName || story.category || 'walkatha sinhala',
      ],
      image: [imageUrl],
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
      },
      publisher: {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
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
        {
          '@type': 'Organization',
          '@id': `${SITE_ORIGIN}/#organization`,
          name: SITE_NAME,
          url: `${SITE_ORIGIN}/`,
          logo: {
            '@type': 'ImageObject',
            url: DEFAULT_OG_IMAGE,
          },
        },
        articleNode,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'මුල් පිටුව',
              item: `${SITE_ORIGIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: story.categoryName || story.category || 'සිංහල කතා',
              item: `${SITE_ORIGIN}/category/${encodeURIComponent(story.category || 'romantic')}`,
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
  }

  static updateCategoriesSeo(_categories: Category[] = []) {
    this.updateStaticPageSeo(
      'Sinhala Wal Katha Categories — වර්ගීකරණ',
      '/categories',
      'Walkathawa (වල් කතාව) සියලුම sinhala wal katha, wela katha, amma wal katha, wife wal katha, thaththa duwa, akka wal katha, teacher සහ spa kathawa වර්ගීකරණ.'
    );
  }

  static updatePopularSeo(page = 1, totalPages = 1) {
    const title =
      page > 1 ? `Popular Sinhala Wal Katha — පිටුව ${page}` : 'Popular Sinhala Wal Katha — ජනප්‍රිය කතා';
    const canonicalPath = page > 1 ? `/popular/page/${page}` : '/popular';
    this.updateStaticPageSeo(
      title,
      canonicalPath,
      'Walkathawa වෙබ් අඩවියේ වැඩිපුරම කියවන ජනප්‍රිය sinhala wal katha, wela katha, walkatha සහ sinhala wala katha එකතුව.'
    );
    this.setLinkRel('prev', page > 1 ? buildCanonicalUrl('/popular', page - 1) : null);
    this.setLinkRel('next', page < totalPages ? buildCanonicalUrl('/popular', page + 1) : null);
  }

  static updateArchivesSeo(page = 1, totalPages = 1) {
    const title =
      page > 1 ? `Wal Katha New & Archives — පිටුව ${page}` : 'Wal Katha New & Archives — ලේඛනාගාරය';
    const canonicalPath = page > 1 ? `/archives/page/${page}` : '/archives';
    this.updateStaticPageSeo(
      title,
      canonicalPath,
      'Walkathawa සිංහල වල් කතා ලේඛනාගාරය — අලුත්ම wal katha new, aluth wal katha සහ සම්පූර්ණ sinhala walkatha එකතුව.'
    );
    this.setLinkRel('prev', page > 1 ? buildCanonicalUrl('/archives', page - 1) : null);
    this.setLinkRel('next', page < totalPages ? buildCanonicalUrl('/archives', page + 1) : null);
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
    this.updateNoIndexSeo('404 — පිටුව හමු නොවීය');
  }

  static updateNoIndexSeo(pageTitle: string, canonicalPath?: string) {
    const title = `${pageTitle} | Walkathawa`;
    if (typeof document !== 'undefined') document.title = title;
    this.removeMetaTag('name', 'keywords');
    this.setRobots('noindex, nofollow');
    this.setLinkRel('prev', null);
    this.setLinkRel('next', null);
    if (canonicalPath && canonicalPath !== '/404') {
      this.setCanonical(buildCanonicalUrl(canonicalPath));
    } else {
      this.setCanonical(null);
    }
  }

  static updateStaticPageSeo(pageTitle: string, canonicalPath: string, customDescription?: string) {
    const title = `${pageTitle} | Walkathawa`;
    const description =
      customDescription ||
      `${pageTitle} — Walkathawa (වල් කතාව) සිංහල කතා වෙබ් අඩවිය.`;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    if (typeof document !== 'undefined') document.title = title;
    this.removeMetaTag('name', 'keywords');
    this.removeMetaTag('property', 'article:published_time');
    this.removeMetaTag('property', 'article:modified_time');
    this.setRobots('index, follow, max-image-preview:large');
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

    this.setJsonLd('structured-data-jsonld', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: title,
          description,
          inLanguage: 'si-LK',
          isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
            { '@type': 'ListItem', position: 2, name: pageTitle, item: canonicalUrl },
          ],
        },
      ],
    });
  }

  static updateSitemapPageSeo(_totalStories = 613) {
    this.updateStaticPageSeo(
      'Complete Sinhala Wal Katha Index — නාමාවලිය',
      '/sitemap',
      'Walkathawa (වල් කතාව) වෙබ් අඩවියේ සියලුම sinhala wal katha, wela katha, walkatha සහ වර්ගීකරණ එකම පිටුවකින්.'
    );
  }
}
