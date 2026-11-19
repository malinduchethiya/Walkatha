import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SITE_ORIGIN,
  normalizeCanonicalPath,
  buildCanonicalUrl,
  resolveCanonicalRedirect,
} from '../src/config/site.ts';
import worker from '../public/_worker.js';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');

function createMockEnvFromDist() {
  return {
    ASSETS: {
      async fetch(req: Request | string) {
        const u = new URL(typeof req === 'string' ? req : req.url);
        const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
        const fullPath = path.join(DIST_DIR, rel);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const contentType =
            ext === '.html'
              ? 'text/html; charset=utf-8'
              : ext === '.xml'
              ? 'application/xml; charset=utf-8'
              : ext === '.json'
              ? 'application/json; charset=utf-8'
              : ext === '.txt'
              ? 'text/plain; charset=utf-8'
              : 'application/octet-stream';
          return new Response(content, { status: 200, headers: { 'Content-Type': contentType } });
        }
        return new Response('Not Found', { status: 404 });
      },
    },
  };
}

function getSampleStorySlug(): string {
  const catalogPath = path.join(ROOT, 'public', 'api-data', 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const first = catalog.stories.find((s: any) => s && (s.slug || s.id));
  assert.ok(first, 'Catalog must contain at least one published story');
  return String(first.slug || first.id);
}

test('site.ts: canonical origin and single-hop 301 redirect rules', () => {
  assert.equal(SITE_ORIGIN, 'https://walkathawa.com');
  assert.equal(buildCanonicalUrl('/'), 'https://walkathawa.com/');
  assert.equal(buildCanonicalUrl('/about/'), 'https://walkathawa.com/about');
  assert.equal(buildCanonicalUrl('/category/wife', 2), 'https://walkathawa.com/category/wife?page=2');

  // No redirect on canonical apex HTTPS URLs
  assert.equal(resolveCanonicalRedirect('walkathawa.com', 'https', '/'), null);
  assert.equal(resolveCanonicalRedirect('walkathawa.com', 'https', '/about'), null);
  assert.equal(resolveCanonicalRedirect('walkathawa.com', 'https', '/story/test-1'), null);

  // Old domains & www consolidate in a single 301 hop
  const oldApex = resolveCanonicalRedirect('walkathawa.site', 'https', '/story/test-1');
  assert.deepEqual(oldApex, {
    shouldRedirect: true,
    status: 301,
    location: 'https://walkathawa.com/story/test-1',
  });

  const oldWwwPosts = resolveCanonicalRedirect('www.walkathawa.site', 'http', '/posts/test-1/');
  assert.deepEqual(oldWwwPosts, {
    shouldRedirect: true,
    status: 301,
    location: 'https://walkathawa.com/story/test-1',
  });

  const wwwNew = resolveCanonicalRedirect('www.walkathawa.com', 'https', '/categories/wife/');
  assert.deepEqual(wwwNew, {
    shouldRedirect: true,
    status: 301,
    location: 'https://walkathawa.com/category/wife',
  });

  const httpApex = resolveCanonicalRedirect('walkathawa.com', 'http', '/collections/wife');
  assert.deepEqual(httpApex, {
    shouldRedirect: true,
    status: 301,
    location: 'https://walkathawa.com/category/wife',
  });

  assert.equal(normalizeCanonicalPath('/posts'), '/');
  assert.equal(normalizeCanonicalPath('/collections'), '/categories');
  assert.equal(normalizeCanonicalPath('/privacy'), '/page/privacy-policy');
  assert.equal(normalizeCanonicalPath('/terms'), '/page/terms-and-conditions');
  assert.equal(normalizeCanonicalPath('/sitemap_index.xml'), '/sitemap.xml');
});

test('dist build artifacts: robots.txt, sitemap.xml, _worker.js, and prerendered HTML', () => {
  assert.ok(fs.existsSync(DIST_DIR), 'dist/ directory must exist after npm run build');
  assert.ok(fs.existsSync(path.join(DIST_DIR, '_worker.js')), 'dist/_worker.js must be bundled');
  assert.ok(fs.existsSync(path.join(DIST_DIR, '_spa.html')), 'dist/_spa.html must exist');

  // robots.txt check
  const robots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap:\s*https:\/\/walkathawa\.com\/sitemap\.xml/);
  assert.match(robots, /Disallow:\s*\/admin/);
  assert.ok(!robots.includes('walkathawa.site'), 'robots.txt must not reference walkathawa.site');

  // sitemap.xml check
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(!sitemap.includes('walkathawa.site'), 'sitemap.xml must not contain old domain URLs');
  assert.ok(!sitemap.includes('/admin'), 'sitemap.xml must exclude /admin');
  assert.ok(sitemap.includes('<loc>https://walkathawa.com/</loc>'), 'sitemap.xml must include homepage');
  assert.ok(sitemap.includes('<loc>https://walkathawa.com/about</loc>'), 'sitemap.xml must include /about');
  assert.ok(sitemap.includes('<loc>https://walkathawa.com/category/wife</loc>'), 'sitemap.xml must include categories');

  const locs = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), (m) => m[1]);
  assert.ok(locs.length > 50, `Expected >50 sitemap URLs, got ${locs.length}`);
  assert.equal(new Set(locs).size, locs.length, 'sitemap.xml must not contain duplicate <loc> entries');

  // Prerendered homepage & about & category & 404 checks
  for (const check of [
    { file: 'index.html', expectedCanonical: 'https://walkathawa.com/' },
    { file: 'about.html', expectedCanonical: 'https://walkathawa.com/about' },
    { file: 'categories.html', expectedCanonical: 'https://walkathawa.com/categories' },
    { file: 'category/wife.html', expectedCanonical: 'https://walkathawa.com/category/wife' },
  ]) {
    const html = fs.readFileSync(path.join(DIST_DIR, check.file), 'utf8');
    const canonicals = Array.from(html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi), (m) => m[1]);
    assert.equal(canonicals.length, 1, `${check.file} must have exactly 1 canonical tag`);
    assert.equal(canonicals[0], check.expectedCanonical, `${check.file} canonical mismatch`);
    assert.ok(!html.includes('https://www.walkathawa.site'), `${check.file} must not contain old domain URLs`);
    assert.ok(html.includes('application/ld+json'), `${check.file} must include JSON-LD`);
  }

  // Prerendered 404.html check
  const notFoundHtml = fs.readFileSync(path.join(DIST_DIR, '404.html'), 'utf8');
  assert.ok(notFoundHtml.includes('noindex, nofollow'), '404.html must be noindex, nofollow');
  assert.ok(!notFoundHtml.includes('rel="canonical"'), '404.html must not emit a canonical tag');

  // Check sample prerendered story HTML
  const storyDir = path.join(DIST_DIR, 'story');
  assert.ok(fs.existsSync(storyDir), 'dist/story/ directory must exist');
  const storyFiles = fs.readdirSync(storyDir).filter((f) => f.endsWith('.html'));
  assert.ok(storyFiles.length > 50, `Expected >50 prerendered story HTML files, got ${storyFiles.length}`);
  const sampleHtml = fs.readFileSync(path.join(storyDir, storyFiles[0]), 'utf8');
  const sampleCanonicals = Array.from(
    sampleHtml.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi),
    (m) => m[1]
  );
  assert.equal(sampleCanonicals.length, 1, 'Prerendered story must have exactly 1 canonical');
  assert.ok(sampleCanonicals[0].startsWith('https://walkathawa.com/story/'));
  assert.ok(sampleHtml.includes('"BlogPosting"'), 'Story JSON-LD must use BlogPosting');
  assert.ok(sampleHtml.includes('data-reading-content'), 'Story initial HTML must include readable body');
});

