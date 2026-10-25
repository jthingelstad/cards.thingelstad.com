import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstPhoto, headlineLines, plainText, postFor, readPost } from '../src/post.mjs';

test('a card path names a blog post', () => {
  assert.deepEqual(postFor('/www/2026/10/15/the-nnxyz-rooms.png'), {
    site: 'www',
    url: 'https://www.thingelstad.com/2026/10/15/the-nnxyz-rooms.html',
  });
  assert.deepEqual(postFor('/www/2009/01/02/123456.png')?.url, 'https://www.thingelstad.com/2009/01/02/123456.html');
});

test('a card path names a Weekly Thing issue or an Another Thing episode', () => {
  assert.deepEqual(postFor('/weekly/archive/353.png'), {
    site: 'weekly',
    url: 'https://weekly.thingelstad.com/archive/353/',
    kicker: 'WT353',
  });
  assert.equal(postFor('/weekly/archive/140-special.png')?.kicker, 'WT140 special');
  assert.deepEqual(postFor('/weekly/index.png'), { site: 'weekly', url: 'https://weekly.thingelstad.com/', home: true });
  assert.deepEqual(postFor('/another/2025/10/05/how-do-you-start-a.png'), {
    site: 'another',
    url: 'https://another.thingelstad.com/2025/10/05/how-do-you-start-a.html',
  });
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
    '/weekly/archive/353/index.png',
    '/weekly/archive/../353.png',
    '/weekly/topics/claude.png',
    '/another/archive/1.png',
    '/xyz/things/thingy.png',
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

test('an issue reads its summary and cover; an episode its summary and no photo', () => {
  const issue = readPost(
    page(`<article class="issue h-entry">
      <p>Weekly Thing 353 · <time class="dt-published" datetime="2026-10-10T12:00:00Z">October 10, 2026</time></p>
      <h1 class="p-name">Release Notes for Every Day</h1>
      <data class="u-url" value="https://weekly.thingelstad.com/archive/353/"></data>
      <data class="u-featured" value="https://files.thingelstad.com/weekly-thing/353/cover.jpg"></data>
      <p class="p-summary">Your Version Number Release Notes, Claude Haiku 5.5.</p>
      <div class="e-content"><p>Hello friends.</p><img src="https://www.thingelstad.com/uploads/2026/x.jpg"></div>
    </article>`),
    'https://weekly.thingelstad.com/archive/353/',
  );
  assert.equal(issue.title, 'Release Notes for Every Day');
  assert.equal(issue.text, 'Your Version Number Release Notes, Claude Haiku 5.5.');
  assert.equal(issue.published, '2026-10-10T12:00:00Z');
  assert.equal(issue.photo, 'https://files.thingelstad.com/weekly-thing/353/cover.jpg');

  // A cover from anywhere else is no photo.
  const elsewhere = readPost(
    page(`<article class="h-entry"><h1 class="p-name">X</h1>
      <data class="u-featured" value="https://example.com/weekly-thing/cover.jpg"></data></article>`),
    'https://weekly.thingelstad.com/archive/1/',
  );
  assert.equal(elsewhere.photo, null);

  const episode = readPost(
    page(`<article class="h-entry"><h1 class="p-name">How do you start a podcast?</h1>
      <p class="p-summary">Stepping into podcasting.</p>
      <img class="u-featured" src="https://another.thingelstad.com/uploads/2025/another-thing-3000.png">
      <div class="e-content"><p>Show notes.</p></div></article>`),
    'https://another.thingelstad.com/2025/10/05/how-do-you-start-a.html',
  );
  assert.equal(episode.text, 'Stepping into podcasting.');
  assert.equal(episode.photo, null);
  assert.deepEqual(episode.episode, { number: 0, seconds: 0 });
  assert.equal(issue.episode, null);

  const numbered = readPost(
    page(`<article class="h-entry"><h1 class="p-name">How do you start a podcast?</h1>
      <data class="p-episode" value="1"></data><data class="p-duration" value="635"></data></article>`),
    'https://another.thingelstad.com/2025/10/05/how-do-you-start-a.html',
  );
  assert.deepEqual(numbered.episode, { number: 1, seconds: 635 });
});

test('the newsletter front page reads its h-feed', () => {
  const home = readPost(
    page(`<section class="home-hero h-feed">
      <data class="p-name" value="Weekly Thing"></data>
      <p class="eyebrow p-kicker">Weekend reading since 2017</p>
      <h1 class="e-summary">A weekend letter<br>about <em>what I&rsquo;m</em><br><em>learning.</em></h1>
      <data class="u-featured" value="https://files.thingelstad.com/weekly-thing/353/cover.jpg"></data>
      <data class="p-issue-count" value="353"></data><data class="p-link-count" value="6510"></data>
    </section>
    <footer><a class="h-card" href="https://www.thingelstad.com/">Jamie Thingelstad</a></footer>`),
    'https://weekly.thingelstad.com/',
    { home: true },
  );
  assert.equal(home.home, true);
  assert.equal(home.title, 'Weekly Thing');
  assert.equal(home.kicker, 'Weekend reading since 2017');
  assert.deepEqual(home.headline, [
    [{ text: 'A weekend letter', accent: false }],
    [{ text: 'about ', accent: false }, { text: 'what I’m', accent: true }],
    [{ text: 'learning.', accent: true }],
  ]);
  assert.equal(home.photo, 'https://files.thingelstad.com/weekly-thing/353/cover.jpg');
  assert.deepEqual(home.counts, { issues: 353, links: 6510 });
  assert.throws(() => readPost(page('<p>Hello</p>'), 'https://weekly.thingelstad.com/', { home: true }), /no h-feed/);
});

test('a headline keeps its line breaks and its accent', () => {
  assert.deepEqual(headlineLines('One<br/>two <strong>three</strong>  four'), [
    [{ text: 'One', accent: false }],
    [{ text: 'two ', accent: false }, { text: 'three', accent: true }, { text: ' four', accent: false }],
  ]);
  assert.deepEqual(headlineLines(''), []);
});

test('a blog post reads its own words, never a summary', () => {
  const post = readPost(
    page(`<article class="h-entry"><h1 class="p-name">T</h1><p class="p-summary">Summary.</p>
      <div class="e-content"><p>The post.</p></div></article>`),
    'https://www.thingelstad.com/2026/10/15/t.html',
  );
  assert.equal(post.text, 'The post.');
});
