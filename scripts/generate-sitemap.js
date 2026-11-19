import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate } from 'firebase/firestore';

const SITE_URL = 'https://walkathawa.com';
const MAX_URLS_PER_SITEMAP = 45000;
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

const CANONICAL_ROBOTS_TXT = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /cgi-bin/',
  '',
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  '',
].join('\n');

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
  if (!raw) return null;
  if (typeof raw === 'object' && typeof raw.toDate === 'function') {
    const d = raw.toDate();
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof raw === 'object' && typeof raw.seconds === 'number') {
    const d = new Date(raw.seconds * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof raw !== 'string') return null;
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

function isPublishableStory(story) {
  if (!story || typeof story !== 'object') return false;
  if (story.isDeleted || story.deleted) return false;
  if (story.published === false) return false;
  if (story.private === true || story.isPrivate === true || story.noindex === true) return false;
  const status = String(story.status || '').toLowerCase();
  if (status === 'draft' || status === 'unpublished' || status === 'private' || status === 'deleted') {
    return false;
  }
  return true;
}

function withTimeout(promise, ms = 12000) {
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
      withTimeout(getDocs(collection(db, 'stories')), 12000),
      withTimeout(getDocs(collection(db, 'categories')), 12000),
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

function parseFallbackStoriesFromCatalog() {
  const apiDataDir = path.resolve(process.cwd(), 'public', 'api-data');
  const catalogPath = path.join(apiDataDir, 'catalog.json');
  try {
    if (!fs.existsSync(catalogPath)) return { stories: [], categories: [] };
    const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const byId = new Map();
    for (const s of Array.isArray(raw.stories) ? raw.stories : []) {
      if (s && (s.id || s.slug)) byId.set(String(s.id || s.slug), { ...s });
    }
    const chunksDir = path.join(apiDataDir, 'chunks');
    if (fs.existsSync(chunksDir)) {
      for (const f of fs.readdirSync(chunksDir).filter((n) => n.endsWith('.json')).sort()) {
        try {
          const chunkRaw = JSON.parse(fs.readFileSync(path.join(chunksDir, f), 'utf8'));
          for (const cs of Array.isArray(chunkRaw.stories) ? chunkRaw.stories : []) {
            if (cs && (cs.id || cs.slug)) {
              const k = String(cs.id || cs.slug);
              byId.set(k, { ...(byId.get(k) || {}), ...cs });
            }
          }
        } catch {
          // ignore corrupted chunk
        }
      }
    }
    return {
      stories: Array.from(byId.values()),
      categories: Array.isArray(raw.categories) ? raw.categories : [],
    };
  } catch {
    return { stories: [], categories: [] };
  }
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
  // Prefer live Firestore as source of truth when reachable so deleted/unpublished stories are excluded
  let combinedRawStories = [];
  let combinedRawCats = [];

  if (live.stories.length > 0) {
    combinedRawStories = live.stories;
    combinedRawCats = live.categories.length > 0 ? live.categories : syncCats;
  } else if (syncStories.length > 0) {
    combinedRawStories = syncStories;
    combinedRawCats = syncCats;
  } else {
    const fallback = parseFallbackStoriesFromCatalog();
    combinedRawStories = fallback.stories;
    combinedRawCats = fallback.categories;
  }

  const seenSlugs = new Set();
  const stories = [];
  for (const s of combinedRawStories) {
    if (!isPublishableStory(s)) continue;
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
  for (const c of combinedRawCats) {
    if (!c || c.isDeleted || c.deleted || c.private === true) continue;
    const slug = stripZW(c.slug || c.id);
    if (!slug || slug.toLowerCase() === 'all') continue;
    catMap.set(slug.toLowerCase(), { ...c, slug });
  }

  return {
    stories,
    categories: Array.from(catMap.values()),
    source: live.stories.length > 0 ? 'firestore-live' : 'local-fallback',
  };
}

function buildUrlsetXml(urlBlocks) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urlBlocks,
    '</urlset>',
    '',
  ].join('\n');
}

function buildSitemapIndexXml(shardFiles, lastmodIso) {
  const entries = shardFiles.map((fileName) =>
    [
      '  <sitemap>',
      `    <loc>${escapeXml(`${SITE_URL}/${fileName}`)}</loc>`,
      `    <lastmod>${escapeXml(lastmodIso)}</lastmod>`,
      '  </sitemap>',
    ].join('\n')
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</sitemapindex>',
    '',
  ].join('\n');
}

function writeSitemapFilesToDir(targetDir, allUrlBlocks, topLastmod) {
  const legacySitemapFiles = [
    'sitemap_index.xml',
    'sitemap-main.xml',
    'sitemap-stories.xml',
    'sitemap2.xml',
    'sitmap.xml',
  ];

  // Clean legacy files and stale numbered shards
  for (const file of fs.readdirSync(targetDir)) {
    if (legacySitemapFiles.includes(file) || /^sitemap-\d+\.xml$/.test(file)) {
      fs.unlinkSync(path.join(targetDir, file));
    }
  }

  if (allUrlBlocks.length > MAX_URLS_PER_SITEMAP) {
    const shardFiles = [];
    for (let i = 0; i < allUrlBlocks.length; i += MAX_URLS_PER_SITEMAP) {
      const shardIdx = shardFiles.length + 1;
      const shardName = `sitemap-${shardIdx}.xml`;
      const shardXml = buildUrlsetXml(allUrlBlocks.slice(i, i + MAX_URLS_PER_SITEMAP));
      fs.writeFileSync(path.join(targetDir, shardName), shardXml, 'utf8');
      shardFiles.push(shardName);
    }
    const indexXml = buildSitemapIndexXml(shardFiles, topLastmod);
    fs.writeFileSync(path.join(targetDir, 'sitemap.xml'), indexXml, 'utf8');
    return { mode: 'sitemapindex', shardCount: shardFiles.length };
  }

  const unifiedXml = buildUrlsetXml(allUrlBlocks);
  fs.writeFileSync(path.join(targetDir, 'sitemap.xml'), unifiedXml, 'utf8');
  return { mode: 'urlset', shardCount: 1 };
}

async function generateSitemaps() {
  const { stories, categories, source } = await loadStore();

  let countFromUpdatedAt = 0;
  let countFromCreatedAt = 0;
  let countMissingBoth = 0;
  let latestStoryMod = null;

  const seenLocs = new Set();
  const storyEntries = [];

  for (const story of stories) {
    const encoded = encodeSlug(story.slug);
    const loc = `${SITE_URL}/story/${encoded}`;
    if (seenLocs.has(loc)) continue;
    seenLocs.add(loc);

    const { lastmod, source: modSource } = resolveStoryLastmod(story);

    if (modSource === 'updatedAt') countFromUpdatedAt++;
    else if (modSource === 'createdAt') countFromCreatedAt++;
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
    storyEntries.push(lines.join('\n'));
  }

  const topLastmod = latestStoryMod || new Date().toISOString();
  const pageEntries = [];

  const staticAndCategoryItems = [
    ...STATIC_SITE_PAGES.map((p) => ({
      loc: p.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${p.path}`,
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
  ];

  for (const u of staticAndCategoryItems) {
    if (seenLocs.has(u.loc)) continue;
    seenLocs.add(u.loc);
    pageEntries.push(
      [
        '  <url>',
        `    <loc>${escapeXml(u.loc)}</loc>`,
        `    <lastmod>${escapeXml(u.lastmod)}</lastmod>`,
        `    <changefreq>${u.changefreq}</changefreq>`,
        `    <priority>${u.priority}</priority>`,
        '  </url>',
      ].join('\n')
    );
  }

  const allUrlBlocks = [...pageEntries, ...storyEntries];

  const publicDir = path.resolve(process.cwd(), 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  const writeSummary = writeSitemapFilesToDir(publicDir, allUrlBlocks, topLastmod);
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), CANONICAL_ROBOTS_TXT, 'utf8');

  // Generate lightweight /api-data/catalog.json + /api-data/chunks/chunk-N.json
  const CHUNK_SIZE = 105;
  const apiDataDir = path.join(publicDir, 'api-data');
  const chunksDir = path.join(apiDataDir, 'chunks');
  fs.mkdirSync(chunksDir, { recursive: true });

  // Clean stale chunk files before writing updated chunks
  for (const file of fs.readdirSync(chunksDir)) {
    if (/^chunk-\d+\.json$/.test(file)) {
      fs.unlinkSync(path.join(chunksDir, file));
    }
  }

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

  const catalogJsonStr = JSON.stringify({
    generatedAt: new Date().toISOString(),
    origin: SITE_URL,
    stories: lightweightCatalogStories,
    categories,
  });
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
    writeSitemapFilesToDir(distDir, allUrlBlocks, topLastmod);
    fs.writeFileSync(path.join(distDir, 'robots.txt'), CANONICAL_ROBOTS_TXT, 'utf8');

    const distApiDataDir = path.join(distDir, 'api-data');
    const distChunksDir = path.join(distApiDataDir, 'chunks');
    fs.mkdirSync(distChunksDir, { recursive: true });
    for (const file of fs.readdirSync(distChunksDir)) {
      if (/^chunk-\d+\.json$/.test(file)) {
        fs.unlinkSync(path.join(distChunksDir, file));
      }
    }
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

  console.log(
    `[Sitemap Generator] Origin: ${SITE_URL} | Source: ${source} | Mode: ${writeSummary.mode} | Total URLs: ${allUrlBlocks.length} (${pageEntries.length} pages/categories + ${storyEntries.length} stories) | Chunks: ${totalChunks} | updatedAt: ${countFromUpdatedAt} | createdAt: ${countFromCreatedAt} | none: ${countMissingBoth}`
  );
  process.exit(0);
}

generateSitemaps().catch((err) => {
  console.error('[Sitemap Generator Error]:', err);
  process.exit(1);
});
