import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { resolveStoryTimestamps, hasSubstantiveStoryChanges } from './src/types/story.js';
import { isBotUserAgent } from './src/utils/botDetection.js';
import {
  SITE_ORIGIN,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  resolveCanonicalRedirect,
} from './src/config/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const syncFilePath = path.resolve(process.cwd(), 'server-data', 'firestore-sync.json');

const SITE_URL = SITE_ORIGIN;
const FIREBASE_API_KEY = 'AIzaSyDWIC_GSMIOliCrhHKPgZgNUAZKUZ96nh4';
const DEFAULT_ADMIN_EMAIL = 'merlinfiverr0@gmail.com';

interface SyncStore {
  stories: any[];
  categories: any[];
}

const DEFAULT_CATEGORIES = [
  {
    id: 'wife',
    slug: 'wife',
    name: 'Wife Stories',
    sinhalaName: 'වයිෆ් / බිරිඳ කතා',
    description: 'බිරිඳ සහ පවුලේ ජීවිතය ඇසුරින් ලියැවුණු සිංහල කතා එකතුව.',
  },
  {
    id: 'akka-malli',
    slug: 'akka-malli',
    name: 'Akka Malli',
    sinhalaName: 'අක්කා - මල්ලි කතා',
    description: 'අක්කා - මල්ලි සහ යෞවන සබඳතා ඇසුරින් ලියැවුණු රසවත් සිංහල කතා.',
  },
  {
    id: 'nanda',
    slug: 'nanda',
    name: 'Aunty Stories',
    sinhalaName: 'නැන්දා / ඇන්ටි කතා',
    description: 'නැන්දා සහ ඇන්ටි චරිත ඇසුරින් නිර්මාණය වූ සිංහල කතා එකතුව.',
  },
  {
    id: 'school',
    slug: 'school',
    name: 'School & Campus',
    sinhalaName: 'පාසල් සහ කැම්පස් කතා',
    description: 'කැම්පස්, පාසල් සහ යෞවන ආදර අත්දැකීම් ඇසුරින් ලියැවුණු සිංහල කතා.',
  },
  {
    id: 'romantic',
    slug: 'romantic',
    name: 'Romantic Stories',
    sinhalaName: 'ආදර සහ රස කතා',
    description: 'ආදරණීය හා හැඟීම්බර සිංහල කතා සහ කෙටි කතා එකතුව.',
  },
];

const STATIC_PAGES: Record<
  string,
  { title: string; canonicalPath: string; description: string; body: string }
> = {
  '/about': {
    title: 'About Us',
    canonicalPath: '/about',
    description: 'Walkathawa (වල් කතාව) — ශ්‍රී ලාංකික පාඨකයන් සඳහා වෙන්වූ සිංහල කතා කියවීමේ වේදිකාව.',
    body: 'Walkathawa යනු ශ්‍රී ලාංකික පාඨකයන් සඳහා වෙන්වූ අන්තර්ජාල සිංහල කතා කියවීමේ වේදිකාවයි.',
  },
  '/contact': {
    title: 'Contact Us',
    canonicalPath: '/contact',
    description: 'Walkathawa සම්බන්ධයෙන් විමසීම් සහ යෝජනා සඳහා අප හා සම්බන්ධ වන්න.',
    body: 'Walkathawa සම්බන්ධයෙන් ඕනෑම විමසීමක් සඳහා අප හා සම්බන්ධ වන්න: contact@walkathawa.site',
  },
  '/page/privacy-policy': {
    title: 'Privacy Policy',
    canonicalPath: '/page/privacy-policy',
    description: 'Walkathawa (walkathawa.site) පෞද්ගලිකත්ව ප්‍රතිපත්තිය.',
    body: 'Walkathawa (walkathawa.site) ඔබගේ පෞද්ගලිකත්වයට සහ දත්ත ආරක්ෂාවට ගරු කරයි.',
  },
  '/page/terms-and-conditions': {
    title: 'Terms and Conditions',
    canonicalPath: '/page/terms-and-conditions',
    description: 'Walkathawa වෙබ් අඩවිය භාවිතා කිරීමේ නියමයන් සහ කොන්දේසි.',
    body: 'Walkathawa වෙබ් අඩවිය භාවිතා කිරීමේදී වයස අවුරුදු 18+ වීම සහ ප්‍රබන්ධ අන්තර්ගත කොන්දේසි අදාළ වේ.',
  },
  '/page/send-your-story': {
    title: 'Send Your Story',
    canonicalPath: '/page/send-your-story',
    description: 'ඔබ විසින් රචිත සිංහල කතා Walkathawa වෙබ් අඩවියට එවන්න.',
    body: 'ඔබ විසින් රචිත නිර්මාණාත්මක සිංහල කතා Walkathawa වෙබ් අඩවියේ පළ කිරීමට stories@walkathawa.site වෙත එවන්න.',
  },
  '/page/disclaimer': {
    title: 'Disclaimer',
    canonicalPath: '/page/disclaimer',
    description: 'Walkathawa (walkathawa.site) වගකීම් ප්‍රකාශය.',
    body: 'Walkathawa (walkathawa.site) හි පළවන සියලුම කතා හුදෙක් ප්‍රබන්ධ නිර්මාණ වන අතර සැබෑ පුද්ගලයන් හෝ සිදුවීම් සමඟ සම්බන්ධ නොවේ.',
  },
};

let cachedStore: SyncStore | null = null;
let cachedStoreStamp = '';

function resolveCatalogDataDirs(): string[] {
  return [
    path.resolve(process.cwd(), 'public', 'api-data'),
    path.resolve(process.cwd(), 'dist', 'api-data'),
    path.resolve(__dirname, 'public', 'api-data'),
    path.resolve(__dirname, 'dist', 'api-data'),
  ];
}

