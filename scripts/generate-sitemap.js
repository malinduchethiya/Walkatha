import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://www.walkathawa.site';
const NOW_MS = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_CATEGORIES = [
  { id: 'wife', slug: 'wife', sinhalaName: 'වයිෆ් / බිරිඳ කතා', name: 'Wife Stories' },
  { id: 'akka-malli', slug: 'akka-malli', sinhalaName: 'අක්කා - මල්ලි කතා', name: 'Akka Malli' },
  { id: 'nanda', slug: 'nanda', sinhalaName: 'නැන්දා / ඇන්ටි කතා', name: 'Aunty Stories' },
  { id: 'school', slug: 'school', sinhalaName: 'පාසල් සහ කැම්පස් කතා', name: 'School & Campus' },
  { id: 'romantic', slug: 'romantic', sinhalaName: 'ආදර සහ රස කතා', name: 'Romantic Stories' },
];

function stripZW(val) {
  return String(val || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function encodeSlug(rawSlug) {
  const clean = stripZW(rawSlug);
  try {
    return encodeURIComponent(decodeURIComponent(clean));
  } catch {
    return encodeURIComponent(clean);
  }
}

function toW3CDatetime(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function resolveStoryLastmod(story) {
  const updatedW3C = toW3CDatetime(story.updatedAt || story.updatedDate);
  const createdW3C = toW3CDatetime(story.createdAt || story.uploadDate || story.uploadedDate);

  if (updatedW3C) {
    return { lastmod: updatedW3C, source: 'updatedAt' };
  }
  if (createdW3C) {
    return { lastmod: createdW3C, source: 'createdAt' };
  }
  return { lastmod: null, source: 'none' };
}

function getRecencyChangefreqAndPriority(lastmodIso) {
  if (!lastmodIso) {
    return { changefreq: 'yearly', priority: '0.6' };
  }
  const ts = new Date(lastmodIso).getTime();
  if (isNaN(ts)) {
    return { changefreq: 'yearly', priority: '0.6' };
  }
  const ageDays = Math.max(0, (NOW_MS - ts) / DAY_MS);
  if (ageDays <= 7) {
    return { changefreq: 'daily', priority: '0.9' };
  }
  if (ageDays <= 30) {
    return { changefreq: 'weekly', priority: '0.8' };
  }
  if (ageDays <= 180) {
    return { changefreq: 'monthly', priority: '0.7' };
  }
  return { changefreq: 'yearly', priority: '0.6' };
}

function loadStore() {
  const syncPath = path.resolve(process.cwd(), 'server-data', 'firestore-sync.json');
  try {
    if (fs.existsSync(syncPath)) {
      const parsed = JSON.parse(fs.readFileSync(syncPath, 'utf8'));
      const rawStories = Array.isArray(parsed.stories)
        ? parsed.stories.filter(
            (s) => s && !s.isDeleted && !s.deleted && s.published !== false && stripZW(s.slug || s.id)
          )
        : [];
      const seenSlugs = new Set();
      const stories = [];
      for (const s of rawStories) {
        const key = encodeSlug(s.slug || s.id).toLowerCase();
        if (!seenSlugs.has(key)) {
          seenSlugs.add(key);
          stories.push({
            ...s,
            slug: stripZW(s.slug || s.id),
            title: stripZW(s.title),
          });
        }
      }

      const rawCats =
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories.filter((c) => c && !c.isDeleted && !c.deleted && c.slug !== 'all')
          : DEFAULT_CATEGORIES;
      return { stories, categories: rawCats };
    }
  } catch (err) {
    console.error('Error reading firestore-sync.json:', err);
  }
  return { stories: [], categories: DEFAULT_CATEGORIES };
}

function generateSitemaps() {
  const { stories, categories } = loadStore();

  let countFromUpdatedAt = 0;
  let countFromCreatedAt = 0;
  let countMissingBoth = 0;
  let latestStoryMod = null;

  const storyEntries = stories.map((story) => {
    const encoded = encodeSlug(story.slug);
    const loc = `${SITE_URL}/story/${encoded}`;
    const { lastmod, source } = resolveStoryLastmod(story);

    if (source === 'updatedAt') countFromUpdatedAt++;
    else if (source === 'createdAt') countFromCreatedAt++;
    else countMissingBoth++;

    if (lastmod && (!latestStoryMod || lastmod > latestStoryMod)) {
      latestStoryMod = lastmod;
    }

    const { changefreq, priority } = getRecencyChangefreqAndPriority(lastmod);
    const coverUrl =
      story.coverImage && String(story.coverImage).startsWith('http')
        ? String(story.coverImage).trim()
        : null;

    const lines = ['  <url>', `    <loc>${escapeXml(loc)}</loc>`];
    if (lastmod) {
      lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
    }
    lines.push(`    <changefreq>${changefreq}</changefreq>`);
    lines.push(`    <priority>${priority}</priority>`);
    if (coverUrl) {
      lines.push('    <image:image>');
      lines.push(`      <image:loc>${escapeXml(coverUrl)}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(story.title)}</image:title>`);
      lines.push('    </image:image>');
    }
    lines.push('  </url>');
    return lines.join('\n');
  });

  const sitemapStoriesXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    storyEntries.join('\n'),
    '</urlset>',
    '',
  ].join('\n');

  const topLastmod = latestStoryMod || new Date().toISOString();

  const mainUrls = [
    { loc: `${SITE_URL}/`, lastmod: topLastmod, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/categories`, lastmod: topLastmod, changefreq: 'weekly', priority: '0.8' },
    ...categories.map((c) => ({
      loc: `${SITE_URL}/category/${encodeSlug(c.slug || c.id)}`,
      lastmod: topLastmod,
      changefreq: 'daily',
      priority: '0.8',
    })),
  ];

  const sitemapMainXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    mainUrls
      .map((u) =>
        [
          '  <url>',
          `    <loc>${escapeXml(u.loc)}</loc>`,
          `    <lastmod>${escapeXml(u.lastmod)}</lastmod>`,
          `    <changefreq>${u.changefreq}</changefreq>`,
          `    <priority>${u.priority}</priority>`,
          '  </url>',
        ].join('\n')
      )
      .join('\n'),
    '</urlset>',
    '',
  ].join('\n');

  const sitemapIndexXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <sitemap>',
    `    <loc>${SITE_URL}/sitemap-main.xml</loc>`,
    `    <lastmod>${escapeXml(topLastmod)}</lastmod>`,
    '  </sitemap>',
    '  <sitemap>',
    `    <loc>${SITE_URL}/sitemap-stories.xml</loc>`,
    `    <lastmod>${escapeXml(topLastmod)}</lastmod>`,
    '  </sitemap>',
    '</sitemapindex>',
    '',
  ].join('\n');

  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap-stories.xml'), sitemapStoriesXml, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'sitemap-main.xml'), sitemapMainXml, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapIndexXml, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'sitemap_index.xml'), sitemapIndexXml, 'utf8');

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap-stories.xml'), sitemapStoriesXml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'sitemap-main.xml'), sitemapMainXml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapIndexXml, 'utf8');
    fs.writeFileSync(path.join(distDir, 'sitemap_index.xml'), sitemapIndexXml, 'utf8');
  }

  console.log(
    `[Sitemap Generator] Total stories: ${stories.length} | From updatedAt: ${countFromUpdatedAt} | Fallback createdAt: ${countFromCreatedAt} | Lacking both: ${countMissingBoth}`
  );
}

generateSitemaps();
