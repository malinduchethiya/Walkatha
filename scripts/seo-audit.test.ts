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

const AD_DOMAIN_PATTERN =
  /ahuramazda\.org|brijmohan\.org|asiaso\.org|popunder-swap\.js|atOptions|BannerAd|NativeBannerAd|e308aeebc92b2395c18ed45beda64648|05ee890ed059b98d213910f338ece6d0|2e5f19d0bbe93686082673c139a7b1b1|9275b71384eefb562fbf9d9fd275cc5e/i;

function assertZeroAds(content: string, contextLabel: string) {
  const match = content.match(AD_DOMAIN_PATTERN);
  assert.equal(
    match,
    null,
    `${contextLabel} must contain ZERO ad scripts or domains (found: ${match?.[0]})`
  );
}

function collectHtmlFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtmlFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

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
  assert.equal(buildCanonicalUrl('/', 2), 'https://www.walkathawa.site/page/2');
  assert.equal(buildCanonicalUrl('/about/'), 'https://www.walkathawa.site/about');
  assert.equal(
    buildCanonicalUrl('/category/wife', 2),
    'https://www.walkathawa.site/category/wife/page/2'
  );

  assert.equal(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/'), null);
  assert.equal(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/page/2'), null);
  assert.equal(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/about'), null);
  assert.equal(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/story/test-1'), null);

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

  assert.equal(normalizeCanonicalPath('/page/1'), '/');
  assert.equal(normalizeCanonicalPath('/category/wife/page/1'), '/category/wife');
  assert.equal(
    normalizeCanonicalPath('/category/amma-wal-katha'),
    `/category/${encodeURIComponent('අම්මා-පුතා')}`
  );
  assert.equal(normalizeCanonicalPath('/category/thaththa-wal-katha'), '/category/thaththa-duwa');
  assert.equal(normalizeCanonicalPath('/category/akka-wal-katha'), '/category/akka-malli');
  assert.equal(normalizeCanonicalPath('/category/wife-wal-katha'), '/category/wife');
  assert.equal(normalizeCanonicalPath('/category/nana-wal-katha'), '/category/nanda');
  assert.equal(normalizeCanonicalPath('/category/teacher-wal-katha'), '/category/school');
  assert.equal(normalizeCanonicalPath('/category/samalingika'), '/category/lesbian');
  assert.equal(normalizeCanonicalPath('/category/spa-kathawa'), '/category/spa-katha');
  assert.equal(
    normalizeCanonicalPath('/category/threesome-wal-katha'),
    `/category/${encodeURIComponent('වටේ-යාම')}`
  );
  assert.equal(normalizeCanonicalPath('/category/sex-katha'), '/category/romantic');
  assert.equal(normalizeCanonicalPath('/posts'), '/');
  assert.equal(normalizeCanonicalPath('/collections'), '/categories');
  assert.equal(normalizeCanonicalPath('/privacy'), '/page/privacy-policy');
  assert.equal(normalizeCanonicalPath('/terms'), '/page/terms-and-conditions');
  assert.equal(normalizeCanonicalPath('/sitemap_index.xml'), '/sitemap.xml');

  assert.equal(normalizeCanonicalPath('/index.html'), '/');
  assert.equal(normalizeCanonicalPath('/about.html'), '/about');
  assert.equal(normalizeCanonicalPath('/story/test-1.html'), '/story/test-1');
  assert.equal(normalizeCanonicalPath('/story/test-1/amp'), '/story/test-1');
  assert.equal(normalizeCanonicalPath('/profile/Walkathawa'), '/');
  assert.equal(normalizeCanonicalPath('/category/all'), '/');
  assert.equal(normalizeCanonicalPath('/category/office'), '/category/wife');
  assert.equal(
    normalizeCanonicalPath('/category/neighbour'),
    `/category/${encodeURIComponent('ඇන්ටි-පුතා')}`
  );

  const walakathaCom = resolveCanonicalRedirect('walakatha.com', 'https', '/category/amma-wal-katha');
  assert.deepEqual(walakathaCom, {
    shouldRedirect: true,
    status: 301,
    location: `https://www.walkathawa.site/category/${encodeURIComponent('අම්මා-පුතා')}`,
  });

  // Query pagination and tracking params must 301-redirect to clean canonical URLs
  assert.deepEqual(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/?page=2'), {
    shouldRedirect: true,
    status: 301,
    location: 'https://www.walkathawa.site/page/2',
  });
  assert.deepEqual(resolveCanonicalRedirect('www.walkathawa.site', 'https', '/?page=1'), {
    shouldRedirect: true,
    status: 301,
    location: 'https://www.walkathawa.site/',
  });
  assert.deepEqual(
    resolveCanonicalRedirect('www.walkathawa.site', 'https', '/category/wife?page=3'),
    {
      shouldRedirect: true,
      status: 301,
      location: 'https://www.walkathawa.site/category/wife/page/3',
    }
  );
  assert.deepEqual(
    resolveCanonicalRedirect('www.walkathawa.site', 'https', '/story/test-1?m=1'),
    {
      shouldRedirect: true,
      status: 301,
      location: 'https://www.walkathawa.site/story/test-1',
    }
  );
});

test('dist build artifacts: ZERO ads, 100% unique titles/descriptions, JSON-LD, crawlable pagination, full sitemap, and _redirects', () => {
  const wranglerConfigRaw = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  const wranglerConfig = JSON.parse(wranglerConfigRaw);
  assert.equal(wranglerConfig.name, 'walkatha');
  assert.equal(wranglerConfig.main, 'public/_worker.js');
  assert.equal(wranglerConfig.assets?.directory, './dist');
  assert.equal(wranglerConfig.assets?.binding, 'ASSETS');
  assert.equal(wranglerConfig.assets?.run_worker_first, true);
  assert.equal(wranglerConfig.assets?.not_found_handling, 'none');
  assert.equal(wranglerConfig.assets?.html_handling, 'none');

  assert.ok(fs.existsSync(DIST_DIR), 'dist/ directory must exist after npm run build');
  assert.ok(fs.existsSync(path.join(DIST_DIR, '_worker.js')), 'dist/_worker.js must be bundled');
  assert.ok(fs.existsSync(path.join(DIST_DIR, '_spa.html')), 'dist/_spa.html must exist');
  assert.ok(fs.existsSync(path.join(DIST_DIR, '_redirects')), 'dist/_redirects must exist');

  // Verify productionTemplate.ts also contains ZERO ad scripts
  const prodTemplate = fs.readFileSync(
    path.join(ROOT, 'src', 'generated', 'productionTemplate.ts'),
    'utf8'
  );
  assertZeroAds(prodTemplate, 'src/generated/productionTemplate.ts');

  const redirects = fs.readFileSync(path.join(DIST_DIR, '_redirects'), 'utf8');
  assert.ok(
    redirects.includes('/posts/:slug /story/:slug 301'),
    '_redirects must contain relative path 301 rules'
  );
  const redirectLines = redirects
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  for (const line of redirectLines) {
    assert.ok(
      line.startsWith('/') && !line.includes('http://') && !line.includes('https://') && !line.includes('301!'),
      `Invalid _redirects rule for Cloudflare Workers Static Assets: "${line}"`
    );
  }

  const robots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap:\s*https:\/\/www\.walkathawa\.site\/sitemap\.xml/);
  assert.match(robots, /Disallow:\s*\/admin/);

  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8');
  assertStrictGscSitemapXml(sitemap);

  // Every URL in sitemap.xml must resolve to an existing static HTML file in dist/
  const sitemapLocs = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), (m) => m[1]);
  for (const loc of sitemapLocs) {
    const pathname = decodeURIComponent(new URL(loc).pathname);
    const clean = pathname.replace(/^\/+/, '');
    const exists =
      pathname === '/'
        ? fs.existsSync(path.join(DIST_DIR, 'index.html'))
        : fs.existsSync(path.join(DIST_DIR, `${clean}.html`)) ||
          fs.existsSync(path.join(DIST_DIR, clean, 'index.html'));
    assert.ok(exists, `Sitemap URL ${loc} is missing prerendered static HTML in dist/`);
  }

  // Verify EVERY SINGLE generated HTML file in dist/ (excluding Google verification file)
  const allHtmlFiles = collectHtmlFiles(DIST_DIR).filter(
    (f) => !path.basename(f).startsWith('google')
  );
  assert.ok(
    allHtmlFiles.length >= 650,
    `Expected at least 650 prerendered HTML pages (stories + pagination + hubs), found ${allHtmlFiles.length}`
  );

  const seenTitles = new Map<string, string>();
  const seenDescs = new Map<string, string>();

  for (const htmlFile of allHtmlFiles) {
    const rel = path.relative(DIST_DIR, htmlFile);
    const html = fs.readFileSync(htmlFile, 'utf8');
    assertZeroAds(html, rel);

    if (rel === '_spa.html' || rel === '404.html' || rel === 'search.html' || rel === 'admin.html') {
      continue;
    }

    assert.ok(
      html.includes('index, follow, max-image-preview:large'),
      `${rel} must emit explicit indexable robots meta`
    );

    const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
    assert.equal(h1Count, 1, `${rel} must contain exactly one <h1> tag (got ${h1Count})`);

    const canonicals = Array.from(
      html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi),
      (m) => m[1]
    );
    assert.equal(canonicals.length, 1, `${rel} must contain exactly 1 canonical tag`);

    const ldMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
    );
    assert.ok(ldMatch, `${rel} must include JSON-LD structured data`);
    assert.doesNotThrow(() => JSON.parse(ldMatch[1]), `${rel} JSON-LD must be valid JSON`);

    const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || ['', ''])[1].trim();
    assert.ok(title.length >= 10 && title.length <= 70, `${rel} title length out of range: "${title}"`);
    assert.ok(
      !seenTitles.has(title),
      `Duplicate <title> "${title}" on ${rel} and ${seenTitles.get(title)}`
    );
    seenTitles.set(title, rel);

    const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || ['', ''])[1].trim();
    assert.ok(
      desc.length >= 50 && desc.length <= 165,
      `${rel} meta description length (${desc.length}) out of 50-165 range`
    );
    assert.ok(
      !seenDescs.has(desc),
      `Duplicate <meta description> on ${rel} and ${seenDescs.get(desc)}`
    );
    seenDescs.set(desc, rel);
  }

  for (const check of [
    { file: 'index.html', expectedCanonical: 'https://www.walkathawa.site/' },
    { file: 'page/2.html', expectedCanonical: 'https://www.walkathawa.site/page/2' },
    { file: 'about.html', expectedCanonical: 'https://www.walkathawa.site/about' },
    { file: 'categories.html', expectedCanonical: 'https://www.walkathawa.site/categories' },
    { file: 'category/wife.html', expectedCanonical: 'https://www.walkathawa.site/category/wife' },
    { file: 'category/thaththa-duwa.html', expectedCanonical: 'https://www.walkathawa.site/category/thaththa-duwa' },
    { file: 'category/spa-katha.html', expectedCanonical: 'https://www.walkathawa.site/category/spa-katha' },
    { file: 'sitemap.html', expectedCanonical: 'https://www.walkathawa.site/sitemap' },
  ]) {
    const html = fs.readFileSync(path.join(DIST_DIR, check.file), 'utf8');
    const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || ['', ''])[1];
    assert.equal(canonical, check.expectedCanonical, `${check.file} canonical mismatch`);
  }

  // Homepage must include "Sinhala Wal Katha & Wela Katha" in title and link to hubs + page 2
  const homeHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  assert.ok(
    homeHtml.includes('<title>Sinhala Wal Katha &amp; Wela Katha') ||
      homeHtml.includes('<title>Sinhala Wal Katha & Wela Katha'),
    'dist/index.html title must include "Sinhala Wal Katha & Wela Katha"'
  );
  for (const requiredHref of ['/categories', '/popular', '/archives', '/sitemap', '/page/2']) {
    assert.ok(
      homeHtml.includes(`href="${requiredHref}"`),
      `dist/index.html must include crawlable link to ${requiredHref}`
    );
  }
  assert.ok(homeHtml.includes('id="__INITIAL_GALLERY__"'), 'dist/index.html must embed __INITIAL_GALLERY__');

  // Page 2 must have prev/next, __INITIAL_GALLERY__, and distinct stories from Page 1
  const page2Html = fs.readFileSync(path.join(DIST_DIR, 'page', '2.html'), 'utf8');
  assert.ok(page2Html.includes('rel="prev"'), 'dist/page/2.html must emit rel="prev"');
  assert.ok(page2Html.includes('rel="next"'), 'dist/page/2.html must emit rel="next"');
  assert.ok(page2Html.includes('id="__INITIAL_GALLERY__"'), 'dist/page/2.html must embed __INITIAL_GALLERY__');
  const page1Links = new Set(Array.from(homeHtml.matchAll(/href="(\/story\/[^"]+)"/g), (m) => m[1]));
  const page2Links = new Set(Array.from(page2Html.matchAll(/href="(\/story\/[^"]+)"/g), (m) => m[1]));
  assert.ok(page2Links.size >= 15, `dist/page/2.html should list stories (found ${page2Links.size})`);
  let overlap = 0;
  for (const link of page2Links) {
    if (page1Links.has(link)) overlap++;
  }
  assert.equal(overlap, 0, 'dist/page/2.html story links must not duplicate Page 1 stories');

  // HTML sitemap must include ALL 600+ stories (not capped at 200)
  const htmlSitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.html'), 'utf8');
  const sitemapStoryLinks = new Set(
    Array.from(htmlSitemap.matchAll(/href="(\/story\/[^"]+)"/g), (m) => m[1])
  );
  assert.ok(
    sitemapStoryLinks.size >= 600,
    `dist/sitemap.html must list all 600+ stories, found ${sitemapStoryLinks.size}`
  );

  const notFoundHtml = fs.readFileSync(path.join(DIST_DIR, '404.html'), 'utf8');
  assert.ok(notFoundHtml.includes('noindex, nofollow'), '404.html must be noindex, nofollow');
  assert.ok(!notFoundHtml.includes('rel="canonical"'), '404.html must not emit a canonical tag');

  const storyDir = path.join(DIST_DIR, 'story');
  const storyFiles = fs.readdirSync(storyDir).filter((f) => f.endsWith('.html'));
  assert.ok(storyFiles.length >= 600, `Expected >=600 prerendered story pages, got ${storyFiles.length}`);
  const sampleHtml = fs.readFileSync(path.join(storyDir, storyFiles[0]), 'utf8');
  assert.ok(sampleHtml.includes('"BlogPosting"'), 'Story JSON-LD must use BlogPosting');
  assert.ok(sampleHtml.includes('data-reading-content'), 'Story initial HTML must include readable body');
  assert.ok(sampleHtml.includes('id="__INITIAL_STORY__"'), 'Story HTML must embed __INITIAL_STORY__');
  assert.ok(sampleHtml.includes('href="/sitemap"'), 'Story HTML must link to /sitemap');
  const storyInternalLinks = new Set(
    Array.from(sampleHtml.matchAll(/href="(\/story\/[^"]+)"/g), (m) => m[1])
  );
  assert.ok(
    storyInternalLinks.size >= 5,
    `Story HTML must include >=5 internal /story/ links (prev/next/related), found ${storyInternalLinks.size}`
  );
});