function readSyncStore(): SyncStore {
  try {
    if (fs.existsSync(syncFilePath)) {
      const stat = fs.statSync(syncFilePath);
      const stamp = `sync:${stat.mtimeMs}`;
      if (cachedStore && cachedStoreStamp === stamp && cachedStore.stories.length > 0) {
        return cachedStore;
      }
      const raw = JSON.parse(fs.readFileSync(syncFilePath, 'utf8'));
      const stories = Array.isArray(raw.stories) ? raw.stories : [];
      const categories = Array.isArray(raw.categories) ? raw.categories : [];
      if (stories.length > 0) {
        cachedStore = { stories, categories };
        cachedStoreStamp = stamp;
        return cachedStore;
      }
    }

    for (const apiDataDir of resolveCatalogDataDirs()) {
      const catalogPath = path.join(apiDataDir, 'catalog.json');
      if (!fs.existsSync(catalogPath)) continue;

      const stat = fs.statSync(catalogPath);
      const stamp = `catalog:${catalogPath}:${stat.mtimeMs}`;
      if (cachedStore && cachedStoreStamp === stamp) {
        return cachedStore;
      }

      const rawCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      const catalogStories = Array.isArray(rawCatalog.stories) ? rawCatalog.stories : [];
      const categories = Array.isArray(rawCatalog.categories) ? rawCatalog.categories : [];

      const byId = new Map<string, any>();
      for (const s of catalogStories) {
        if (!s) continue;
        const key = String(s.id || s.slug || '');
        if (key) byId.set(key, { ...s });
      }

      const chunksDir = path.join(apiDataDir, 'chunks');
      if (fs.existsSync(chunksDir)) {
        const chunkFiles = fs
          .readdirSync(chunksDir)
          .filter((f) => f.endsWith('.json'))
          .sort();
        for (const chunkFile of chunkFiles) {
          try {
            const chunkRaw = JSON.parse(fs.readFileSync(path.join(chunksDir, chunkFile), 'utf8'));
            const chunkStories = Array.isArray(chunkRaw.stories) ? chunkRaw.stories : [];
            for (const cs of chunkStories) {
              if (!cs) continue;
              const key = String(cs.id || cs.slug || '');
              if (key) {
                byId.set(key, { ...(byId.get(key) || {}), ...cs });
              }
            }
          } catch {
            // ignore corrupted chunk
          }
        }
      }

      cachedStore = {
        stories: Array.from(byId.values()),
        categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
      };
      cachedStoreStamp = stamp;
      return cachedStore;
    }
  } catch (err) {
    console.error('[Walkathawa Store Read Error]:', err);
  }
  return { stories: [], categories: DEFAULT_CATEGORIES };
}

