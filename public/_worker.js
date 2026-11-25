/**
 * Walkathawa Cloudflare Pages Worker (public/_worker.js)
 *
 * Responsibilities:
 * 1. Single-hop 301 canonical redirects (old domains, www, http, slashes, legacy paths)
 * 2. Canonical /robots.txt serving https://www.walkathawa.site/sitemap.xml
 * 3. Live Firestore-synced /sitemap.xml (edge-cached 5m, static fallback, auto sitemap-index >45k URLs)
 * 4. Live SSR HTML for published stories, categories, and pages + real HTTP 404 for missing/deleted routes
 * 5. Authenticated POST /api/trigger-rebuild (Firebase ID token verified, purges edge cache, optional CF_DEPLOY_HOOK_URL)
 */

const SITE_ORIGIN = 'https://www.walkathawa.site';
const SITE_HOSTNAME = 'www.walkathawa.site';
const SITE_NAME = 'Walkathawa';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icon.png`;
const FIREBASE_PROJECT_ID = 'walkathawa-93f80';
const FIREBASE_API_KEY = 'AIzaSyDWIC_GSMIOliCrhHKPgZgNUAZKUZ96nh4';
const DEFAULT_ADMIN_EMAIL = 'merlinfiverr0@gmail.com';
const MAX_URLS_PER_SITEMAP = 45000;
const BULK_MIGRATION_PREFIX = '2026-11-09T12:0';

const LEGACY_HOSTS = new Set([
  'walkathawa.site',
  'walkathawa.com',
  'www.walkathawa.com',
  'walakatha.com',
  'www.walakatha.com',
]);

const PRODUCTION_HOSTS = new Set([SITE_HOSTNAME, ...LEGACY_HOSTS]);

const BOT_UA_PATTERN =
  /googlebot|google-inspectiontool|googleother|adsbot-google|mediapartners-google|apis-google|storebot-google|bingbot|msnbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|applebot|twitterbot|linkedinbot|pinterest|whatsapp|telegrambot|discordbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|perplexitybot|oai-searchbot|chrome-lighthouse|pagespeed|gtmetrix|headlesschrome|lighthouse/i;

const DEFAULT_CATEGORIES = [
  { id: 'අම්මා-පුතා', slug: 'අම්මා-පුතා', name: 'අම්ම පුතා (Amma Wal Katha)', sinhalaName: 'අම්ම පුතා', description: 'අලුත්ම amma wal katha, අම්ම පුතා (ammai puthai) කතා සහ sinhala wal katha එකතුව.' },
  { id: 'wife', slug: 'wife', name: 'වයිෆ් හෝ GF (Wife Wal Katha)', sinhalaName: 'වයිෆ් හෝ GF', description: 'අලුත්ම wife wal katha, wife gf (වයිෆ් හෝ GF) සහ විවාහක sinhala wal katha එකතුව.' },
  { id: 'thaththa-duwa', slug: 'thaththa-duwa', name: 'පියා සහ දියණියෝ (Thaththa Duwa)', sinhalaName: 'පියා සහ දියණියෝ', description: 'අලුත්ම thaththa duwa, thaththa wal katha (පියා සහ දියණියෝ) සහ sinhala wal katha එකතුව.' },
  { id: 'akka-malli', slug: 'akka-malli', name: 'ලොකු අක්කා (Akka Wal Katha)', sinhalaName: 'ලොකු අක්කා / අක්කා මල්ලි', description: 'නවතම akka wal katha, akkagen sapa, ලොකු අක්කා සහ sahodhara sohadhari (අක්කා මල්ලි) කතා.' },
  { id: 'nanda', slug: 'nanda', name: 'නෑනා / නැන්දා (Nana Wal Katha)', sinhalaName: 'නෑනා / නැන්දා', description: 'හොඳම nana wal katha, pawule an aya (නෑනා සහ නැන්දා) සහ අලුත්ම sinhala wela katha.' },
  { id: 'ඇන්ටි-පුතා', slug: 'ඇන්ටි-පුතා', name: 'ඇන්ටි පුතා (Aunty Wal Katha)', sinhalaName: 'ඇන්ටි පුතා', description: 'අලුත්ම aunty wal katha, ඇන්ටි පුතා, wadimahal bala සහ uncle තේමා රැගත් sinhala wal katha.' },
  { id: 'school', slug: 'school', name: 'පාසල් / ගුරු (Teacher Wal Katha)', sinhalaName: 'පාසල් / ගුරු', description: 'නවතම teacher wal katha, model wal katha, campus, hostel සහ bus wal katha එකතුව.' },
  { id: 'spa-katha', slug: 'spa-katha', name: 'ස්පා කතා (Spa Kathawa)', sinhalaName: 'ස්පා කතා', description: 'අලුත්ම spa kathawa, spa katha, මසාජ් අත්දැකීම් සහ real story (ඇත්ත සීන් එකක්) කතා.' },
  { id: 'lesbian', slug: 'lesbian', name: 'සමලිංගික (Samalingika)', sinhalaName: 'සමලිංගික කතා', description: 'අලුත්ම samalingika (සමලිංගික) කතා, lesbian wal katha සහ sinhala wela katha එකතුව.' },
  { id: 'වටේ-යාම', slug: 'වටේ-යාම', name: 'වටේ යාම (Threesome & Walle Kathawa)', sinhalaName: 'වටේ යාම', description: 'අලුත්ම threesome wal katha, walle kathawa, wife sharing සහ වටේ යාම sinhala wal katha.' },
  { id: 'romantic', slug: 'romantic', name: 'ආදර කතා (Sinhala Sex Katha)', sinhalaName: 'ආදර සහ රස කතා', description: 'ආදර හා හැඟීම්බර sinhala sex katha, sinhala sex stories, real story සහ jil katha එකතුව.' },
];

const CATEGORY_THEME_PATTERNS = {
  'අම්මා-පුතා': /(amma|අම්ම|මව|putha|පුතා)/i,
  wife: /(wife|වයිෆ්|බිරිඳ|බිරින්ද|gf|girlfriend|කෙල්ල|couple|ජෝඩු|husband)/i,
  'thaththa-duwa': /(thaththa|තාත්ත|පියා|duwa|දුව|දියණි|bappa|බාප්ප)/i,
  'akka-malli': /(akka|අක්ක|නංගි|nangi|මල්ලි|malli|සහෝදර|sahodhara)/i,
  nanda: /(nanda|නැන්ද|nana|නෑන|පවුල|pawul|මාමා|mama)/i,
  'ඇන්ටි-පුතා': /(aunty|ඇන්ටි|anti|අන්කල්|uncle)/i,
  school: /(school|පාසල්|ඉස්කෝල|teacher|ටීච|මැඩම්|madam|campus|කැම්පස්|hostel|හොස්ටල්|model|ක්ලාස්|class)/i,
  'spa-katha': /(spa|ස්පා|massage|මසාජ්)/i,
  lesbian: /(lesbian|සමලිංගික|samalingika|ලෙස්බියන්)/i,
  'වටේ-යාම': /(වටේ|wate|cuckold|threesome|ත්‍රීසම්|ජෝඩු මාරු|sharing|වල්ලෙ|walle)/i,
  romantic: /(romantic|ආදර|love|රස|sex katha|real|ඇත්ත)/i,
};

function storyMatchesCategory(story, rawCatSlug) {
  let catLower = stripZW(rawCatSlug).toLowerCase();
  try {
    catLower = stripZW(decodeURIComponent(catLower)).toLowerCase();
  } catch {
    // ignore
  }
  const sCat = stripZW(story.category).toLowerCase();
  const sCatId = stripZW(story.categoryId).toLowerCase();
  const sCatName = stripZW(story.categoryName).toLowerCase();
  const sTags = Array.isArray(story.tags) ? story.tags.map((t) => stripZW(t).toLowerCase()) : [];
  if (
    sCat === catLower ||
    sCatId === catLower ||
    (catLower.length > 2 && sCatName.includes(catLower)) ||
    sTags.includes(catLower)
  ) {
    return true;
  }
  const rx = CATEGORY_THEME_PATTERNS[catLower];
  if (rx) {
    const text = `${story.title || ''} ${story.slug || ''} ${story.shortDescription || story.description || ''} ${sTags.join(' ')}`;
    return rx.test(text);
  }
  return false;
}

const VALID_CANONICAL_CATEGORIES = new Set([
  'අම්මා-පුතා',
  'wife',
  'thaththa-duwa',
  'akka-malli',
  'nanda',
  'ඇන්ටි-පුතා',
  'school',
  'spa-katha',
  'lesbian',
  'වටේ-යාම',
  'romantic',
]);

const CATEGORY_SLUG_ALIASES_DECODED = {
  amma: 'අම්මා-පුතා',
  'amma-wal-katha': 'අම්මා-පුතා',
  'ammai-puthai': 'අම්මා-පුතා',
  'thaththa-wal-katha': 'thaththa-duwa',
  'akka-wal-katha': 'akka-malli',
  'akkagen-sapa': 'akka-malli',
  'sahodhara-sohadhari': 'akka-malli',
  'අක්කා-මල්ලි': 'akka-malli',
  'wife-wal-katha': 'wife',
  'wife-gf': 'wife',
  'වයිෆ්-බිරිඳ': 'wife',
  office: 'wife',
  'nana-wal-katha': 'nanda',
  'pawule-an-aya': 'nanda',
  'aunty-wal-katha': 'ඇන්ටි-පුතා',
  'wadimahal-bala': 'ඇන්ටි-පුතා',
  neighbour: 'ඇන්ටි-පුතා',
  'teacher-wal-katha': 'school',
  'model-wal-katha': 'school',
  'පාසල්-කතා': 'school',
  samalingika: 'lesbian',
  'spa-kathawa': 'spa-katha',
  'threesome-wal-katha': 'වටේ-යාම',
  'walle-kathawa': 'වටේ-යාම',
  'sex-katha': 'romantic',
  'sinhala-sex-katha': 'romantic',
  'ආදර-කතා': 'romantic',
  'ට්-රිප්-ගිහින්': 'romantic',
  'වෙනත්': 'romantic',
};

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

const STATIC_PAGE_CONTENT = {
  '/about': {
    title: 'About Us',
    description: 'Walkathawa (වල් කතාව) — ශ්‍රී ලාංකික පාඨකයන් සඳහා වෙන්වූ සිංහල කතා කියවීමේ වේදිකාව.',
    body: 'Walkathawa යනු ශ්‍රී ලාංකික පාඨකයන් සඳහා වෙන්වූ අන්තර්ජාල සිංහල කතා කියවීමේ වේදිකාවයි.',
  },
  '/contact': {
    title: 'Contact Us',
    description: 'Walkathawa සම්බන්ධයෙන් විමසීම් සහ යෝජනා සඳහා අප හා සම්බන්ධ වන්න.',
    body: 'Walkathawa සම්බන්ධයෙන් ඕනෑම විමසීමක් සඳහා අප හා සම්බන්ධ වන්න: contact@walkathawa.site',
  },
  '/page/privacy-policy': {
    title: 'Privacy Policy',
    description: 'Walkathawa (walkathawa.site) පෞද්ගලිකත්ව ප්‍රතිපත්තිය.',
    body: 'Walkathawa (walkathawa.site) ඔබගේ පෞද්ගලිකත්වයට සහ දත්ත ආරක්ෂාවට ගරු කරයි.',
  },
  '/page/terms-and-conditions': {
    title: 'Terms and Conditions',
    description: 'Walkathawa වෙබ් අඩවිය භාවිතා කිරීමේ නියමයන් සහ කොන්දේසි.',
    body: 'Walkathawa වෙබ් අඩවිය භාවිතා කිරීමේදී වයස අවුරුදු 18+ වීම සහ ප්‍රබන්ධ අන්තර්ගත කොන්දේසි අදාළ වේ.',
  },
  '/page/send-your-story': {
    title: 'Send Your Story',
    description: 'ඔබ විසින් රචිත සිංහල කතා Walkathawa වෙබ් අඩවියට එවන්න.',
    body: 'ඔබ විසින් රචිත නිර්මාණාත්මක සිංහල කතා Walkathawa වෙබ් අඩවියේ පළ කිරීමට stories@walkathawa.site වෙත එවන්න.',
  },
  '/page/disclaimer': {
    title: 'Disclaimer',
    description: 'Walkathawa (walkathawa.site) වගකීම් ප්‍රකාශය.',
    body: 'Walkathawa (walkathawa.site) හි පළවන සියලුම කතා හුදෙක් ප්‍රබන්ධ නිර්මාණ වන අතර සැබෑ පුද්ගලයන් හෝ සිදුවීම් සමඟ සම්බන්ධ නොවේ.',
  },
};

const ROBOTS_TXT_BODY = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /cgi-bin/',
  '',
  `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
  '',
].join('\n');

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

