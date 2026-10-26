import assert from 'node:assert/strict';
import { test } from 'node:test';
import { breakLines, cardFor, clip, countParts, durationLabel, excerpt, fitSize, formatDate, HEIGHT, lede, OVERLAY, overPhoto, WIDTH } from '../src/card.mjs';
import jpeg from 'jpeg-js';
import { dimensions } from '../src/post.mjs';
import { SITES } from '../src/sites.mjs';
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

// Every string a card draws, in order.
const texts = (node) =>
  typeof node === 'string' ? [node] : Array.isArray(node) ? node.flatMap(texts) : node?.props ? texts(node.props.children) : [];

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

// Things 4 Good's front page, as sites.mjs reads it.
const T4G_HOME = {
  title: 'Hand-poured candles, 100% for good.',
  kicker: '6th annual fall fundraiser',
  headline: 'Hand-poured candles,',
  accent: '100% for good.',
  text: '',
  facts: ['Nov 7–8, 2026', 'Minneapolis', '$25 a candle'],
  published: null,
  categories: [],
  photo: null,
};

const LINK = {
  title: 'Mandelnaut — Making Fractal Wallpapers',
  text: 'I love the Mandelbrot fractal.',
  published: '2026-10-09T01:29:08Z',
  categories: [],
  photo: null,
  host: 'techmatt.github.io',
  issues: ['WT353'],
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
    [LINK, { site: SITES.links, photo: null }],
    [{ ...LINK, text: '', issues: [] }, { site: SITES.links, photo: null }],
    [HOME, { site: SITES.weekly, photo: { src: DOT } }],
    [HOME, { site: SITES.weekly, photo: null }],
    [T4G_HOME, { site: SITES.t4g, photo: null }],
    [{ ...T4G_HOME, headline: 'Where the good has gone.', accent: '', facts: [], text: 'Every nonprofit we have supported since 2021.' }, { site: SITES.t4g, photo: null }],
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
  assert.match(words, /"children":"WT353 · OCTOBER 10, 2026"/);
  // The band is dark on every card: the site's dark-mode strip colour, or the
  // strip's light ink for a site with none.
  assert.match(words, /"color":"#78acf2"},"children":"Newsletter"/);
  assert.match(words, /"backgroundColor":"#0e0e12"/);
  assert.match(JSON.stringify(cardFor(post, { site: SITES.www, photo: null })), /"color":"#ececf0"},"children":"Blog"/);
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
  assert.ok(texts(tree).join(' ').includes('19 links 4 journal entries'));
  assert.match(words, /Your Version Number Release Notes/);
  // The photo is darkened from the left too, behind the words.
  assert.match(words, /linear-gradient\(90deg, rgba\(10,10,14,0\.5\) 0%/);
  const png = await render(tree, dir);
  assert.equal(png.readUInt32BE(16), WIDTH);
  assert.equal(png.readUInt32BE(20), HEIGHT);
  // One of each says so; none is left out. With no cover, the counts go under the words.
  const one = texts(cardFor({ ...post, counts: { links: 1, journal: 0 } }, { site: SITES.weekly, photo: null, kicker: 'WT353' }));
  assert.ok(one.join(' ').includes('1 link'));
  assert.ok(!one.some((said) => said.includes('journal')));
});

