import { Story, Category } from '../types/story';

const SITE_URL = 'https://www.walkathawa.site';
const SITE_NAME = 'Walkathawa';
const DEFAULT_OG_IMAGE = `${SITE_URL}/icon.png`;

// Research-backed primary Sinhala & Singlish keywords (2026 Sri Lanka search trends)
export const PRIMARY_SINHALA_KEYWORDS = [
  'සිංහල වැල කතා',
  'වල් කතා',
  'වැල කතා',
  'Sinhala Wal Katha',
  'Wela Katha',
  'Walkatha9',
];

export const TARGET_SITE_KEYWORDS = [
  'සිංහල වැල කතා',
  'වල් කතා',
  'වැල කතා',
  'සිංහල වල් කතා',
  'අලුත්ම වල් කතා 2026',
  'අම්මා වල් කතා 2026',
  'Sinhala Wal Katha',
  'Wela Katha',
  'Sinhala Walkatha',
  'Walkatha9',
  'Sinhala Katha',
  'New Sinhala wal katha 2026',
  'Aluth wal katha',
  'Aunty wal katha',
  'ඇන්ටි කතා',
  'Teacher wal katha',
  'ටීචර් කතා',
  'Kamathuru katha',
  'ආදර සහ ලිංගික කතා',
  'Sri Lankan wal katha site',
  'Wala katha pdf',
  'Wal Katha',
  'wala katha',
  'wela katha',
  'Wela kathaa',
  'Sex Katha',
  'Sex Stories',
  'Wal Stories',
  'Sinhala Sex',
  'Sinhala Porn',
  'Free Download',
  'Sri Lanka',
  'new wela katha',
  'wal katha 9',
  'sinhala wela katha',
  'wal Katha sinhalen',
  'Ammai Puthai',
  'Paule wela Katha',
  'Sinhala wal wala wela katha',
  'amma katha',
  'family katha',
  'suparima katha',
  'walma',
  'wal katha kari katha',
  'eha gedara',
  'akka katha',
  'malli katha',
  'seeya katha',
  'husband katha',
  'wife katha',
  'hora katha',
  'New Wal Katha blogs',
  'wal chithra katha',
  'wal katha free',
  'sinhala sex katha',
  'sinhala wal katha blog',
  'nangita hukala',
  'campus wal katha',
  'amma malli',
  'akka malli wal katha',
  'birinda wal katha',
  'wife lingika paula',
  'rasama wal katha',
  'rasa wal katha',
  'wal katha fb',
];

export const HOME_FAQ_ENTRIES = [
  {
    question: 'අලුත්ම සිංහල වැල කතා (New Sinhala Wal Katha 2026) නොමිලේ කියවන්නේ කොහොමද?',
    answer:
      'Walkathawa (walkathawa.site) වෙබ් අඩවිය හරහා දිනපතා අලුත් වන සිංහල වැල කතා, වල් කතා, Wela Katha සහ Walkatha9 එකතුවේ කතා 600කට වැඩි ප්‍රමාණයක් කිසිදු ගාස්තුවකින් තොරව ජංගම දුරකථනයෙන් හෝ පරිගණකයෙන් සෘජුවම කියවිය හැක.',
  },
  {
    question: 'Walkathawa වෙබ් අඩවියේ ඇති ප්‍රධාන සිංහල වල් කතා වර්ගීකරණ (Categories) මොනවාද?',
    answer:
      'වයිෆ් සහ බිරිඳ කතා (Wife Wal Katha), අක්කා මල්ලි කතා (Akka Malli Katha), නැන්දා සහ ඇන්ටි කතා (Aunty & Nanda Wal Katha), පාසල් සහ කැම්පස් කතා (School & Campus Wela Katha), ටීචර් කතා (Teacher Katha) සහ ආදර කතා (Romantic Sinhala Katha) ඇතුළු සියලුම වර්ගීකරණ මෙහි ඇතුළත් වේ.',
  },
  {
    question: 'සිංහල වැල කතා PDF සහ සම්පූර්ණ දිගු කතා (Full-Length Sinhala Stories) මෙහි තිබේද?',
    answer:
      'ඔව්, සෑම කතාවක්ම කොටස් අඩු නොකර සම්පූර්ණ සිංහල යුනිකෝඩ් අකුරින් (Full Sinhala Unicode Story) පැහැදිලිව කියවීමට හැකි පරිදි සකසා ඇත.',
  },
];