function isBotUserAgent(ua) {
  return Boolean(ua && BOT_UA_PATTERN.test(ua));
}

function decodeSlug(rawSlug) {
  const clean = stripZW(rawSlug);
  if (!clean) return '';
  try {
    return stripZW(decodeURIComponent(clean));
  } catch {
    return clean;
  }
}

function resolveCanonicalCategorySlug(rawCatSlug) {
  const decoded = decodeSlug(rawCatSlug || '').toLowerCase();
  if (!decoded || decoded === 'all') return 'romantic';
  if (CATEGORY_SLUG_ALIASES_DECODED[decoded]) return CATEGORY_SLUG_ALIASES_DECODED[decoded];
  if (VALID_CANONICAL_CATEGORIES.has(decoded)) return decoded;
  return 'romantic';
}

function normalizeCanonicalPath(rawPathname) {
  let target = (rawPathname || '/').replace(/\/{2,}/g, '/');
  if (target.length > 1 && target.endsWith('/')) {
    target = target.slice(0, -1);
  }
  if (/^\/index\.(html?|php)$/i.test(target)) return '/';
  if (/\.html$/i.test(target) && !/^\/google[a-z0-9]+\.html$/i.test(target)) {
    target = target.replace(/\.html$/i, '') || '/';
  }
  if (/^\/(story|posts|katha)\/[^/]+\/amp$/i.test(target)) {
    target = target.replace(/\/amp$/i, '');
  }
  if (target === '/page/1') return '/';
  if (/^\/(popular|archives)\/page\/1$/i.test(target)) return target.replace(/\/page\/1$/i, '');
  if (/^\/category\/[^/]+\/page\/1$/i.test(target)) target = target.replace(/\/page\/1$/i, '');
  if (target === '/posts' || target === '/katha') return '/';
  if (target.startsWith('/posts/')) target = target.replace(/^\/posts\//, '/story/');
  if (target.startsWith('/katha/')) target = target.replace(/^\/katha\//, '/story/');
  if (target.startsWith('/categories/')) target = target.replace(/^\/categories\//, '/category/');
  if (target.startsWith('/collections/')) target = target.replace(/^\/collections\//, '/category/');
  if (
    target === '/profile' ||
    target.startsWith('/profile/') ||
    target.startsWith('/followers/') ||
    target.startsWith('/following/')
  ) {
    return '/';
  }
  if (target === '/archiveposts' || target.startsWith('/archiveposts/')) {
    target = target.replace(/^\/archiveposts/, '/archives');
    if (/^\/archives\/page\/1$/i.test(target)) return '/archives';
  }
  if (target.startsWith('/category/')) {
    const parts = target.split('/');
    const decodedCat = decodeSlug(parts[2] || '').toLowerCase();
    if (!decodedCat || decodedCat === 'all') {
      return '/';
    }
    const mapped = CATEGORY_SLUG_ALIASES_DECODED[decodedCat];
    parts[2] = encodeSlug(mapped || decodedCat);
    target = parts.join('/');
  }
  if (target === '/collections') return '/categories';
  if (target === '/privacy') return '/page/privacy-policy';
  if (target === '/terms') return '/page/terms-and-conditions';
  if (
    target === '/sitemap_index.xml' ||
    target === '/sitemap-main.xml' ||
    target === '/sitemap-stories.xml' ||
    target === '/sitemap2.xml' ||
    target === '/sitmap.xml'
  ) {
    return '/sitemap.xml';
  }
  if (target !== '/') {
    target =
      '/' +
      target
        .split('/')
        .filter(Boolean)
        .map((seg) => encodeSlug(seg))
        .join('/');
  }
  return target || '/';
}

function resolveCanonicalRedirect(url) {
  const host = url.hostname.toLowerCase();
  const isProdHost = PRODUCTION_HOSTS.has(host);
  const needsHostOrProtoRedirect =
    LEGACY_HOSTS.has(host) || (host === SITE_HOSTNAME && url.protocol === 'http:');

  let targetPath = normalizeCanonicalPath(url.pathname);
  const rawQuery = url.search ? url.search.replace(/^\?/, '') : '';
  let targetQuery = '';

  const preservesQuery =
    targetPath === '/search' ||
    targetPath === '/admin' ||
    targetPath.startsWith('/admin/') ||
    targetPath.startsWith('/api/');

  if (rawQuery) {
    if (preservesQuery) {
      targetQuery = rawQuery;
    } else {
      const searchQ = (url.searchParams.get('s') || url.searchParams.get('q') || '').trim();
      if (targetPath === '/' && searchQ) {
        targetPath = '/search';
        targetQuery = `s=${encodeURIComponent(searchQ)}`;
      } else {
        const pageVal = parseInt(url.searchParams.get('page') || '', 10);
        if (!isNaN(pageVal) && pageVal > 1) {
          if (targetPath === '/') {
            targetPath = `/page/${pageVal}`;
          } else if (
            targetPath === '/popular' ||
            targetPath === '/archives' ||
            /^\/category\/[^/]+$/.test(targetPath)
          ) {
            targetPath = `${targetPath}/page/${pageVal}`;
          }
        }
        targetQuery = '';
      }
    }
  }

  const pathChanged = targetPath !== url.pathname;
  const queryChanged = targetQuery !== rawQuery;

  if (!needsHostOrProtoRedirect && !pathChanged && !queryChanged) {
    return null;
  }

  const destinationOrigin = isProdHost ? SITE_ORIGIN : url.origin;
  const querySuffix = targetQuery ? `?${targetQuery}` : '';
  return `${destinationOrigin}${targetPath}${querySuffix}`;
}

function decodeFirestoreValue(val) {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const obj = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = decodeFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function decodeFirestoreDocument(doc) {
  if (!doc || typeof doc !== 'object') return null;
  const docId = String(doc.name || '').split('/').pop() || '';
  const data = {};
  const fields = doc.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = decodeFirestoreValue(v);
  }
  return {
    ...data,
    id: stripZW(data.id || docId),
    slug: stripZW(data.slug || data.id || docId),
    _updateTime: doc.updateTime || null,
    _createTime: doc.createTime || null,
  };
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

function toIsoDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function formatCleanStoryTitle(rawTitle) {
  const cleaned = stripZW(rawTitle).replace(/\s+/g, ' ').trim();
  const suffix = ` | ${SITE_NAME}`;
  const hasCoreKeyword = /(wal\s*katha|wela\s*katha|wala\s*katha|walkatha|වල්\s*කතා)/i.test(cleaned);
  const withKeyword = hasCoreKeyword ? `${cleaned}${suffix}` : `${cleaned} — Wal Katha${suffix}`;
  if (withKeyword.length <= 65) return withKeyword;
  if (cleaned.length + suffix.length <= 65) return `${cleaned}${suffix}`;
  return `${cleaned.slice(0, Math.max(12, 62 - suffix.length)).trim()}...${suffix}`;
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

function getEdgeCache() {
  try {
    return typeof caches !== 'undefined' && caches.default ? caches.default : null;
  } catch {
    return null;
  }
}

async function fetchFirestoreCollection(collectionName) {
  const docs = [];
  let pageToken = '';
  const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionName}`;

  for (let page = 0; page < 20; page++) {
    const query = pageToken
      ? `?pageSize=300&pageToken=${encodeURIComponent(pageToken)}`
      : '?pageSize=300';
    const res = await fetch(`${base}${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) break;
    const json = await res.json();
    if (Array.isArray(json.documents)) {
      for (const d of json.documents) {
        const decoded = decodeFirestoreDocument(d);
        if (decoded) docs.push(decoded);
      }
    }
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  return docs;
}

async function fetchLiveStoreCached(env, ctx) {
  const cache = getEdgeCache();
  const cacheKey = new Request(`${SITE_ORIGIN}/__internal_live_store_v1`);
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      try {
        return await cached.json();
      } catch {
        // ignore corrupted cache entry
      }
    }
  }

  try {
    const [rawStories, rawCategories] = await Promise.all([
      fetchFirestoreCollection('stories'),
      fetchFirestoreCollection('categories'),
    ]);

    if (rawStories.length > 0) {
      const seen = new Set();
      const stories = [];
      for (const s of rawStories) {
        if (!isPublishableStory(s)) continue;
        const slug = stripZW(s.slug || s.id);
        if (!slug) continue;
        const key = encodeSlug(slug).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        stories.push({ ...s, slug, title: stripZW(s.title || slug) });
      }
      stories.sort((a, b) => {
        const aT = new Date(a.updatedAt || a.uploadDate || a.createdAt || a._updateTime || 0).getTime();
        const bT = new Date(b.updatedAt || b.uploadDate || b.createdAt || b._updateTime || 0).getTime();
        return (isNaN(bT) ? 0 : bT) - (isNaN(aT) ? 0 : aT);
      });

      const catMap = new Map();
      for (const def of DEFAULT_CATEGORIES) catMap.set(def.slug.toLowerCase(), def);
      for (const c of rawCategories) {
        if (!c || c.isDeleted || c.deleted || c.private === true) continue;
        const slug = stripZW(c.slug || c.id);
        if (!slug || slug.toLowerCase() === 'all') continue;
        catMap.set(slug.toLowerCase(), { ...c, slug });
      }

      const payload = { stories, categories: Array.from(catMap.values()), source: 'firestore' };
      if (cache) {
        const cacheResp = new Response(JSON.stringify(payload), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=120',
          },
        });
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(cache.put(cacheKey, cacheResp));
        } else {
          await cache.put(cacheKey, cacheResp);
        }
      }
      return payload;
    }
  } catch {
    // Fall back to static build catalog below
  }

  // Fallback to static build-time catalog.json from ASSETS
  if (env && env.ASSETS) {
    try {
      const catResp = await env.ASSETS.fetch(new Request(`${SITE_ORIGIN}/api-data/catalog.json`));
      if (catResp.ok) {
        const data = await catResp.json();
        return {
          stories: Array.isArray(data.stories) ? data.stories : [],
          categories:
            Array.isArray(data.categories) && data.categories.length > 0
              ? data.categories
              : DEFAULT_CATEGORIES,
          source: 'static-catalog',
        };
      }
    } catch {
      // ignore
    }
  }

  return { stories: [], categories: DEFAULT_CATEGORIES, source: 'empty' };
}

function buildOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
  };
}

function safeJsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildPageHref(baseRoute, pageNum) {
  if (pageNum <= 1) return baseRoute === '/' ? '/' : baseRoute;
  return baseRoute === '/' ? `/page/${pageNum}` : `${baseRoute}/page/${pageNum}`;
}

function buildPageAbsoluteUrl(baseRoute, pageNum) {
  const rel = buildPageHref(baseRoute, pageNum);
  return rel === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${rel}`;
}

function buildSiteNavHtml(categories) {
  const catLinks = (categories || [])
    .map(
      (c) =>
        `<a href="/category/${encodeSlug(c.slug || c.id)}">${escapeHtmlText(
          stripZW(c.sinhalaName || c.name || c.slug)
        )}</a>`
    )
    .join(' ');
  return `<header><nav aria-label="Primary navigation"><a href="/">Walkathawa</a> <a href="/categories">වර්ගීකරණ</a> <a href="/popular">ජනප්‍රිය</a> <a href="/archives">ලේඛනාගාරය</a> <a href="/sitemap">සම්පූර්ණ කතා නාමාවලිය</a></nav><nav aria-label="Categories">${catLinks}</nav></header>`;
}

function buildSiteFooterHtml(categories) {
  const catLinks = (categories || [])
    .map(
      (c) =>
        `<a href="/category/${encodeSlug(c.slug || c.id)}">${escapeHtmlText(
          stripZW(c.sinhalaName || c.name || c.slug)
        )}</a>`
    )
    .join(' ');
  return `<footer><nav aria-label="Footer navigation"><a href="/">Home</a> <a href="/categories">Categories</a> <a href="/popular">Popular</a> <a href="/archives">Archives</a> <a href="/sitemap">Sitemap</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/page/privacy-policy">Privacy</a> <a href="/page/terms-and-conditions">Terms</a> <a href="/page/disclaimer">Disclaimer</a></nav><div>${catLinks}</div></footer>`;
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

function buildCardsShell(
  h1Text,
  storiesSlice,
  prevUrl = null,
  nextUrl = null,
  categories = [],
  baseRoute = '/',
  currentPage = 1,
  totalPages = 1
) {
  const items = storiesSlice
    .map((s) => {
      const slug = encodeSlug(s.slug || s.id);
      return `<article><h2><a href="/story/${slug}">${escapeHtmlText(stripZW(s.title))}</a></h2></article>`;
    })
    .join('\n');
  const nav = [];
  if (prevUrl) nav.push(`<a rel="prev" href="${escapeHtmlAttr(prevUrl)}">Previous</a>`);
  if (totalPages > 1) {
    for (let p = 1; p <= totalPages; p++) {
      nav.push(
        `<a href="${escapeHtmlAttr(buildPageHref(baseRoute, p))}"${
          p === currentPage ? ' aria-current="page"' : ''
        }>${p}</a>`
      );
    }
  }
  if (nextUrl) nav.push(`<a rel="next" href="${escapeHtmlAttr(nextUrl)}">Next</a>`);
  const navHtml = nav.length > 0 ? `\n  <nav aria-label="Pagination">${nav.join(' ')}</nav>` : '';
  return `<div class="ssr-shell">
  ${buildSiteNavHtml(categories)}
  <main>
    <h1>${escapeHtmlText(h1Text)}</h1>
    <div>${items}</div>${navHtml}
  </main>
  ${buildSiteFooterHtml(categories)}
</div>`;
}

function injectIntoTemplate(rawSpaHtml, headOpts, bodyHtml, _isAdmin = false, initialScriptTag = '') {
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
  const assetTags = preservedAssets.length > 0 ? `\n${preservedAssets.join('\n')}` : '';

  return rawSpaHtml
    .replace(/<html[^>]*>/i, '<html lang="si" class="dark">')
    .replace(
      /<head>[\s\S]*?<\/head>/i,
      `<head>\n${buildHead(headOpts)}${assetTags}\n  </head>`
    )
    .replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${bodyHtml}</div>${initialScriptTag}`);
}

async function loadSpaTemplate(env, origin) {
  if (env && env.ASSETS) {
    for (const candidate of ['/_spa.html', '/index.html']) {
      try {
        const res = await env.ASSETS.fetch(new Request(`${origin}${candidate}`));
        if (res.ok) return await res.text();
      } catch {
        // try next
      }
    }
  }
  return '<!DOCTYPE html><html lang="si" class="dark"><head><meta charset="UTF-8"><title>Walkathawa</title></head><body><div id="root"></div></body></html>';
}

async function handleSitemapRequest(request, env, ctx, shardNumber = null) {
  const cache = getEdgeCache();
  const cacheKey = new Request(`${SITE_ORIGIN}${shardNumber ? `/sitemap-${shardNumber}.xml` : '/sitemap.xml'}`);
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const store = await fetchLiveStoreCached(env, ctx);
  if (store.stories.length === 0 && env && env.ASSETS) {
    const staticSitemap = await env.ASSETS.fetch(request);
    if (staticSitemap.ok) return staticSitemap;
  }

  const seenLocs = new Set();
  let latestStoryMod = null;
  const storyBlocks = [];

  const toValidAsciiLoc = (rawUrl) => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.origin !== SITE_ORIGIN) return null;
      const href = parsed.href;
      if (href.length > 2048 || !/^[\x21-\x7E]+$/.test(href)) return null;
      return href;
    } catch {
      return null;
    }
  };

  for (const story of store.stories) {
    const loc = toValidAsciiLoc(`${SITE_ORIGIN}/story/${encodeSlug(story.slug || story.id)}`);
    if (!loc || seenLocs.has(loc)) continue;
    seenLocs.add(loc);

    const rawUpdated = typeof story.updatedAt === 'string' ? story.updatedAt : story.updatedDate;
    const isBulkStamp =
      typeof rawUpdated === 'string' && rawUpdated.startsWith(BULK_MIGRATION_PREFIX);
    const iso =
      (!isBulkStamp ? toIsoDate(rawUpdated) : null) ||
      toIsoDate(story.createdAt || story.uploadDate || story.uploadedDate) ||
      toIsoDate(story._updateTime);
    const lastmod = iso ? iso.slice(0, 10) : null;
    if (lastmod && (!latestStoryMod || lastmod > latestStoryMod)) latestStoryMod = lastmod;

    const lines = ['  <url>', `    <loc>${escapeXml(loc)}</loc>`];
    if (lastmod) lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
    lines.push('  </url>');
    storyBlocks.push(lines.join('\n'));
  }

  const topLastmod = latestStoryMod || new Date().toISOString().slice(0, 10);
  const pageBlocks = [];
  for (const p of STATIC_SITE_PAGES) {
    const loc = toValidAsciiLoc(p.path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${p.path}`);
    if (!loc || seenLocs.has(loc)) continue;
    seenLocs.add(loc);
    pageBlocks.push(
      [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${escapeXml(topLastmod)}</lastmod>`,
        '  </url>',
      ].join('\n')
    );
  }
  for (const c of store.categories) {
    const loc = toValidAsciiLoc(`${SITE_ORIGIN}/category/${encodeSlug(c.slug || c.id)}`);
    if (!loc || seenLocs.has(loc)) continue;
    seenLocs.add(loc);
    pageBlocks.push(
      [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${escapeXml(topLastmod)}</lastmod>`,
        '  </url>',
      ].join('\n')
    );
  }

  const allBlocks = [...pageBlocks, ...storyBlocks];
  let xml = '';

  if (allBlocks.length > MAX_URLS_PER_SITEMAP) {
    const totalShards = Math.ceil(allBlocks.length / MAX_URLS_PER_SITEMAP);
    if (shardNumber) {
      if (shardNumber < 1 || shardNumber > totalShards) {
        return new Response('Sitemap shard not found', { status: 404 });
      }
      const slice = allBlocks.slice(
        (shardNumber - 1) * MAX_URLS_PER_SITEMAP,
        shardNumber * MAX_URLS_PER_SITEMAP
      );
      xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...slice,
        '</urlset>',
        '',
      ].join('\n');
    } else {
      const shardEntries = [];
      for (let i = 1; i <= totalShards; i++) {
        shardEntries.push(
          [
            '  <sitemap>',
            `    <loc>${escapeXml(`${SITE_ORIGIN}/sitemap-${i}.xml`)}</loc>`,
            `    <lastmod>${escapeXml(topLastmod)}</lastmod>`,
            '  </sitemap>',
          ].join('\n')
        );
      }
      xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...shardEntries,
        '</sitemapindex>',
        '',
      ].join('\n');
    }
  } else {
    if (shardNumber) {
      return new Response('Sitemap shard not found', { status: 404 });
    }
    xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...allBlocks,
      '</urlset>',
      '',
    ].join('\n');
  }

  const response = new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      'X-Robots-Tag': 'all',
    },
  });

  if (cache) {
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    } else {
      await cache.put(cacheKey, response.clone());
    }
  }
  return response;
}

