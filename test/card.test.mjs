import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardFor, durationLabel, excerpt, fitSize, formatDate, HEIGHT, WIDTH } from '../src/card.mjs';
import jpeg from 'jpeg-js';
import { dimensions, SITES } from '../src/post.mjs';
import { emojiAsset, emojiFiles, render } from '../src/render.mjs';
import { stageAssets } from '../tools/package.mjs';

test('dates are Jamie\'s calendar day', () => {
  assert.equal(formatDate('2026-10-16T03:30:00Z'), 'October 15, 2026');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('not a date'), '');
});

test('an excerpt ends at a sentence where one fits, else at a word', () => {
  assert.equal(excerpt('Short.', 50), 'Short.');
  assert.equal(excerpt('One sentence here. Another one that runs long past the end.', 30), 'One sentence here.');
  assert.equal(excerpt('a few words that run on and on without stopping at all', 30), 'a few words that run on and on…');
});

test('a title shrinks until its longest word fits a line', () => {
  assert.equal(fitSize(72, 'Morning coffee', 472, 0.64), 72);
  assert.equal(fitSize(72, '2013 Minnesota Kubb Tournament Photos', 472, 0.64), 72);
  assert.equal(fitSize(100, 'Supercalifragilisticexpialidocious', 1072, 0.64), 49);
  assert.equal(fitSize(72, 'https://example.com/a/very/long/address/that/never/breaks', 472, 0.64), 28);
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// A 1 x 1 PNG, standing in for a cover.
const DOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
// The newsletter's front page, as post.mjs reads its h-feed.
const HOME = {
  site: 'weekly',
  home: true,
  title: 'Weekly Thing',
  kicker: 'Weekend reading since 2017',
  headline: [
    [{ text: 'A weekend letter', accent: false }],
    [{ text: 'about ', accent: false }, { text: 'what I’m', accent: true }],
    [{ text: 'learning.', accent: true }],
  ],
  text: 'A weekend letter about what I’m learning.',
  published: null,
  categories: [],
  counts: { issues: 353, links: 6510 },
};

test('every kind of card draws a 1200 x 630 PNG', async () => {
  const dir = await stageAssets();
  const posts = [
    { title: 'A world that doesn’t need new software is a world without ideas.', text: 'Words. '.repeat(80) },
    { title: '', text: 'Worked with Claude today and created Linking Things! '.repeat(4) },
    { title: '', text: 'Ok.' },
    { title: 'Ünïcödé — “quotes” and Łódź', text: '' },
    { title: `Red leaves. ${String.fromCodePoint(0x1f342)}`, text: '' },
  ];
  for (const base of posts) {
    const post = { published: '2026-10-15T12:00:00Z', categories: ['Travel', 'Food'], photo: null, ...base };
    const png = await render(cardFor(post, { site: SITES.www, photo: null }), dir);
    assert.deepEqual(png.subarray(0, 8), PNG);
    assert.equal(png.readUInt32BE(16), WIDTH);
    assert.equal(png.readUInt32BE(20), HEIGHT);
  }
  // An issue with no cover, an episode, and the newsletter's front page with
  // and without its cover.
  const issue = { title: 'Weekly Thing for May 13, 2017', text: 'Layne Kennedy, Minnesota Original.', published: '2017-05-13T13:00:00Z', categories: [], photo: null, counts: { links: 17, journal: 0 } };
  const episode = { title: 'How do you start a podcast?', text: 'Stepping into podcasting.', published: '2025-10-05T12:00:00Z', categories: [], photo: null, episode: { number: 1, seconds: 635 } };
  for (const [post, opts] of [
    [issue, { site: SITES.weekly, photo: null, kicker: 'WT1' }],
    [episode, { site: SITES.another, photo: null }],
    [HOME, { site: SITES.weekly, photo: { src: DOT } }],
    [HOME, { site: SITES.weekly, photo: null }],
  ]) {
    const png = await render(cardFor(post, opts), dir);
    assert.deepEqual(png.subarray(0, 8), PNG);
    assert.equal(png.readUInt32BE(16), WIDTH);
    assert.equal(png.readUInt32BE(20), HEIGHT);
  }
});

test('an issue card names the issue before the date, and its site in its colour', () => {
  const post = { title: 'Release Notes for Every Day', text: '', published: '2026-10-10T12:00:00Z', categories: [], photo: null };
  const words = JSON.stringify(cardFor(post, { site: SITES.weekly, photo: null, kicker: 'WT353' }));
  assert.match(words, /WT353 · October 10, 2026/);
  assert.match(words, /"color":"#1a5eb6"},"children":"Newsletter"/);
  assert.match(JSON.stringify(cardFor(post, { site: SITES.www, photo: null })), /"color":"#16161a"},"children":"Blog"/);
  const dated = { ...post, title: 'May 5, 2018', published: '2018-05-05T12:00:00Z' };
  assert.match(JSON.stringify(cardFor(dated, { site: SITES.weekly, photo: null, kicker: 'WT52' })), /"children":"WT52"/);
});


