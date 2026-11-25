import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SITE_ORIGIN = 'https://www.walkathawa.site';
const SITE_NAME = 'Walkathawa';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icon.png`;
const PAGE_SIZE = 20;

const STATIC_PAGES = [
  {
    route: '/about',
    file: 'about.html',
    title: 'About Us',
    description: 'Walkathawa (වල් කතාව) — ශ්‍රී ලාංකික පාඨකයන් සඳහා වෙන්වූ සිංහල කතා කියවීමේ වේදිකාව.',
    body: 'Walkathawa යනු ශ්‍රී ලාංකික පාඨකයන් සඳහා වෙන්වූ අන්තර්ජාල සිංහල කතා කියවීමේ වේදිකාවයි.',
  },
  {
    route: '/contact',
    file: 'contact.html',
    title: 'Contact Us',
    description: 'Walkathawa (walkathawa.site) සම්බන්ධයෙන් විමසීම්, ප්‍රතිපෝෂණ සහ යෝජනා සඳහා අප හා සම්බන්ධ වන්න.',
    body: 'Walkathawa සම්බන්ධයෙන් ඕනෑම විමසීමක් සඳහා අප හා සම්බන්ධ වන්න: contact@walkathawa.site',
  },
  {
    route: '/page/privacy-policy',
    file: 'page/privacy-policy.html',
    title: 'Privacy Policy',
    description: 'Walkathawa (walkathawa.site) පෞද්ගලිකත්ව ප්‍රතිපත්තිය — පරිශීලක දත්ත ආරක්ෂාව සහ කුකීස් භාවිතය.',
    body: 'Walkathawa (walkathawa.site) ඔබගේ පෞද්ගලිකත්වයට සහ දත්ත ආරක්ෂාවට ගරු කරයි.',
  },
  {
    route: '/page/terms-and-conditions',
    file: 'page/terms-and-conditions.html',
    title: 'Terms and Conditions',
    description: 'Walkathawa (walkathawa.site) වෙබ් අඩවිය භාවිතා කිරීමේ නියමයන්, කොන්දේසි සහ ප්‍රබන්ධ සාහිත්‍ය නීති.',
    body: 'Walkathawa වෙබ් අඩවිය භාවිතා කිරීමේදී වයස අවුරුදු 18+ වීම සහ ප්‍රබන්ධ අන්තර්ගත කොන්දේසි අදාළ වේ.',
  },
  {
    route: '/page/send-your-story',
    file: 'page/send-your-story.html',
    title: 'Send Your Story',
    description: 'ඔබ විසින් රචිත නිර්මාණාත්මක සිංහල කතා Walkathawa වෙබ් අඩවියේ පළ කිරීම සඳහා අප වෙත එවන්න.',
    body: 'ඔබ විසින් රචිත නිර්මාණාත්මක සිංහල කතා Walkathawa වෙබ් අඩවියේ පළ කිරීමට stories@walkathawa.site වෙත එවන්න.',
  },
  {
    route: '/page/disclaimer',
    file: 'page/disclaimer.html',
    title: 'Disclaimer',
    description: 'Walkathawa (walkathawa.site) වගකීම් ප්‍රකාශය — ප්‍රබන්ධ කතා අන්තර්ගතය පිළිබඳ නිල දැනුම්දීම.',
    body: 'Walkathawa (walkathawa.site) හි පළවන සියලුම කතා හුදෙක් ප්‍රබන්ධ නිර්මාණ වන අතර සැබෑ පුද්ගලයන් හෝ සිදුවීම් සමඟ සම්බන්ධ නොවේ.',
  },
];

function stripZW(val) {
  return String(val || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function escapeHtmlAttr(val) {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(val) {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeJsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function encodeSlug(rawSlug) {
  const clean = stripZW(rawSlug);
  try {
    return encodeURIComponent(decodeURIComponent(clean));
  } catch {
    return encodeURIComponent(clean);
  }
}

function toIsoDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parsed = new Date(raw.trim());
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const HOME_SEO_TITLE = 'Walkathawa (වල් කතාව) — Sinhala Wal Katha & Wela Katha New';
const HOME_SEO_DESCRIPTION =
  'Walkathawa (වල් කතාව) — Read new Sinhala wal katha, wela katha, and sinhala wala katha online free. Daily updated wal katha sinhala and aluth sinhala walkatha.';

const CATEGORY_SEO_MAP = {
  wife: {
    titleBase: 'Wife Wal Katha — වයිෆ් / බිරිඳ කතා',
    shortBase: 'Wife Wal Katha',
    description:
      'අලුත්ම wife wal katha, බිරිඳ කතා සහ sinhala wal katha Walkathawa වෙතින් නොමිලේ කියවන්න. Daily updated wela katha sinhala.',
  },
  'akka-malli': {
    titleBase: 'Akka Malli Wal Katha — අක්කා මල්ලි කතා',
    shortBase: 'Akka Malli Wal Katha',
    description:
      'නවතම akka wal katha, අක්කා මල්ලි කතා සහ sinhala wala katha Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
  },
  nanda: {
    titleBase: 'Aunty & Nanda Wal Katha — නැන්දා කතා',
    shortBase: 'Aunty & Nanda Wal Katha',
    description:
      'හොඳම aunty wal katha, නැන්දා කතා සහ sinhala wal katha new එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.',
  },
  'ඇන්ටි-පුතා': {
    titleBase: 'Aunty Wal Katha — ඇන්ටි පුතා කතා',
    shortBase: 'Aunty Wal Katha',
    description:
      'අලුත්ම aunty wal katha, ඇන්ටි පුතා කතා සහ wal katha sinhala Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
  },
  'අම්මා-පුතා': {
    titleBase: 'Amma Wal Katha — අම්මා පුතා කතා',
    shortBase: 'Amma Wal Katha',
    description:
      'අලුත්ම amma wal katha, අම්මා පුතා කතා සහ sinhala wal katha Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
  },
  school: {
    titleBase: 'School & Teacher Wal Katha — පාසල් කතා',
    shortBase: 'School & Teacher Wal Katha',
    description:
      'නවතම school wal katha, teacher wal katha සහ පාසල් කැම්පස් sinhala walkatha එකතුව Walkathawa වෙතින් කියවන්න.',
  },
  lesbian: {
    titleBase: 'Lesbian Wal Katha — සිංහල වල් කතා',
    shortBase: 'Lesbian Wal Katha',
    description:
      'අලුත්ම lesbian wal katha සහ sinhala wela katha එකතුව Walkathawa (වල් කතාව) වෙතින් නොමිලේ කියවන්න.',
  },
  'වටේ-යාම': {
    titleBase: 'Cuckold & Wife Sharing Wal Katha — වටේ යාම',
    shortBase: 'Cuckold Wal Katha',
    description:
      'අලුත්ම cuckold wal katha, wife sharing සහ වටේ යාම sinhala wal katha Walkathawa වෙතින් නොමිලේ කියවන්න.',
  },
  romantic: {
    titleBase: 'Romantic Sinhala Wal Katha — ආදර කතා',
    shortBase: 'Romantic Sinhala Wal Katha',
    description:
      'ආදර හා හැඟීම්බර sinhala wal katha, wela katha සහ sinhala walkatha කෙටි කතා Walkathawa වෙතින් නොමිලේ කියවන්න.',
  },
};

function formatCleanStoryTitle(rawTitle) {
  const cleaned = stripZW(rawTitle).replace(/\s+/g, ' ').trim();
  const suffix = ` | ${SITE_NAME}`;
  const hasCoreKeyword = /(wal\s*katha|wela\s*katha|wala\s*katha|walkatha|වල්\s*කතා)/i.test(cleaned);
  const withKeyword = hasCoreKeyword ? `${cleaned}${suffix}` : `${cleaned} — Wal Katha${suffix}`;
  if (withKeyword.length <= 65) return withKeyword;
  if (cleaned.length + suffix.length <= 65) return `${cleaned}${suffix}`;
  return `${cleaned.slice(0, Math.max(12, 62 - suffix.length)).trim()}...${suffix}`;
}

function formatCleanDescription(rawDesc, fallbackBody, fallbackTitle) {
  const cleanText = (val) =>
    stripZW(val)
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/["<>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const desc = cleanText(rawDesc);
  const body = cleanText(fallbackBody);
  const title = cleanText(fallbackTitle);

  let candidate = desc;
  if (!candidate || candidate.length < 65) {
    if (body.length >= 65) {
      candidate =
        candidate && !body.startsWith(candidate.slice(0, 20))
          ? `${candidate} ${body}`
          : body;
    } else if (title) {
      candidate = `${title} — ${candidate || body || 'සිංහල කතා Walkathawa වෙතින් නොමිලේ කියවන්න.'}`;
    }
  }
  if (!candidate || candidate.length < 55) {
    candidate = `${title || 'Walkathawa'} — අලුත්ම සිංහල කතා Walkathawa වෙතින් නොමිලේ කියවන්න.`;
  }
  if (candidate.length <= 152) return candidate;
  const trimmed = candidate.slice(0, 149).replace(/\s+\S*$/, '').trim();
  return `${trimmed || candidate.slice(0, 149).trim()}...`;
}

function splitParagraphs(rawContent) {
  const initial = String(rawContent || '')
    .split(/\n\s*\n|\r\n\s*\r\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (initial.length > 1) return initial;

  const sentences = String(rawContent || '')
    .replace(/([.!?।])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences.length > 0 ? sentences : ['සිංහල කතාව'];
}

function toSummaryCard(story) {
  const rawSlug = stripZW(story.slug || story.id);
  const body = String(story.fullContent || story.content || '');
  const desc = formatCleanDescription(
    story.shortDescription || story.description,
    body,
    story.title || rawSlug
  );
  return {
    id: stripZW(story.id || rawSlug),
    slug: rawSlug,
    title: stripZW(story.title || rawSlug),
    shortDescription: desc,
    description: desc,
    category: stripZW(story.category || 'romantic') || 'romantic',
    categoryId: stripZW(story.categoryId || story.category || 'romantic') || 'romantic',
    categoryName: stripZW(story.categoryName || story.category || 'සිංහල කතා'),
    coverImage: story.coverImage || '',
    views: Number(story.views) || 12,
    readingTime: Number(story.readingTime) || 5,
    wordCount: Number(story.wordCount) || 0,
    uploadDate: story.uploadDate || story.createdAt || undefined,
    createdAt: story.createdAt || story.uploadDate || undefined,
    updatedAt: story.updatedAt || story.updatedDate || undefined,
    tags: Array.isArray(story.tags) ? story.tags.slice(0, 6) : [],
    author: story.author || SITE_NAME,
    published: true,
  };
}

function findRelatedStories(story, allStories, limit = 6) {
  const currentId = stripZW(story.id);
  const currentSlug = stripZW(story.slug);
  const currentCat = stripZW(story.category || story.categoryId).toLowerCase();
  const currentTags = Array.isArray(story.tags)
    ? story.tags.map((t) => stripZW(t).toLowerCase())
    : [];
  const basePrefix = stripZW(story.title)
    .replace(/[\s–-]+\d+.*$/, '')
    .trim()
    .toLowerCase();

  const scored = [];
  for (const cand of allStories) {
    const cId = stripZW(cand.id);
    const cSlug = stripZW(cand.slug);
    if (cId === currentId || cSlug === currentSlug) continue;
    let score = 0;
    const cTitle = stripZW(cand.title).toLowerCase();
    if (basePrefix.length > 4 && cTitle.startsWith(basePrefix)) score += 15;
    if (stripZW(cand.category || cand.categoryId).toLowerCase() === currentCat) score += 6;
    if (Array.isArray(cand.tags)) {
      for (const t of cand.tags) {
        if (currentTags.includes(stripZW(t).toLowerCase())) score += 2;
      }
    }
    scored.push({ story: cand, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.story);
}

function buildOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    alternateName: ['වල් කතාව', 'Wal Katha', 'Walkatha', 'Sinhala Wal Katha'],
    url: `${SITE_ORIGIN}/`,
    logo: {
      '@type': 'ImageObject',
      url: DEFAULT_OG_IMAGE,
    },
  };
}

function extractTemplateParts(rawSpaHtml) {
  const headMatch = rawSpaHtml.match(/<head>([\s\S]*?)<\/head>/i);
  const preservedAssets = [];
  if (headMatch) {
    const existingHead = headMatch[1];
    const patterns = [
      /<style[\s\S]*?<\/style>/gi,
      /<link[^>]+rel="stylesheet"[^>]*>/gi,
      /<link[^>]+rel="modulepreload"[^>]*>/gi,
      /<script[^>]+type="module"[\s\S]*?<\/script>/gi,
    ];
    for (const rx of patterns) {
      for (const m of existingHead.match(rx) || []) {
        preservedAssets.push(`    ${m.trim()}`);
      }
    }
  }
  return {
    assetTags: preservedAssets.length > 0 ? `\n${preservedAssets.join('\n')}` : '',
    baseHtml: rawSpaHtml,
  };
}

function buildHead(opts) {
  const ogImg = opts.ogImage || DEFAULT_OG_IMAGE;
  const robotsValue = opts.noIndex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large';

  const lines = [
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">',
    `    <title>${escapeHtmlText(opts.title)}</title>`,
    `    <meta name="description" content="${escapeHtmlAttr(opts.description)}">`,
    `    <meta name="robots" content="${robotsValue}">`,
    ...(opts.canonicalUrl
      ? [`    <link rel="canonical" href="${escapeHtmlAttr(opts.canonicalUrl)}">`]
      : []),
    ...(opts.prevUrl ? [`    <link rel="prev" href="${escapeHtmlAttr(opts.prevUrl)}">`] : []),
    ...(opts.nextUrl ? [`    <link rel="next" href="${escapeHtmlAttr(opts.nextUrl)}">`] : []),
    `    <link rel="icon" type="image/png" href="${SITE_ORIGIN}/favicon.png">`,
    `    <link rel="apple-touch-icon" href="${SITE_ORIGIN}/apple-touch-icon.png">`,
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
      ? [`    <meta property="article:published_time" content="${escapeHtmlAttr(opts.publishedTime)}">`]
      : []),
    ...(opts.modifiedTime
      ? [`    <meta property="article:modified_time" content="${escapeHtmlAttr(opts.modifiedTime)}">`]
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

function renderDocument(templateParts, headOpts, bodyHtml, initialScriptTag = '') {
  const headHtml = buildHead(headOpts);
  return templateParts.baseHtml
    .replace(/<html[^>]*>/i, '<html lang="si" class="dark">')
    .replace(
      /<head>[\s\S]*?<\/head>/i,
      `<head>\n${headHtml}${templateParts.assetTags}\n  </head>`
    )
    .replace(
      /<div id="root">[\s\S]*?<\/div>/i,
      `<div id="root">${bodyHtml}</div>${initialScriptTag}`
    );
}

function buildSiteNavHtml(categories) {
  const catLinks = categories
    .map(
      (c) =>
        `<a href="/category/${encodeSlug(c.slug || c.id)}">${escapeHtmlText(
          stripZW(c.sinhalaName || c.name || c.slug)
        )}</a>`
    )
    .join(' ');
  return `<header>
  <nav aria-label="Primary navigation">
    <a href="/">Walkathawa</a>
    <a href="/categories">වර්ගීකරණ</a>
    <a href="/popular">ජනප්‍රිය</a>
    <a href="/archives">ලේඛනාගාරය</a>
    <a href="/sitemap">සම්පූර්ණ කතා නාමාවලිය</a>
  </nav>
  <nav aria-label="Categories">${catLinks}</nav>
