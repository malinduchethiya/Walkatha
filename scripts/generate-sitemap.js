import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate } from 'firebase/firestore';

const SITE_URL = 'https://www.walkathawa.site';
const NOW_MS = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

const PRIMARY_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDWIC_GSMIOliCrhHKPgZgNUAZKUZ96nh4',
  authDomain: 'walkathawa-93f80.firebaseapp.com',
  projectId: 'walkathawa-93f80',
  storageBucket: 'walkathawa-93f80.firebasestorage.app',
  messagingSenderId: '575596307575',
  appId: '1:575596307575:web:daf2ef013ba17b53745272',
};

const DEFAULT_CATEGORIES = [
  { id: 'wife', slug: 'wife', sinhalaName: 'වයිෆ් / බිරිඳ කතා', name: 'Wife Stories' },
  { id: 'akka-malli', slug: 'akka-malli', sinhalaName: 'අක්කා - මල්ලි කතා', name: 'Akka Malli' },
  { id: 'nanda', slug: 'nanda', sinhalaName: 'නැන්දා / ඇන්ටි කතා', name: 'Aunty Stories' },
  { id: 'school', slug: 'school', sinhalaName: 'පාසල් සහ කැම්පස් කතා', name: 'School & Campus' },
  { id: 'romantic', slug: 'romantic', sinhalaName: 'ආදර සහ රස කතා', name: 'Romantic Stories' },
];

const STATIC_SITE_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/categories', changefreq: 'weekly', priority: '0.8' },
  { path: '/popular', changefreq: 'daily', priority: '0.8' },
  { path: '/archives', changefreq: 'daily', priority: '0.7' },
  { path: '/sitemap', changefreq: 'weekly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/page/privacy-policy', changefreq: 'monthly', priority: '0.4' },
  { path: '/page/terms-and-conditions', changefreq: 'monthly', priority: '0.4' },
  { path: '/page/send-your-story', changefreq: 'monthly', priority: '0.5' },
  { path: '/page/disclaimer', changefreq: 'monthly', priority: '0.4' },
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

function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function fetchFromFirestore() {
  const stories = [];
  const categories = [];
  const appName = 'sitemap-generator';
  let app = getApps().find((a) => a.name === appName);
  if (!app) {
    app = initializeApp(PRIMARY_FIREBASE_CONFIG, appName);
  }
  const db = getFirestore(app);

  try {
    const [storiesSnap, catsSnap] = await Promise.all([
      withTimeout(getDocs(collection(db, 'stories')), 8000),
      withTimeout(getDocs(collection(db, 'categories')), 8000),
    ]);

    if (storiesSnap) {
      storiesSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        stories.push({
          ...data,
          id: stripZW(data.id || docSnap.id),
          slug: stripZW(data.slug || data.id || docSnap.id),
          title: stripZW(data.title || 'සිංහල කතාව'),
        });
      });
    }

    if (catsSnap) {
      catsSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        categories.push({
          ...data,
          id: stripZW(data.id || docSnap.id),
          slug: stripZW(data.slug || data.id || docSnap.id),
        });
      });
    }
  } catch (err) {
    console.warn('[Sitemap Generator] Firestore fetch skipped:', err?.message || err);
  } finally {
    try {
      await terminate(db);
    } catch {
      // ignore
    }
  }

  return { stories, categories };
}

function parseFallbackStoriesFromXml() {
  const candidates = [
    path.resolve(process.cwd(), 'public', 'sitemap-stories.xml'),
    path.resolve(process.cwd(), 'public', 'sitemap.xml'),
  ];
  for (const xmlPath of candidates) {
    try {
      if (!fs.existsSync(xmlPath)) continue;
      const xml = fs.readFileSync(xmlPath, 'utf8');
      if (!xml.includes('/story/')) continue;
      const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
      const parsed = [];
      for (const block of urlBlocks) {
        const locMatch = block.match(/<loc>(.*?)<\/loc>/);
        if (!locMatch || !locMatch[1].includes('/story/')) continue;
        const slugPart = locMatch[1].split('/story/')[1];
        if (!slugPart) continue;
        const lastmodMatch = block.match(/<lastmod>(.*?)<\/lastmod>/);
        const imgLocMatch = block.match(/<image:loc>(.*?)<\/image:loc>/);
        const imgTitleMatch = block.match(/<image:title>(.*?)<\/image:title>/);
        parsed.push({
          id: decodeURIComponent(slugPart),
          slug: decodeURIComponent(slugPart),
          title: imgTitleMatch ? imgTitleMatch[1] : decodeURIComponent(slugPart),
          coverImage: imgLocMatch ? imgLocMatch[1].replace(/&amp;/g, '&') : '',
          updatedAt: lastmodMatch ? lastmodMatch[1] : undefined,
        });
      }
      if (parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }
  return [];
}

async function loadStore() {
  const syncPath = path.resolve(process.cwd(), 'server-data', 'firestore-sync.json');
  let syncStories = [];
  let syncCats = [];

  try {
    if (fs.existsSync(syncPath)) {
      const parsed = JSON.parse(fs.readFileSync(syncPath, 'utf8'));
      if (Array.isArray(parsed.stories)) syncStories = parsed.stories;
      if (Array.isArray(parsed.categories)) syncCats = parsed.categories;
    }
  } catch (err) {
    console.error('Error reading firestore-sync.json:', err);
  }

  const live = await fetchFromFirestore();
  let combinedRawStories = [...live.stories, ...syncStories];
  if (combinedRawStories.length === 0) {
    combinedRawStories = parseFallbackStoriesFromXml();
  }

  const seenSlugs = new Set();
  const stories = [];
  for (const s of combinedRawStories) {
    if (!s || s.isDeleted || s.deleted || s.published === false) continue;
    const rawSlug = stripZW(s.slug || s.id);
    if (!rawSlug) continue;
    const key = encodeSlug(rawSlug).toLowerCase();
    if (!seenSlugs.has(key)) {
      seenSlugs.add(key);
      stories.push({
        ...s,
        slug: rawSlug,
        title: stripZW(s.title),
      });
    }
  }

  stories.sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.uploadDate || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.uploadDate || b.createdAt || 0).getTime();
    return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
  });

  const catMap = new Map();
  for (const def of DEFAULT_CATEGORIES) {
    catMap.set(def.slug.toLowerCase(), def);
  }
  for (const c of [...syncCats, ...live.categories]) {
    if (!c || c.isDeleted || c.deleted) continue;
    const slug = stripZW(c.slug || c.id);
    if (!slug || slug.toLowerCase() === 'all') continue;
    catMap.set(slug.toLowerCase(), { ...c, slug });
  }

  return { stories, categories: Array.from(catMap.values()) };
}

