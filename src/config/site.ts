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

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  amma: '%E0%B6%85%E0%B6%B8%E0%B7%8A%E0%B6%B8%E0%B7%8F-%E0%B6%B4%E0%B7%94%E0%B6%AD%E0%B7%8F',
  'amma-wal-katha': '%E0%B6%85%E0%B6%B8%E0%B7%8A%E0%B6%B8%E0%B7%8F-%E0%B6%B4%E0%B7%94%E0%B6%AD%E0%B7%8F',
  'ammai-puthai': '%E0%B6%85%E0%B6%B8%E0%B7%8A%E0%B6%B8%E0%B7%8F-%E0%B6%B4%E0%B7%94%E0%B6%AD%E0%B7%8F',
  'thaththa-wal-katha': 'thaththa-duwa',
  'akka-wal-katha': 'akka-malli',
  'akkagen-sapa': 'akka-malli',
  'sahodhara-sohadhari': 'akka-malli',
  'wife-wal-katha': 'wife',
  'wife-gf': 'wife',
  'nana-wal-katha': 'nanda',
  'pawule-an-aya': 'nanda',
  'aunty-wal-katha': '%E0%B6%87%E0%B6%B1%E0%B7%8A%E0%B6%A7%E0%B7%92-%E0%B6%B4%E0%B7%94%E0%B6%AD%E0%B7%8F',
  'wadimahal-bala': '%E0%B6%87%E0%B6%B1%E0%B7%8A%E0%B6%A7%E0%B7%92-%E0%B6%B4%E0%B7%94%E0%B6%AD%E0%B7%8F',
  'teacher-wal-katha': 'school',
  'model-wal-katha': 'school',
  samalingika: 'lesbian',
  'spa-kathawa': 'spa-katha',
  'threesome-wal-katha': '%E0%B7%80%E0%B6%A7%E0%B7%9A-%E0%B6%BA%E0%B7%8F%E0%B6%B8',
  'walle-kathawa': '%E0%B7%80%E0%B6%A7%E0%B7%9A-%E0%B6%BA%E0%B7%8F%E0%B6%B8',
  'sex-katha': 'romantic',
  'sinhala-sex-katha': 'romantic',
};

export function normalizeCanonicalPath(rawPathname: string): string {
  let target = (rawPathname || '/').replace(/\/{2,}/g, '/');
  if (target.length > 1 && target.endsWith('/')) {
    target = target.slice(0, -1);
  }

  if (target === '/page/1') {
    return '/';
  }
  if (/^\/(popular|archives)\/page\/1$/i.test(target)) {
    return target.replace(/\/page\/1$/i, '');
  }
  if (/^\/category\/[^/]+\/page\/1$/i.test(target)) {
    target = target.replace(/\/page\/1$/i, '');
  }
  if (target === '/posts') {
    return '/';
  }
  if (target.startsWith('/posts/')) {
    return target.replace(/^\/posts\//, '/story/');
  }
  if (target.startsWith('/katha/')) {
    return target.replace(/^\/katha\//, '/story/');
  }
  if (target.startsWith('/categories/')) {
    target = target.replace(/^\/categories\//, '/category/');
  }
  if (target.startsWith('/collections/')) {
    target = target.replace(/^\/collections\//, '/category/');
  }
  if (target.startsWith('/category/')) {
    const parts = target.split('/');
    const rawCatSlug = (parts[2] || '').toLowerCase();
    const mapped = CATEGORY_SLUG_ALIASES[rawCatSlug];
    if (mapped) {
      parts[2] = mapped;
      target = parts.join('/');
    }
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
  const targetPath = normalizeCanonicalPath(rawPathname);
  const pathChanged = targetPath !== rawPathname;

  if (!needsHostOrProtoRedirect && !pathChanged) {
    return null;
  }

  const querySuffix = rawQuery ? `?${rawQuery}` : '';
  const destination = isProdHost
    ? `${SITE_ORIGIN}${targetPath}${querySuffix}`
    : `${targetPath}${querySuffix}`;

  return {
    shouldRedirect: true,
    status: 301,
    location: destination,
  };
}
