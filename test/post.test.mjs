import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstPhoto, plainText, postFor, readPost } from '../src/post.mjs';

test('a card path names a blog post', () => {
  assert.deepEqual(postFor('/www/2026/10/15/the-nnxyz-rooms.png'), {
    site: 'www',
    url: 'https://www.thingelstad.com/2026/10/15/the-nnxyz-rooms.html',
  });
  assert.deepEqual(postFor('/www/2009/01/02/123456.png')?.url, 'https://www.thingelstad.com/2009/01/02/123456.html');
});

test('anything else is not a card', () => {
  for (const path of [
    '/',
    '/health',
    '/www/2026/10/15/the-nnxyz-rooms.html',
    '/www/2026/10/15/../../x.png',
    '/www/2026/10/the-nnxyz-rooms.png',
    '/weekly/2026/10/15/x.png',
    '/www/2026/10/15/a.b.png',
    '/www/2026/10/15/x.png/extra',
  ])
    assert.equal(postFor(path), null, path);
});

test('plain text drops photos, captions and embeds', () => {
  const html =
    '<p>First <em>line</em>.</p><figure><img src="a.jpg"><figcaption>Caption</figcaption></figure>' +
    '<p>Second&nbsp;line.</p><script>x()</script><ul><li>One</li><li>Two</li></ul>';
  assert.equal(plainText(html), 'First line. Second line. One Two');
});

test('the first photo is an upload, never an icon or another host', () => {
  assert.equal(
    firstPhoto(
      '<img src="https://example.com/a.jpg"><img src="https://cdn.uploads.micro.blog/1/icon.png" width="64">' +
        '<img src="https://www.thingelstad.com/uploads/2026/photo.jpg" width="600">',
    ),
    'https://www.thingelstad.com/uploads/2026/photo.jpg',
  );
  assert.equal(firstPhoto('<p>No photos</p>'), null);
});

const page = (entry) => `<!doctype html><html><body><main>${entry}</main></body></html>`;

test('a titled post reads its title, text, date, categories and photo', () => {
  const post = readPost(
    page(`<article class="h-entry">
      <h1 class="p-name">The   NNXYZ rooms</h1>
      <time class="dt-published" datetime="2026-10-15T09:30:00-05:00">October 15</time>
      <a class="p-category" href="/categories/travel/">Travel</a>
      <div class="e-content"><p>We went.</p><img src="https://cdn.uploads.micro.blog/1/2026/room.jpg"></div>
    </article>`),
    'https://www.thingelstad.com/2026/10/15/the-nnxyz-rooms.html',
  );
  assert.equal(post.title, 'The NNXYZ rooms');
  assert.equal(post.text, 'We went.');
  assert.equal(post.published, '2026-10-15T09:30:00-05:00');
  assert.deepEqual(post.categories, ['Travel']);
  assert.equal(post.photo, 'https://cdn.uploads.micro.blog/1/2026/room.jpg');
});

test('a micropost has no title', () => {
  const post = readPost(
    page(`<article class="h-entry"><div class="e-content"><p>Morning coffee.</p></div>
      <time class="dt-published" datetime="2026-10-17T07:00:00-05:00"></time></article>`),
    'https://www.thingelstad.com/2026/10/17/morning-coffee.html',
  );
  assert.equal(post.title, '');
  assert.equal(post.text, 'Morning coffee.');
  assert.equal(post.photo, null);
});

test('a page with no h-entry is an error', () => {
  assert.throws(() => readPost(page('<p>Hello</p>'), 'https://www.thingelstad.com/x.html'), /no h-entry/);
});