/**
 * Enforces high-CTR, natural titles strictly <= 60 characters
 */
export function formatCleanTitle(rawTitle: string): string {
  const cleaned = rawTitle
    .replace(/\s*[–|-]\s*(Sinhala\s+)?(Wal|Wela|Wala|Sex)\s+Katha.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const suffix = ' - සිංහල වැල කතා | Walkatha';
  if (cleaned.length + suffix.length <= 60) {
    return `${cleaned}${suffix}`;
  }
  const shortSuffix = ' | සිංහල වැල කතා';
  if (cleaned.length + shortSuffix.length <= 60) {
    return `${cleaned}${shortSuffix}`;
  }
  if (cleaned.length <= 60) {
    return cleaned;
  }
  return `${cleaned.slice(0, 57).replace(/\s+\S*$/, '')}...`;
}

/**
 * Enforces high-CTR meta descriptions strictly <= 158 characters
 */
export function formatCleanDescription(rawDesc: string, fallbackTitle?: string): string {
  const cleaned = (rawDesc || '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 35) {
    const base = fallbackTitle
      ? `${fallbackTitle} - අලුත්ම සිංහල වැල කතා (Sinhala Wal Katha 2026) සහ රසවත් වල් කතා එකතුවෙන් දැන්ම කියවන්න.`
      : 'අලුත්ම සිංහල වැල කතා (Sinhala Wal Katha 2026), වල් කතා, Wela Katha, ඇන්ටි කතා සහ පවුලේ වැල කතා 600+ එකතුව නොමිලේ කියවන්න.';
    return base.slice(0, 158);
  }

  if (cleaned.length <= 158) {
    return cleaned;
  }

  return `${cleaned.slice(0, 155).replace(/\s+\S*$/, '')}...`;
}

export class SeoService {
  private static setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
    if (typeof document === 'undefined') return;
    let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
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
    const secureUrl = href.replace(/^http:\/\//i, 'https://');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', secureUrl);
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

  /**
   * Home & Category Page SEO:
   * - Bilingual Sinhala + Singlish Title (< 60 chars) & Description (< 158 chars)
   * - Pagination rel="prev" / rel="next"
   * - Schema.org WebSite + Organization + CollectionPage + ItemList + BreadcrumbList + FAQPage
   */
  static updateHomeSeo(
    category?: Category | null,
    page = 1,
    stories: Story[] = [],
    totalPages = 1
  ) {
    const isCategory = Boolean(category && category.slug && category.slug !== 'all');
    const pageSuffix = page > 1 ? ` - පිටුව ${page}` : '';

    const rawTitle = isCategory
      ? `${category?.sinhalaName || category?.name} | සිංහල වැල කතා${pageSuffix}`
      : `සිංහල වැල කතා | Sinhala Wal Katha & Wela Katha 2026${pageSuffix}`;

    const title = rawTitle.length <= 60 ? rawTitle : `${rawTitle.slice(0, 57)}...`;

    const rawDesc = isCategory
      ? `${category?.sinhalaName || category?.name} - අලුත්ම සිංහල වැල කතා (Sinhala Wal Katha 2026), වල් කතා සහ Wela Katha එකතුව නොමිලේ කියවන්න.`
      : 'අලුත්ම සිංහල වැල කතා (Sinhala Wal Katha 2026), වල් කතා, Wela Katha, Walkatha9, ඇන්ටි සහ පවුලේ වැල කතා 600+ එකතුව නොමිලේ කියවන්න.';

    const description = formatCleanDescription(rawDesc);

    const basePath = isCategory
      ? `${SITE_URL}/category/${encodeURIComponent(category!.slug || category!.id)}`
      : `${SITE_URL}/`;
    const canonicalUrl =
      page > 1
        ? `${basePath.replace(/\/$/, '')}?page=${page}`
        : basePath;

    const prevUrl =
      page > 1
        ? page === 2
          ? basePath
          : `${basePath.replace(/\/$/, '')}?page=${page - 1}`
        : null;
    const nextUrl =
      page < totalPages
        ? `${basePath.replace(/\/$/, '')}?page=${page + 1}`
        : null;

    if (typeof document !== 'undefined') {
      document.title = title;
    }

    this.setMetaTag('name', 'title', title);
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('name', 'keywords', TARGET_SITE_KEYWORDS.join(', '));
    this.setMetaTag(
      'name',
      'robots',
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    this.setMetaTag('property', 'og:type', 'website');
    this.setMetaTag('property', 'og:site_name', SITE_NAME);
    this.setMetaTag('property', 'og:locale', 'si_LK');
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

    const itemListElements = stories.slice(0, 30).map((story, idx) => ({
      '@type': 'ListItem',
      position: (page - 1) * 30 + idx + 1,
      name: story.title,
      url: `${SITE_URL}/story/${encodeURIComponent(story.slug)}`,
    }));

    const graph: Record<string, any>[] = [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Walkathawa - සිංහල වැල කතා | Sinhala Wal Katha 2026',
        alternateName: [
          'සිංහල වැල කතා',
          'වල් කතා',
          'වැල කතා',
          'Sinhala Wal Katha',
          'Wela Katha',
          'Walkatha9',
          'Sinhala Walkatha',
          'Aluth Wal Katha 2026',
        ],
        inLanguage: 'si-LK',
        description,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: 'Walkathawa Sinhala Wal Katha',
        url: `${SITE_URL}/`,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_OG_IMAGE,
          width: 512,
          height: 512,
        },
      },
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: 'si-LK',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: PRIMARY_SINHALA_KEYWORDS.map((kw) => ({
          '@type': 'Thing',
          name: kw,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: isCategory
          ? [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'මුල් පිටුව (සිංහල වැල කතා)',
                item: `${SITE_URL}/`,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: category?.sinhalaName || category?.name || 'වර්ගීකරණය',
                item: basePath,
              },
            ]
          : [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'මුල් පිටුව (සිංහල වැල කතා)',
                item: `${SITE_URL}/`,
              },
            ],
      },
    ];

    if (itemListElements.length > 0) {
      graph.push({
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#itemlist`,
        name: isCategory
          ? `${category?.sinhalaName || category?.name} - සිංහල වැල කතා ලැයිස්තුව`
          : 'අලුත්ම සිංහල වැල කතා ලැයිස්තුව (Latest Sinhala Wal Katha)',
        numberOfItems: itemListElements.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: itemListElements,
      });
    }

    if (page === 1) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: HOME_FAQ_ENTRIES.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      });
    }

    this.setJsonLd('structured-data-jsonld', {
      '@context': 'https://schema.org',
      '@graph': graph,
    });
  }

  /**
   * Individual Story Page SEO (Title <= 60 chars, Description <= 158 chars, Schema.org Article + BlogPosting + BreadcrumbList)
   */
  static updateStorySeo(story: Story, relatedStories: Story[] = []) {
    const title = formatCleanTitle(story.title);
    const bodyText = story.fullContent || story.content || '';
    const description = formatCleanDescription(
      story.shortDescription || story.description || bodyText.slice(0, 160),
      story.title
    );
    const canonicalUrl = `${SITE_URL}/story/${encodeURIComponent(story.slug)}`;
    const imageUrl =
      story.coverImage && story.coverImage.startsWith('http')
        ? story.coverImage
        : DEFAULT_OG_IMAGE;

    const storyKeywords = Array.from(
      new Set([
        story.title,
        ...PRIMARY_SINHALA_KEYWORDS,
        ...(story.tags || []),
        story.categoryName || story.category || 'sinhala wal katha',
        'අම්මා වල් කතා 2026',
        'sinhala wela katha',
        'wal katha sinhalen',
        'aluth wal katha 2026',
      ])
    ).join(', ');

    const wordCount = story.wordCount || (bodyText ? bodyText.split(/\s+/).length : 950);
    const readingMinutes = story.readingTime || Math.max(3, Math.ceil(wordCount / 180));

    if (typeof document !== 'undefined') {
      document.title = title;
    }

    this.setMetaTag('name', 'title', title);
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('name', 'keywords', storyKeywords);
    this.setMetaTag(
      'name',
      'robots',
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    this.setMetaTag('property', 'og:type', 'article');
    this.setMetaTag('property', 'og:site_name', SITE_NAME);
    this.setMetaTag('property', 'og:locale', 'si_LK');
    this.setMetaTag('property', 'og:title', title);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:image', imageUrl);
    this.setMetaTag(
      'property',
      'article:section',
      story.categoryName || story.category || 'සිංහල වැල කතා'
    );
    this.setMetaTag(
      'property',
      'article:published_time',
      story.uploadDate || '2026-05-01T00:00:00.000Z'
    );

    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', title);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('name', 'twitter:image', imageUrl);

    this.setCanonical(canonicalUrl);
    this.setLinkRel('prev', null);
    this.setLinkRel('next', null);

    const graph: Record<string, any>[] = [
      {
        '@type': ['Article', 'BlogPosting'],
        '@id': `${canonicalUrl}#article`,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        headline: title,
        alternativeHeadline: `${story.title} - Sinhala Wal Katha | සිංහල වැල කතා`,
        name: story.title,
        description,
        inLanguage: 'si-LK',
        isAccessibleForFree: true,
        wordCount,
        timeRequired: `PT${readingMinutes}M`,
        articleSection: story.categoryName || story.category || 'සිංහල වැල කතා',
        keywords: storyKeywords,
        articleBody: bodyText.slice(0, 600),
        image: [imageUrl],
        datePublished: story.uploadDate || '2026-05-01T00:00:00.000Z',
        dateModified: story.updatedDate || story.uploadDate || '2026-05-15T00:00:00.000Z',
        isPartOf: { '@id': `${SITE_URL}/#website` },
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
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'මුල් පිටුව (සිංහල වැල කතා)',
            item: `${SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: story.categoryName || story.category || 'වල් කතා',
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
    ];

    if (relatedStories.length > 0) {
      graph.push({
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#related`,
        name: 'තවත් රසවත් සිංහල වැල කතා (Related Sinhala Wal Katha)',
        itemListElement: relatedStories.slice(0, 6).map((rel, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: rel.title,
          url: `${SITE_URL}/story/${encodeURIComponent(rel.slug)}`,
        })),
      });
    }

    this.setJsonLd('structured-data-jsonld', {
      '@context': 'https://schema.org',
      '@graph': graph,
    });
  }

  /**
   * Categories Hub Page SEO (`/categories`)
   */
  static updateCategoriesSeo(categories: Category[] = []) {
    const title = 'සිංහල වැල කතා වර්ගීකරණ | Sinhala Wal Katha Categories';
    const description =
      'වයිෆ් කතා, අක්කා මල්ලි කතා, ඇන්ටි සහ නැන්දා කතා, පාසල් සහ කැම්පස් වැල කතා ඇතුළු සියලුම සිංහල වැල කතා වර්ගීකරණ පිරික්සන්න.';
    const canonicalUrl = `${SITE_URL}/categories`;

    if (typeof document !== 'undefined') {
      document.title = title;
    }
    this.setMetaTag('name', 'title', title);
    this.setMetaTag('name', 'description', description);
    this.setCanonical(canonicalUrl);
    this.setLinkRel('prev', null);
    this.setLinkRel('next', null);

    this.setJsonLd('structured-data-jsonld', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${canonicalUrl}#categories`,
          url: canonicalUrl,
          name: title,
          description,
          inLanguage: 'si-LK',
        },
        {
          '@type': 'ItemList',
          itemListElement: categories.map((cat, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: cat.sinhalaName || cat.name,
            url: `${SITE_URL}/category/${encodeURIComponent(cat.slug || cat.id)}`,
          })),
        },
      ],
    });
  }

  /**
   * HTML Sitemap & Complete Directory Page SEO (`/sitemap`)
   */
  static updateSitemapPageSeo(totalStories = 614) {
    const title = `සම්පූර්ණ සිංහල වැල කතා නාමාවලිය (${totalStories}+) | Sitemap`;
    const description = `Walkathawa වෙබ් අඩවියේ ඇති සම්පූර්ණ සිංහල වැල කතා, වල් කතා සහ Sinhala Wal Katha ${totalStories}කට වැඩි සියලුම කතා ලැයිස්තුව එකම තැනකින්.`;
    const canonicalUrl = `${SITE_URL}/sitemap`;

    if (typeof document !== 'undefined') {
      document.title = title;
    }
    this.setMetaTag('name', 'title', title);
    this.setMetaTag('name', 'description', description);
    this.setCanonical(canonicalUrl);
    this.setLinkRel('prev', null);
    this.setLinkRel('next', null);
  }
}
