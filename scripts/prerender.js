import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SITE_ORIGIN = 'https://www.walkathawa.site';
const SITE_NAME = 'Walkathawa';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icon.png`;

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
    description: 'Walkathawa සම්බන්ධයෙන් විමසීම් සහ යෝජනා සඳහා අප හා සම්බන්ධ වන්න.',
    body: 'Walkathawa සම්බන්ධයෙන් ඕනෑම විමසීමක් සඳහා අප හා සම්බන්ධ වන්න: contact@walkathawa.site',
  },
  {
    route: '/page/privacy-policy',
    file: 'page/privacy-policy.html',
    title: 'Privacy Policy',
    description: 'Walkathawa (walkathawa.site) පෞද්ගලිකත්ව ප්‍රතිපත්තිය.',
    body: 'Walkathawa (walkathawa.site) ඔබගේ පෞද්ගලිකත්වයට සහ දත්ත ආරක්ෂාවට ගරු කරයි.',
  },
  {
    route: '/page/terms-and-conditions',
    file: 'page/terms-and-conditions.html',
    title: 'Terms and Conditions',
    description: 'Walkathawa වෙබ් අඩවිය භාවිතා කිරීමේ නියමයන් සහ කොන්දේසි.',
    body: 'Walkathawa වෙබ් අඩවිය භාවිතා කිරීමේදී වයස අවුරුදු 18+ වීම සහ ප්‍රබන්ධ අන්තර්ගත කොන්දේසි අදාළ වේ.',
  },
  {
    route: '/page/send-your-story',
    file: 'page/send-your-story.html',
    title: 'Send Your Story',
    description: 'ඔබ විසින් රචිත සිංහල කතා Walkathawa වෙබ් අඩවියට එවන්න.',
    body: 'ඔබ විසින් රචිත නිර්මාණාත්මක සිංහල කතා Walkathawa වෙබ් අඩවියේ පළ කිරීමට stories@walkathawa.site වෙත එවන්න.',
  },
  {
    route: '/page/disclaimer',
    file: 'page/disclaimer.html',
    title: 'Disclaimer',
    description: 'Walkathawa (walkathawa.site) වගකීම් ප්‍රකාශය.',
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

function formatCleanStoryTitle(rawTitle) {
  const cleaned = stripZW(rawTitle)
    .replace(/\s*[–|-]\s*(Sinhala\s+)?(Wal|Wela|Wala|Sex)\s+Katha.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const suffix = ` | ${SITE_NAME}`;
  if (cleaned.length + suffix.length <= 60) {
    return `${cleaned}${suffix}`;
  }
  return `${cleaned.slice(0, Math.max(10, 57 - suffix.length)).trim()}...${suffix}`;
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

function buildOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
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
  const lines = [
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">',
    `    <title>${escapeHtmlText(opts.title)}</title>`,
    `    <meta name="description" content="${escapeHtmlAttr(opts.description)}">`,
    ...(opts.noIndex ? ['    <meta name="robots" content="noindex, nofollow">'] : []),
    ...(opts.canonicalUrl
      ? [`    <link rel="canonical" href="${escapeHtmlAttr(opts.canonicalUrl)}">`]
      : []),
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

const POPUNDER_SCRIPT_TAG =
  '\n    <script data-cfasync="false" src="https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e"></script>';

function renderDocument(templateParts, headOpts, bodyHtml) {
  const headHtml = buildHead(headOpts);
  const popunderTag = headOpts.noIndex ? '' : POPUNDER_SCRIPT_TAG;
  return templateParts.baseHtml
    .replace(/<html[^>]*>/i, '<html lang="si" class="dark">')
    .replace(
      /<head>[\s\S]*?<\/head>/i,
      `<head>\n${headHtml}${templateParts.assetTags}${popunderTag}\n  </head>`
    )
    .replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${bodyHtml}</div>`);
}