test('an issue with no cover is drawn on the newsletter blue under its W', () => {
  const post = { title: 'Weekly Thing for May 13, 2017', text: 'Layne Kennedy.', published: '2017-05-13T13:00:00Z', categories: [], counts: { links: 17, journal: 0 } };
  const words = JSON.stringify(cardFor(post, { site: SITES.weekly, photo: null, kicker: 'WT1' }));
  assert.match(words, /linear-gradient\(135deg, #1f6fd6/);
  assert.match(words, /data:image\/svg\+xml;base64,/);
  assert.match(words, /"children":"WT1 · MAY 13, 2017"/);
  assert.match(words, /"children":"17"/);
});

test('an episode reads as the show: its number and date, and its crimson dot a play button with its running time', () => {
  const post = { title: 'How do you start a podcast?', text: 'Stepping into podcasting.', published: '2025-10-05T12:00:00Z', categories: [], episode: { number: 1, seconds: 635 } };
  const words = JSON.stringify(cardFor(post, { site: SITES.another, photo: null }));
  assert.match(words, /"children":"EPISODE 1 · OCTOBER 5, 2025"/);
  assert.match(words, /"children":"Another Thing"/);
  assert.match(words, /"children":"LISTEN · 11 MIN"/);
  assert.match(words, /"width":132,"height":132,"borderRadius":66,"backgroundColor":"#c8174a"/);
  assert.match(words, /"color":"#f58aa3"},"children":"Podcast"/);
  // A page that doesn't say its number or length still gets the card.
  const bare = JSON.stringify(cardFor({ ...post, episode: { number: 0, seconds: 0 } }, { site: SITES.another, photo: null }));
  assert.match(bare, /"children":"OCTOBER 5, 2025"/);
  assert.match(bare, /"children":"LISTEN"/);
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

const WIDE = { src: DOT, width: 1200, height: 900 };

test('a blog post is drawn over its photo when the photo is wide and the words a headline', () => {
  const micro = { title: '', text: 'Red leaves today.' };
  assert.equal(overPhoto(micro, WIDE), true);
  assert.equal(overPhoto({ title: 'Art Shanty Projects', text: 'Words. '.repeat(60) }, WIDE), true);
  // A square or tall photo, a screenshot, a photo of unknown size, or more
  // words than a headline: beside it, as before.
  assert.equal(overPhoto(micro, { ...WIDE, height: 1200 }), false);
  assert.equal(overPhoto(micro, { ...WIDE, width: 900 }), false);
  assert.equal(overPhoto(micro, { ...WIDE, screenshot: true }), false);
  assert.equal(overPhoto(micro, { src: DOT }), false);
  assert.equal(overPhoto({ title: '', text: 'x'.repeat(OVERLAY.words + 1) }, WIDE), false);
  assert.equal(overPhoto({ title: '', text: 'x'.repeat(OVERLAY.words) }, WIDE), true);
  assert.equal(overPhoto(micro, null), false);
  // Another answer, as a preview asks for it.
  assert.equal(overPhoto(micro, { ...WIDE, height: 1200 }, { ...OVERLAY, wide: 0.95 }), true);
});

test('over its photo, a micropost is its own headline and a titled post keeps its text', () => {
  const base = { published: '2026-10-24T12:00:00Z', categories: ['Photos'] };
  const micro = JSON.stringify(cardFor({ ...base, title: '', text: 'Red leaves today.' }, { site: SITES.www, photo: WIDE }));
  assert.match(micro, /"position":"absolute"/);
  assert.match(micro, /"fontFamily":"Inter Tight","fontWeight":800[^}]*"fontSize":88[^}]*},"children":"Red leaves today\."/);
  assert.match(micro, /"children":"OCTOBER 24, 2026 · PHOTOS"/);
  assert.match(micro, /rgba\(10,10,14,0\.72\) 0%/);
  const titled = JSON.stringify(
    cardFor({ ...base, title: 'Art Shanty Projects', text: 'We walked the lake. '.repeat(20) }, { site: SITES.www, photo: WIDE }),
  );
  assert.match(titled, /"children":"Art Shanty Projects"/);
  assert.match(titled, /"children":"We walked the lake\./);
  // A square photo stands full height on the right half, on black: no layer over it.
  const square = JSON.stringify(cardFor({ ...base, title: '', text: 'Red leaves today.' }, { site: SITES.www, photo: { ...WIDE, height: 1200 } }));
  assert.match(square, /"position":"absolute","top":0,"left":600,"width":600,"height":630/);
  assert.doesNotMatch(square, /rgba\(10,10,14/);
  // A longer micropost, when the limit lets one in, steps down to fit.
  const long = JSON.stringify(cardFor({ ...base, title: '', text: 'word '.repeat(28).trim() }, { site: SITES.www, photo: WIDE, overlay: { words: 150 } }));
  assert.match(long, /"fontSize":48/);
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

test('a link card reads as its record: the day saved, its issues, host, title and note', () => {
  const tree = cardFor(LINK, { site: SITES.links, photo: null });
  const words = JSON.stringify(tree);
  const said = texts(tree).join(' ');
  for (const part of ['SAVED OCTOBER 8, 2026', 'In WT353', 'techmatt.github.io', LINK.title, LINK.text, 'JAMIE’S NOTE']) assert.ok(said.includes(part), part);
  // On black, each line of the title underlined in the dark-mode link blue.
  assert.match(words, /"backgroundColor":"#121218"/);
  assert.match(words, /"borderBottom":"4px solid #78acf2"/);
  assert.match(words, /"color":"#ececf0"},"children":"Links"/);
  // More issues than two: the first two, then how many more.
  const many = texts(cardFor({ ...LINK, issues: ['WT1', 'WT2', 'WT3', 'WT4'] }, { site: SITES.links, photo: null }));
  assert.deepEqual(many.filter((t) => /^In WT|^\+/.test(t)), ['In WT1', 'In WT2', '+2']);
});

test('a title too long for its lines is cut at a word, never clamped', () => {
  assert.equal(clip('Short title', 20), 'Short title');
  assert.equal(clip('Vision Pro is an over-engineered devkit // Hardware bleeds genius', 45), 'Vision Pro is an over-engineered devkit…');
  const long = 'Dumb refrigerator, meet Smarter FridgeCam '.repeat(6);
  const said = texts(cardFor({ ...LINK, title: long, text: '' }, { site: SITES.links, photo: null }));
  const end = said.findIndex((t) => t.endsWith('…'));
  const start = said.findIndex((t) => long.startsWith(t));
  const title = said.slice(start, end + 1).join(' ');
  assert.ok(end >= 0 && title.length < long.length, title);
});

test('a headline is broken into even lines, or left to Satori when it cannot be', () => {
  // 14 characters a line at 0.55em: the fewest lines, the widest as short as it can be.
  assert.deepEqual(breakLines('Worked with Claude today', { size: 100, width: 800, most: 3 }), ['Worked with', 'Claude today']);
  assert.deepEqual(breakLines('Red leaves.', { size: 100, width: 800, most: 3 }), ['Red leaves.']);
  // No word alone on the last line.
  assert.deepEqual(breakLines('How do you start a podcast?', { size: 100, width: 1100, most: 2 }), ['How do you', 'start a podcast?']);
  // More lines than allowed, or a word wider than a line: null.
  assert.equal(breakLines('one two three four five six seven', { size: 100, width: 400, most: 2 }), null);
  assert.equal(breakLines('Incomprehensibilities', { size: 100, width: 800, most: 3 }), null);
});

test('a micropost leads with its first sentence only when that sentence is short', () => {
  const rest = 'I publish links every week in the Weekly Thing but never had a site for all of them.';
  assert.deepEqual(lede(`Worked with Claude today and created Linking Things! ${rest}`), { first: 'Worked with Claude today and created Linking Things!', rest });
  // Short enough to be a headline whole; a first sentence too long, or too
  // short to stand alone; one sentence only.
  assert.equal(lede('Red leaves today.'), null);
  assert.equal(lede(`${'A very long first sentence that keeps going and going '.repeat(2)}. ${rest}`), null);
  assert.equal(lede(`Wow. ${rest}`), null);
  assert.equal(lede('word '.repeat(30)), null);
  const ink = cardFor({ title: '', text: `Worked with Claude today and created Linking Things! ${rest}`, published: '2026-10-23T12:00:00Z', categories: [] }, { site: SITES.www, photo: null });
  assert.ok(texts(ink).includes(rest));
  assert.match(JSON.stringify(ink), /"backgroundColor":"#16161a"/);
});

test('an issue counts what it has, one or many', () => {
  assert.deepEqual(countParts({ links: 19, journal: 4 }), [[19, 'links'], [4, 'journal entries']]);
  assert.deepEqual(countParts({ links: 1, journal: 1 }), [[1, 'link'], [1, 'journal entry']]);
  assert.deepEqual(countParts({ links: 0, journal: 0 }), []);
  assert.deepEqual(countParts(undefined), []);
});

test('a screenshot runs off the corner of the card, framed, beside the words', () => {
  const post = { title: 'Phishing Fear', text: 'Well done phishing campaign.', published: '2026-10-24T12:00:00Z', categories: [] };
  const words = JSON.stringify(cardFor(post, { site: SITES.www, photo: { src: DOT, width: 1400, height: 1000, screenshot: true } }));
  assert.match(words, /"top":64,"left":590,"width":700,"height":500/);
  assert.match(words, /"borderRadius":16/);
  // A screenshot of unknown size fills the height above the band.
  assert.match(JSON.stringify(cardFor(post, { site: SITES.www, photo: { src: DOT, screenshot: true } })), /"width":700,"height":562/);
});

test('a Things 4 Good card reads as its site: candle, serif heading, pale pine accent, facts and the family', () => {
  const tree = cardFor(T4G_HOME, { site: SITES.t4g, photo: { src: DOT, width: 1200, height: 562 } });
  const words = JSON.stringify(tree);
  assert.deepEqual(texts(tree), [
    '6TH ANNUAL FALL FUNDRAISER',
    'Hand-poured candles,',
    '100% for good.',
    'Nov 7–8, 2026',
    'Minneapolis',
    '$25 a candle',
    'The Thingelstad Family',
    'Things 4 Good',
    'things4good.xyz',
  ]);
  assert.match(words, /"fontFamily":"Newsreader"/);
  assert.match(words, /"fontStyle":"italic","color":"#9fdcc6"/);
  assert.match(words, /"color":"#f2a65a"},"children":"Things 4 Good"/);
  assert.match(words, /"backgroundColor":"#1c140e"/);
  // A line under the heading, in the site's grotesk; no photo, no photo drawn.
  const plain = cardFor({ ...T4G_HOME, accent: '', facts: [], text: 'Everything about the candles.' }, { site: SITES.t4g, photo: null });
  assert.match(JSON.stringify(plain), /"fontFamily":"Hanken Grotesk"/);
  assert.ok(!JSON.stringify(plain).includes('"type":"img","props":{"src":"data:image/png'));
});