</header>`;
}

function buildSiteFooterHtml(categories) {
  const catLinks = categories
    .map(
      (c) =>
        `<a href="/category/${encodeSlug(c.slug || c.id)}">${escapeHtmlText(
          stripZW(c.sinhalaName || c.name || c.slug)
        )}</a>`
    )
    .join(' ');
  return `<footer>
  <nav aria-label="Footer navigation">
    <a href="/">Home</a>
    <a href="/categories">Categories</a>
    <a href="/popular">Popular</a>
    <a href="/archives">Archives</a>
    <a href="/sitemap">Sitemap</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
    <a href="/page/privacy-policy">Privacy</a>
    <a href="/page/terms-and-conditions">Terms</a>
    <a href="/page/disclaimer">Disclaimer</a>
    <a href="/page/send-your-story">Send Story</a>
  </nav>
  <div>${catLinks}</div>
</footer>`;
}

function buildPageHref(baseRoute, pageNum) {
  if (pageNum <= 1) return baseRoute === '/' ? '/' : baseRoute;
  return baseRoute === '/' ? `/page/${pageNum}` : `${baseRoute}/page/${pageNum}`;
}

function buildPageAbsoluteUrl(baseRoute, pageNum) {
  const rel = buildPageHref(baseRoute, pageNum);
  return rel === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${rel}`;
}

