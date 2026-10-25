import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardFor, excerpt, fitSize, formatDate, HEIGHT, WIDTH } from '../src/card.mjs';
import { SITES } from '../src/post.mjs';
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
  // An issue with no cover, and an episode: the kicker and the site's mark.
  for (const [site, kicker] of [[SITES.weekly, 'WT1'], [SITES.another, undefined]]) {
    const post = { title: 'Weekly Thing for May 13, 2017', text: 'Layne Kennedy, Minnesota Original.', published: '2017-05-13T13:00:00Z', categories: [], photo: null };
    const png = await render(cardFor(post, { site, photo: null, kicker }), dir);
    assert.equal(png.readUInt32BE(16), WIDTH);
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

// A 1 x 1 PNG, standing in for a cover.
const DOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

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