function stripZW(val: unknown): string {
  return String(val || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function escapeHtmlAttr(val: string): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(val: string): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function writeSyncStore(store: SyncStore): void {
  try {
    const dir = path.dirname(syncFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(syncFilePath, JSON.stringify(store), 'utf8');
    cachedStore = null;
    cachedStoreStamp = '';
  } catch (err) {
    console.error('[Walkathawa Store Write Error]:', err);
  }
}

function triggerSitemapUpdate(): void {
  const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate-sitemap.js');
  if (fs.existsSync(scriptPath)) {
    execFile('node', [scriptPath], { cwd: process.cwd() }, () => {
      cachedStore = null;
      cachedStoreStamp = '';
    });
  }
}

function getActiveStories(store: SyncStore): any[] {
  return store.stories.filter((s) => s && !s.isDeleted && !s.deleted && s.published !== false);
}

function getActiveCategories(store: SyncStore): any[] {
  const cats = (store.categories || []).filter(
    (c) => c && !c.isDeleted && !c.deleted && c.slug !== 'all'
  );
  return cats.length > 0 ? cats : DEFAULT_CATEGORIES;
}

function findStoryBySlug(rawSlug: string): any | null {
  const target = stripZW(rawSlug).toLowerCase();
  if (!target) return null;
  let decodedTarget = target;
  try {
    decodedTarget = stripZW(decodeURIComponent(rawSlug)).toLowerCase();
  } catch {
    // ignore
  }
  const activeStories = getActiveStories(readSyncStore());
  return (
    activeStories.find((s) => {
      const sSlug = stripZW(s.slug).toLowerCase();
      const sId = stripZW(s.id).toLowerCase();
      let sSlugDec = sSlug;
      try {
        sSlugDec = stripZW(decodeURIComponent(String(s.slug || ''))).toLowerCase();
      } catch {
        // ignore
      }
      return (
        sSlug === target ||
        sSlug === decodedTarget ||
        sSlugDec === decodedTarget ||
        sId === target ||
        sId === decodedTarget
      );
    }) || null
  );
}

function findCategoryAndStories(rawSlug: string): {
  category: any | null;
  stories: any[];
  isValid: boolean;
} {
  const decoded = stripZW(rawSlug).toLowerCase();
  const store = readSyncStore();
  const activeStories = getActiveStories(store);
  const categories = getActiveCategories(store);

  if (decoded === 'all') {
    return {
      category: { id: 'all', slug: 'all', name: 'All Stories', sinhalaName: 'සියලුම කතා' },
      stories: activeStories,
      isValid: true,
    };
  }

  const catObj =
    categories.find(
      (c) =>
        stripZW(c.slug).toLowerCase() === decoded || stripZW(c.id).toLowerCase() === decoded
    ) || null;

  const matchingStories = activeStories.filter((s) => {
    const sCat = stripZW(s.category).toLowerCase();
    const sCatId = stripZW(s.categoryId).toLowerCase();
    const sCatName = stripZW(s.categoryName).toLowerCase();
    const sTags = Array.isArray(s.tags) ? s.tags.map((t: any) => stripZW(t).toLowerCase()) : [];
    return (
      sCat === decoded ||
      sCatId === decoded ||
      (decoded.length > 2 && sCatName.includes(decoded)) ||
      sTags.includes(decoded)
    );
  });

  return {
    category: catObj || (matchingStories.length > 0 ? { id: decoded, slug: decoded, name: rawSlug, sinhalaName: rawSlug } : null),
    stories: matchingStories,
    isValid: Boolean(catObj || matchingStories.length > 0),
  };
}

function splitParagraphsForSsr(rawContent: string): string[] {
  const initial = (rawContent || '')
    .split(/\n\s*\n|\r\n\s*\r\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (initial.length > 1) return initial;

  const sentences = (rawContent || '')
    .replace(/([.!?।])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length > 0 ? sentences : ['සිංහල කතාව'];
}

function formatCleanStoryTitle(rawTitle: string): string {
  const cleaned = stripZW(rawTitle)
    .replace(/\s*[–|-]\s*(Sinhala\s+)?(Wal|Wela|Wala|Sex)\s+Katha.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const suffix = ' | Walkathawa';
  if (cleaned.length + suffix.length <= 60) {
    return `${cleaned}${suffix}`;
  }
  return `${cleaned.slice(0, Math.max(10, 57 - suffix.length)).trim()}...${suffix}`;
}

function buildStandardHead(opts: {
  title: string;
  description: string;
  canonicalUrl?: string | null;
  ogType?: 'website' | 'article';
  ogImage?: string;
  prevUrl?: string | null;
  nextUrl?: string | null;
  noIndex?: boolean;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  jsonLd?: Record<string, any> | null;
}): string {
  const ogImg = opts.ogImage || DEFAULT_OG_IMAGE;
  const lines = [
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">',
    `    <title>${escapeHtmlText(opts.title)}</title>`,
    `    <meta name="description" content="${escapeHtmlAttr(opts.description)}">`,
    ...(opts.noIndex ? ['    <meta name="robots" content="noindex, nofollow">'] : []),
    ...(opts.canonicalUrl
      ? [`    <link rel="canonical" href="${escapeHtmlAttr(opts.canonicalUrl)}">`]
      : []),
    ...(opts.prevUrl ? [`    <link rel="prev" href="${escapeHtmlAttr(opts.prevUrl)}">`] : []),
    ...(opts.nextUrl ? [`    <link rel="next" href="${escapeHtmlAttr(opts.nextUrl)}">`] : []),
    `    <link rel="icon" type="image/png" href="${SITE_URL}/favicon.png">`,
    `    <link rel="apple-touch-icon" href="${SITE_URL}/apple-touch-icon.png">`,
    '    <link rel="manifest" href="/manifest.json">',
    `    <meta property="og:type" content="${opts.ogType || 'website'}">`,
    `    <meta property="og:site_name" content="${SITE_NAME}">`,
    ...(opts.canonicalUrl
      ? [`    <meta property="og:url" content="${escapeHtmlAttr(opts.canonicalUrl)}">`]
      : []),
    `    <meta property="og:title" content="${escapeHtmlAttr(opts.title)}">`,
    `    <meta property="og:description" content="${escapeHtmlAttr(opts.description)}">`,
    `    <meta property="og:image" content="${escapeHtmlAttr(ogImg)}">`,
    ...(opts.publishedTime
      ? [
          `    <meta property="article:published_time" content="${escapeHtmlAttr(
            opts.publishedTime
          )}">`,
        ]
      : []),
    ...(opts.modifiedTime
      ? [
          `    <meta property="article:modified_time" content="${escapeHtmlAttr(
            opts.modifiedTime
          )}">`,
        ]
      : []),
    '    <meta name="twitter:card" content="summary_large_image">',
    `    <meta name="twitter:title" content="${escapeHtmlAttr(opts.title)}">`,
    `    <meta name="twitter:description" content="${escapeHtmlAttr(opts.description)}">`,
    `    <meta name="twitter:image" content="${escapeHtmlAttr(ogImg)}">`,
  ];

  if (opts.jsonLd) {
    lines.push('    <script id="structured-data-jsonld" type="application/ld+json">');
    lines.push(JSON.stringify(opts.jsonLd, null, 2));
    lines.push('    </script>');
  }
  return lines.join('\n');
}

function buildCardsShellHtml(
  h1Text: string,
  slice: any[],
  prevUrl?: string | null,
  nextUrl?: string | null
): string {
  const cardsHtml = slice
    .map((s) => {
      const slug = encodeURIComponent(stripZW(s.slug || s.id));
      const title = escapeHtmlText(stripZW(s.title));
      return `<article class="card"><h2><a href="/story/${slug}">${title}</a></h2></article>`;
    })
    .join('\n');

  const navLinks: string[] = [];
  if (prevUrl) navLinks.push(`<a rel="prev" href="${escapeHtmlAttr(prevUrl)}">Previous</a>`);
  if (nextUrl) navLinks.push(`<a rel="next" href="${escapeHtmlAttr(nextUrl)}">Next</a>`);
  const navHtml = navLinks.length > 0 ? `\n  <nav aria-label="Pagination">${navLinks.join(' ')}</nav>` : '';

  return `<div class="ssr-shell">
  <h1 class="sr-only">${escapeHtmlText(h1Text)}</h1>
  <div class="story-grid-3x5">
    ${cardsHtml}
  </div>${navHtml}
</div>`;
}

function resolveRouteForSsr(
  reqPath: string,
  queryParams: URLSearchParams
): {
  status: number;
  noIndex: boolean;
  headHtml: string;
  bodyHtml: string;
} {
  const normalizedPath = reqPath.replace(/\/+$/, '') || '/';
  const pageParam = parseInt(queryParams.get('page') || '1', 10);
  const page = !isNaN(pageParam) && pageParam > 1 ? pageParam : 1;

  const store = readSyncStore();
  const activeStories = getActiveStories(store);
  const activeCategories = getActiveCategories(store);

  // 1. Admin & Utility Noindex Routes
  if (
    normalizedPath === '/admin' ||
    normalizedPath.startsWith('/admin/') ||
    normalizedPath === '/search' ||
    normalizedPath === '/login' ||
    normalizedPath === '/register' ||
    normalizedPath === '/forgot-password'
  ) {
    const labelMap: Record<string, string> = {
      '/search': 'සෙවුම් ප්‍රතිඵල',
      '/login': 'Login',
      '/register': 'Register',
      '/forgot-password': 'Forgot Password',
    };
    const label = normalizedPath.startsWith('/admin') ? 'Admin' : labelMap[normalizedPath] || 'Search';
    return {
      status: 200,
      noIndex: true,
      headHtml: buildStandardHead({
        title: `${label} | Walkathawa`,
        description: `Walkathawa ${label}`,
        noIndex: true,
        canonicalUrl: `${SITE_URL}${normalizedPath}`,
      }),
      bodyHtml: '',
    };
  }

  // 2. Story Reader Route: /story/:slug (or /story/:slug/amp)
  if (normalizedPath.startsWith('/story/')) {
    const withoutPrefix = normalizedPath.replace(/^\/story\//, '').replace(/\/amp$/, '');
    const story = findStoryBySlug(withoutPrefix);

    if (!story) {
      return {
        status: 404,
        noIndex: true,
        headHtml: buildStandardHead({
          title: '404 — Story Not Found | Walkathawa',
          description: 'ඔබ සෙවූ කතාව Walkathawa වෙබ් අඩවියෙන් හමු නොවීය.',
          noIndex: true,
          canonicalUrl: null,
        }),
        bodyHtml: `<div class="ssr-shell"><h1>404 — පිටුව හමු නොවීය</h1><p><a href="/">මුල් පිටුවට යන්න</a></p></div>`,
      };
    }

    const postTitle = stripZW(story.title);
    const cleanTitle = formatCleanStoryTitle(postTitle);
    const bodyText =
      story.fullContent || story.content || story.shortDescription || story.description || postTitle;
    const excerpt = String(bodyText).replace(/\s+/g, ' ').trim().slice(0, 155);
    const canonicalSlug = encodeURIComponent(stripZW(story.slug || story.id));
    const canonicalUrl = `${SITE_URL}/story/${canonicalSlug}`;
    const ogImg =
      story.coverImage && String(story.coverImage).startsWith('http')
        ? String(story.coverImage).trim()
        : DEFAULT_OG_IMAGE;

    const { datePublished, dateModified } = resolveStoryTimestamps(story);
    const wordCount = story.wordCount || String(bodyText).split(/\s+/).length || 950;
    const readingMinutes = story.readingTime || Math.max(3, Math.ceil(wordCount / 180));
    const catSlug = stripZW(story.category || 'romantic');
    const catLabel = stripZW(story.categoryName || story.category || 'සිංහල කතා');
    const authorName = stripZW(
      typeof story.author === 'object' && story.author !== null
        ? story.author.name || SITE_NAME
        : story.author || SITE_NAME
    );

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: `${SITE_URL}/`,
          logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
        },
        {
          '@type': 'BlogPosting',
          '@id': `${canonicalUrl}#article`,
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
          headline: postTitle,
          name: postTitle,
          description: excerpt,
          inLanguage: 'si-LK',
          wordCount,
          timeRequired: `PT${readingMinutes}M`,
          articleSection: catLabel,
          image: [ogImg],
          ...(datePublished ? { datePublished } : {}),
          ...(dateModified ? { dateModified } : {}),
          author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
          publisher: { '@id': `${SITE_URL}/#organization` },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_URL}/` },
            {
              '@type': 'ListItem',
              position: 2,
              name: catLabel,
              item: `${SITE_URL}/category/${encodeURIComponent(catSlug)}`,
            },
            { '@type': 'ListItem', position: 3, name: postTitle, item: canonicalUrl },
          ],
        },
      ],
    };

    const paragraphs = splitParagraphsForSsr(String(bodyText));
    const paragraphsHtml = paragraphs
      .map((p) => `<p data-reading-content>${escapeHtmlText(p)}</p>`)
      .join('\n');

    return {
      status: 200,
      noIndex: false,
      headHtml: buildStandardHead({
        title: cleanTitle,
        description: excerpt,
        canonicalUrl,
        ogType: 'article',
        ogImage: ogImg,
        publishedTime: datePublished,
        modifiedTime: dateModified,
        jsonLd,
      }),
      bodyHtml: `<div class="ssr-article">
  <article>
    <header>
      <a href="/category/${encodeURIComponent(catSlug)}">${escapeHtmlText(catLabel)}</a>
      <h1>${escapeHtmlText(postTitle)}</h1>
      <a href="/profile/${encodeURIComponent(authorName)}">${escapeHtmlText(authorName)}</a>
    </header>
    <div class="article-body">
      ${paragraphsHtml}
    </div>
    <blockquote>
      අලුත්ම සිංහල කතා දිනපතා එසැණින් කියවීමට අපගේ Telegram නාලිකාව සමඟ එක්වන්න: <a href="https://t.me/walkathawa">https://t.me/walkathawa</a>
    </blockquote>
    <footer>
      <a href="/">Previous</a>
      <a href="/">Next</a>
    </footer>
  </article>
</div>`,
    };
  }

  // 3. Category Page: /category/:slug
  if (normalizedPath.startsWith('/category/')) {
    const rawCatSlug = normalizedPath.replace(/^\/category\//, '').trim();
    const { category, stories: catStories, isValid } = findCategoryAndStories(rawCatSlug);
    if (!isValid || !category) {
      return {
        status: 404,
        noIndex: true,
        headHtml: buildStandardHead({
          title: '404 — Category Not Found | Walkathawa',
          description: 'ඔබ සෙවූ වර්ගීකරණය Walkathawa වෙබ් අඩවියෙන් හමු නොවීය.',
          noIndex: true,
          canonicalUrl: null,
        }),
        bodyHtml: `<div class="ssr-shell"><h1>404 — පිටුව හමු නොවීය</h1><p><a href="/categories">වර්ගීකරණ බලන්න</a></p></div>`,
      };
    }

    const totalPages = Math.max(1, Math.ceil(catStories.length / 20));
    const slice = catStories.slice((page - 1) * 20, page * 20);
    const catLabel = stripZW(category.sinhalaName || category.name || rawCatSlug);
    const title = page > 1 ? `${catLabel} — පිටුව ${page} | Walkathawa` : `${catLabel} | Walkathawa`;
    const description = stripZW(
      category.description ||
        `${catLabel} — සිංහල කතා එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.`
    ).slice(0, 158);
    const baseCatUrl = `${SITE_URL}/category/${encodeURIComponent(category.slug || rawCatSlug)}`;
    const canonicalUrl = page > 1 ? `${baseCatUrl}?page=${page}` : baseCatUrl;
    const prevUrl = page > 1 ? (page === 2 ? baseCatUrl : `${baseCatUrl}?page=${page - 1}`) : null;
    const nextUrl = page < totalPages ? `${baseCatUrl}?page=${page + 1}` : null;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${canonicalUrl}#collection`,
          url: canonicalUrl,
          name: title,
          description,
          inLanguage: 'si-LK',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: catLabel, item: baseCatUrl },
          ],
        },
        ...(slice.length > 0
          ? [
              {
                '@type': 'ItemList',
                numberOfItems: slice.length,
                itemListElement: slice.map((s, idx) => ({
                  '@type': 'ListItem',
                  position: (page - 1) * 20 + idx + 1,
                  name: stripZW(s.title),
                  url: `${SITE_URL}/story/${encodeURIComponent(stripZW(s.slug || s.id))}`,
                })),
              },
            ]
          : []),
      ],
    };

    return {
      status: 200,
      noIndex: false,
      headHtml: buildStandardHead({
        title,
        description,
        canonicalUrl,
        prevUrl,
        nextUrl,
        jsonLd,
      }),
      bodyHtml: buildCardsShellHtml(`${catLabel} | Walkathawa`, slice),
    };
  }

  // 4. Categories Directory: /categories
  if (normalizedPath === '/categories') {
    const canonicalUrl = `${SITE_URL}/categories`;
    const title = 'වර්ගීකරණ | Walkathawa';
    const description = 'Walkathawa සිංහල කතා වර්ගීකරණ එකතුව පිරික්සන්න.';
    const catLinks = activeCategories
      .map(
        (c) =>
          `<li><a href="/category/${encodeURIComponent(stripZW(c.slug || c.id))}">${escapeHtmlText(
            stripZW(c.sinhalaName || c.name || c.slug)
          )}</a></li>`
      )
      .join('\n');

    return {
      status: 200,
      noIndex: false,
      headHtml: buildStandardHead({
        title,
        description,
        canonicalUrl,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          url: canonicalUrl,
          name: title,
          description,
          inLanguage: 'si-LK',
        },
      }),
      bodyHtml: `<div class="ssr-shell"><h1>${escapeHtmlText(title)}</h1><ul>${catLinks}</ul></div>`,
    };
  }

  // 5. Popular & Archives: /popular, /archives, /archiveposts
  if (
    normalizedPath === '/popular' ||
    normalizedPath === '/archives' ||
    normalizedPath === '/archiveposts'
  ) {
    const isPopular = normalizedPath === '/popular';
    const canonicalBase = `${SITE_URL}${isPopular ? '/popular' : '/archives'}`;
    const canonicalUrl = page > 1 ? `${canonicalBase}?page=${page}` : canonicalBase;
    const sorted = [...activeStories].sort((a, b) =>
      isPopular
        ? (Number(b.views) || 0) - (Number(a.views) || 0)
        : new Date(b.uploadDate || b.createdAt || 0).getTime() -
          new Date(a.uploadDate || a.createdAt || 0).getTime()
    );
    const totalPages = Math.max(1, Math.ceil(sorted.length / 20));
    const slice = sorted.slice((page - 1) * 20, page * 20);
    const title = isPopular
      ? page > 1
        ? `ජනප්‍රිය කතා — පිටුව ${page} | Walkathawa`
        : 'ජනප්‍රිය කතා | Walkathawa'
      : page > 1
      ? `ලේඛනාගාරය — පිටුව ${page} | Walkathawa`
      : 'ලේඛනාගාරය | Walkathawa';
    const description = isPopular
      ? 'Walkathawa වෙබ් අඩවියේ වැඩිපුරම කියවන ජනප්‍රිය සිංහල කතා එකතුව.'
      : 'Walkathawa සිංහල කතා ලේඛනාගාරය — සියලුම කතා එකතුව.';

    return {
      status: 200,
      noIndex: false,
      headHtml: buildStandardHead({
        title,
        description,
        canonicalUrl,
        prevUrl:
          page > 1 ? (page === 2 ? canonicalBase : `${canonicalBase}?page=${page - 1}`) : null,
        nextUrl: page < totalPages ? `${canonicalBase}?page=${page + 1}` : null,
      }),
      bodyHtml: buildCardsShellHtml(title, slice),
    };
  }

  // 6. HTML Sitemap Page: /sitemap
  if (normalizedPath === '/sitemap') {
    const canonicalUrl = `${SITE_URL}/sitemap`;
    const title = 'සම්පූර්ණ කතා නාමාවලිය | Walkathawa';
    const description = 'Walkathawa වෙබ් අඩවියේ සියලුම සිංහල කතා සහ වර්ගීකරණ එකම පිටුවකින්.';
    const storyLinks = activeStories
      .slice(0, 200)
      .map(
        (s) =>
          `<li><a href="/story/${encodeURIComponent(stripZW(s.slug || s.id))}">${escapeHtmlText(
            stripZW(s.title)
          )}</a></li>`
      )
      .join('\n');

    return {
      status: 200,
      noIndex: false,
      headHtml: buildStandardHead({ title, description, canonicalUrl }),
      bodyHtml: `<div class="ssr-shell"><h1>Walkathawa — Complete Sitemap</h1><ul>${storyLinks}</ul></div>`,
    };
  }

  // 7. Static Pages (/about, /contact, /page/*)
  if (STATIC_PAGES[normalizedPath]) {
    const info = STATIC_PAGES[normalizedPath];
    return {
      status: 200,
      noIndex: false,
      headHtml: buildStandardHead({
        title: `${info.title} | Walkathawa`,
        description: info.description,
        canonicalUrl: `${SITE_URL}${info.canonicalPath}`,
      }),
      bodyHtml: `<div class="ssr-shell"><article><h1>${escapeHtmlText(
        info.title
      )}</h1><p>${escapeHtmlText(info.body)}</p></article></div>`,
    };
  }

  // 8. Profile Page
  if (
    normalizedPath.startsWith('/profile/') ||
    normalizedPath.startsWith('/followers/') ||
    normalizedPath.startsWith('/following/')
  ) {
    const author = normalizedPath.replace(/^\/(profile|followers|following)\//, '').trim() || SITE_NAME;
    const canonicalUrl = `${SITE_URL}/profile/${encodeURIComponent(author)}`;
    return {
      status: 200,
      noIndex: false,
      headHtml: buildStandardHead({
        title: `${author} | Walkathawa`,
        description: `${author} විසින් Walkathawa හි පළ කරන ලද සිංහල කතා එකතුව.`,
        canonicalUrl,
      }),
      bodyHtml: buildCardsShellHtml(`${author} | Walkathawa`, activeStories.slice(0, 20)),
    };
  }

  // 9. Homepage: /
  if (normalizedPath === '/') {
    const totalPages = Math.max(1, Math.ceil(activeStories.length / 20));
    const startIdx = (page - 1) * 20;
    const pageStories = activeStories.slice(startIdx, startIdx + 20);
    const title =
      page > 1
        ? `Walkathawa (වල් කතාව) — පිටුව ${page}`
        : 'Walkathawa (වල් කතාව) | Sinhala Stories Online';
    const sampleTitles = pageStories
      .slice(0, 2)
      .map((s) => stripZW(s.title))
      .join(', ');
    const description =
      page > 1 && sampleTitles
        ? `Walkathawa පිටුව ${page}: ${sampleTitles} ඇතුළු සිංහල කතා නොමිලේ කියවන්න.`.slice(0, 158)
        : 'Walkathawa (වල් කතාව) is a place to read Sinhala stories online. Discover new Sinhala katha, romantic stories, fictional stories, and short stories updated regularly.';

    const canonicalUrl = page > 1 ? `${SITE_URL}/?page=${page}` : `${SITE_URL}/`;
    const prevUrl =
      page > 1 ? (page === 2 ? `${SITE_URL}/` : `${SITE_URL}/?page=${page - 1}`) : null;
    const nextUrl = page < totalPages ? `${SITE_URL}/?page=${page + 1}` : null;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: `${SITE_URL}/`,
          logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: `${SITE_URL}/`,
          name: SITE_NAME,
          inLanguage: 'si-LK',
          description,
          publisher: { '@id': `${SITE_URL}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${SITE_URL}/search?s={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
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
        },
        ...(pageStories.length > 0
          ? [
              {
                '@type': 'ItemList',
                '@id': `${canonicalUrl}#itemlist`,
                numberOfItems: pageStories.length,
                itemListElement: pageStories.map((s, idx) => ({
                  '@type': 'ListItem',
                  position: startIdx + idx + 1,
                  name: stripZW(s.title),
                  url: `${SITE_URL}/story/${encodeURIComponent(stripZW(s.slug || s.id))}`,
                })),
              },
            ]
          : []),
      ],
    };

    return {
      status: 200,
      noIndex: false,
      headHtml: buildStandardHead({
        title,
        description,
        canonicalUrl,
        prevUrl,
        nextUrl,
        jsonLd,
      }),
      bodyHtml: buildCardsShellHtml(title, pageStories, prevUrl, nextUrl),
    };
  }

  // 10. Unknown Route -> Real HTTP 404 (prevents Soft 404 indexing penalties)
  return {
    status: 404,
    noIndex: true,
    headHtml: buildStandardHead({
      title: '404 — පිටුව හමු නොවීය | Walkathawa',
      description: 'ඔබ සෙවූ පිටුව Walkathawa වෙබ් අඩවියෙන් හමු නොවීය.',
      noIndex: true,
      canonicalUrl: null,
    }),
    bodyHtml: `<div class="ssr-shell"><h1>404 — පිටුව හමු නොවීය</h1><p><a href="/">මුල් පිටුවට යන්න</a></p></div>`,
  };
}

