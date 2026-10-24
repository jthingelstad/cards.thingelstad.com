import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardFor, excerpt, fitSize, formatDate, HEIGHT, WIDTH } from '../src/card.mjs';
import { SITES } from '../src/post.mjs';
import { render } from '../src/render.mjs';
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
  ];
  for (const base of posts) {
    const post = { published: '2026-10-15T12:00:00Z', categories: ['Travel', 'Food'], photo: null, ...base };
    const png = await render(cardFor(post, { site: SITES.www, photo: null }), dir);
    assert.deepEqual(png.subarray(0, 8), PNG);
    assert.equal(png.readUInt32BE(16), WIDTH);
    assert.equal(png.readUInt32BE(20), HEIGHT);
  }
});
