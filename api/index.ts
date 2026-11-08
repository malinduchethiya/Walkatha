import fs from 'fs';
import path from 'path';

function stripZW(val: unknown): string {
  return String(val || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

function readSyncStore(): { stories: any[]; categories: any[] } {
  const candidates = [
    path.resolve(process.cwd(), 'server-data', 'firestore-sync.json'),
    path.resolve(process.cwd(), 'public', 'api-data', 'catalog.json'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          stories: Array.isArray(raw.stories) ? raw.stories : [],
          categories: Array.isArray(raw.categories) ? raw.categories : [],
        };
      }
    } catch {
      // ignore
    }
  }
  return { stories: [], categories: [] };
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (pathname === '/api/health' || pathname === '/api') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }

  if (pathname === '/api/firestore/stories') {
    const store = readSyncStore();
    const activeStories = store.stories.filter(
      (s) => s && !s.isDeleted && !s.deleted && s.published !== false
    );
    const activeCategories = store.categories.filter(
      (c) => c && !c.isDeleted && !c.deleted && c.slug !== 'all'
    );
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ stories: activeStories, categories: activeCategories }));
  }

  if (pathname.startsWith('/api/firestore/story/')) {
    const rawSlug = pathname.replace('/api/firestore/story/', '');
    let target = stripZW(rawSlug).toLowerCase();
    try {
      target = stripZW(decodeURIComponent(rawSlug)).toLowerCase();
    } catch {
      // ignore
    }
    const store = readSyncStore();
    const found = store.stories.find((s) => {
      if (!s || s.isDeleted || s.deleted || s.published === false) return false;
      const sSlug = stripZW(s.slug).toLowerCase();
      const sId = stripZW(s.id).toLowerCase();
      let sSlugDec = sSlug;
      try {
        sSlugDec = stripZW(decodeURIComponent(String(s.slug || ''))).toLowerCase();
      } catch {
        // ignore
      }
      return sSlug === target || sSlugDec === target || sId === target;
    });

    if (!found) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Story not found' }));
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(found));
  }

  if (pathname === '/api/categories') {
    const store = readSyncStore();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ categories: store.categories }));
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ status: 'ok', message: 'Walkathawa API endpoint' }));
}