test('an issue with a cover sets its words over it, with its counts', async () => {
  const dir = await stageAssets();
  const post = {
    title: 'Release Notes for Every Day',
    text: 'Your Version Number Release Notes, Claude Haiku 5.5, zkAPI.',
    published: '2026-10-10T12:00:00Z',
    categories: [],
    counts: { links: 19, journal: 4 },
  };
  const tree = cardFor(post, { site: SITES.weekly, photo: { src: DOT }, kicker: 'WT353' });
  const words = JSON.stringify(tree);
  assert.match(words, /"position":"absolute"/);
  assert.match(words, /19 links · 4 journal entries/);
  assert.match(words, /Your Version Number Release Notes/);
  const png = await render(tree, dir);
  assert.equal(png.readUInt32BE(16), WIDTH);
  assert.equal(png.readUInt32BE(20), HEIGHT);
  // One of each says so; none is left out. With no cover, the counts go under the words.
  const one = JSON.stringify(cardFor({ ...post, counts: { links: 1, journal: 0 } }, { site: SITES.weekly, photo: null, kicker: 'WT353' }));
  assert.match(one, /"children":"1 link"/);
  assert.doesNotMatch(one, /journal/);
});

test('an issue with no cover is drawn on the newsletter blue under its W', () => {
  const post = { title: 'Weekly Thing for May 13, 2017', text: 'Layne Kennedy.', published: '2017-05-13T13:00:00Z', categories: [], counts: { links: 17, journal: 0 } };
  const words = JSON.stringify(cardFor(post, { site: SITES.weekly, photo: null, kicker: 'WT1' }));
  assert.match(words, /linear-gradient\(135deg, #1f6fd6/);
  assert.match(words, /data:image\/svg\+xml;base64,/);
  assert.match(words, /"children":"WT1 · May 13, 2017"/);
  assert.match(words, /"children":"17 links"/);
});

test('an episode reads as the show: its number, date, running time and a listen button', () => {
  const post = { title: 'How do you start a podcast?', text: 'Stepping into podcasting.', published: '2025-10-05T12:00:00Z', categories: [], episode: { number: 1, seconds: 635 } };
  const words = JSON.stringify(cardFor(post, { site: SITES.another, photo: null }));
  assert.match(words, /"children":"EPISODE 1 · OCTOBER 5, 2025"/);
  assert.match(words, /"children":"Another Thing"/);
  assert.match(words, /"children":"Listen · 11 min"/);
  assert.match(words, /"color":"#b3123f"},"children":"Podcast"/);
  // A page that doesn't say its number or length still gets the card.
  const bare = JSON.stringify(cardFor({ ...post, episode: { number: 0, seconds: 0 } }, { site: SITES.another, photo: null }));
  assert.match(bare, /"children":"OCTOBER 5, 2025"/);
  assert.match(bare, /"children":"Listen"/);
});

test('a running time reads as the episode page says it', () => {
  assert.equal(durationLabel(635), '11 min');
  assert.equal(durationLabel(3600), '1 hr');
  assert.equal(durationLabel(3900), '1 hr 5 min');
  assert.equal(durationLabel(29), '0 min');
  assert.equal(durationLabel('nope'), '0 min');
});

test('the front page card carries its hero line, accent and archive size', () => {
  const words = JSON.stringify(cardFor(HOME, { site: SITES.weekly, photo: { src: DOT } }));
  assert.match(words, /"children":"WEEKEND READING SINCE 2017"/);
  assert.match(words, /"color":"#8fbcf5","whiteSpace":"pre"},"children":"what I’m"/);
  assert.match(words, /"color":"#ffffff","whiteSpace":"pre"},"children":"about "/);
  assert.match(words, /"children":"353 issues · 6,510 links"/);
  assert.match(words, /"children":"Weekly Thing"/);
  // No hero line read: the name stands in; no counts, no counts line.
  const bare = JSON.stringify(cardFor({ ...HOME, headline: [], counts: { issues: 0, links: 0 } }, { site: SITES.weekly, photo: null }));
  assert.doesNotMatch(bare, /issues/);
  assert.match(bare, /"whiteSpace":"pre"},"children":"Weekly Thing"/);
});