function buildCardsShell(
  h1Text,
  storiesSlice,
  categories,
  baseRoute,
  currentPage,
  totalPages
) {
  const items = storiesSlice
    .map((s) => {
      const slug = encodeSlug(s.slug || s.id);
      const excerpt = formatCleanDescription(
        s.shortDescription || s.description,
        s.fullContent || s.content || '',
        s.title
      );
      return `<article><h2><a href="/story/${slug}">${escapeHtmlText(
        stripZW(s.title)
      )}</a></h2><p>${escapeHtmlText(excerpt)}</p></article>`;
    })
    .join('\n');

  const pageLinks = [];
  if (currentPage > 1) {
    pageLinks.push(
      `<a rel="prev" href="${escapeHtmlAttr(buildPageHref(baseRoute, currentPage - 1))}">Previous</a>`
    );
  }
  for (let p = 1; p <= totalPages; p++) {
    pageLinks.push(
      `<a href="${escapeHtmlAttr(buildPageHref(baseRoute, p))}"${
        p === currentPage ? ' aria-current="page"' : ''
      }>${p}</a>`
    );
  }
  if (currentPage < totalPages) {
    pageLinks.push(
      `<a rel="next" href="${escapeHtmlAttr(buildPageHref(baseRoute, currentPage + 1))}">Next</a>`
    );
  }

  const navHtml =
    totalPages > 1
      ? `\n  <nav aria-label="Pagination">${pageLinks.join(' ')}</nav>`
      : '';

  return `<div class="ssr-shell">
  ${buildSiteNavHtml(categories)}
  <main>
    <h1>${escapeHtmlText(h1Text)}</h1>
    <div>${items}</div>${navHtml}
  </main>
  ${buildSiteFooterHtml(categories)}
</div>`;
}

