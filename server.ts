import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { resolveStoryTimestamps, hasSubstantiveStoryChanges } from './src/types/story.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const syncFilePath = path.resolve(process.cwd(), 'server-data', 'firestore-sync.json');

const SITE_URL = 'https://www.walkathawa.site';
const SITE_NAME = 'Walkathawa';
const DEFAULT_OG_IMAGE = `${SITE_URL}/icon.png`;

interface SyncStore {
  stories: any[];
  categories: any[];
}

function readSyncStore(): SyncStore {
  try {
    if (fs.existsSync(syncFilePath)) {
      const raw = JSON.parse(fs.readFileSync(syncFilePath, 'utf8'));
      return {
        stories: Array.isArray(raw.stories) ? raw.stories : [],
        categories: Array.isArray(raw.categories) ? raw.categories : [],
      };
    }
  } catch (err) {
    console.error('[Walkathawa Store Read Error]:', err);
  }
  return { stories: [], categories: [] };
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
  } catch (err) {
    console.error('[Walkathawa Store Write Error]:', err);
  }
}

function triggerSitemapUpdate(): void {
  const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate-sitemap.js');
  if (fs.existsSync(scriptPath)) {
    execFile('node', [scriptPath], { cwd: process.cwd() }, () => {});
  }
}

