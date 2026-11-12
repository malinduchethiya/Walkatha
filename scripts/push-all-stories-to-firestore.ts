import { db, contentDb, auth } from '../src/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, writeBatch, collection, getDocs, setDoc } from 'firebase/firestore';
import fs from 'fs';

async function pushAllStoriesToBothFirestores() {
  console.log('1. Signing in to primary Firestore (walkathawa-93f80)...');
  const cred = await signInWithEmailAndPassword(auth, 'merlinfiverr0@gmail.com', 'g2jabB80');
  console.log('Signed in as admin:', cred.user.email, 'uid:', cred.user.uid);

  // Load all 614 full stories from server-data/firestore-sync.json
  const syncData = JSON.parse(fs.readFileSync('./server-data/firestore-sync.json', 'utf8'));
  const rawStories: any[] = syncData.stories || [];
  console.log(`Loaded ${rawStories.length} full stories from ./server-data/firestore-sync.json.`);

  // Also read existing docs in walkathawa-93f80 so we preserve exact document IDs and view counts
  const existingPrimarySnap = await getDocs(collection(db, 'stories'));
  const primaryById = new Map<string, any>();
  const primaryBySlug = new Map<string, { docId: string; data: any }>();

  existingPrimarySnap.forEach((d) => {
    const data = d.data();
    primaryById.set(d.id, data);
    if (data.slug) {
      primaryBySlug.set(String(data.slug).trim().toLowerCase(), { docId: d.id, data });
    }
  });
  console.log(`Found ${existingPrimarySnap.size} existing story docs in walkathawa-93f80.`);

  // Build lookup of full stories by id and by slug
  const fullById = new Map<string, any>();
  const fullBySlug = new Map<string, any>();
  for (const s of rawStories) {
    if (s.id) fullById.set(String(s.id).trim(), s);
    if (s.slug) fullBySlug.set(String(s.slug).trim().toLowerCase(), s);
  }

  // Merge so every document ID in walkathawa-93f80 AND every story in syncData gets complete fullContent
  const targetDocs = new Map<string, any>();

  for (const s of rawStories) {
    const slugKey = String(s.slug || '').trim().toLowerCase();
    const matchedPrimary = primaryById.get(s.id)
      ? { docId: s.id, data: primaryById.get(s.id) }
      : primaryBySlug.get(slugKey);

    const docId = matchedPrimary ? matchedPrimary.docId : String(s.id || s.slug).trim();
    const existingData = matchedPrimary ? matchedPrimary.data : {};

    const fullBody = String(
      s.fullContent || s.content || existingData.fullContent || existingData.content || ''
    ).trim();
    const words = fullBody ? fullBody.split(/\s+/).length : Number(s.wordCount) || 0;
    const readingTime = Math.max(4, Math.ceil(words / 180));
    const desc = String(
      s.shortDescription || s.description || existingData.shortDescription || existingData.description || ''
    ).trim() || `${fullBody.replace(/\s+/g, ' ').slice(0, 152)}...`;

    targetDocs.set(docId, {
      ...existingData,
      ...s,
      id: docId,
      title: String(s.title || existingData.title || 'සිංහල කතාව').trim(),
      slug: String(existingData.slug || s.slug || docId).trim(),
      shortDescription: desc,
      description: desc,
      fullContent: fullBody,
      content: fullBody,
      wordCount: words,
      readingTime,
      category: s.category || existingData.category || 'romantic',
      categoryId: s.categoryId || existingData.categoryId || s.category || 'romantic',
      categoryName: s.categoryName || existingData.categoryName || 'සිංහල කතා',
      tags:
        Array.isArray(s.tags) && s.tags.length > 0
          ? s.tags
          : Array.isArray(existingData.tags) && existingData.tags.length > 0
          ? existingData.tags
          : ['සිංහල වැල කතා', 'වල් කතා', 'වැල කතා'],
      coverImage: s.coverImage || existingData.coverImage || '',
      views: Math.max(Number(existingData.views) || 0, Number(s.views) || 12),
      likes: Math.max(Number(existingData.likes) || 0, Number(s.likes) || 0),
      featured: Boolean(s.featured ?? existingData.featured ?? false),
      published: existingData.isDeleted === true || s.isDeleted === true ? false : true,
      uploadDate: existingData.uploadDate || s.uploadDate || '2026-05-01T00:00:00.000Z',
      uploadedDate: existingData.uploadedDate || s.uploadedDate || s.uploadDate || '2026-05-01T00:00:00.000Z',
      updatedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Also check if any doc in existingPrimarySnap wasn't in rawStories by id
  existingPrimarySnap.forEach((d) => {
    if (!targetDocs.has(d.id)) {
      const data = d.data();
      const slugKey = String(data.slug || '').trim().toLowerCase();
      const matchedFull = fullById.get(d.id) || fullBySlug.get(slugKey);
      if (matchedFull) {
        const fullBody = String(matchedFull.fullContent || matchedFull.content || data.fullContent || '').trim();
        const words = fullBody ? fullBody.split(/\s+/).length : 0;
        targetDocs.set(d.id, {
          ...data,
          fullContent: fullBody,
          content: fullBody,
          wordCount: words,
          readingTime: Math.max(4, Math.ceil(words / 180)),
          updatedDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });

  // Also check existing contentDb docs so we only write docs that need updating
  const existingContentSnap = await getDocs(collection(contentDb, 'stories')).catch(() => null);
  const contentById = new Map<string, any>();
  if (existingContentSnap) {
    existingContentSnap.forEach((d) => contentById.set(d.id, d.data()));
  }

  const allDocs = Array.from(targetDocs.values());
  const docsNeedingPrimarySync = allDocs.filter((d) => {
    const prev = primaryById.get(d.id);
    return !prev || (prev.fullContent || '').length < (d.fullContent || '').length - 10;
  });
  const docsNeedingContentSync = allDocs.filter((d) => {
    const prev = contentById.get(d.id);
    return !prev || (prev.fullContent || '').length < (d.fullContent || '').length - 10;
  });

  console.log(
    `Total prepared: ${allDocs.length}. Remaining to update in walkathawa-93f80: ${docsNeedingPrimarySync.length}, in contentDb: ${docsNeedingContentSync.length}.`
  );

  const batchSize = 20;

  if (docsNeedingPrimarySync.length > 0) {
    let syncedPrimary = 0;
    for (let i = 0; i < docsNeedingPrimarySync.length; i += batchSize) {
      const chunk = docsNeedingPrimarySync.slice(i, i + batchSize);
      const primaryBatch = writeBatch(db);
      for (const storyDoc of chunk) {
        const docId = storyDoc.id;
        primaryBatch.set(doc(db, 'stories', docId), storyDoc, { merge: true });
        primaryBatch.set(
          doc(db, 'posts', docId),
          {
            id: docId,
            slug: storyDoc.slug,
            title: storyDoc.title,
            fullContent: storyDoc.fullContent,
            content: storyDoc.content,
            shortDescription: storyDoc.shortDescription,
            wordCount: storyDoc.wordCount,
            readingTime: storyDoc.readingTime,
            category: storyDoc.category,
            tags: storyDoc.tags,
            published: storyDoc.published,
            uploadDate: storyDoc.uploadDate,
            updatedDate: storyDoc.updatedDate,
          },
          { merge: true }
        );
      }
      await primaryBatch.commit();
      syncedPrimary += chunk.length;
      console.log(`Synced ${syncedPrimary}/${docsNeedingPrimarySync.length} remaining stories to walkathawa-93f80...`);
    }
  }

  if (docsNeedingContentSync.length > 0) {
    let syncedContent = 0;
    for (let i = 0; i < docsNeedingContentSync.length; i += batchSize) {
      const chunk = docsNeedingContentSync.slice(i, i + batchSize);
      const contentBatch = writeBatch(contentDb);
      for (const storyDoc of chunk) {
        const docId = storyDoc.id;
        contentBatch.set(doc(contentDb, 'stories', docId), storyDoc, { merge: true });
        contentBatch.set(
          doc(contentDb, 'posts', docId),
          {
            id: docId,
            slug: storyDoc.slug,
            title: storyDoc.title,
            fullContent: storyDoc.fullContent,
            content: storyDoc.content,
            shortDescription: storyDoc.shortDescription,
            wordCount: storyDoc.wordCount,
            readingTime: storyDoc.readingTime,
            category: storyDoc.category,
            tags: storyDoc.tags,
            published: storyDoc.published,
            uploadDate: storyDoc.uploadDate,
            updatedDate: storyDoc.updatedDate,
          },
          { merge: true }
        );
      }
      try {
        await contentBatch.commit();
        syncedContent += chunk.length;
        console.log(`Synced ${syncedContent}/${docsNeedingContentSync.length} remaining stories to contentDb...`);
      } catch (err: any) {
        console.warn('Notice on contentDb batch commit:', err.message);
        break;
      }
    }
  }

  // Verify both databases after sync
  const verifyPrimary = await getDocs(collection(db, 'stories'));
  let primaryFullCount = 0;
  verifyPrimary.forEach((d) => {
    if ((d.data().fullContent || '').length > 500) primaryFullCount++;
  });

  console.log(
    `VERIFIED walkathawa-93f80 (db): ${verifyPrimary.size} total stories, ${primaryFullCount} with fullContent > 500 chars!`
  );

  const verifyContent = await getDocs(collection(contentDb, 'stories')).catch(() => null);
  if (verifyContent) {
    let contentFullCount = 0;
    verifyContent.forEach((d) => {
      if ((d.data().fullContent || '').length > 500) contentFullCount++;
    });
    console.log(
      `VERIFIED ai-studio-walkatha (contentDb): ${verifyContent.size} total stories, ${contentFullCount} with fullContent > 500 chars!`
    );
  }
  process.exit(0);
}

pushAllStoriesToBothFirestores().catch((err) => {
  console.error('Error syncing full stories to Firestore:', err);
  process.exit(1);
});
