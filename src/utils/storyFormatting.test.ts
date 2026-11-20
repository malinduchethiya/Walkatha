import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRouteState,
  splitStoryParagraphs,
  getStoryExcerpt,
  getStoryAuthorName,
  getCategoryLabel,
} from './storyFormatting';

test('resolveRouteState: parses core public, legacy, admin, and 404 routes cleanly', () => {
  const home = resolveRouteState('/', '?page=2');
  assert.equal(home.viewMode, 'home');
  assert.equal(home.currentPage, 2);

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
