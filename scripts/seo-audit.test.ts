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

function assertStrictGscSitemapXml(xml: string) {
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(xml), 'XML must not contain invalid control characters');
  assert.ok(!xml.includes('walkathawa.com'), 'sitemap.xml must not contain cross-domain walkathawa.com URLs');
  assert.ok(!xml.includes('<image:title>'), 'sitemap.xml must not contain deprecated <image:title> tags');
  assert.ok(!xml.includes('/admin'), 'sitemap.xml must exclude /admin');

  const locs = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), (m) => m[1]);
  assert.ok(locs.length > 50, `Expected >50 sitemap URLs, got ${locs.length}`);
  assert.equal(new Set(locs).size, locs.length, 'sitemap.xml must not contain duplicate <loc> entries');

  for (const loc of locs) {
    assert.ok(
      loc.startsWith('https://www.walkathawa.site/'),
      `Cross-domain or invalid <loc> found: ${loc}`
    );
    assert.ok(loc.length <= 2048, `<loc> exceeds 2048 chars: ${loc}`);
    assert.ok(/^[\x21-\x7E]+$/.test(loc), `<loc> must be strictly RFC-3986 ASCII: ${loc}`);
    assert.doesNotThrow(() => new URL(loc), `Malformed <loc> URL: ${loc}`);
  }

  const lastmods = Array.from(xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g), (m) => m[1]);
  for (const d of lastmods) {
    assert.match(d, /^\d{4}-\d{2}-\d{2}$/, `Invalid W3C <lastmod> date: ${d}`);
  }
}

