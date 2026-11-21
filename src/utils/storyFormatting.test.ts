import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRouteState,
  splitStoryParagraphs,
  getStoryExcerpt,
  getStoryAuthorName,
  getCategoryLabel,
} from './storyFormatting';
import {
  parseInitialStoryPayload,
  parseInitialGalleryPayload,
} from './initialData';

test('resolveRouteState: parses core public, path pagination, legacy, admin, and 404 routes cleanly', () => {
  const home = resolveRouteState('/', '?page=2');
  assert.equal(home.viewMode, 'home');
  assert.equal(home.currentPage, 2);

  const homePage2 = resolveRouteState('/page/2', '');
  assert.equal(homePage2.viewMode, 'home');
  assert.equal(homePage2.currentPage, 2);
  assert.equal(homePage2.canonicalReplacePath, undefined);

  const homePage1 = resolveRouteState('/page/1', '');
  assert.equal(homePage1.viewMode, 'home');
  assert.equal(homePage1.currentPage, 1);
  assert.equal(homePage1.canonicalReplacePath, '/');

  const staticPrivacy = resolveRouteState('/page/privacy-policy', '');
  assert.equal(staticPrivacy.viewMode, 'static');
  assert.equal(staticPrivacy.staticSlug, 'privacy-policy');

  const story = resolveRouteState('/story/test-katha-1', '');
  assert.equal(story.viewMode, 'reader');
  assert.equal(story.selectedStorySlug, 'test-katha-1');
  assert.equal(story.canonicalReplacePath, undefined);

  const legacyPost = resolveRouteState('/posts/legacy-slug', '');
  assert.equal(legacyPost.viewMode, 'reader');
  assert.equal(legacyPost.selectedStorySlug, 'legacy-slug');
  assert.equal(legacyPost.canonicalReplacePath, '/story/legacy-slug');

  const category = resolveRouteState('/category/wife', '?page=3');
  assert.equal(category.viewMode, 'category');
  assert.equal(category.selectedCategory, 'wife');
  assert.equal(category.currentPage, 3);

  const categoryPathPage = resolveRouteState('/category/wife/page/3', '');
  assert.equal(categoryPathPage.viewMode, 'category');
  assert.equal(categoryPathPage.selectedCategory, 'wife');
  assert.equal(categoryPathPage.currentPage, 3);
  assert.equal(categoryPathPage.canonicalReplacePath, undefined);

  const categoryPage1 = resolveRouteState('/category/wife/page/1', '');
  assert.equal(categoryPage1.viewMode, 'category');
  assert.equal(categoryPage1.selectedCategory, 'wife');
  assert.equal(categoryPage1.currentPage, 1);
  assert.equal(categoryPage1.canonicalReplacePath, '/category/wife');

  const popularPage2 = resolveRouteState('/popular/page/2', '');
  assert.equal(popularPage2.viewMode, 'popular');
  assert.equal(popularPage2.currentPage, 2);

  const archivesPage2 = resolveRouteState('/archives/page/2', '');
  assert.equal(archivesPage2.viewMode, 'archives');
  assert.equal(archivesPage2.currentPage, 2);

  const legacyCat = resolveRouteState('/collections/school', '');
  assert.equal(legacyCat.viewMode, 'category');
  assert.equal(legacyCat.selectedCategory, 'school');
  assert.equal(legacyCat.canonicalReplacePath, '/category/school');

  const search = resolveRouteState('/search', '?s=amma');
  assert.equal(search.viewMode, 'search');
  assert.equal(search.searchQuery, 'amma');

  assert.equal(resolveRouteState('/categories', '').viewMode, 'categories');
  assert.equal(resolveRouteState('/popular', '').viewMode, 'popular');
  assert.equal(resolveRouteState('/archives', '').viewMode, 'archives');
  assert.equal(resolveRouteState('/sitemap', '').viewMode, 'sitemap');
  assert.equal(resolveRouteState('/about', '').viewMode, 'static');
  assert.equal(resolveRouteState('/admin', '').viewMode, 'admin');
  assert.equal(resolveRouteState('/does-not-exist', '').viewMode, 'not-found');
});

test('initialData: parses matching SSR story and gallery hydration payloads and rejects mismatches', () => {
  const storyPayload = JSON.stringify({
    story: { id: 's1', slug: 'sample-story-1', title: 'Sample Story', fullContent: 'Body text' },
    prevStory: { id: 's0', slug: 'prev-story', title: 'Prev' },
    nextStory: { id: 's2', slug: 'next-story', title: 'Next' },
    relatedStories: [{ id: 's3', slug: 'rel-story', title: 'Related' }],
  });

  const parsedStory = parseInitialStoryPayload(storyPayload, 'sample-story-1');
  assert.ok(parsedStory);
  assert.equal(parsedStory.story.title, 'Sample Story');
  assert.equal(parsedStory.prevStory?.slug, 'prev-story');
  assert.equal(parsedStory.nextStory?.slug, 'next-story');
  assert.equal(parsedStory.relatedStories?.length, 1);

  assert.equal(parseInitialStoryPayload(storyPayload, 'different-slug'), null);
  assert.equal(parseInitialStoryPayload('{invalid-json', 'sample-story-1'), null);

  const galleryPayload = JSON.stringify({
    viewMode: 'home',
    selectedCategory: 'all',
    currentPage: 2,
    totalStories: 613,
    totalPages: 31,
    stories: [{ id: 's21', slug: 'story-21', title: 'Story 21' }],
    categories: [{ id: 'wife', slug: 'wife', name: 'Wife' }],
  });

  const parsedGallery = parseInitialGalleryPayload(galleryPayload, 'home', 'all', 2);
  assert.ok(parsedGallery);
  assert.equal(parsedGallery.currentPage, 2);
  assert.equal(parsedGallery.stories.length, 1);

  assert.equal(parseInitialGalleryPayload(galleryPayload, 'home', 'all', 1), null);
  assert.equal(parseInitialGalleryPayload(galleryPayload, 'category', 'wife', 2), null);
});

test('splitStoryParagraphs: splits multi-paragraph and single-block Sinhala prose cleanly', () => {
  const multi = splitStoryParagraphs('පළමු ඡේදය.\n\nදෙවන ඡේදය.\n\nතෙවන ඡේදය.');
  assert.deepEqual(multi, ['පළමු ඡේදය.', 'දෙවන ඡේදය.', 'තෙවන ඡේදය.']);

  const singleBlock = splitStoryParagraphs('One. Two. Three. Four. Five. Six.');
  assert.equal(singleBlock.length, 2);
  assert.equal(singleBlock[0], 'One. Two. Three.');
  assert.equal(singleBlock[1], 'Four. Five. Six.');

  assert.deepEqual(splitStoryParagraphs('   '), []);
});

test('getStoryExcerpt, getStoryAuthorName, getCategoryLabel: format cleanly without English suffixes', () => {
  assert.equal(
    getStoryExcerpt({ shortDescription: 'Short clean summary.' }, 100),
    'Short clean summary.'
  );
  assert.equal(getStoryAuthorName({}), 'Walkathawa');
  assert.equal(getStoryAuthorName({ author: { name: 'Kasun' } }), 'Kasun');
  assert.equal(
    getCategoryLabel(
      { category: 'wife' },
      [{ id: 'wife', slug: 'wife', name: 'Wife Stories', sinhalaName: 'වයිෆ් / බිරිඳ (Wife Stories)' }]
    ),
    'වයිෆ් / බිරිඳ'
  );
});