test('Cloudflare Worker (public/_worker.js): routes, statuses, redirects, and crawler isolation', async () => {
  const env = createMockEnvFromDist();
  const sampleSlug = getSampleStorySlug();
  const encodedSlug = encodeURIComponent(sampleSlug);

  // 1. Homepage 200
  const homeRes = await worker.fetch(new Request('https://walkathawa.com/'), env);
  assert.equal(homeRes.status, 200);
  const homeHtml = await homeRes.text();
  assert.ok(homeHtml.includes('rel="canonical" href="https://walkathawa.com/"'));
  assert.ok(homeHtml.includes('"@type": "WebSite"'));
  assert.ok(homeHtml.includes('"@type": "Organization"'));

  // 2. /posts -> 301 /
  const postsRes = await worker.fetch(new Request('https://walkathawa.com/posts'), env);
  assert.equal(postsRes.status, 301);
  assert.equal(postsRes.headers.get('Location'), 'https://walkathawa.com/');

  // 3. /posts/{slug} -> 301 /story/{slug}
  const postSlugRes = await worker.fetch(
    new Request(`https://walkathawa.com/posts/${encodedSlug}`),
    env
  );
  assert.equal(postSlugRes.status, 301);
  assert.equal(postSlugRes.headers.get('Location'), `https://walkathawa.com/story/${encodedSlug}`);

  // 4. Existing story -> 200 + BlogPosting + Sinhala content + Googlebot ad stripping
  const storyBotRes = await worker.fetch(
    new Request(`https://walkathawa.com/story/${encodedSlug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    }),
    env
  );
  assert.equal(storyBotRes.status, 200);
  assert.equal(storyBotRes.headers.get('Vary'), 'User-Agent');
  const storyBotHtml = await storyBotRes.text();
  assert.ok(storyBotHtml.includes(`rel="canonical" href="https://walkathawa.com/story/${encodedSlug}"`));
  assert.ok(storyBotHtml.includes('"@type": "BlogPosting"'));
  assert.ok(storyBotHtml.includes('data-reading-content'));
  assert.ok(!storyBotHtml.includes('popunder-swap.js'), 'Googlebot must not receive popunder script');
  assert.ok(!storyBotHtml.includes('ahuramazda.org'), 'Googlebot must not receive ad scripts');

  // 5. Missing story -> real HTTP 404 + noindex (never homepage 200)
  const missingStoryRes = await worker.fetch(
    new Request('https://walkathawa.com/story/non-existent-story-seo-test-99999'),
    env
  );
  assert.equal(missingStoryRes.status, 404);
  assert.equal(missingStoryRes.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const missingStoryHtml = await missingStoryRes.text();
  assert.ok(missingStoryHtml.includes('noindex, nofollow'));
  assert.ok(!missingStoryHtml.includes('rel="canonical"'));

  // 6. /categories/{slug} & /collections/{slug} -> 301 /category/{slug}
  const legacyCatRes = await worker.fetch(new Request('https://walkathawa.com/categories/wife'), env);
  assert.equal(legacyCatRes.status, 301);
  assert.equal(legacyCatRes.headers.get('Location'), 'https://walkathawa.com/category/wife');

  const legacyColRes = await worker.fetch(new Request('https://walkathawa.com/collections/wife'), env);
  assert.equal(legacyColRes.status, 301);
  assert.equal(legacyColRes.headers.get('Location'), 'https://walkathawa.com/category/wife');

  // 7. Existing category -> 200
  const catRes = await worker.fetch(new Request('https://walkathawa.com/category/wife'), env);
  assert.equal(catRes.status, 200);
  const catHtml = await catRes.text();
  assert.ok(catHtml.includes('rel="canonical" href="https://walkathawa.com/category/wife"'));
  assert.ok(catHtml.includes('"@type": "CollectionPage"'));

  // 8. /about -> 200
  const aboutRes = await worker.fetch(new Request('https://walkathawa.com/about'), env);
  assert.equal(aboutRes.status, 200);
  const aboutHtml = await aboutRes.text();
  assert.ok(aboutHtml.includes('rel="canonical" href="https://walkathawa.com/about"'));

  // 9. /robots.txt -> 200 with walkathawa.com sitemap
  const robotsRes = await worker.fetch(new Request('https://walkathawa.com/robots.txt'), env);
  assert.equal(robotsRes.status, 200);
  const robotsText = await robotsRes.text();
  assert.ok(robotsText.includes('Sitemap: https://walkathawa.com/sitemap.xml'));
  assert.ok(robotsText.includes('Disallow: /admin'));

  // 10. /sitemap.xml -> 200 XML with walkathawa.com URLs
  const sitemapRes = await worker.fetch(new Request('https://walkathawa.com/sitemap.xml'), env);
  assert.equal(sitemapRes.status, 200);
  assert.match(sitemapRes.headers.get('Content-Type') || '', /application\/xml/);
  const sitemapXml = await sitemapRes.text();
  assert.ok(sitemapXml.includes('<loc>https://walkathawa.com/</loc>'));
  assert.ok(!sitemapXml.includes('walkathawa.site'));

  // 11. Old domain -> single-hop 301 to walkathawa.com
  const oldDomainRes = await worker.fetch(
    new Request(`https://www.walkathawa.site/posts/${encodedSlug}/`),
    env
  );
  assert.equal(oldDomainRes.status, 301);
  assert.equal(oldDomainRes.headers.get('Location'), `https://walkathawa.com/story/${encodedSlug}`);

  // 12. /admin -> noindex and zero ad scripts
  const adminRes = await worker.fetch(new Request('https://walkathawa.com/admin'), env);
  assert.equal(adminRes.status, 200);
  assert.equal(adminRes.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const adminHtml = await adminRes.text();
  assert.ok(!adminHtml.includes('popunder-swap.js'));

  // 13. Unauthenticated POST /api/trigger-rebuild -> 401
  const unauthRebuildRes = await worker.fetch(
    new Request('https://walkathawa.com/api/trigger-rebuild', { method: 'POST' }),
    env
  );
  assert.equal(unauthRebuildRes.status, 401);
});