function renderFullDocument(
  rawHtml: string,
  reqPath: string,
  queryString: string,
  isBot = false
): { html: string; status: number; noIndex: boolean } {
  const normalizedPath = reqPath.replace(/\/+$/, '') || '/';
  const queryParams = new URLSearchParams(queryString);
  const resolved = resolveRouteForSsr(reqPath, queryParams);

  const headMatch = rawHtml.match(/<head>([\s\S]*?)<\/head>/i);
  let assetTags = '';
  if (headMatch) {
    const existingHead = headMatch[1];
    const preserved: string[] = [];
    const styleRegex = /<style[\s\S]*?<\/style>/gi;
    const linkStylesheetRegex = /<link[^>]+rel="stylesheet"[^>]*>/gi;
    const linkPreloadRegex = /<link[^>]+rel="modulepreload"[^>]*>/gi;
    const scriptModuleRegex = /<script[^>]+type="module"[\s\S]*?<\/script>/gi;
    for (const m of existingHead.match(styleRegex) || []) preserved.push(m);
    for (const m of existingHead.match(linkStylesheetRegex) || []) preserved.push(m);
    for (const m of existingHead.match(linkPreloadRegex) || []) preserved.push(m);
    for (const m of existingHead.match(scriptModuleRegex) || []) preserved.push(m);
    if (preserved.length > 0) {
      assetTags = '\n' + preserved.join('\n');
    }
  }

  const cleanedHtml = rawHtml
    .replace(/<script[^>]*popunder-swap\.js[^>]*><\/script>\s*/gi, '')
    .replace(/<script[^>]*ahuramazda\.org[^>]*><\/script>\s*/gi, '')
    .replace(/<script[^>]*brijmohan\.org\/14[^>]*><\/script>\s*/gi, '');

  const isAdmin = normalizedPath === '/admin' || normalizedPath.startsWith('/admin/');
  const skipAds = isBot || isAdmin || resolved.noIndex;

  // popunder-swap.js handles crawler isolation and loads human ad scripts cleanly once
  const headClosingScript = skipAds ? '' : '\n    <script src="/popunder-swap.js"></script>';

  const html = cleanedHtml
    .replace(/<html[^>]*>/i, '<html lang="si" class="dark">')
    .replace(
      /<head>[\s\S]*?<\/head>/i,
      `<head>\n${resolved.headHtml}${assetTags}${headClosingScript}\n  </head>`
    )
    .replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${resolved.bodyHtml}</div>`);

  return { html, status: resolved.status, noIndex: resolved.noIndex };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (
      isProd &&
      req.path.startsWith('/assets/') &&
      req.path.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/i)
    ) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (!isProd) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  // Canonical host, protocol, slash, and legacy URL single-hop 301 redirects
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api/')) return next();

    const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
    const redirect = resolveCanonicalRedirect(rawHost, rawProto, req.originalUrl || req.url || '/');

    if (redirect) {
      return res.redirect(redirect.status, redirect.location);
    }

    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/firestore/stories', (_req, res) => {
    const store = readSyncStore();
    const activeStories = getActiveStories(store);
    const activeCategories = getActiveCategories(store);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      stories: activeStories,
      categories: activeCategories,
    });
  });

  app.get('/api/firestore/story/:slug', (req, res) => {
    const found = findStoryBySlug(req.params.slug || '');
    if (!found) {
      return res.status(404).json({ error: 'Story not found' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(found);
  });

  app.post('/api/firestore/story', (req, res) => {
    const incoming = req.body;
    if (!incoming || !incoming.title) {
      return res.status(400).json({ error: 'Invalid story payload' });
    }
    const store = readSyncStore();
    const idx = store.stories.findIndex(
      (s) => s.id === incoming.id || (incoming.slug && s.slug === incoming.slug)
    );
    if (idx >= 0) {
      const existing = store.stories[idx];
      const substantive = hasSubstantiveStoryChanges(existing, incoming);
      const nextUpdatedAt = substantive
        ? new Date().toISOString()
        : existing.updatedAt || existing.updatedDate;

      store.stories[idx] = {
        ...existing,
        ...incoming,
        createdAt: existing.createdAt || existing.uploadDate || incoming.createdAt,
        uploadDate: existing.uploadDate || existing.createdAt || incoming.uploadDate,
        updatedAt: nextUpdatedAt,
        updatedDate: nextUpdatedAt,
        isDeleted: false,
        deleted: false,
        published: true,
      };
    } else {
      const now = new Date().toISOString();
      store.stories.unshift({
        ...incoming,
        createdAt: incoming.createdAt || incoming.uploadDate || now,
        uploadDate: incoming.uploadDate || incoming.createdAt || now,
        updatedAt: incoming.updatedAt || incoming.updatedDate || now,
        updatedDate: incoming.updatedDate || incoming.updatedAt || now,
        isDeleted: false,
        deleted: false,
        published: true,
      });
    }
    writeSyncStore(store);
    triggerSitemapUpdate();
    res.json({ status: 'ok', story: incoming });
  });

  app.delete('/api/firestore/story/:id', (req, res) => {
    const target = decodeURIComponent(req.params.id || '').trim().toLowerCase();
    const store = readSyncStore();
    store.stories = store.stories.filter(
      (s) =>
        String(s.id || '').toLowerCase() !== target &&
        String(s.slug || '').toLowerCase() !== target
    );
    writeSyncStore(store);
    triggerSitemapUpdate();
    res.json({ status: 'ok' });
  });

  app.post('/api/firestore/category', (req, res) => {
    const incoming = req.body;
    if (!incoming || (!incoming.slug && !incoming.name)) {
      return res.status(400).json({ error: 'Invalid category payload' });
    }
    const store = readSyncStore();
    const key = String(incoming.slug || incoming.id).trim().toLowerCase();
    const idx = store.categories.findIndex(
      (c) =>
        String(c.slug || '').toLowerCase() === key ||
        String(c.id || '').toLowerCase() === key
    );
    if (idx >= 0) {
      store.categories[idx] = { ...store.categories[idx], ...incoming, isDeleted: false };
    } else {
      store.categories.push({ ...incoming, isDeleted: false });
    }
    writeSyncStore(store);
    triggerSitemapUpdate();
    res.json({ status: 'ok', categories: store.categories });
  });

  app.delete('/api/firestore/category/:slug', (req, res) => {
    const target = decodeURIComponent(req.params.slug || '').trim().toLowerCase();
    const store = readSyncStore();
    store.categories = store.categories.filter(
      (c) =>
        String(c.slug || '').toLowerCase() !== target &&
        String(c.id || '').toLowerCase() !== target
    );
    writeSyncStore(store);
    triggerSitemapUpdate();
    res.json({ status: 'ok', categories: store.categories });
  });

  app.post('/api/trigger-rebuild', async (req, res) => {
    const authHeader = String(req.headers.authorization || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return res.status(401).json({ status: 'error', message: 'Missing Authorization token' });
    }

    try {
      const verifyResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
          process.env.FIREBASE_WEB_API_KEY || FIREBASE_API_KEY
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );
      if (!verifyResp.ok) {
        return res.status(401).json({ status: 'error', message: 'Invalid Firebase token' });
      }
      const data: any = await verifyResp.json();
      const email = String(data?.users?.[0]?.email || '').toLowerCase();
      const allowedEmail = String(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase();
      if (email !== allowedEmail) {
        return res.status(403).json({ status: 'error', message: 'Forbidden' });
      }
    } catch {
      return res.status(401).json({ status: 'error', message: 'Token verification failed' });
    }

    triggerSitemapUpdate();

    let deployTriggered = false;
    const hookUrl = process.env.CF_DEPLOY_HOOK_URL;
    if (hookUrl && hookUrl.startsWith('https://')) {
      fetch(hookUrl, { method: 'POST' }).catch(() => {});
      deployTriggered = true;
    }

    res.json({ status: 'ok', deployTriggered });
  });

  app.post('/api/regenerate-sitemap', (_req, res) => {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate-sitemap.js');
    execFile('node', [scriptPath], { cwd: process.cwd() }, (err, stdout) => {
      if (err) {
        return res.status(500).json({ status: 'error', message: err.message });
      }
      cachedStore = null;
      cachedStoreStamp = '';
      res.json({ status: 'ok', output: stdout.trim() });
    });
  });

  const serveXml = (fileName: string, res: express.Response) => {
    const candidates = [
      path.resolve(process.cwd(), 'public', fileName),
      path.resolve(process.cwd(), 'dist', fileName),
      path.resolve(__dirname, 'public', fileName),
      path.resolve(__dirname, 'dist', fileName),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader(
          'Cache-Control',
          'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400'
        );
        return res.sendFile(filePath);
      }
    }
    res
      .status(404)
      .setHeader('Content-Type', 'text/plain; charset=utf-8')
      .send(`Sitemap ${fileName} not found`);
  };

  app.get('/sitemap.xml', (_req, res) => serveXml('sitemap.xml', res));

  app.get('/robots.txt', (_req, res) => {
    const file = path.resolve(process.cwd(), 'public', 'robots.txt');
    if (fs.existsSync(file)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(file);
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /cgi-bin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    );
  });

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const [rawPath, rawQuery = ''] = (req.originalUrl || req.url || '/').split('?');
        const reqPath = decodeURIComponent(rawPath || '/');
        const isBot = isBotUserAgent(String(req.headers['user-agent'] || ''));
        const rendered = renderFullDocument(template, reqPath, rawQuery, isBot);
        res.setHeader('Vary', 'User-Agent');
        if (rendered.noIndex) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        }
        res
          .status(rendered.status)
          .set({ 'Content-Type': 'text/html; charset=utf-8' })
          .end(rendered.html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { maxAge: '7d', index: false }));
    app.get('*', (req, res) => {
      const spaFile = path.join(distPath, '_spa.html');
      const indexFile = fs.existsSync(spaFile) ? spaFile : path.join(distPath, 'index.html');
      if (!fs.existsSync(indexFile)) {
        return res.status(404).send('Not found');
      }

      try {
        const rawHtml = fs.readFileSync(indexFile, 'utf8');
        const [rawPath, rawQuery = ''] = (req.originalUrl || req.url || '/').split('?');
        const reqPath = decodeURIComponent(rawPath || '/');
        const isBot = isBotUserAgent(String(req.headers['user-agent'] || ''));
        const rendered = renderFullDocument(rawHtml, reqPath, rawQuery, isBot);
        res.setHeader('Vary', 'User-Agent');
        if (rendered.noIndex) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          res.setHeader('Cache-Control', 'no-store');
        } else {
          res.setHeader(
            'Cache-Control',
            'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'
          );
        }
        return res
          .status(rendered.status)
          .set({ 'Content-Type': 'text/html; charset=utf-8' })
          .send(rendered.html);
      } catch {
        return res.sendFile(indexFile);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Walkathawa Server] running on http://0.0.0.0:${PORT} (Mode: ${
        isProd ? 'production' : 'development'
      })`
    );
  });
}

startServer().catch((err) => {
  console.error('[Walkathawa Server Error]:', err);
  process.exit(1);
});