test('site.ts: canonical origin https://www.walkathawa.site and single-hop 301 redirect rules', () => {
  assert.equal(SITE_ORIGIN, 'https://www.walkathawa.site');
  assert.equal(buildCanonicalUrl('/'), 'https://www.walkathawa.site/');
  assert.equal(buildCanonicalUrl('/about/'), 'https://www.walkathawa.site/about');
  assert.equal(
    buildCanonicalUrl('/category/wife', 2),
    'https://www.walkathawa.site/category/wife?page=2'
  );

  // No redirect on canonical www.walkathawa.site HTTPS URLs
  assert.equal(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/'), null);
  assert.equal(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/about'), null);
  assert.equal(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/story/test-1'), null);

  // Apex and alternate domains consolidate in a single 301 hop
  const apexSite = resolveCanonicalRedirect('walkathawa.site', 'https', '/story/test-1');
  assert.deepEqual(apexSite, {
    shouldRedirect: true,
    status: 301,
    location: 'https://www.walkathawa.site/story/test-1',
  });

  const altComPosts = resolveCanonicalRedirect('walkathawa.com', 'http', '/posts/test-1/');
  assert.deepEqual(altComPosts, {
    shouldRedirect: true,
    status: 301,
    location: 'https://www.walkathawa.site/story/test-1',
  });

  const httpWww = resolveCanonicalRedirect('www.walkathawa.site', 'http', '/categories/wife/');
  assert.deepEqual(httpWww, {
    shouldRedirect: true,
    status: 301,
    location: 'https://www.walkathawa.site/category/wife',
  });

  assert.equal(normalizeCanonicalPath('/posts'), '/');
  assert.equal(normalizeCanonicalPath('/collections'), '/categories');
  assert.equal(normalizeCanonicalPath('/privacy'), '/page/privacy-policy');
  assert.equal(normalizeCanonicalPath('/terms'), '/page/terms-and-conditions');
  assert.equal(normalizeCanonicalPath('/sitemap_index.xml'), '/sitemap.xml');
});

test('dist build artifacts: robots.txt, strict GSC sitemap.xml, _worker.js, and prerendered HTML', () => {
  assert.ok(fs.existsSync(DIST_DIR), 'dist/ directory must exist after npm run build');
  assert.ok(fs.existsSync(path.join(DIST_DIR, '_worker.js')), 'dist/_worker.js must be bundled');
  assert.ok(fs.existsSync(path.join(DIST_DIR, '_spa.html')), 'dist/_spa.html must exist');

  // robots.txt check
  const robots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap:\s*https:\/\/www\.walkathawa\.site\/sitemap\.xml/);
  assert.match(robots, /Disallow:\s*\/admin/);
  assert.ok(!robots.includes('walkathawa.com'), 'robots.txt must not reference walkathawa.com');

  // strict GSC sitemap.xml check
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');
  assertStrictGscSitemapXml(sitemap);
  assert.ok(sitemap.includes('<loc>https://www.walkathawa.site/</loc>'));
  assert.ok(sitemap.includes('<loc>https://www.walkathawa.site/about</loc>'));
  assert.ok(sitemap.includes('<loc>https://www.walkathawa.site/category/wife</loc>'));

  // Prerendered homepage, about, categories, category checks
  for (const check of [
    { file: 'index.html', expectedCanonical: 'https://www.walkathawa.site/' },
    { file: 'about.html', expectedCanonical: 'https://www.walkathawa.site/about' },
    { file: 'categories.html', expectedCanonical: 'https://www.walkathawa.site/categories' },
    { file: 'category/wife.html', expectedCanonical: 'https://www.walkathawa.site/category/wife' },
  ]) {
    const html = fs.readFileSync(path.join(DIST_DIR, check.file), 'utf8');
    const canonicals = Array.from(
      html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi),
      (m) => m[1]
    );
    assert.equal(canonicals.length, 1, `${check.file} must have exactly 1 canonical tag`);
    assert.equal(canonicals[0], check.expectedCanonical, `${check.file} canonical mismatch`);
    assert.ok(!html.includes('walkathawa.com'), `${check.file} must not contain walkathawa.com URLs`);
    assert.ok(html.includes('application/ld+json'), `${check.file} must include JSON-LD`);
  }

  // Prerendered 404.html check
  const notFoundHtml = fs.readFileSync(path.join(DIST_DIR, '404.html'), 'utf8');
  assert.ok(notFoundHtml.includes('noindex, nofollow'), '404.html must be noindex, nofollow');
  assert.ok(!notFoundHtml.includes('rel="canonical"'), '404.html must not emit a canonical tag');

  // Sample prerendered story HTML
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
  assert.ok(sampleCanonicals[0].startsWith('https://www.walkathawa.site/story/'));
  assert.ok(sampleHtml.includes('"BlogPosting"'), 'Story JSON-LD must use BlogPosting');
  assert.ok(sampleHtml.includes('data-reading-content'), 'Story initial HTML must include readable body');
});

test('Cloudflare Worker (public/_worker.js): routes, statuses, redirects, GSC sitemap, and crawler isolation', async () => {
  const env = createMockEnvFromDist();
  const sampleSlug = getSampleStorySlug();
  const encodedSlug = encodeURIComponent(sampleSlug);

  // 1. Homepage 200
  const homeRes = await worker.fetch(new Request('https://www.walkathawa.site/'), env);
  assert.equal(homeRes.status, 200);
  const homeHtml = await homeRes.text();
  assert.ok(homeHtml.includes('rel="canonical" href="https://www.walkathawa.site/"'));

  // 2. /posts -> 301 /
  const postsRes = await worker.fetch(new Request('https://www.walkathawa.site/posts'), env);
  assert.equal(postsRes.status, 301);
  assert.equal(postsRes.headers.get('Location'), 'https://www.walkathawa.site/');

  // 3. Existing story -> 200 + BlogPosting + Googlebot ad stripping
  const storyBotRes = await worker.fetch(
    new Request(`https://www.walkathawa.site/story/${encodedSlug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    }),
    env
  );
  assert.equal(storyBotRes.status, 200);
  assert.equal(storyBotRes.headers.get('Vary'), 'User-Agent');
  const storyBotHtml = await storyBotRes.text();
  assert.ok(
    storyBotHtml.includes(`rel="canonical" href="https://www.walkathawa.site/story/${encodedSlug}"`)
  );
  assert.ok(storyBotHtml.includes('"@type": "BlogPosting"'));
  assert.ok(!storyBotHtml.includes('popunder-swap.js'));

  // 4. Missing story -> real HTTP 404 + noindex
  const missingStoryRes = await worker.fetch(
    new Request('https://www.walkathawa.site/story/non-existent-story-seo-test-99999'),
    env
  );
  assert.equal(missingStoryRes.status, 404);
  assert.equal(missingStoryRes.headers.get('X-Robots-Tag'), 'noindex, nofollow');

  // 5. /robots.txt -> 200 with www.walkathawa.site sitemap
  const robotsRes = await worker.fetch(new Request('https://www.walkathawa.site/robots.txt'), env);
  assert.equal(robotsRes.status, 200);
  const robotsText = await robotsRes.text();
  assert.ok(robotsText.includes('Sitemap: https://www.walkathawa.site/sitemap.xml'));

  // 6. /sitemap.xml -> 200 strict GSC XML on www.walkathawa.site
  const sitemapRes = await worker.fetch(new Request('https://www.walkathawa.site/sitemap.xml'), env);
  assert.equal(sitemapRes.status, 200);
  assert.match(sitemapRes.headers.get('Content-Type') || '', /application\/xml/);
  assertStrictGscSitemapXml(await sitemapRes.text());

  // 7. Apex walkathawa.site -> single-hop 301 to www.walkathawa.site
  const apexRes = await worker.fetch(
    new Request(`https://walkathawa.site/posts/${encodedSlug}/`),
    env
  );
  assert.equal(apexRes.status, 301);
  assert.equal(
    apexRes.headers.get('Location'),
    `https://www.walkathawa.site/story/${encodedSlug}`
  );
});