async function verifyAdminFirebaseToken(idToken, env) {
  if (!idToken) return false;
  const apiKey = (env && env.FIREBASE_WEB_API_KEY) || FIREBASE_API_KEY;
  const adminEmail = String((env && env.ADMIN_EMAIL) || DEFAULT_ADMIN_EMAIL).toLowerCase();
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return false;
    const data = await res.json();
    const user = Array.isArray(data.users) ? data.users[0] : null;
    return Boolean(user && String(user.email || '').toLowerCase() === adminEmail);
  } catch {
    return false;
  }
}

async function handleTriggerRebuild(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const isAuthorized = await verifyAdminFirebaseToken(token, env);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const cache = getEdgeCache();
  const purged = [];
  if (cache) {
    const keysToPurge = [
      `${SITE_ORIGIN}/__internal_live_store_v1`,
      `${SITE_ORIGIN}/sitemap.xml`,
      `${SITE_ORIGIN}/`,
      `${SITE_ORIGIN}/categories`,
    ];
    if (body && typeof body.slug === 'string' && body.slug.trim()) {
      keysToPurge.push(`${SITE_ORIGIN}/story/${encodeSlug(body.slug)}`);
    }
    if (body && typeof body.category === 'string' && body.category.trim()) {
      keysToPurge.push(`${SITE_ORIGIN}/category/${encodeSlug(body.category)}`);
    }
    for (const k of keysToPurge) {
      await cache.delete(new Request(k));
      purged.push(k);
    }
  }

  // Optional server-side Cloudflare Pages Deploy Hook (rate-limited to 1 trigger / 5 min)
  let deployTriggered = false;
  const deployHookUrl = env && env.CF_DEPLOY_HOOK_URL;
  if (deployHookUrl && typeof deployHookUrl === 'string' && deployHookUrl.startsWith('https://')) {
    const cooldownKey = new Request(`${SITE_ORIGIN}/__internal_deploy_cooldown`);
    const inCooldown = cache ? Boolean(await cache.match(cooldownKey)) : false;
    if (!inCooldown) {
      const triggerPromise = fetch(deployHookUrl, { method: 'POST' }).catch(() => {});
      if (ctx && typeof ctx.waitUntil === 'function') {
        ctx.waitUntil(triggerPromise);
      } else {
        await triggerPromise;
      }
      if (cache) {
        await cache.put(
          cooldownKey,
          new Response('1', { headers: { 'Cache-Control': 'public, max-age=300' } })
        );
      }
      deployTriggered = true;
    }
  }

  return new Response(
    JSON.stringify({
      status: 'ok',
      cachePurged: purged.length,
      deployTriggered,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }
  );
}

function isStaticAssetPath(pathname) {
  if (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/api-data/') ||
    pathname.startsWith('/_prerender/') ||
    pathname.startsWith('/images/') ||
    /^\/google[a-z0-9]+\.html$/i.test(pathname)
  ) {
    return true;
  }
  return /\.(js|mjs|css|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2|ttf|eot|json|txt|xml|map)$/i.test(
    pathname
  );
}

export default {
  async fetch(request, env = {}, ctx = {}) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Authenticated publishing sync endpoint
    if (pathname === '/api/trigger-rebuild' || pathname === '/api/regenerate-sitemap') {
      return handleTriggerRebuild(request, env, ctx);
    }

    if (pathname === '/api/health') {
      return new Response(
        JSON.stringify({ status: 'ok', origin: SITE_ORIGIN, timestamp: new Date().toISOString() }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Single-hop 301 canonical redirects for GET/HEAD
    if ((request.method === 'GET' || request.method === 'HEAD') && !pathname.startsWith('/api/')) {
      const redirectLocation = resolveCanonicalRedirect(url);
      if (redirectLocation) {
        return Response.redirect(redirectLocation, 301);
      }
    }

    // 3. Canonical robots.txt
    if (pathname === '/robots.txt') {
      return new Response(ROBOTS_TXT_BODY, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'X-Robots-Tag': 'all',
        },
      });
    }

    // 4. Live Firestore-synced sitemap.xml (and optional shards)
    if (pathname === '/sitemap.xml') {
      return handleSitemapRequest(request, env, ctx, null);
    }
    const shardMatch = pathname.match(/^\/sitemap-(\d+)\.xml$/);
    if (shardMatch) {
      return handleSitemapRequest(request, env, ctx, parseInt(shardMatch[1], 10));
    }

    // 5. Pass through real static assets directly from Cloudflare ASSETS
    if (isStaticAssetPath(pathname) && env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // 5b. Fast-path: serve prerendered static HTML directly from dist/ ASSETS when no query pagination/search overrides it
    let decodedPath = pathname;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      decodedPath = pathname;
    }
    const normalizedPath = decodedPath.replace(/\/+$/, '') || '/';
    const hasQueryPage = url.searchParams.has('page') && (parseInt(url.searchParams.get('page') || '1', 10) || 1) > 1;
    const isAdminOrSearch =
      normalizedPath === '/admin' ||
      normalizedPath.startsWith('/admin/') ||
      normalizedPath === '/search';

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      !hasQueryPage &&
      !isAdminOrSearch &&
      env &&
      env.ASSETS
    ) {
      const staticHtmlPath = normalizedPath === '/' ? '/index.html' : `${normalizedPath}.html`;
      try {
        const assetRes = await env.ASSETS.fetch(
          new Request(`${url.origin}${encodeURI(staticHtmlPath)}`, { method: request.method })
        );
        if (assetRes && assetRes.ok) {
          const headers = new Headers(assetRes.headers);
          headers.set('Content-Type', 'text/html; charset=utf-8');
          headers.set('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=3600');
          headers.set('X-Content-Type-Options', 'nosniff');
          return new Response(assetRes.body, { status: 200, headers });
        }
      } catch {
        // fall through to live Firestore SSR
      }
    }

    // 6. Dynamic SSR fallback for live newly published stories & real HTTP 404s
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const page = !isNaN(pageParam) && pageParam > 1 ? pageParam : 1;

    const spaTemplate = await loadSpaTemplate(env, url.origin);

    const buildHtmlResponse = (headOpts, bodyHtml, status = 200, isAdmin = false, initialScriptTag = '') => {
      const html = injectIntoTemplate(spaTemplate, headOpts, bodyHtml, isAdmin, initialScriptTag);
      const headers = new Headers({
        'Content-Type': 'text/html; charset=utf-8',
        Vary: 'User-Agent',
        'X-Content-Type-Options': 'nosniff',
      });
      if (headOpts.noIndex || status >= 400 || isAdmin) {
        headers.set('X-Robots-Tag', 'noindex, nofollow');
        headers.set('Cache-Control', 'no-store');
      } else {
        headers.set(
          'Cache-Control',
          'public, max-age=120, s-maxage=300, stale-while-revalidate=3600'
        );
      }
      return new Response(html, { status, headers });
    };

    // 6a. Admin & Utility noindex routes
    if (
      normalizedPath === '/admin' ||
      normalizedPath.startsWith('/admin/') ||
      normalizedPath === '/search' ||
      normalizedPath === '/login' ||
      normalizedPath === '/register' ||
      normalizedPath === '/forgot-password'
    ) {
      const isAdmin = normalizedPath === '/admin' || normalizedPath.startsWith('/admin/');
      const label = isAdmin ? 'Admin' : normalizedPath === '/search' ? 'සෙවුම් ප්‍රතිඵල' : 'Account';
      return buildHtmlResponse(
        {
          title: `${label} | ${SITE_NAME}`,
          description: `${SITE_NAME} ${label}`,
          noIndex: true,
          canonicalUrl: `${SITE_ORIGIN}${normalizedPath}`,
        },
        '',
        200,
        isAdmin
      );
    }

    // 6b. Static content pages (/about, /contact, /page/*)
    if (STATIC_PAGE_CONTENT[normalizedPath]) {
      const info = STATIC_PAGE_CONTENT[normalizedPath];
      const canonicalUrl = `${SITE_ORIGIN}${normalizedPath}`;
      const fullTitle = `${info.title} | ${SITE_NAME}`;
      return buildHtmlResponse(
        {
          title: fullTitle,
          description: info.description,
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
                description: info.description,
                inLanguage: 'si-LK',
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'මුල් පිටුව', item: `${SITE_ORIGIN}/` },
                  { '@type': 'ListItem', position: 2, name: info.title, item: canonicalUrl },
                ],
              },
            ],
          },
        },
        `<div class="ssr-shell"><article><h1>${escapeHtmlText(info.title)}</h1><p>${escapeHtmlText(info.body)}</p></article></div>`,
        200
      );
    }

    const store = await fetchLiveStoreCached(env, ctx);
    const activeStories = store.stories;
    const activeCategories = store.categories;

    // 6c. Story Detail Page: /story/:slug
    if (normalizedPath.startsWith('/story/')) {
      const rawSlug = normalizedPath.replace(/^\/story\//, '').replace(/\/amp$/, '');
      const target = stripZW(rawSlug).toLowerCase();
      const story =
        activeStories.find((s) => {
          const sSlug = stripZW(s.slug).toLowerCase();
          const sId = stripZW(s.id).toLowerCase();
          let sSlugDec = sSlug;
          try {
            sSlugDec = stripZW(decodeURIComponent(String(s.slug || ''))).toLowerCase();
          } catch {
            // ignore
          }
          return sSlug === target || sSlugDec === target || sId === target;
        }) || null;

      if (!story) {
        return buildHtmlResponse(
          {
            title: `404 — Story Not Found | ${SITE_NAME}`,
            description: 'ඔබ සෙවූ කතාව Walkathawa වෙබ් අඩවියෙන් හමු නොවීය.',
            noIndex: true,
            canonicalUrl: null,
          },
          '<div class="ssr-shell"><h1>404 — පිටුව හමු නොවීය</h1><p><a href="/">මුල් පිටුවට යන්න</a></p></div>',
          404
        );
      }

      const canonicalSlug = encodeSlug(story.slug || story.id);
      const requestedEncodedSlug = encodeSlug(rawSlug);
      if (requestedEncodedSlug !== canonicalSlug || normalizedPath.endsWith('/amp')) {
        return Response.redirect(`${SITE_ORIGIN}/story/${canonicalSlug}`, 301);
      }

      const postTitle = stripZW(story.title);
      const cleanTitle = formatCleanStoryTitle(postTitle);
      const bodyText =
        story.fullContent || story.content || story.shortDescription || story.description || postTitle;
      const excerpt = String(bodyText).replace(/\s+/g, ' ').trim().slice(0, 155);
      const canonicalUrl = `${SITE_ORIGIN}/story/${canonicalSlug}`;
      const ogImg =
        story.coverImage && String(story.coverImage).startsWith('http')
          ? String(story.coverImage).trim()
          : DEFAULT_OG_IMAGE;
      const datePublished = toIsoDate(story.createdAt || story.uploadDate || story.uploadedDate || story._createTime);
      const dateModified = toIsoDate(story.updatedAt || story.updatedDate || story._updateTime) || datePublished;
      const wordCount = story.wordCount || String(bodyText).split(/\s+/).length || 950;
      const readingMinutes = story.readingTime || Math.max(3, Math.ceil(wordCount / 180));
      const catSlug = resolveCanonicalCategorySlug(story.category || 'romantic');
      const catObj = DEFAULT_CATEGORIES.find((c) => c.slug === catSlug);
      const catLabel = stripZW(catObj?.sinhalaName || story.categoryName || story.category || 'සිංහල කතා');
      const authorName = stripZW(
        typeof story.author === 'object' && story.author !== null
          ? story.author.name || SITE_NAME
          : story.author || SITE_NAME
      );

      const storyIdx = activeStories.indexOf(story);
      const prevStory = storyIdx > 0 ? activeStories[storyIdx - 1] : null;
      const nextStory = storyIdx >= 0 && storyIdx < activeStories.length - 1 ? activeStories[storyIdx + 1] : null;
      const relatedStories = activeStories
        .filter((s) => s !== story && storyMatchesCategory(s, catSlug))
        .slice(0, 6);

      const paragraphsHtml = splitParagraphs(bodyText)
        .map((p) => `<p data-reading-content>${escapeHtmlText(p)}</p>`)
        .join('\n');

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
      const initialStoryScript = `\n    <script id="__INITIAL_STORY__" type="application/json">${safeJsonForScript({
        story: { ...story, category: catSlug, fullContent: bodyText, content: bodyText },
        prevStory,
        nextStory,
        relatedStories,
      })}</script>`;

      return buildHtmlResponse(
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
  ${buildSiteNavHtml(activeCategories)}
  <main>
    <article>
      <header>
        <nav aria-label="Breadcrumb"><a href="/">මුල් පිටුව</a> / <a href="/category/${encodeSlug(
          catSlug
        )}">${escapeHtmlText(catLabel)}</a></nav>
        <h1>${escapeHtmlText(postTitle)}</h1>
        <span>${escapeHtmlText(authorName)}</span>
      </header>
      <div class="article-body">
        ${paragraphsHtml}
      </div>
      ${adjNavHtml}
      ${relatedHtml}
    </article>
  </main>
  ${buildSiteFooterHtml(activeCategories)}
</div>`,
        200,
        false,
        initialStoryScript
      );
    }

    // 6d. Category Page: /category/:slug and /category/:slug/page/:num
    if (normalizedPath.startsWith('/category/')) {
      const catRest = normalizedPath.replace(/^\/category\//, '').trim();
      const catPageMatch = catRest.match(/^(.+?)\/page\/(\d+)$/);
      const rawCatSlug = (catPageMatch ? catPageMatch[1] : catRest).trim();
      const catPage = catPageMatch ? Math.max(1, parseInt(catPageMatch[2], 10) || 1) : page;
      const decodedCat = stripZW(rawCatSlug).toLowerCase();

      const catObj =
        decodedCat === 'all'
          ? { id: 'all', slug: 'all', name: 'All Stories', sinhalaName: 'සියලුම කතා' }
          : activeCategories.find(
              (c) =>
                stripZW(c.slug).toLowerCase() === decodedCat ||
                stripZW(c.id).toLowerCase() === decodedCat
            ) || null;

      const catStories =
        decodedCat === 'all'
          ? activeStories
          : activeStories.filter((s) => storyMatchesCategory(s, decodedCat));

      if (!catObj && catStories.length === 0) {
        return buildHtmlResponse(
          {
            title: `404 — Category Not Found | ${SITE_NAME}`,
            description: 'ඔබ සෙවූ වර්ගීකරණය Walkathawa වෙබ් අඩවියෙන් හමු නොවීය.',
            noIndex: true,
            canonicalUrl: null,
          },
          '<div class="ssr-shell"><h1>404 — පිටුව හමු නොවීය</h1><p><a href="/categories">වර්ගීකරණ බලන්න</a></p></div>',
          404
        );
      }

      const category = catObj || { id: decodedCat, slug: decodedCat, name: rawCatSlug, sinhalaName: rawCatSlug };
      const totalPages = Math.max(1, Math.ceil(catStories.length / 20));
      const slice = catStories.slice((catPage - 1) * 20, catPage * 20);
      const catLabel = stripZW(category.sinhalaName || category.name || rawCatSlug);
      const title = catPage > 1 ? `${catLabel} — පිටුව ${catPage} | ${SITE_NAME}` : `${catLabel} | ${SITE_NAME}`;
      const description = stripZW(
        category.description || `${catLabel} — සිංහල කතා එකතුව Walkathawa වෙතින් නොමිලේ කියවන්න.`
      ).slice(0, 158);
      const catBaseRoute = `/category/${encodeSlug(category.slug || rawCatSlug)}`;
      const baseCatUrl = `${SITE_ORIGIN}${catBaseRoute}`;
      const canonicalUrl = buildPageAbsoluteUrl(catBaseRoute, catPage);
      const prevUrl = catPage > 1 ? buildPageAbsoluteUrl(catBaseRoute, catPage - 1) : null;
      const nextUrl = catPage < totalPages ? buildPageAbsoluteUrl(catBaseRoute, catPage + 1) : null;

      return buildHtmlResponse(
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
                        position: (catPage - 1) * 20 + idx + 1,
                        name: stripZW(s.title),
                        url: `${SITE_ORIGIN}/story/${encodeSlug(s.slug || s.id)}`,
                      })),
                    },
                  ]
                : []),
            ],
          },
        },
        buildCardsShell(title, slice, prevUrl, nextUrl, activeCategories, catBaseRoute, catPage, totalPages),
        200
      );
    }

    // 6e. Categories Directory: /categories
    if (normalizedPath === '/categories') {
      const canonicalUrl = `${SITE_ORIGIN}/categories`;
      const title = `වර්ගීකරණ | ${SITE_NAME}`;
      const description = 'Walkathawa සිංහල කතා වර්ගීකරණ එකතුව පිරික්සන්න.';
      const catLinks = activeCategories
        .map(
          (c) =>
            `<li><a href="/category/${encodeSlug(c.slug || c.id)}">${escapeHtmlText(
              stripZW(c.sinhalaName || c.name || c.slug)
            )}</a></li>`
        )
        .join('\n');
      return buildHtmlResponse(
        {
          title,
          description,
          canonicalUrl,
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
                  { '@type': 'ListItem', position: 2, name: 'වර්ගීකරණ', item: canonicalUrl },
                ],
              },
            ],
          },
        },
        `<div class="ssr-shell"><h1>${escapeHtmlText(title)}</h1><ul>${catLinks}</ul></div>`,
        200
      );
    }

    // 6f. Popular & Archives (including /popular/page/:num and /archives/page/:num)
    if (
      normalizedPath === '/popular' ||
      /^\/popular\/page\/(\d+)$/.test(normalizedPath) ||
      normalizedPath === '/archives' ||
      normalizedPath === '/archiveposts' ||
      /^\/archives\/page\/(\d+)$/.test(normalizedPath)
    ) {
      const isPopular = normalizedPath.startsWith('/popular');
      const pathPageMatch = normalizedPath.match(/\/page\/(\d+)$/);
      const listPage = pathPageMatch ? Math.max(1, parseInt(pathPageMatch[1], 10) || 1) : page;
      const baseRoute = isPopular ? '/popular' : '/archives';
      const canonicalUrl = buildPageAbsoluteUrl(baseRoute, listPage);
      const sorted = [...activeStories].sort((a, b) =>
        isPopular
          ? (Number(b.views) || 0) - (Number(a.views) || 0)
          : new Date(b.uploadDate || b.createdAt || 0).getTime() -
            new Date(a.uploadDate || a.createdAt || 0).getTime()
      );
      const totalPages = Math.max(1, Math.ceil(sorted.length / 20));
      const slice = sorted.slice((listPage - 1) * 20, listPage * 20);
      const title = isPopular
        ? listPage > 1
          ? `ජනප්‍රිය කතා — පිටුව ${listPage} | ${SITE_NAME}`
          : `ජනප්‍රිය කතා | ${SITE_NAME}`
        : listPage > 1
        ? `ලේඛනාගාරය — පිටුව ${listPage} | ${SITE_NAME}`
        : `ලේඛනාගාරය | ${SITE_NAME}`;
      const description = isPopular
        ? 'Walkathawa වෙබ් අඩවියේ වැඩිපුරම කියවන ජනප්‍රිය සිංහල කතා එකතුව.'
        : 'Walkathawa සිංහල කතා ලේඛනාගාරය — සියලුම කතා එකතුව.';
      const prevUrl = listPage > 1 ? buildPageAbsoluteUrl(baseRoute, listPage - 1) : null;
      const nextUrl = listPage < totalPages ? buildPageAbsoluteUrl(baseRoute, listPage + 1) : null;

      return buildHtmlResponse(
        { title, description, canonicalUrl, prevUrl, nextUrl },
        buildCardsShell(title, slice, prevUrl, nextUrl, activeCategories, baseRoute, listPage, totalPages),
        200
      );
    }

    // 6g. HTML Sitemap Page: /sitemap (ALL stories, no truncation)
    if (normalizedPath === '/sitemap') {
      const canonicalUrl = `${SITE_ORIGIN}/sitemap`;
      const title = `සම්පූර්ණ කතා නාමාවලිය | ${SITE_NAME}`;
      const description = `Walkathawa වෙබ් අඩවියේ සියලුම සිංහල කතා (${activeStories.length}) සහ වර්ගීකරණ එකම පිටුවකින්.`;
      const links = activeStories
        .map(
          (s) =>
            `<li><a href="/story/${encodeSlug(s.slug || s.id)}">${escapeHtmlText(stripZW(s.title))}</a></li>`
        )
        .join('\n');
      return buildHtmlResponse(
        { title, description, canonicalUrl },
        `<div class="ssr-shell">${buildSiteNavHtml(
          activeCategories
        )}<main><h1>Walkathawa — සම්පූර්ණ කතා නාමාවලිය (${activeStories.length})</h1><ul>${links}</ul></main>${buildSiteFooterHtml(
          activeCategories
        )}</div>`,
        200
      );
    }

    // 6h. Profile Page
    if (
      normalizedPath.startsWith('/profile/') ||
      normalizedPath.startsWith('/followers/') ||
      normalizedPath.startsWith('/following/')
    ) {
      const author = normalizedPath.replace(/^\/(profile|followers|following)\//, '').trim() || SITE_NAME;
      const canonicalUrl = `${SITE_ORIGIN}/profile/${encodeURIComponent(author)}`;
      return buildHtmlResponse(
        {
          title: `${author} | ${SITE_NAME}`,
          description: `${author} විසින් Walkathawa හි පළ කරන ලද සිංහල කතා එකතුව.`,
          canonicalUrl,
        },
        buildCardsShell(`${author} | ${SITE_NAME}`, activeStories.slice(0, 20), null, null, activeCategories),
        200
      );
    }

    // 6i. Homepage: / and /page/:num
    const homePageMatch = normalizedPath.match(/^\/page\/(\d+)$/);
    if (normalizedPath === '/' || homePageMatch) {
      const homePage = homePageMatch ? Math.max(1, parseInt(homePageMatch[1], 10) || 1) : page;
      const totalPages = Math.max(1, Math.ceil(activeStories.length / 20));
      const startIdx = (homePage - 1) * 20;
      const pageStories = activeStories.slice(startIdx, startIdx + 20);
      const title =
        homePage > 1
          ? `Sinhala Wal Katha & Wela Katha — පිටුව ${homePage} | ${SITE_NAME}`
          : 'Sinhala Wal Katha & Wela Katha — Walkathawa (වල් කතාව)';
      const sampleTitles = pageStories.slice(0, 2).map((s) => stripZW(s.title)).join(', ');
      const description =
        homePage > 1 && sampleTitles
          ? `Walkathawa පිටුව ${homePage}: ${sampleTitles} ඇතුළු අලුත්ම sinhala wal katha, wela katha, sinhala wela katha සහ walkatha නොමිලේ කියවන්න.`.slice(0, 158)
          : 'Sinhala wal katha, wela katha සහ sinhala wela katha නොමිලේ කියවන්න. Walkathawa (වල් කතාව) අලුත්ම walkatha, wal katha 2026 සහ sinhala wal එකතුව.';
      const canonicalUrl = buildPageAbsoluteUrl('/', homePage);
      const prevUrl = homePage > 1 ? buildPageAbsoluteUrl('/', homePage - 1) : null;
      const nextUrl = homePage < totalPages ? buildPageAbsoluteUrl('/', homePage + 1) : null;

      return buildHtmlResponse(
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
                '@type': 'WebSite',
                '@id': `${SITE_ORIGIN}/#website`,
                url: `${SITE_ORIGIN}/`,
                name: SITE_NAME,
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
        buildCardsShell(title, pageStories, prevUrl, nextUrl, activeCategories, '/', homePage, totalPages),
        200
      );
    }

    // 6j. Unknown route -> Real HTTP 404 (never serves homepage fallback as 200)
    return buildHtmlResponse(
      {
        title: `404 — පිටුව හමු නොවීය | ${SITE_NAME}`,
        description: 'ඔබ සෙවූ පිටුව Walkathawa වෙබ් අඩවියෙන් හමු නොවීය.',
        noIndex: true,
        canonicalUrl: null,
      },
      '<div class="ssr-shell"><h1>404 — පිටුව හමු නොවීය</h1><p><a href="/">මුල් පිටුවට යන්න</a></p></div>',
      404
    );
  },
};
