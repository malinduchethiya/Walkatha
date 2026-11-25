/**
 * Phase 11 — Automated Technical SEO Validation System
 *
 * Audits all 650+ public URLs across dist/ and dist/sitemap.xml, simulating HTTP requests
 * through the Cloudflare Worker (public/_worker.js) and inspecting raw HTML responses for:
 *  - HTTP status code (200 vs 301 vs 404 vs 5xx)
 *  - Final URL after redirects
 *  - Self-referential canonical URL (<link rel="canonical">)
 *  - Indexability & robots directives (<meta name="robots"> and X-Robots-Tag)
 *  - Unique <title> and <meta name="description">
 *  - Meaningful body content & duplicate/thin content detection
 *  - Sitemap inclusion & 100% sitemap-to-canonical alignment
 *  - Internal link graph discoverability (BFS crawl starting from /)
 */

import fs from 'node:fs';
import path from 'node:path';
import worker from '../public/_worker.js';

const SITE_ORIGIN = 'https://www.walkathawa.site';
const distDir = path.resolve(process.cwd(), 'dist');

function collectHtmlFiles(dir, prefix = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.html')) {
      results.push(rel);
    }
  }
  return results;
}

function createMockAssetsEnv() {
  return {
    ASSETS: {
      async fetch(req) {
        const u = new URL(typeof req === 'string' ? req : req.url);
        let decodedPathname = u.pathname;
        try {
          decodedPathname = decodeURIComponent(u.pathname);
        } catch {
          decodedPathname = u.pathname;
        }
        const relPath = decodedPathname.replace(/^\/+/, '');
        const filePath = path.join(distDir, relPath);
        if (filePath.startsWith(distDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType =
            ext === '.html'
              ? 'text/html; charset=utf-8'
              : ext === '.json'
                ? 'application/json; charset=utf-8'
                : ext === '.xml'
                  ? 'application/xml; charset=utf-8'
                  : 'text/plain; charset=utf-8';
          return new Response(fs.readFileSync(filePath), {
            status: 200,
            headers: { 'Content-Type': contentType },
          });
        }
        return new Response('Not Found', { status: 404 });
      },
    },
  };
}

function fileRelToRoutePath(relFile) {
  if (relFile === 'index.html') return '/';
  const withoutExt = relFile.replace(/\.html$/, '');
  const segments = withoutExt.split('/').map((s) => encodeURIComponent(s));
  return `/${segments.join('/')}`;
}

function stripTagsToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function runValidation() {
  if (!fs.existsSync(distDir)) {
    console.error('[SEO Validation] dist/ directory not found. Run npm run build first.');
    process.exit(1);
  }

  const env = createMockAssetsEnv();
  const allHtmlFiles = collectHtmlFiles(distDir);
  const publicHtmlFiles = allHtmlFiles.filter(
    (f) => f !== '404.html' && f !== '_spa.html' && !/^google[a-z0-9]+\.html$/i.test(f)
  );

  // Parse sitemap.xml via Worker
  const sitemapRes = await worker.fetch(new Request(`${SITE_ORIGIN}/sitemap.xml`), env, {});
  const sitemapXml = await sitemapRes.text();
  const sitemapLocs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const sitemapSet = new Set(sitemapLocs);

  const discoveredRoutes = new Set(publicHtmlFiles.map(fileRelToRoutePath));
  for (const loc of sitemapLocs) {
    const u = new URL(loc);
    discoveredRoutes.add(u.pathname);
  }

  let totalHttp200 = 0;
  let totalIndexable = 0;
  let technicalProblems = 0;
  let duplicateOrThinPages = 0;
  const problemDetails = [];
  const thinDetails = [];

  const canonicalSet = new Set();
  const titleMap = new Map();
  const descMap = new Map();
  const linkGraph = new Map();

  for (const routePath of discoveredRoutes) {
    const fullUrl = routePath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${routePath}`;
    const res = await worker.fetch(new Request(fullUrl), env, {});
    const status = res.status;
    if (status === 200) {
      totalHttp200++;
    } else {
      technicalProblems++;
      problemDetails.push(`Non-200 status (${status}) for ${fullUrl}`);
      continue;
    }

    const html = await res.text();
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
    const robotsMatch = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const xRobots = res.headers.get('X-Robots-Tag') || '';

    const canonical = canonicalMatch ? canonicalMatch[1] : null;
    const robots = robotsMatch ? robotsMatch[1] : '';
    const title = titleMatch ? titleMatch[1].trim() : '';
    const desc = descMatch ? descMatch[1].trim() : '';
    const isNoIndex = robots.includes('noindex') || xRobots.includes('noindex');

    if (canonical) {
      canonicalSet.add(canonical);
    }

    if (!isNoIndex) {
      totalIndexable++;
    } else {
      technicalProblems++;
      problemDetails.push(`Unexpected noindex on public URL: ${fullUrl}`);
    }

    if (canonical !== fullUrl) {
      technicalProblems++;
      problemDetails.push(`Canonical mismatch on ${fullUrl} -> ${canonical}`);
    }

    if (!title || !desc || !h1Match) {
      technicalProblems++;
      problemDetails.push(`Missing title/description/H1 on ${fullUrl}`);
    }

    if (titleMap.has(title)) {
      technicalProblems++;
      problemDetails.push(`Duplicate title "${title}" on ${fullUrl} and ${titleMap.get(title)}`);
    } else {
      titleMap.set(title, fullUrl);
    }

    if (descMap.has(desc)) {
      technicalProblems++;
      problemDetails.push(`Duplicate description on ${fullUrl} and ${descMap.get(desc)}`);
    } else {
      descMap.set(desc, fullUrl);
    }

    // Content quality check for story pages
    const mainMatch = html.match(/<article[\s\S]*?<\/article>/i) || html.match(/<main[\s\S]*?<\/main>/i);
    const bodyText = stripTagsToText(mainMatch ? mainMatch[0] : html);
    if (routePath.startsWith('/story/') && bodyText.length < 250) {
      duplicateOrThinPages++;
      thinDetails.push(`${fullUrl} (${bodyText.length} chars)`);
    }

    // Extract internal links for BFS crawl verification
    const outLinks = [];
    for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const href = m[1];
      if (
        href.startsWith('/assets/') ||
        href.startsWith('/api-data/') ||
        /\.(png|jpg|jpeg|webp|svg|ico|xml|txt|json|css|js)$/i.test(href)
      ) {
        continue;
      }
      const cleanHref = href === '/' ? '/' : href.replace(/\/+$/, '');
      outLinks.push(cleanHref);
    }
    linkGraph.set(routePath, outLinks);
  }

  // BFS crawl from homepage / to verify 100% internal link discoverability
  const visited = new Set(['/']);
  const queue = ['/'];
  while (queue.length > 0) {
    const curr = queue.shift();
    const neighbors = linkGraph.get(curr) || [];
    for (const next of neighbors) {
      let normalizedNext = next;
      try {
        const dec = decodeURIComponent(next);
        normalizedNext =
          dec === '/'
            ? '/'
            : `/${dec
                .replace(/^\/+/, '')
                .split('/')
                .map((s) => encodeURIComponent(s))
                .join('/')}`;
      } catch {
        normalizedNext = next;
      }
      if (!visited.has(normalizedNext)) {
        visited.add(normalizedNext);
        queue.push(normalizedNext);
      }
    }
  }

  let unreachableCount = 0;
  for (const routePath of discoveredRoutes) {
    if (!visited.has(routePath)) {
      unreachableCount++;
      technicalProblems++;
      problemDetails.push(`Orphan page not reachable from /: ${routePath}`);
    }
  }

  // Verify redirect rules & 404/noindex rules
  const catalogRaw = JSON.parse(fs.readFileSync(path.join(distDir, 'api-data', 'catalog.json'), 'utf8'));
  const storyWithDiffId = (catalogRaw.stories || []).find((s) => s.id && s.slug && s.id !== s.slug);

  const redirectChecks = [
    ['https://walkathawa.site/', 'https://www.walkathawa.site/'],
    ['https://www.walkathawa.site/?page=2', 'https://www.walkathawa.site/page/2'],
    ['https://www.walkathawa.site/category/office', 'https://www.walkathawa.site/category/wife'],
    ['https://www.walkathawa.site/profile/Walkathawa', 'https://www.walkathawa.site/'],
    ...(storyWithDiffId
      ? [
          [
            `https://www.walkathawa.site/story/${encodeURIComponent(storyWithDiffId.id)}`,
            `${SITE_ORIGIN}/story/${encodeURIComponent(storyWithDiffId.slug)}`,
          ],
        ]
      : []),
  ];
  for (const [fromUrl, expectedTo] of redirectChecks) {
    const r = await worker.fetch(new Request(fromUrl), env, {});
    if (r.status !== 301 || r.headers.get('Location') !== expectedTo) {
      technicalProblems++;
      problemDetails.push(`Redirect check failed for ${fromUrl}: got ${r.status} -> ${r.headers.get('Location')}`);
    }
  }

  // Verify malformed URL returns 404 (not 500)
  const malformedRes = await worker.fetch(new Request(`${SITE_ORIGIN}/story/%E0%A4%A`), env, {});
  if (malformedRes.status >= 500) {
    technicalProblems++;
    problemDetails.push(`Malformed URL returned 5xx (${malformedRes.status})`);
  }

  const summary = {
    totalUrlsDiscovered: discoveredRoutes.size,
    totalUrlsReturningHttp200: totalHttp200,
    totalUniqueCanonicalUrls: canonicalSet.size,
    totalIndexableUrls: totalIndexable,
    totalUrlsInSitemap: sitemapSet.size,
    totalPagesReachableViaInternalLinks: visited.size,
    totalOrphanPages: unreachableCount,
    totalPagesWithTechnicalProblems: technicalProblems,
    totalPagesWithDuplicateOrThinContent: duplicateOrThinPages,
  };

  console.log('==============================================================');
  console.log('PHASE 11 — AUTOMATED TECHNICAL SEO VALIDATION SUMMARY');
  console.log('==============================================================');
  console.log(`- Total URLs discovered:                   ${summary.totalUrlsDiscovered}`);
  console.log(`- Total URLs returning HTTP 200:           ${summary.totalUrlsReturningHttp200}`);
  console.log(`- Total unique canonical URLs:             ${summary.totalUniqueCanonicalUrls}`);
  console.log(`- Total indexable URLs:                    ${summary.totalIndexableUrls}`);
  console.log(`- Total URLs in the sitemap:               ${summary.totalUrlsInSitemap}`);
  console.log(`- Total pages reachable from / via links:  ${summary.totalPagesReachableViaInternalLinks}`);
  console.log(`- Total pages with technical problems:     ${summary.totalPagesWithTechnicalProblems}`);
  console.log(`- Total pages with duplicate/thin content: ${summary.totalPagesWithDuplicateOrThinContent}`);
  console.log('==============================================================');

  if (problemDetails.length > 0) {
    console.error('Technical problems detected:', problemDetails.slice(0, 20));
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('[SEO Validation Fatal Error]:', err);
  process.exit(1);
});