async function generateSitemaps() {
  const { stories, categories } = await loadStore();

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

  const topLastmod = latestStoryMod || new Date().toISOString();

  const pageEntries = [
    ...STATIC_SITE_PAGES.map((p) => ({
      loc: `${SITE_URL}${p.path}`,
      lastmod: topLastmod,
      changefreq: p.changefreq,
      priority: p.priority,
    })),
    ...categories.map((c) => ({
      loc: `${SITE_URL}/category/${encodeSlug(c.slug || c.id)}`,
      lastmod: topLastmod,
      changefreq: 'daily',
      priority: '0.8',
    })),
  ].map((u) =>
    [
      '  <url>',
      `    <loc>${escapeXml(u.loc)}</loc>`,
      `    <lastmod>${escapeXml(u.lastmod)}</lastmod>`,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      '  </url>',
    ].join('\n')
  );

  // Single unified sitemap.xml containing all pages, categories, and stories for Google Search Console
  const unifiedSitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...pageEntries,
    ...storyEntries,
    '</urlset>',
    '',
  ].join('\n');

  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const legacySitemapFiles = [
    'sitemap_index.xml',
    'sitemap-main.xml',
    'sitemap-stories.xml',
    'sitemap2.xml',
    'sitmap.xml',
  ];

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), unifiedSitemapXml, 'utf8');
  for (const legacyFile of legacySitemapFiles) {
    const legacyPath = path.join(publicDir, legacyFile);
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
    }
  }

  // Generate lightweight /api-data/catalog.json + /api-data/chunks/chunk-N.json
  const CHUNK_SIZE = 105;
  const apiDataDir = path.join(publicDir, 'api-data');
  const chunksDir = path.join(apiDataDir, 'chunks');
  fs.mkdirSync(chunksDir, { recursive: true });

  const fullChunkStories = stories.map((s, idx) => ({
    ...s,
    fullContent: s.fullContent || s.content || '',
    content: s.fullContent || s.content || '',
    chunkIndex: Math.floor(idx / CHUNK_SIZE),
  }));

  const lightweightCatalogStories = fullChunkStories.map(({ fullContent, content, ...meta }) => ({
    ...meta,
    chunkIndex: meta.chunkIndex,
  }));

  const catalogJsonStr = JSON.stringify({ stories: lightweightCatalogStories, categories });
  fs.writeFileSync(path.join(apiDataDir, 'catalog.json'), catalogJsonStr, 'utf8');

  const totalChunks = Math.ceil(fullChunkStories.length / CHUNK_SIZE);
  for (let c = 0; c < totalChunks; c++) {
    const slice = fullChunkStories.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
    fs.writeFileSync(
      path.join(chunksDir, `chunk-${c}.json`),
      JSON.stringify({ chunkIndex: c, stories: slice }),
      'utf8'
    );
  }

  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), unifiedSitemapXml, 'utf8');
    for (const legacyFile of legacySitemapFiles) {
      const legacyPath = path.join(distDir, legacyFile);
      if (fs.existsSync(legacyPath)) {
        fs.unlinkSync(legacyPath);
      }
    }

    const distApiDataDir = path.join(distDir, 'api-data');
    const distChunksDir = path.join(distApiDataDir, 'chunks');
    fs.mkdirSync(distChunksDir, { recursive: true });
    fs.writeFileSync(path.join(distApiDataDir, 'catalog.json'), catalogJsonStr, 'utf8');
    for (let c = 0; c < totalChunks; c++) {
      const slice = fullChunkStories.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
      fs.writeFileSync(
        path.join(distChunksDir, `chunk-${c}.json`),
        JSON.stringify({ chunkIndex: c, stories: slice }),
        'utf8'
      );
    }
  }

  const totalUrls = pageEntries.length + storyEntries.length;
  console.log(
    `[Unified Sitemap Generator] Total URLs in sitemap.xml: ${totalUrls} (${pageEntries.length} pages/categories + ${stories.length} stories) | Chunks: ${totalChunks} | From updatedAt: ${countFromUpdatedAt} | Fallback createdAt: ${countFromCreatedAt} | Lacking both: ${countMissingBoth}`
  );
  process.exit(0);
}

generateSitemaps().catch((err) => {
  console.error('[Unified Sitemap Generator Error]:', err);
  process.exit(1);
});