function findStoryBySlug(rawSlug: string): any | null {
  const target = stripZW(rawSlug).toLowerCase();
  let decodedTarget = target;
  try {
    decodedTarget = stripZW(decodeURIComponent(rawSlug)).toLowerCase();
  } catch {
    // ignore
  }
  const store = readSyncStore();
  return (
    store.stories.find((s) => {
      if (!s || s.isDeleted || s.deleted || s.published === false) return false;
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

function splitParagraphsForSsr(rawContent: string): string[] {
  const initial = (rawContent || '')
    .split(/\n\s*\n|\r\n\s*\r\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (initial.length > 5) return initial;

  const sentences = (rawContent || '')
    .replace(/([.!?।])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length > 5) return sentences;

  const padded = [...(sentences.length > 0 ? sentences : ['සිංහල කතාව'])];
  while (padded.length <= 5) {
    padded.push(padded[padded.length - 1]);
  }
  return padded;
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

function buildHeadForRoute(reqPath: string, queryParams: URLSearchParams): string {
  const normalizedPath = reqPath.replace(/\/+$/, '') || '/';
  const pageParam = parseInt(queryParams.get('page') || '1', 10);
  const page = !isNaN(pageParam) && pageParam > 1 ? pageParam : 1;

  // 1. Story page: /story/:slug (or /posts/:slug)
  if (normalizedPath.startsWith('/story/') || normalizedPath.startsWith('/posts/')) {
    const withoutPrefix = normalizedPath
      .replace(/^\/(story|posts)\//, '')
      .replace(/\/amp$/, '');
    const story = findStoryBySlug(withoutPrefix);
    const postTitle = story ? stripZW(story.title) : stripZW(withoutPrefix);
    const cleanTitle = formatCleanStoryTitle(postTitle);
    const bodyText = story
      ? story.fullContent || story.content || story.shortDescription || story.description || postTitle
      : postTitle;
    const excerpt = String(bodyText)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 155);
    const canonicalSlug = encodeURIComponent(
      story ? stripZW(story.slug || story.id) : stripZW(withoutPrefix)
    );
    const canonicalUrl = `${SITE_URL}/story/${canonicalSlug}`;
    const ogImg =
      story && story.coverImage && String(story.coverImage).startsWith('http')
        ? String(story.coverImage).trim()
        : DEFAULT_OG_IMAGE;

    const { datePublished, dateModified } = story
      ? resolveStoryTimestamps(story)
      : { datePublished: null, dateModified: null };
    const wordCount = story?.wordCount || String(bodyText).split(/\s+/).length || 950;
    const readingMinutes = story?.readingTime || Math.max(3, Math.ceil(wordCount / 180));

    const articleSchema: Record<string, any> = {
      '@type': 'Article',
      '@id': `${canonicalUrl}#article`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
      },
      headline: postTitle,
      name: postTitle,
      description: excerpt,
      inLanguage: 'si-LK',
      wordCount,
      timeRequired: `PT${readingMinutes}M`,
      articleSection: story?.categoryName || story?.category || 'සිංහල වල කතා',
      image: [ogImg],
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

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        articleSchema,
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
              name: story?.categoryName || story?.category || 'සිංහල වල කතා',
              item: `${SITE_URL}/category/${encodeURIComponent(story?.category || 'romantic')}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: postTitle,
              item: canonicalUrl,
            },
          ],
        },
      ],
    };

    const lines = [
      '    <meta charset="UTF-8">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">',
      `    <title>${escapeHtmlText(cleanTitle)}</title>`,
      `    <meta name="description" content="${escapeHtmlAttr(excerpt)}">`,
      `    <link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}">`,
      `    <link rel="icon" type="image/png" href="${SITE_URL}/favicon.png">`,
      '    <meta property="og:type" content="article">',
      `    <meta property="og:site_name" content="${SITE_NAME}">`,
      `    <meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}">`,
      `    <meta property="og:title" content="${escapeHtmlAttr(cleanTitle)}">`,
      `    <meta property="og:description" content="${escapeHtmlAttr(excerpt)}">`,
      `    <meta property="og:image" content="${escapeHtmlAttr(ogImg)}">`,
      ...(datePublished
        ? [`    <meta property="article:published_time" content="${escapeHtmlAttr(datePublished)}">`]
        : []),
      ...(dateModified
        ? [`    <meta property="article:modified_time" content="${escapeHtmlAttr(dateModified)}">`]
        : []),
      '    <meta name="twitter:card" content="summary_large_image">',
      `    <meta name="twitter:url" content="${escapeHtmlAttr(canonicalUrl)}">`,
      `    <meta name="twitter:title" content="${escapeHtmlAttr(cleanTitle)}">`,
      `    <meta name="twitter:description" content="${escapeHtmlAttr(excerpt)}">`,
      `    <meta name="twitter:image" content="${escapeHtmlAttr(ogImg)}">`,
      '    <script id="structured-data-jsonld" type="application/ld+json">',
      JSON.stringify(jsonLd, null, 2),
      '    </script>',
    ];
    return lines.join('\n');
  }

  // 2. Homepage & Paginated Homepage (/?page=N)
  const store = readSyncStore();
  const activeStories = store.stories.filter(
    (s) => s && !s.isDeleted && !s.deleted && s.published !== false
  );
  const totalPages = Math.max(1, Math.ceil(activeStories.length / 15));
  const startIdx = (page - 1) * 15;
  const pageStories = activeStories.slice(startIdx, startIdx + 15);

  const title =
    page > 1
      ? `සිංහල වල කතා — පිටුව ${page} | Walkathawa`
      : 'සිංහල වල කතා — අලුත්ම කතා | Walkathawa';

  const sampleTitles = pageStories
    .slice(0, 2)
    .map((s) => stripZW(s.title))
    .join(', ');
  const description =
    page > 1
      ? `සිංහල වල කතා පිටුව ${page}: ${sampleTitles} ඇතුළු අලුත්ම සිංහල කතා Walkathawa වෙතින් නොමිලේ කියවන්න.`.slice(
          0,
          158
        )
      : 'සිංහල වල කතා — අලුත්ම සිංහල කතා, වල් කතා සහ කෙටි කතා 600+ එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.';

  const canonicalUrl = page > 1 ? `${SITE_URL}/?page=${page}` : `${SITE_URL}/`;
  const prevUrl =
    page > 1 ? (page === 2 ? `${SITE_URL}/` : `${SITE_URL}/?page=${page - 1}`) : null;
  const nextUrl = page < totalPages ? `${SITE_URL}/?page=${page + 1}` : null;

  const jsonLd = {
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
    ],
  };

  return [
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">',
    `    <title>${escapeHtmlText(title)}</title>`,
    `    <meta name="description" content="${escapeHtmlAttr(description)}">`,
    `    <link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}">`,
    ...(prevUrl ? [`    <link rel="prev" href="${escapeHtmlAttr(prevUrl)}">`] : []),
    ...(nextUrl ? [`    <link rel="next" href="${escapeHtmlAttr(nextUrl)}">`] : []),
    `    <link rel="icon" type="image/png" href="${SITE_URL}/favicon.png">`,
    '    <meta property="og:type" content="website">',
    `    <meta property="og:site_name" content="${SITE_NAME}">`,
    `    <meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}">`,
    `    <meta property="og:title" content="${escapeHtmlAttr(title)}">`,
    `    <meta property="og:description" content="${escapeHtmlAttr(description)}">`,
    `    <meta property="og:image" content="${DEFAULT_OG_IMAGE}">`,
    '    <meta name="twitter:card" content="summary_large_image">',
    `    <meta name="twitter:url" content="${escapeHtmlAttr(canonicalUrl)}">`,
    `    <meta name="twitter:title" content="${escapeHtmlAttr(title)}">`,
    `    <meta name="twitter:description" content="${escapeHtmlAttr(description)}">`,
    `    <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">`,
    '    <script id="structured-data-jsonld" type="application/ld+json">',
    JSON.stringify(jsonLd, null, 2),
    '    </script>',
  ].join('\n');
}

function buildSsrBodyContent(reqPath: string, queryParams: URLSearchParams): string {
  const normalizedPath = reqPath.replace(/\/+$/, '') || '/';
  const pageParam = parseInt(queryParams.get('page') || '1', 10);
  const page = !isNaN(pageParam) && pageParam > 1 ? pageParam : 1;

  const store = readSyncStore();
  const activeStories = store.stories.filter(
    (s) => s && !s.isDeleted && !s.deleted && s.published !== false
  );

  if (normalizedPath === '/') {
    const startIdx = (page - 1) * 15;
    const slice = activeStories.slice(startIdx, startIdx + 15);
    const cardsHtml = slice
      .map((s) => {
        const slug = encodeURIComponent(stripZW(s.slug || s.id));
        const title = escapeHtmlText(stripZW(s.title));
        return `<article class="card"><a href="https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd" target="_blank" rel="noopener noreferrer"><img src="/icon.png" alt=""></a><h2><a href="/story/${slug}">${title}</a></h2></article>`;
      })
      .join('\n');

    const h1Text =
      page > 1
        ? `සිංහල වල කතා — පිටුව ${page} | Walkathawa`
        : 'සිංහල වල කතා — අලුත්ම කතා | Walkathawa';

    return `<div class="ssr-shell">
  <h1 class="sr-only">${escapeHtmlText(h1Text)}</h1>
  <div class="story-grid-3x5">
    ${cardsHtml}
  </div>
</div>`;
  }

  if (normalizedPath.startsWith('/story/') || normalizedPath.startsWith('/posts/')) {
    const rawSlug = normalizedPath.replace(/^\/(story|posts)\//, '').replace(/\/amp$/, '');
    const story = findStoryBySlug(rawSlug);
    const postTitle = story ? stripZW(story.title) : stripZW(rawSlug);
    const catSlug = story ? stripZW(story.category || 'romantic') : 'romantic';
    const catLabel = story ? stripZW(story.categoryName || story.category || 'සිංහල වල කතා') : 'සිංහල වල කතා';
    const authorName = story
      ? stripZW(
          typeof story.author === 'object' && story.author !== null
            ? story.author.name || 'Walkathawa'
            : story.author || 'Walkathawa'
        )
      : 'Walkathawa';
    const rawBody = story
      ? story.fullContent || story.content || story.shortDescription || postTitle
      : postTitle;
    const paragraphs = splitParagraphsForSsr(String(rawBody));

    const paragraphsHtml = paragraphs
      .map((p) => `<p data-reading-content>${escapeHtmlText(p)}</p>`)
      .join('\n');

    return `<div class="ssr-article">
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
      අලුත්ම සිංහල වැල කතා දිනපතා එසැණින් කියවීමට අපගේ Telegram නාලිකාව සමඟ එක්වන්න: <a href="https://t.me/walkathawa">https://t.me/walkathawa</a>
    </blockquote>
    <footer>
      <a href="/">Previous</a>
      <a href="/">Next</a>
    </footer>
  </article>
</div>`;
  }

  return '';
}

function renderFullDocument(rawHtml: string, reqPath: string, queryString: string): string {
  const normalizedPath = reqPath.replace(/\/+$/, '') || '/';
  const queryParams = new URLSearchParams(queryString);
  const newHeadInner = buildHeadForRoute(normalizedPath, queryParams);

  const headMatch = rawHtml.match(/<head>([\s\S]*?)<\/head>/i);
  let assetTags = '';
  if (headMatch) {
    const existingHead = headMatch[1];
    const preserved: string[] = [];
    const styleRegex = /<style[\s\S]*?<\/style>/gi;
    const linkStylesheetRegex = /<link[^>]+rel="stylesheet"[^>]*>/gi;
    const scriptModuleRegex = /<script[^>]+type="module"[\s\S]*?<\/script>/gi;
    for (const m of existingHead.match(styleRegex) || []) preserved.push(m);
    for (const m of existingHead.match(linkStylesheetRegex) || []) preserved.push(m);
    for (const m of existingHead.match(scriptModuleRegex) || []) preserved.push(m);
    if (preserved.length > 0) {
      assetTags = '\n' + preserved.join('\n');
    }
  }

  const ssrContent = buildSsrBodyContent(normalizedPath, queryParams);
  const cleanedHtml = rawHtml
    .replace(/<script[^>]*ahuramazda\.org[^>]*><\/script>\s*/gi, '')
    .replace(/<script[^>]*brijmohan\.org\/14[^>]*><\/script>\s*/gi, '');

  const headClosingScript =
    '    <script data-cfasync="false" src="https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e"></script>';
  const bodyClosingScript =
    '    <script data-cfasync="false" src="https://brijmohan.org/14/c05ac7bd55736617f6c7021ffa7f49da"></script>';

  return cleanedHtml
    .replace(/<html[^>]*>/i, '<html lang="si" class="dark">')
    .replace(
      /<head>[\s\S]*?<\/head>/i,
      `<head>\n${newHeadInner}${assetTags}\n${headClosingScript}\n  </head>`
    )
    .replace(/<div id="root"><\/div>/i, `<div id="root">${ssrContent}</div>`)
    .replace(/<\/body>/i, `${bodyClosingScript}\n  </body>`);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (isProd && req.path.startsWith('/assets/') && req.path.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (!isProd) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/firestore/stories', (_req, res) => {
    const store = readSyncStore();
    const activeStories = store.stories.filter(
      (s) => !s.isDeleted && !s.deleted && s.published !== false
    );
    const activeCategories = store.categories.filter(
      (c) => !c.isDeleted && !c.deleted && c.slug !== 'all'
    );
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

  /**
   * Task 1: Decouple updatedAt from view counters and ad config.
   * Only update updatedAt/updatedDate when substantive edits (title, body, cover, category) occur.
   */
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

  app.post('/api/regenerate-sitemap', (_req, res) => {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate-sitemap.js');
    execFile('node', [scriptPath], { cwd: process.cwd() }, (err, stdout) => {
      if (err) {
        return res.status(500).json({ status: 'error', message: err.message });
      }
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

  app.get(['/sitemap.xml', '/sitemap_index.xml'], (_req, res) => serveXml('sitemap.xml', res));
  app.get('/sitemap-main.xml', (_req, res) => serveXml('sitemap-main.xml', res));
  app.get('/sitemap-stories.xml', (_req, res) => serveXml('sitemap-stories.xml', res));

  app.get('/robots.txt', (_req, res) => {
    const file = path.resolve(process.cwd(), 'public', 'robots.txt');
    if (fs.existsSync(file)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(file);
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
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
        const finalHtml = renderFullDocument(template, reqPath, rawQuery);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { maxAge: '7d', index: false }));
    app.get('*', (req, res) => {
      res.setHeader(
        'Cache-Control',
        'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'
      );
      const indexFile = path.join(distPath, 'index.html');
      if (!fs.existsSync(indexFile)) {
        return res.status(404).send('Not found');
      }

      try {
        const rawHtml = fs.readFileSync(indexFile, 'utf8');
        const [rawPath, rawQuery = ''] = (req.originalUrl || req.url || '/').split('?');
        const reqPath = decodeURIComponent(rawPath || '/');
        const finalHtml = renderFullDocument(rawHtml, reqPath, rawQuery);
        return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(finalHtml);
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
