export const SITE_ORIGIN = 'https://www.walkathawa.site';
export const SITE_HOSTNAME = 'www.walkathawa.site';
export const SITE_NAME = 'Walkathawa';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icon.png`;

export const LEGACY_REDIRECT_HOSTS = new Set<string>([
  'walkathawa.site',
  'walkathawa.com',
  'www.walkathawa.com',
  'walakatha.com',
  'www.walakatha.com',
]);

export const PRODUCTION_HOSTS = new Set<string>([
  SITE_HOSTNAME,
  ...Array.from(LEGACY_REDIRECT_HOSTS),
]);

const VALID_CANONICAL_CATEGORIES = new Set<string>([
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

const CATEGORY_SLUG_ALIASES_DECODED: Record<string, string> = {
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

function stripZeroWidth(val: string): string {
  return String(val || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

export function encodePathSegment(seg: string): string {
  const clean = stripZeroWidth(seg);
  if (!clean) return '';
  try {
    return encodeURIComponent(decodeURIComponent(clean));
  } catch {
    return encodeURIComponent(clean);
  }
}

export function decodePathSegment(seg: string): string {
  const clean = stripZeroWidth(seg);
  if (!clean) return '';
  try {
    return stripZeroWidth(decodeURIComponent(clean));
  } catch {
    return clean;
  }
}

export function resolveCanonicalCategorySlug(rawCatSlug?: string): string {
  const decoded = decodePathSegment(rawCatSlug || '').toLowerCase();
  if (!decoded || decoded === 'all') return 'romantic';
  if (CATEGORY_SLUG_ALIASES_DECODED[decoded]) {
    return CATEGORY_SLUG_ALIASES_DECODED[decoded];
  }
  if (VALID_CANONICAL_CATEGORIES.has(decoded)) {
    return decoded;
  }
  return 'romantic';
}

export function normalizeCanonicalPath(rawPathname: string): string {
  let target = (rawPathname || '/').replace(/\/{2,}/g, '/');
  if (target.length > 1 && target.endsWith('/')) {
    target = target.slice(0, -1);
  }

  // Strip /index.html, /index.htm, /index.php -> /
  if (/^\/index\.(html?|php)$/i.test(target)) {
    return '/';
  }

  // Strip .html suffix on public routes (except Google verification file)
  if (/\.html$/i.test(target) && !/^\/google[a-z0-9]+\.html$/i.test(target)) {
    target = target.replace(/\.html$/i, '') || '/';
  }

  // Strip trailing /amp on story/post URLs
  if (/^\/(story|posts|katha)\/[^/]+\/amp$/i.test(target)) {
    target = target.replace(/\/amp$/i, '');
  }

  if (target === '/page/1') {
    return '/';
  }
  if (/^\/(popular|archives)\/page\/1$/i.test(target)) {
    target = target.replace(/\/page\/1$/i, '');
  }
  if (/^\/category\/[^/]+\/page\/1$/i.test(target)) {
    target = target.replace(/\/page\/1$/i, '');
  }
  if (target === '/posts' || target === '/katha') {
    return '/';
  }
  if (target.startsWith('/posts/')) {
    target = target.replace(/^\/posts\//, '/story/');
  }
  if (target.startsWith('/katha/')) {
    target = target.replace(/^\/katha\//, '/story/');
  }
  if (target.startsWith('/categories/')) {
    target = target.replace(/^\/categories\//, '/category/');
  }
  if (target.startsWith('/collections/')) {
    target = target.replace(/^\/collections\//, '/category/');
  }
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
    if (/^\/archives\/page\/1$/i.test(target)) {
      return '/archives';
    }
  }
  if (target.startsWith('/category/')) {
    const parts = target.split('/');
    const decodedCat = decodePathSegment(parts[2] || '').toLowerCase();
    if (!decodedCat || decodedCat === 'all') {
      return '/';
    }
    const mapped = CATEGORY_SLUG_ALIASES_DECODED[decodedCat];
    if (mapped) {
      parts[2] = encodePathSegment(mapped);
    } else {
      parts[2] = encodePathSegment(decodedCat);
    }
    target = parts.join('/');
  }
  if (target === '/collections') {
    return '/categories';
  }
  if (target === '/privacy') {
    return '/page/privacy-policy';
  }
  if (target === '/terms') {
    return '/page/terms-and-conditions';
  }
  if (
    target === '/sitemap_index.xml' ||
    target === '/sitemap-main.xml' ||
    target === '/sitemap-stories.xml' ||
    target === '/sitemap2.xml' ||
    target === '/sitmap.xml'
  ) {
    return '/sitemap.xml';
  }

  // Ensure every segment is consistently RFC-3986 percent-encoded
  if (target !== '/') {
    target =
      '/' +
      target
        .split('/')
        .filter(Boolean)
        .map((seg) => encodePathSegment(seg))
        .join('/');
  }

  return target || '/';
}

export function buildCanonicalUrl(pathname: string, page = 1): string {
  const normalized = normalizeCanonicalPath(pathname).replace(/\/page\/\d+$/i, '') || '/';
  if (page > 1) {
    return normalized === '/'
      ? `${SITE_ORIGIN}/page/${page}`
      : `${SITE_ORIGIN}${normalized}/page/${page}`;
  }
  return normalized === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${normalized}`;
}

export interface RedirectResolution {
  shouldRedirect: boolean;
  status: 301;
  location: string;
}

export function resolveCanonicalRedirect(
  rawHostHeader: string,
  rawProtoHeader: string,
  originalUrl: string
): RedirectResolution | null {
  const host = String(rawHostHeader || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  const proto = String(rawProtoHeader || 'https')
    .split(',')[0]
    .trim()
    .toLowerCase();

  const isProdHost = PRODUCTION_HOSTS.has(host);
  const needsHostOrProtoRedirect =
    LEGACY_REDIRECT_HOSTS.has(host) || (host === SITE_HOSTNAME && proto === 'http');

  const [rawPathname = '/', rawQuery = ''] = (originalUrl || '/').split('?');
  let targetPath = normalizeCanonicalPath(rawPathname);
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
      const params = new URLSearchParams(rawQuery);
      const searchQ = (params.get('s') || params.get('q') || '').trim();
      if (targetPath === '/' && searchQ) {
        targetPath = '/search';
        targetQuery = `s=${encodeURIComponent(searchQ)}`;
      } else {
        const pageVal = parseInt(params.get('page') || '', 10);
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
        // Strip all query parameters (?page=..., ?m=1, ?fbclid=..., ?utm_..., etc.) on indexable public pages
        targetQuery = '';
      }
    }
  }

  const pathChanged = targetPath !== rawPathname;
  const queryChanged = targetQuery !== rawQuery;

  if (!needsHostOrProtoRedirect && !pathChanged && !queryChanged) {
    return null;
  }

  const querySuffix = targetQuery ? `?${targetQuery}` : '';
  const destination = isProdHost
    ? `${SITE_ORIGIN}${targetPath}${querySuffix}`
    : `${targetPath}${querySuffix}`;

  return {
    shouldRedirect: true,
    status: 301,
    location: destination,
  };
}