function loadBuildCatalog() {
  const apiDataDir = path.resolve(process.cwd(), 'public', 'api-data');
  const catalogPath = path.join(apiDataDir, 'catalog.json');
  if (!fs.existsSync(catalogPath)) {
    throw new Error('public/api-data/catalog.json not found. Run generate-sitemap.js first.');
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const byId = new Map();
  for (const s of Array.isArray(catalog.stories) ? catalog.stories : []) {
    if (s && (s.id || s.slug)) byId.set(String(s.id || s.slug), { ...s });
  }
  const chunksDir = path.join(apiDataDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    for (const f of fs.readdirSync(chunksDir).filter((n) => n.endsWith('.json')).sort()) {
      const chunk = JSON.parse(fs.readFileSync(path.join(chunksDir, f), 'utf8'));
      for (const cs of Array.isArray(chunk.stories) ? chunk.stories : []) {
        if (cs && (cs.id || cs.slug)) {
          const k = String(cs.id || cs.slug);
          byId.set(k, { ...(byId.get(k) || {}), ...cs });
        }
      }
    }
  }
  return {
    stories: Array.from(byId.values()),
    categories: Array.isArray(catalog.categories) ? catalog.categories : [],
  };
}

function writeFileSafe(absPath, content) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
}

function main() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('[Prerender Error]: dist/index.html does not exist. Run vite build first.');
    process.exit(1);
  }

  const rawSpaHtml = fs.readFileSync(indexPath, 'utf8');
  writeFileSafe(path.join(distDir, '_spa.html'), rawSpaHtml);

  const templateParts = extractTemplateParts(rawSpaHtml);
  const { stories, categories } = loadBuildCatalog();

  let renderedCount = 0;
  const manifest = {
    generatedAt: new Date().toISOString(),
    origin: SITE_ORIGIN,
    hashedStories: {},
  };

  // 1. Prerender ALL Homepage Pagination Pages: dist/index.html (Page 1) & dist/page/2.html .. N.html
  const totalHomePages = Math.max(1, Math.ceil(stories.length / PAGE_SIZE));
  for (let p = 1; p <= totalHomePages; p++) {
    const startIdx = (p - 1) * PAGE_SIZE;
    const pageStories = stories.slice(startIdx, startIdx + PAGE_SIZE);
    const title =
      p > 1 ? `Sinhala Wal Katha — පිටුව ${p} | ${SITE_NAME}` : HOME_SEO_TITLE;
    const sampleTitles = pageStories
      .slice(0, 2)
      .map((s) => stripZW(s.title))
      .join(', ');
    const description =
      p > 1 && sampleTitles
        ? formatCleanDescription(
            `Walkathawa පිටුව ${p}: ${sampleTitles} ඇතුළු අලුත්ම sinhala wal katha, wela katha සහ wal katha sinhala නොමිලේ කියවන්න.`,
            '',
            title
          )
        : HOME_SEO_DESCRIPTION;
    const canonicalUrl = buildPageAbsoluteUrl('/', p);
    const prevUrl = p > 1 ? buildPageAbsoluteUrl('/', p - 1) : null;
    const nextUrl = p < totalHomePages ? buildPageAbsoluteUrl('/', p + 1) : null;

    const initialGalleryScript = `\n    <script id="__INITIAL_GALLERY__" type="application/json">${safeJsonForScript({
      viewMode: 'home',
      selectedCategory: 'all',
      currentPage: p,
      totalStories: stories.length,
      totalPages: totalHomePages,
      stories: pageStories.map(toSummaryCard),
      categories,
    })}</script>`;

    const homeHtml = renderDocument(
      templateParts,
      {
        title,
        description,
        canonicalUrl,
        prevUrl,
        nextUrl,
        ogType: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            buildOrganizationSchema(),
            {
              '@type': 'WebSite',
              '@id': `${SITE_ORIGIN}/#website`,
              url: `${SITE_ORIGIN}/`,
              name: SITE_NAME,
              alternateName: ['වල් කතාව', 'Sinhala Wal Katha', 'Wela Katha'],
              inLanguage: 'si-LK',
              description,
              publisher: { '@id': `${SITE_ORIGIN}/#organization` },
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${SITE_ORIGIN}/search?s={search_term_string}`,
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
              isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
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
                      url: `${SITE_ORIGIN}/story/${encodeSlug(s.slug || s.id)}`,
                    })),
                  },
                ]
              : []),
          ],
        },
      },
      buildCardsShell(title, pageStories, categories, '/', p, totalHomePages),
      initialGalleryScript
    );

    const outPath = p === 1 ? indexPath : path.join(distDir, 'page', `${p}.html`);
    writeFileSafe(outPath, homeHtml);
    renderedCount++;
  }

  // 2. Prerender Static Pages
  for (const page of STATIC_PAGES) {
    const canonicalUrl = `${SITE_ORIGIN}${page.route}`;
    const fullTitle = `${page.title} | ${SITE_NAME}`;
    const html = renderDocument(
      templateParts,
      {
        title: fullTitle,
        description: page.description,
        canonicalUrl,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            buildOrganizationSchema(),
            {
              '@type': 'WebPage',
              '@id': `${canonicalUrl}#webpage`,
              url: canonicalUrl,
              name: fullTitle,
              description: page.description,
              inLanguage: 'si-LK',
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
                { '@type': 'ListItem', position: 2, name: page.title, item: canonicalUrl },
              ],
            },
          ],
        },
      },
      `<div class="ssr-shell">${buildSiteNavHtml(categories)}<main><article><h1>${escapeHtmlText(
        page.title
      )}</h1><p>${escapeHtmlText(page.body)}</p></article></main>${buildSiteFooterHtml(
        categories
      )}</div>`
    );
    writeFileSafe(path.join(distDir, page.file), html);
    renderedCount++;
  }

  // 3. Prerender /categories, /popular (+ pagination), /archives (+ pagination), /sitemap (ALL 600+ stories)
  const catListHtml = categories
    .map(
      (c) =>
        `<li><a href="/category/${encodeSlug(c.slug || c.id)}">${escapeHtmlText(
          stripZW(c.sinhalaName || c.name || c.slug)
        )}</a></li>`
    )
    .join('\n');
  writeFileSafe(
    path.join(distDir, 'categories.html'),
    renderDocument(
      templateParts,
      {
        title: `Sinhala Wal Katha Categories — වර්ගීකරණ | ${SITE_NAME}`,
        description:
          'Walkathawa (වල් කතාව) සියලුම sinhala wal katha, wela katha, wife, akka, amma, aunty සහ school wal katha වර්ගීකරණ එකම තැනකින්.',
        canonicalUrl: `${SITE_ORIGIN}/categories`,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            buildOrganizationSchema(),
            {
              '@type': 'CollectionPage',
              '@id': `${SITE_ORIGIN}/categories#collection`,
              url: `${SITE_ORIGIN}/categories`,
              name: `Sinhala Wal Katha Categories — වර්ගීකරණ | ${SITE_NAME}`,
              description:
                'Walkathawa (වල් කතාව) සියලුම sinhala wal katha, wela katha, wife, akka, amma, aunty සහ school wal katha වර්ගීකරණ එකම තැනකින්.',
              inLanguage: 'si-LK',
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
                { '@type': 'ListItem', position: 2, name: 'වර්ගීකරණ', item: `${SITE_ORIGIN}/categories` },
              ],
            },
          ],
        },
      },
      `<div class="ssr-shell">${buildSiteNavHtml(
        categories
      )}<main><h1>Sinhala Wal Katha Categories — වර්ගීකරණ</h1><ul>${catListHtml}</ul></main>${buildSiteFooterHtml(
        categories
      )}</div>`
    )
  );
  renderedCount++;

  const popularSorted = [...stories].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
  const totalPopularPages = Math.max(1, Math.ceil(popularSorted.length / PAGE_SIZE));
  for (let p = 1; p <= totalPopularPages; p++) {
    const startIdx = (p - 1) * PAGE_SIZE;
    const slice = popularSorted.slice(startIdx, startIdx + PAGE_SIZE);
    const title =
      p > 1
        ? `Popular Sinhala Wal Katha — පිටුව ${p} | ${SITE_NAME}`
        : `Popular Sinhala Wal Katha — ජනප්‍රිය කතා | ${SITE_NAME}`;
    const sampleTitles = slice
      .slice(0, 2)
      .map((s) => stripZW(s.title))
      .join(', ');
    const description = formatCleanDescription(
      p > 1
        ? `Popular sinhala wal katha පිටුව ${p}: ${sampleTitles} ඇතුළු වැඩිපුරම කියවන wela katha සහ walkatha එකතුව.`
        : `Walkathawa වැඩිපුරම කියවන ජනප්‍රිය sinhala wal katha, wela katha සහ sinhala wala katha: ${sampleTitles}.`,
      '',
      title
    );
    const canonicalUrl = buildPageAbsoluteUrl('/popular', p);
    const prevUrl = p > 1 ? buildPageAbsoluteUrl('/popular', p - 1) : null;
    const nextUrl = p < totalPopularPages ? buildPageAbsoluteUrl('/popular', p + 1) : null;
    const initialGalleryScript = `\n    <script id="__INITIAL_GALLERY__" type="application/json">${safeJsonForScript({
      viewMode: 'popular',
      selectedCategory: 'all',
      currentPage: p,
      totalStories: popularSorted.length,
      totalPages: totalPopularPages,
      stories: slice.map(toSummaryCard),
      categories,
    })}</script>`;

    writeFileSafe(
      p === 1
        ? path.join(distDir, 'popular.html')
        : path.join(distDir, 'popular', 'page', `${p}.html`),
      renderDocument(
        templateParts,
        {
          title,
          description,
          canonicalUrl,
          prevUrl,
          nextUrl,
          jsonLd: {
            '@context': 'https://schema.org',
            '@graph': [
              buildOrganizationSchema(),
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
                  { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
                  { '@type': 'ListItem', position: 2, name: 'ජනප්‍රිය කතා', item: `${SITE_ORIGIN}/popular` },
                ],
              },
              ...(slice.length > 0
                ? [
                    {
                      '@type': 'ItemList',
                      numberOfItems: slice.length,
                      itemListElement: slice.map((s, idx) => ({
                        '@type': 'ListItem',
                        position: startIdx + idx + 1,
                        name: stripZW(s.title),
                        url: `${SITE_ORIGIN}/story/${encodeSlug(s.slug || s.id)}`,
                      })),
                    },
                  ]
                : []),
            ],
          },
        },
        buildCardsShell(title, slice, categories, '/popular', p, totalPopularPages),
        initialGalleryScript
      )
    );
    renderedCount++;
  }

  const totalArchivePages = Math.max(1, Math.ceil(stories.length / PAGE_SIZE));
  for (let p = 1; p <= totalArchivePages; p++) {
    const startIdx = (p - 1) * PAGE_SIZE;
    const slice = stories.slice(startIdx, startIdx + PAGE_SIZE);
    const title =
      p > 1
        ? `Wal Katha New & Archives — පිටුව ${p} | ${SITE_NAME}`
        : `Wal Katha New & Archives — ලේඛනාගාරය | ${SITE_NAME}`;
    const sampleTitles = slice
      .slice(0, 2)
      .map((s) => stripZW(s.title))
      .join(', ');
    const description = formatCleanDescription(
      p > 1
        ? `Wal katha new ලේඛනාගාරය පිටුව ${p}: ${sampleTitles} ඇතුළු සම්පූර්ණ sinhala wal katha සහ walkatha එකතුව.`
        : `Walkathawa සිංහල වල් කතා ලේඛනාගාරය — ${sampleTitles} ඇතුළු අලුත්ම wal katha new සහ sinhala walkatha එකතුව.`,
      '',
      title
    );
    const canonicalUrl = buildPageAbsoluteUrl('/archives', p);
    const prevUrl = p > 1 ? buildPageAbsoluteUrl('/archives', p - 1) : null;
    const nextUrl = p < totalArchivePages ? buildPageAbsoluteUrl('/archives', p + 1) : null;
    const initialGalleryScript = `\n    <script id="__INITIAL_GALLERY__" type="application/json">${safeJsonForScript({
      viewMode: 'archives',
      selectedCategory: 'all',
      currentPage: p,
      totalStories: stories.length,
      totalPages: totalArchivePages,
      stories: slice.map(toSummaryCard),
      categories,
    })}</script>`;

    writeFileSafe(
      p === 1
        ? path.join(distDir, 'archives.html')
        : path.join(distDir, 'archives', 'page', `${p}.html`),
      renderDocument(
        templateParts,
        {
          title,
          description,
          canonicalUrl,
          prevUrl,
          nextUrl,
          jsonLd: {
            '@context': 'https://schema.org',
            '@graph': [
              buildOrganizationSchema(),
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
                  { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
                  { '@type': 'ListItem', position: 2, name: 'ලේඛනාගාරය', item: `${SITE_ORIGIN}/archives` },
                ],
              },
              ...(slice.length > 0
                ? [
                    {
                      '@type': 'ItemList',
                      numberOfItems: slice.length,
                      itemListElement: slice.map((s, idx) => ({
                        '@type': 'ListItem',
                        position: startIdx + idx + 1,
                        name: stripZW(s.title),
                        url: `${SITE_ORIGIN}/story/${encodeSlug(s.slug || s.id)}`,
                      })),
                    },
                  ]
                : []),
            ],
          },
        },
        buildCardsShell(title, slice, categories, '/archives', p, totalArchivePages),
        initialGalleryScript
      )
    );
    renderedCount++;
  }

  // Complete HTML Sitemap: ALL stories + ALL categories (zero truncation!)
  const allSitemapLinks = stories
    .map(
      (s) =>
        `<li><a href="/story/${encodeSlug(s.slug || s.id)}">${escapeHtmlText(stripZW(s.title))}</a></li>`
    )
    .join('\n');
  writeFileSafe(
    path.join(distDir, 'sitemap.html'),
    renderDocument(
      templateParts,
      {
        title: `Complete Sinhala Wal Katha Index — නාමාවලිය | ${SITE_NAME}`,
        description: `Walkathawa (වල් කතාව) වෙබ් අඩවියේ සියලුම sinhala wal katha (${stories.length}), wela katha, walkatha සහ වර්ගීකරණ එකම පිටුවකින්.`,
        canonicalUrl: `${SITE_ORIGIN}/sitemap`,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            buildOrganizationSchema(),
            {
              '@type': 'CollectionPage',
              '@id': `${SITE_ORIGIN}/sitemap#webpage`,
              url: `${SITE_ORIGIN}/sitemap`,
              name: `Complete Sinhala Wal Katha Index — නාමාවලිය | ${SITE_NAME}`,
              description: `Walkathawa (වල් කතාව) වෙබ් අඩවියේ සියලුම sinhala wal katha (${stories.length}), wela katha, walkatha සහ වර්ගීකරණ එකම පිටුවකින්.`,
              inLanguage: 'si-LK',
            },
          ],
        },
      },
      `<div class="ssr-shell">${buildSiteNavHtml(
        categories
      )}<main><h1>Walkathawa — Sinhala Wal Katha සම්පූර්ණ කතා නාමාවලිය (${stories.length})</h1><h2>වර්ගීකරණ</h2><ul>${catListHtml}</ul><h2>සියලුම කතා</h2><ul>${allSitemapLinks}</ul></main>${buildSiteFooterHtml(
        categories
      )}</div>`
    )
  );
  renderedCount++;

  // 4. Prerender ALL Category Pages + ALL Category Pagination Pages
  for (const cat of categories) {
    const rawSlug = stripZW(cat.slug || cat.id);
    if (!rawSlug || rawSlug.includes('/')) continue;
    const catLower = rawSlug.toLowerCase();
    const matching = stories.filter((s) => {
      const sCat = stripZW(s.category).toLowerCase();
      const sCatId = stripZW(s.categoryId).toLowerCase();
      const sTags = Array.isArray(s.tags) ? s.tags.map((t) => stripZW(t).toLowerCase()) : [];
      return sCat === catLower || sCatId === catLower || sTags.includes(catLower);
    });
    const catLabel = stripZW(cat.sinhalaName || cat.name || rawSlug);
    const catSeo = CATEGORY_SEO_MAP[catLower] || {
      titleBase: `${catLabel} — Wal Katha`,
      shortBase: catLabel,
      description: `${catLabel} — අලුත්ම sinhala wal katha, wela katha සහ walkatha එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.`,
    };
    const catBaseRoute = `/category/${encodeSlug(rawSlug)}`;
    const totalCatPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));

    for (let p = 1; p <= totalCatPages; p++) {
      const startIdx = (p - 1) * PAGE_SIZE;
      const slice = matching.slice(startIdx, startIdx + PAGE_SIZE);
      const title =
        p > 1
          ? `${catSeo.shortBase} — පිටුව ${p} | ${SITE_NAME}`
          : `${catSeo.titleBase} | ${SITE_NAME}`;
      const sampleTitles = slice
        .slice(0, 2)
        .map((s) => stripZW(s.title))
        .join(', ');
      const description = formatCleanDescription(
        p > 1
          ? `${catSeo.shortBase} පිටුව ${p}: ${sampleTitles} ඇතුළු sinhala wal katha සහ wela katha Walkathawa වෙතින් නොමිලේ කියවන්න.`
          : catSeo.description,
        '',
        title
      );
      const canonicalUrl = buildPageAbsoluteUrl(catBaseRoute, p);
      const prevUrl = p > 1 ? buildPageAbsoluteUrl(catBaseRoute, p - 1) : null;
      const nextUrl = p < totalCatPages ? buildPageAbsoluteUrl(catBaseRoute, p + 1) : null;

      const initialGalleryScript = `\n    <script id="__INITIAL_GALLERY__" type="application/json">${safeJsonForScript({
        viewMode: 'category',
        selectedCategory: rawSlug,
        currentPage: p,
        totalStories: matching.length,
        totalPages: totalCatPages,
        stories: slice.map(toSummaryCard),
        categories,
      })}</script>`;

      const catHtml = renderDocument(
        templateParts,
        {
          title,
          description,
          canonicalUrl,
          prevUrl,
          nextUrl,
          jsonLd: {
            '@context': 'https://schema.org',
            '@graph': [
              buildOrganizationSchema(),
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
                  { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
                  { '@type': 'ListItem', position: 2, name: catLabel, item: `${SITE_ORIGIN}${catBaseRoute}` },
                ],
              },
              ...(slice.length > 0
                ? [
                    {
                      '@type': 'ItemList',
                      numberOfItems: slice.length,
                      itemListElement: slice.map((s, idx) => ({
                        '@type': 'ListItem',
                        position: startIdx + idx + 1,
                        name: stripZW(s.title),
                        url: `${SITE_ORIGIN}/story/${encodeSlug(s.slug || s.id)}`,
                      })),
                    },
                  ]
                : []),
            ],
          },
        },
        buildCardsShell(title, slice, categories, catBaseRoute, p, totalCatPages),
        initialGalleryScript
      );

      if (Buffer.byteLength(`${rawSlug}.html`, 'utf8') <= 240) {
        const outPath =
          p === 1
            ? path.join(distDir, 'category', `${rawSlug}.html`)
            : path.join(distDir, 'category', rawSlug, 'page', `${p}.html`);
        writeFileSafe(outPath, catHtml);
        renderedCount++;
      }
    }
  }

  // 5. Prerender All Published Story Pages with Rich Internal Links + Zero-Flicker Hydration JSON
  let storyRendered = 0;
  let storyHashed = 0;
  const seenStoryTitles = new Map();
  const seenStoryDescriptions = new Set();

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const rawSlug = stripZW(story.slug || story.id);
    if (!rawSlug) continue;
    const postTitle = stripZW(story.title || rawSlug);
    let cleanTitle = formatCleanStoryTitle(postTitle);
    const titleKey = cleanTitle.toLowerCase();
    const prevTitleCount = seenStoryTitles.get(titleKey) || 0;
    seenStoryTitles.set(titleKey, prevTitleCount + 1);
    if (prevTitleCount > 0) {
      const suffixNum = prevTitleCount + 1;
      const baseWithoutBrand = cleanTitle.replace(/\s*\|\s*Walkathawa$/i, '').trim();
      const maxBase = Math.max(10, 56 - ` (${suffixNum}) | ${SITE_NAME}`.length);
      cleanTitle = `${baseWithoutBrand.slice(0, maxBase).trim()} (${suffixNum}) | ${SITE_NAME}`;
    }

    const bodyText =
      story.fullContent || story.content || story.shortDescription || story.description || postTitle;
    let excerpt = formatCleanDescription(
      story.shortDescription || story.description,
      bodyText,
      postTitle
    );
    if (seenStoryDescriptions.has(excerpt.toLowerCase())) {
      const altSnippet = String(bodyText).replace(/\s+/g, ' ').trim().slice(140, 320);
      excerpt = formatCleanDescription(
        `${postTitle} (${i + 1}) — ${altSnippet || bodyText}`,
        bodyText,
        `${postTitle} ${i + 1}`
      );
    }
    seenStoryDescriptions.add(excerpt.toLowerCase());
    const canonicalSlug = encodeSlug(rawSlug);
    const canonicalUrl = `${SITE_ORIGIN}/story/${canonicalSlug}`;
    const ogImg =
      story.coverImage && String(story.coverImage).startsWith('http')
        ? String(story.coverImage).trim()
        : DEFAULT_OG_IMAGE;

    const datePublished = toIsoDate(story.createdAt || story.uploadDate || story.uploadedDate);
    const dateModified = toIsoDate(story.updatedAt || story.updatedDate) || datePublished;
    const wordCount = story.wordCount || String(bodyText).split(/\s+/).length || 950;
    const readingMinutes = story.readingTime || Math.max(3, Math.ceil(wordCount / 180));
    const catSlug = stripZW(story.category || 'romantic');
    const catLabel = stripZW(story.categoryName || story.category || 'සිංහල කතා');
    const authorName = stripZW(
      typeof story.author === 'object' && story.author !== null
        ? story.author.name || SITE_NAME
        : story.author || SITE_NAME
    );

    const prevStory = i > 0 ? stories[i - 1] : null;
    const nextStory = i < stories.length - 1 ? stories[i + 1] : null;
    const relatedStories = findRelatedStories(story, stories, 6);

    const paragraphsHtml = splitParagraphs(bodyText)
      .map((p) => `<p data-reading-content>${escapeHtmlText(p)}</p>`)
      .join('\n');

    const coverHtml =
      story.coverImage && String(story.coverImage).startsWith('http')
        ? `<figure><img src="${escapeHtmlAttr(String(story.coverImage).trim())}" alt="${escapeHtmlAttr(
            `${postTitle} — ${catLabel} | Sinhala Wal Katha`
          )}" loading="eager" /></figure>`
        : '';

    const adjLinks = [];
    if (prevStory) {
      adjLinks.push(
        `<a rel="prev" href="/story/${encodeSlug(prevStory.slug || prevStory.id)}">${escapeHtmlText(
          stripZW(prevStory.title)
        )}</a>`
      );
    }
    if (nextStory) {
      adjLinks.push(
        `<a rel="next" href="/story/${encodeSlug(nextStory.slug || nextStory.id)}">${escapeHtmlText(
          stripZW(nextStory.title)
        )}</a>`
      );
    }
    const adjNavHtml =
      adjLinks.length > 0 ? `<nav aria-label="Adjacent stories">${adjLinks.join(' ')}</nav>` : '';

    const relatedHtml =
      relatedStories.length > 0
        ? `<section><h2>තවත් කියවන්න</h2><ul>${relatedStories
            .map(
              (rel) =>
                `<li><a href="/story/${encodeSlug(rel.slug || rel.id)}">${escapeHtmlText(
                  stripZW(rel.title)
                )}</a></li>`
            )
            .join('\n')}</ul></section>`
        : '';

    const initialStoryPayload = {
      story: {
        ...toSummaryCard(story),
        fullContent: bodyText,
        content: bodyText,
      },
      prevStory: prevStory ? toSummaryCard(prevStory) : null,
      nextStory: nextStory ? toSummaryCard(nextStory) : null,
      relatedStories: relatedStories.map(toSummaryCard),
    };
    const initialStoryScript = `\n    <script id="__INITIAL_STORY__" type="application/json">${safeJsonForScript(
      initialStoryPayload
    )}</script>`;

    const storyHtml = renderDocument(
      templateParts,
      {
        title: cleanTitle,
        description: excerpt,
        canonicalUrl,
        ogType: 'article',
        ogImage: ogImg,
        publishedTime: datePublished,
        modifiedTime: dateModified,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            buildOrganizationSchema(),
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
              keywords: ['wal katha', 'sinhala wal katha', 'wela katha', 'walkatha', 'sinhala wala katha', catLabel],
              image: [ogImg],
              ...(datePublished ? { datePublished } : {}),
              ...(dateModified ? { dateModified } : {}),
              author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_ORIGIN}/` },
              publisher: { '@id': `${SITE_ORIGIN}/#organization` },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: catLabel,
                  item: `${SITE_ORIGIN}/category/${encodeSlug(catSlug)}`,
                },
                { '@type': 'ListItem', position: 3, name: postTitle, item: canonicalUrl },
              ],
            },
          ],
        },
      },
      `<div class="ssr-article">
  ${buildSiteNavHtml(categories)}
  <main>
    <article>
      <header>
        <nav aria-label="Breadcrumb"><a href="/">මුල් පිටුව</a> / <a href="/category/${encodeSlug(
          catSlug
        )}">${escapeHtmlText(catLabel)}</a></nav>
        <h1>${escapeHtmlText(postTitle)}</h1>
        <a href="/profile/${encodeURIComponent(authorName)}">${escapeHtmlText(authorName)}</a>
      </header>
      ${coverHtml}
      <div class="article-body">
        ${paragraphsHtml}
      </div>
      ${adjNavHtml}
      ${relatedHtml}
    </article>
  </main>
  ${buildSiteFooterHtml(categories)}
</div>`,
      initialStoryScript
    );

    const safeDirectFilename =
      !rawSlug.includes('/') &&
      !rawSlug.includes('\\') &&
      !rawSlug.includes('..') &&
      Buffer.byteLength(`${rawSlug}.html`, 'utf8') <= 240;

    if (safeDirectFilename) {
      writeFileSafe(path.join(distDir, 'story', `${rawSlug}.html`), storyHtml);
      storyRendered++;
      renderedCount++;
    } else {
      const hash = crypto.createHash('sha1').update(rawSlug).digest('hex');
      writeFileSafe(path.join(distDir, '_prerender', 'stories', `${hash}.html`), storyHtml);
      manifest.hashedStories[rawSlug.toLowerCase()] = `/_prerender/stories/${hash}.html`;
      storyHashed++;
      renderedCount++;
    }
  }

  // 6. Prerender 404.html
  writeFileSafe(
    path.join(distDir, '404.html'),
    renderDocument(
      templateParts,
      {
        title: `404 — පිටුව හමු නොවීය | ${SITE_NAME}`,
        description: 'ඔබ සෙවූ පිටුව Walkathawa වෙබ් අඩවියෙන් හමු නොවීය.',
        canonicalUrl: null,
        noIndex: true,
      },
      `<div class="ssr-shell">${buildSiteNavHtml(
        categories
      )}<main><h1>404 — පිටුව හමු නොවීය</h1><p><a href="/">මුල් පිටුවට යන්න</a></p></main>${buildSiteFooterHtml(
        categories
      )}</div>`
    )
  );
  renderedCount++;

  writeFileSafe(path.join(distDir, 'prerender-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(
    `[Prerender] Generated ${renderedCount} static HTML pages on ${SITE_ORIGIN} (stories direct: ${storyRendered}, hashed: ${storyHashed}, homePages: ${totalHomePages}, categories: ${categories.length})`
  );
}

main();