test('Cloudflare Worker (public/_worker.js): routes, path pagination, full sitemap, redirects, and ZERO ads', async () => {
  const env = createMockEnvFromDist();
  const sampleSlug = getSampleStorySlug();
  const encodedSlug = encodeURIComponent(sampleSlug);

  const homeRes = await worker.fetch(new Request('https://www.walkathawa.site/'), env);
  assert.equal(homeRes.status, 200);
  const homeHtml = await homeRes.text();
  assert.ok(homeHtml.includes('rel="canonical" href="https://www.walkathawa.site/"'));
  assertZeroAds(homeHtml, 'Worker homepage');

  const page2Res = await worker.fetch(new Request('https://www.walkathawa.site/page/2'), env);
  assert.equal(page2Res.status, 200);
  const page2Html = await page2Res.text();
  assert.ok(page2Html.includes('rel="canonical" href="https://www.walkathawa.site/page/2"'));
  assertZeroAds(page2Html, 'Worker homepage page 2');

  const storyRes = await worker.fetch(
    new Request(`https://www.walkathawa.site/story/${encodedSlug}`),
    env
  );
  assert.equal(storyRes.status, 200);
  const storyHtml = await storyRes.text();
  assert.ok(
    storyHtml.includes(`rel="canonical" href="https://www.walkathawa.site/story/${encodedSlug}"`)
  );
  assert.ok(storyHtml.includes('"@type": "BlogPosting"'));
  assert.ok(storyHtml.includes('id="__INITIAL_STORY__"'));
  assertZeroAds(storyHtml, 'Worker story HTML');

  const catRes = await worker.fetch(new Request('https://www.walkathawa.site/category/wife'), env);
  assert.equal(catRes.status, 200);
  assertZeroAds(await catRes.text(), 'Worker category HTML');

  const catPage2Res = await worker.fetch(
    new Request('https://www.walkathawa.site/category/wife/page/2'),
    env
  );
  assert.equal(catPage2Res.status, 200);
  const catPage2Html = await catPage2Res.text();
  assert.ok(
    catPage2Html.includes('rel="canonical" href="https://www.walkathawa.site/category/wife/page/2"')
  );
  assertZeroAds(catPage2Html, 'Worker category page 2 HTML');

  const htmlSitemapRes = await worker.fetch(new Request('https://www.walkathawa.site/sitemap'), env);
  assert.equal(htmlSitemapRes.status, 200);
  const htmlSitemapText = await htmlSitemapRes.text();
  const workerSitemapLinks = new Set(
    Array.from(htmlSitemapText.matchAll(/href="(\/story\/[^"]+)"/g), (m) => m[1])
  );
  assert.ok(
    workerSitemapLinks.size >= 600,
    `Worker /sitemap must list all 600+ stories, found ${workerSitemapLinks.size}`
  );

  const missingStoryRes = await worker.fetch(
    new Request('https://www.walkathawa.site/story/non-existent-story-seo-test-99999'),
    env
  );
  assert.equal(missingStoryRes.status, 404);
  assert.equal(missingStoryRes.headers.get('X-Robots-Tag'), 'noindex, nofollow');

  const robotsRes = await worker.fetch(new Request('https://www.walkathawa.site/robots.txt'), env);
  assert.equal(robotsRes.status, 200);
  assert.ok((await robotsRes.text()).includes('Sitemap: https://www.walkathawa.site/sitemap.xml'));

  const sitemapRes = await worker.fetch(new Request('https://www.walkathawa.site/sitemap.xml'), env);
  assert.equal(sitemapRes.status, 200);
  assertStrictGscSitemapXml(await sitemapRes.text());

  const apexRes = await worker.fetch(
    new Request(`https://walkathawa.site/posts/${encodedSlug}/`),
    env
  );
  assert.equal(apexRes.status, 301);
  assert.equal(
    apexRes.headers.get('Location'),
    `https://www.walkathawa.site/story/${encodedSlug}`
  );

  // Query pagination and Blogger ?m=1 on Worker must 301-redirect (never HTTP 200 alternative page)
  const queryPage2Res = await worker.fetch(
    new Request('https://www.walkathawa.site/?page=2'),
    env
  );
  assert.equal(queryPage2Res.status, 301);
  assert.equal(queryPage2Res.headers.get('Location'), 'https://www.walkathawa.site/page/2');

  const queryM1Res = await worker.fetch(
    new Request(`https://www.walkathawa.site/story/${encodedSlug}?m=1`),
    env
  );
  assert.equal(queryM1Res.status, 301);
  assert.equal(
    queryM1Res.headers.get('Location'),
    `https://www.walkathawa.site/story/${encodedSlug}`
  );

  const htmlExtRes = await worker.fetch(
    new Request(`https://www.walkathawa.site/story/${encodedSlug}.html`),
    env
  );
  assert.equal(htmlExtRes.status, 301);
  assert.equal(
    htmlExtRes.headers.get('Location'),
    `https://www.walkathawa.site/story/${encodedSlug}`
  );

  // Requesting a story by its Firestore ID (story.id !== story.slug) must 301-redirect to canonical /story/:slug
  const catalog = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public', 'api-data', 'catalog.json'), 'utf8')
  );
  const storyWithDiffId = catalog.stories.find((s: any) => s.id && s.slug && s.id !== s.slug);
  if (storyWithDiffId) {
    const idRes = await worker.fetch(
      new Request(`https://www.walkathawa.site/story/${encodeURIComponent(storyWithDiffId.id)}`),
      env
    );
    assert.equal(idRes.status, 301);
    assert.equal(
      idRes.headers.get('Location'),
      `https://www.walkathawa.site/story/${encodeURIComponent(storyWithDiffId.slug)}`
    );
  }
});