function buildCardsShell(h1Text, storiesSlice, nextUrl = null) {
  const items = storiesSlice
    .map((s) => {
      const slug = encodeSlug(s.slug || s.id);
      return `<article><h2><a href="/story/${slug}">${escapeHtmlText(stripZW(s.title))}</a></h2></article>`;
    })
    .join('\n');
  const nextHtml = nextUrl
    ? `\n  <nav aria-label="Pagination"><a rel="next" href="${escapeHtmlAttr(nextUrl)}">Next</a></nav>`
    : '';
  return `<div class="ssr-shell">
  <h1 class="sr-only">${escapeHtmlText(h1Text)}</h1>
  <div>${items}</div>${nextHtml}
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
  // Preserve clean SPA template for Cloudflare Worker & production fallback
  writeFileSafe(path.join(distDir, '_spa.html'), rawSpaHtml);

  const templateParts = extractTemplateParts(rawSpaHtml);
  const { stories, categories } = loadBuildCatalog();

  let renderedCount = 0;
  const manifest = {
    generatedAt: new Date().toISOString(),
    origin: SITE_ORIGIN,
    hashedStories: {},
  };

  // 1. Prerender Homepage (dist/index.html)
  const homeStories = stories.slice(0, 20);
  const homeTitle = 'Walkathawa (වල් කතාව) | Sinhala Stories Online';
  const homeDesc =
    'Walkathawa (වල් කතාව) is a place to read Sinhala stories online. Discover new Sinhala katha, romantic stories, fictional stories, and short stories updated regularly.';
  const homeNext = stories.length > 20 ? `${SITE_ORIGIN}/?page=2` : null;
  const homeHtml = renderDocument(
    templateParts,
    {
      title: homeTitle,
      description: homeDesc,
      canonicalUrl: `${SITE_ORIGIN}/`,
      nextUrl: homeNext,
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
            inLanguage: 'si-LK',
            description: homeDesc,
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
            '@id': `${SITE_ORIGIN}/#collection`,
            url: `${SITE_ORIGIN}/`,
            name: homeTitle,
            description: homeDesc,
            inLanguage: 'si-LK',
            isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
          },
          ...(homeStories.length > 0
            ? [
                {
                  '@type': 'ItemList',
                  '@id': `${SITE_ORIGIN}/#itemlist`,
                  numberOfItems: homeStories.length,
                  itemListElement: homeStories.map((s, idx) => ({
                    '@type': 'ListItem',
                    position: idx + 1,
                    name: stripZW(s.title),
                    url: `${SITE_ORIGIN}/story/${encodeSlug(s.slug || s.id)}`,
                  })),
                },
              ]
            : []),
        ],
      },
    },
    buildCardsShell(homeTitle, homeStories, homeNext)
  );
  writeFileSafe(indexPath, homeHtml);
  renderedCount++;

  // 2. Prerender Static Pages (flat .html files avoid trailing-slash redirects on Cloudflare Pages)
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
      `<div class="ssr-shell"><article><h1>${escapeHtmlText(page.title)}</h1><p>${escapeHtmlText(page.body)}</p></article></div>`
    );
    writeFileSafe(path.join(distDir, page.file), html);
    renderedCount++;
  }

  // 3. Prerender /categories, /popular, /archives, /sitemap
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
        title: `වර්ගීකරණ | ${SITE_NAME}`,
        description: 'Walkathawa සිංහල කතා වර්ගීකරණ එකතුව පිරික්සන්න.',
        canonicalUrl: `${SITE_ORIGIN}/categories`,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            buildOrganizationSchema(),
            {
              '@type': 'CollectionPage',
              '@id': `${SITE_ORIGIN}/categories#collection`,
              url: `${SITE_ORIGIN}/categories`,
              name: `වර්ගීකරණ | ${SITE_NAME}`,
              description: 'Walkathawa සිංහල කතා වර්ගීකරණ එකතුව පිරික්සන්න.',
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
      `<div class="ssr-shell"><h1>වර්ගීකරණ | Walkathawa</h1><ul>${catListHtml}</ul></div>`
    )
  );
  renderedCount++;

  const popularStories = [...stories]
    .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
    .slice(0, 20);
  writeFileSafe(
    path.join(distDir, 'popular.html'),
    renderDocument(
      templateParts,
      {
        title: `ජනප්‍රිය කතා | ${SITE_NAME}`,
        description: 'Walkathawa වෙබ් අඩවියේ වැඩිපුරම කියවන ජනප්‍රිය සිංහල කතා එකතුව.',
        canonicalUrl: `${SITE_ORIGIN}/popular`,
        nextUrl: stories.length > 20 ? `${SITE_ORIGIN}/popular?page=2` : null,
      },
      buildCardsShell('ජනප්‍රිය කතා | Walkathawa', popularStories, stories.length > 20 ? `${SITE_ORIGIN}/popular?page=2` : null)
    )
  );
  renderedCount++;

  writeFileSafe(
    path.join(distDir, 'archives.html'),
    renderDocument(
      templateParts,
      {
        title: `ලේඛනාගාරය | ${SITE_NAME}`,
        description: 'Walkathawa සිංහල කතා ලේඛනාගාරය — සියලුම කතා එකතුව.',
        canonicalUrl: `${SITE_ORIGIN}/archives`,
        nextUrl: stories.length > 20 ? `${SITE_ORIGIN}/archives?page=2` : null,
      },
      buildCardsShell('ලේඛනාගාරය | Walkathawa', homeStories, stories.length > 20 ? `${SITE_ORIGIN}/archives?page=2` : null)
    )
  );
  renderedCount++;

  const sitemapLinks = stories
    .slice(0, 200)
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
        title: `සම්පූර්ණ කතා නාමාවලිය | ${SITE_NAME}`,
        description: 'Walkathawa වෙබ් අඩවියේ සියලුම සිංහල කතා සහ වර්ගීකරණ එකම පිටුවකින්.',
        canonicalUrl: `${SITE_ORIGIN}/sitemap`,
      },
      `<div class="ssr-shell"><h1>Walkathawa — Complete Sitemap</h1><ul>${sitemapLinks}</ul></div>`
    )
  );
  renderedCount++;

  // 4. Prerender Category Pages: dist/category/{slug}.html
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
    const slice = matching.slice(0, 20);
    const catLabel = stripZW(cat.sinhalaName || cat.name || rawSlug);
    const title = `${catLabel} | ${SITE_NAME}`;
    const description = stripZW(
      cat.description || `${catLabel} — සිංහල කතා එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.`
    ).slice(0, 158);
    const canonicalUrl = `${SITE_ORIGIN}/category/${encodeSlug(rawSlug)}`;
    const nextUrl = matching.length > 20 ? `${canonicalUrl}?page=2` : null;

    const catHtml = renderDocument(
      templateParts,
      {
        title,
        description,
        canonicalUrl,
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
                { '@type': 'ListItem', position: 2, name: catLabel, item: canonicalUrl },
              ],
            },
            ...(slice.length > 0
              ? [
                  {
                    '@type': 'ItemList',
                    numberOfItems: slice.length,
                    itemListElement: slice.map((s, idx) => ({
                      '@type': 'ListItem',
                      position: idx + 1,
                      name: stripZW(s.title),
                      url: `${SITE_ORIGIN}/story/${encodeSlug(s.slug || s.id)}`,
                    })),
                  },
                ]
              : []),
          ],
        },
      },
      buildCardsShell(title, slice, nextUrl)
    );

    if (Buffer.byteLength(`${rawSlug}.html`, 'utf8') <= 240) {
      writeFileSafe(path.join(distDir, 'category', `${rawSlug}.html`), catHtml);
      renderedCount++;
    }
  }

  // 5. Prerender All Published Story Pages: dist/story/{slug}.html
  let storyRendered = 0;
  let storyHashed = 0;
  for (const story of stories) {
    const rawSlug = stripZW(story.slug || story.id);
    if (!rawSlug) continue;
    const postTitle = stripZW(story.title || rawSlug);
    const cleanTitle = formatCleanStoryTitle(postTitle);
    const bodyText =
      story.fullContent || story.content || story.shortDescription || story.description || postTitle;
    const excerpt = String(bodyText).replace(/\s+/g, ' ').trim().slice(0, 155);
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

    const paragraphsHtml = splitParagraphs(bodyText)
      .map((p) => `<p data-reading-content>${escapeHtmlText(p)}</p>`)
      .join('\n');

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
  <article>
    <header>
      <a href="/category/${encodeSlug(catSlug)}">${escapeHtmlText(catLabel)}</a>
      <h1>${escapeHtmlText(postTitle)}</h1>
      <a href="/profile/${encodeURIComponent(authorName)}">${escapeHtmlText(authorName)}</a>
    </header>
    <div class="article-body">
      ${paragraphsHtml}
    </div>
  </article>
</div>`
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

  // 6. Prerender 404.html (ensures Cloudflare Pages serves real HTTP 404 for unknown static paths)
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
      '<div class="ssr-shell"><h1>404 — පිටුව හමු නොවීය</h1><p><a href="/">මුල් පිටුවට යන්න</a></p></div>'
    )
  );
  renderedCount++;

  writeFileSafe(path.join(distDir, 'prerender-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(
    `[Prerender] Generated ${renderedCount} static HTML pages on ${SITE_ORIGIN} (stories direct: ${storyRendered}, hashed: ${storyHashed}, categories: ${categories.length})`
  );
}

main();
