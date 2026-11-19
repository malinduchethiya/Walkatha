export const SITE_ORIGIN = 'https://www.walkathawa.site';
export const SITE_HOSTNAME = 'www.walkathawa.site';
export const SITE_NAME = 'Walkathawa';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icon.png`;

export const LEGACY_REDIRECT_HOSTS = new Set<string>([
  'walkathawa.site',
  'walkathawa.com',
  'www.walkathawa.com',
]);

export const PRODUCTION_HOSTS = new Set<string>([
  SITE_HOSTNAME,
  ...Array.from(LEGACY_REDIRECT_HOSTS),
]);

export function normalizeCanonicalPath(rawPathname: string): string {
  let target = (rawPathname || '/').replace(/\/{2,}/g, '/');
  if (target.length > 1 && target.endsWith('/')) {
    target = target.slice(0, -1);
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
    return target.replace(/^\/categories\//, '/category/');
  }
  if (target.startsWith('/collections/')) {
    return target.replace(/^\/collections\//, '/category/');
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
  const normalized = normalizeCanonicalPath(pathname);
  const base = normalized === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${normalized}`;
  if (page > 1) {
    return `${base}?page=${page}`;
  }
  return base;
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