// A 1200 x 900 photo: a gradient with grain, so it compresses like one.
function photo() {
  const [width, height] = [1200, 900];
  const data = Buffer.alloc(width * height * 4);
  let seed = 7;
  for (let i = 0; i < width * height; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const grain = (seed % 33) - 16;
    const [x, y] = [i % width, Math.floor(i / width)];
    data.set([(x * 200) / width + 40 + grain, (y * 160) / height + 60 + grain, 120 + grain, 255], i * 4);
  }
  const bytes = Buffer.from(jpeg.encode({ data, width, height }, 90).data);
  return { bytes, src: `data:image/jpeg;base64,${bytes.toString('base64')}` };
}

test('an image says its size in its header', () => {
  assert.deepEqual(dimensions(Buffer.from(DOT.split(',')[1], 'base64')), { width: 1, height: 1 });
  assert.deepEqual(dimensions(photo().bytes), { width: 1200, height: 900 });
  assert.deepEqual(dimensions(Buffer.from('GIF89a')), {});
  assert.deepEqual(dimensions(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), {});
});

test('a card with a photo is a 1200 x 630 JPEG, under Bluesky\'s 1 MB', async () => {
  const dir = await stageAssets();
  const { src } = photo();
  const issue = { title: 'Release Notes for Every Day', text: 'Words.', published: '2026-10-10T12:00:00Z', categories: [], counts: { links: 19, journal: 4 } };
  const post = { title: '', text: 'Red leaves today.', published: '2026-10-24T12:00:00Z', categories: [] };
  for (const [card, site] of [[issue, SITES.weekly], [post, SITES.www]]) {
    const image = await render(cardFor(card, { site, photo: { src, width: 1200, height: 900 } }), dir, { format: 'jpeg' });
    assert.deepEqual([...image.subarray(0, 2)], [0xff, 0xd8]);
    assert.deepEqual(dimensions(image), { width: WIDTH, height: HEIGHT });
    assert.ok(image.length < 1_000_000, `${image.length} bytes`);
  }
});

const emoji = (...points) => String.fromCodePoint(...points);

test('an emoji finds its Twemoji file', async () => {
  assert.deepEqual(emojiFiles(emoji(0x1f342)), ['1f342.svg']);
  assert.deepEqual(emojiFiles(emoji(0x2764, 0xfe0f)), ['2764.svg']);
  assert.deepEqual(emojiFiles(emoji(0x2764, 0xfe0f, 0x200d, 0x1f525)), ['2764-fe0f-200d-1f525.svg', '2764-200d-1f525.svg']);
  const load = emojiAsset(await stageAssets());
  assert.match(await load('emoji', emoji(0x1f342)), /^data:image\/svg\+xml;base64,/);
  assert.match(await load('emoji', emoji(0x2764, 0xfe0f, 0x200d, 0x1f525)), /^data:image\/svg\+xml;base64,/);
  assert.notEqual(await load('emoji', emoji(0x1f342)), await load('emoji', emoji(0x10ffff)));
  assert.deepEqual(await load('ja-JP', 'こんにちは'), []);
});
