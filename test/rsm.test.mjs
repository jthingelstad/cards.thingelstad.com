// Road Sign Math's cards: its paths, its pages' microformats, the math from
// LaTeX, the map from the site's own SVG, and a card of each kind drawn.
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cardFor, HEIGHT, mapPaths, mathSize, RSM_SIGN, WIDTH } from '../src/card.mjs';
import { mathImage, mathSvg } from '../src/math.mjs';
import { fetchPhoto, postFor, readPost } from '../src/post.mjs';
import { render } from '../src/render.mjs';
import { dayLabel, rsmPin, SITES } from '../src/sites.mjs';
import { stageAssets } from '../tools/package.mjs';

const real = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = real;
});

const SITE = 'https://roadsignmath.xyz';
const PHOTO = `${SITE}/p/01hdc8mjn0hnm4c0b9jmq03d1q/large.jpg`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// A 1 x 1 PNG, standing in for a photo.
const DOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Every string a card draws, in order.
const texts = (node) =>
  typeof node === 'string' ? [node] : Array.isArray(node) ? node.flatMap(texts) : node?.props ? texts(node.props.children) : [];

test('a card path names a Road Sign Math sign, player or Home', () => {
  assert.deepEqual(postFor('/rsm/signs/osceola.png'), { site: 'rsm', url: `${SITE}/signs/osceola`, kind: 'sign' });
  assert.deepEqual(postFor('/rsm/signs/i-35w-at-82nd-street.png')?.url, `${SITE}/signs/i-35w-at-82nd-street`);
  assert.deepEqual(postFor('/rsm/players/jamie.png'), { site: 'rsm', url: `${SITE}/players/jamie`, kind: 'player', item: 'h-card' });
  assert.deepEqual(postFor('/rsm/index.png'), { site: 'rsm', url: `${SITE}/`, home: true });
  for (const path of [
    '/rsm/signs.png',
    '/rsm/signs/Osceola.png',
    '/rsm/signs/osceola/index.png',
    '/rsm/signs/../osceola.png',
    '/rsm/signs/a.b.png',
    '/rsm/players/jamie/signs.png',
    '/rsm/about.png',
    '/rsm/p/01hdc8mjn0hnm4c0b9jmq03d1q/large.png',
    `/rsm/signs/${'a'.repeat(81)}.png`,
  ])
    assert.equal(postFor(path), null, path);
});

const signPage = ({ tex = '5 + 1 = 6', math = '5 + 1 = 6', ways = 3, photo = PHOTO, finders = ['Jamie'] } = {}) => `<!doctype html>
<html><head><meta property="og:image" content="https://cards.thingelstad.com/rsm/signs/osceola.png?v=0123456789"></head>
<body><header><div class="h-card"><data class="p-name" value="Somebody else"></data></div></header>
<main class="sign h-entry">
  <data class="u-url" value="${SITE}/signs/osceola"></data>
  ${photo ? `<data class="u-photo" value="${photo}"></data>` : ''}
  <data class="p-location" value="Near Osceola, Missouri"></data>
  ${finders.map((f) => `<data class="p-finder" value="${f}"></data>`).join('')}
  ${math ? `<data class="p-math" value="${math}"></data>` : ''}
  ${tex ? `<data class="p-tex" value="${tex}"></data>` : ''}
  <data class="p-way-count" value="${ways}"></data>
  <data class="p-number" value="5"></data><data class="p-number" value="1"></data><data class="p-number" value="6"></data>
  <h1 class="p-name">Osceola</h1>
  <time class="dt-published" datetime="2023-10-22">Oct 22, 2023</time>
</main></body></html>`;

test('a sign page reads its name, photo, place, finders, day, first way and numbers', () => {
  const post = readPost(signPage(), `${SITE}/signs/osceola`, postFor('/rsm/signs/osceola.png'));
  assert.equal(post.kind, 'sign');
  assert.equal(post.title, 'Osceola');
  assert.equal(post.photo, PHOTO);
  assert.equal(post.place, 'Near Osceola, Missouri');
  assert.deepEqual(post.finders, ['Jamie']);
  // The day the sign was found, never shifted a day by a time zone.
  assert.equal(post.day, 'October 22, 2023');
  assert.deepEqual([post.math, post.tex, post.ways], ['5 + 1 = 6', '5 + 1 = 6', 3]);
  assert.deepEqual(post.numbers, ['5', '1', '6']);
  assert.equal(post.card, 'https://cards.thingelstad.com/rsm/signs/osceola.png?v=0123456789');
  // Unsolved: no way, its numbers stay.
  const open = readPost(signPage({ tex: '', math: '', ways: 0 }), `${SITE}/signs/osceola`, { kind: 'sign' });
  assert.deepEqual([open.math, open.tex, open.ways, open.numbers], ['', '', 0, ['5', '1', '6']]);
  // Only a photo at its large size on the site itself.
  for (const photo of [`${SITE}/p/01hdc8mjn0hnm4c0b9jmq03d1q/thumb.jpg`, 'https://example.com/p/01hdc8mjn0hnm4c0b9jmq03d1q/large.jpg', `${SITE}/p/../x/large.jpg`, `${SITE}/us-map.svg`])
    assert.equal(readPost(signPage({ photo }), `${SITE}/signs/osceola`, { kind: 'sign' }).photo, null, photo);
});

const playerPage = ({ photo = null, color = '#F2B300' } = {}) => `<!doctype html>
<html><head></head><body>
<main><div class="who-is h-card">
  <data class="u-url" value="${SITE}/players/tammy"></data>
  ${photo ? `<data class="u-photo" value="${photo}"></data>` : ''}
  <data class="p-avatar-color" value="${color}"></data>
  <data class="p-sign-count" value="1"></data><data class="p-state-count" value="1"></data><data class="p-first-year" value="2021"></data>
  <h1 class="p-name">Tammy</h1><p class="p-note">Hello.</p>
</div>
<div class="h-card"><data class="u-url" value="${SITE}/players/jamie"></data><span class="p-name">Jamie</span></div>
</main></body></html>`;

test('a player page reads its own h-card: name, photo or colour, and counts', () => {
  const target = postFor('/rsm/players/tammy.png');
  const post = readPost(playerPage(), target.url, target);
  assert.deepEqual([post.kind, post.title, post.photo, post.color, post.counts, post.since], ['player', 'Tammy', null, '#F2B300', { signs: 1, states: 1 }, 2021]);
  assert.equal(readPost(playerPage({ photo: PHOTO }), target.url, target).photo, PHOTO);
  assert.equal(readPost(playerPage({ color: 'red' }), target.url, target).color, '#006348');
  assert.throws(() => readPost('<p>none</p>', target.url, target), /no h-card/);
});

const homePage = (map = `${SITE}/us-map.svg`) => `<!doctype html><html><head></head><body>
<section class="hero h-feed">
  <data class="p-name" value="Road Sign Math"></data><data class="u-url" value="${SITE}/"></data>
  <data class="u-map" value="${map}"></data>
  <data class="p-pin" value="55.68 53.46 5"></data><data class="p-pin" value="20.4 58 1"></data><data class="p-pin" value="120 3 1"></data>
  <p class="p-kicker">A road trip game</p><h1 class="p-summary">Find a sign. Make the math true.</h1>
  <dd class="p-sign-count">16</dd><dd class="p-player-count">3</dd><dd class="p-state-count">6</dd>
</section></body></html>`;

test('Home reads its h-feed: the map, every pin on it and its counts', () => {
  const post = readPost(homePage(), `${SITE}/`, { home: true });
  assert.deepEqual(
    [post.title, post.kicker, post.text, post.photo],
    ['Road Sign Math', 'A road trip game', 'Find a sign. Make the math true.', `${SITE}/us-map.svg`],
  );
  // A pin off the map is left out.
  assert.deepEqual(post.pins, [{ x: 55.68, y: 53.46, n: 5 }, { x: 20.4, y: 58, n: 1 }]);
  assert.deepEqual(post.counts, { signs: 16, players: 3, states: 6 });
  assert.equal(readPost(homePage('https://example.com/us-map.svg'), `${SITE}/`, { home: true }).photo, null);
});

test('pins and days read only as the site writes them', () => {
  assert.deepEqual(rsmPin('0 100 2'), { x: 0, y: 100, n: 2 });
  for (const value of ['', '1 2', '1 2 0', '1 2 1.5', '-1 2 1', 'a b c', undefined]) assert.equal(rsmPin(value), null, value);
  assert.equal(dayLabel('2021-03-04'), 'March 4, 2021');
  assert.equal(dayLabel('2021-03-04T00:00:00Z'), '');
  assert.equal(dayLabel(undefined), '');
});

test('the math is drawn from its LaTeX in the card\'s colour, or not at all', () => {
  const math = mathImage('\\frac{90 - 82}{8} \\times 1 \\times 2 = \\frac{6}{10 - 7}', '#ffffff');
  const markup = Buffer.from(math.src.split(',')[1], 'base64').toString('utf8');
  assert.ok(!markup.includes('currentColor'));
  assert.match(markup, /fill="#ffffff"/);
  assert.ok(!/ex"/.test(markup), 'sized in its own units, not ex');
  // A fraction stands taller than a sum.
  assert.ok(math.units > mathImage('5 + 1 = 6', '#fff').units);
  assert.match(Buffer.from(mathImage('1 + 1 = 2', '#fff', { shadow: true }).src.split(',')[1], 'base64').toString('utf8'), /feDropShadow/);
  for (const tex of ['', '   ', '\\frac{1}{', '\\undefinedcommand{2}', 'x'.repeat(401), null]) assert.equal(mathImage(tex, '#fff'), null, String(tex));
  assert.equal(mathSvg('\\sqrt{5 - 1} = 2').box.split(' ').length, 4);
});

test('long math steps down to fit its room', () => {
  const wide = { ratio: 12, units: 750 };
  assert.deepEqual(mathSize(wide, { em: 100, width: 600, height: 150 }), { width: 600, height: 50 });
  const tall = { ratio: 2, units: 2000 };
  assert.deepEqual(mathSize(tall, { em: 100, width: 1000, height: 150 }), { width: 300, height: 150 });
  assert.deepEqual(mathSize({ ratio: 4, units: 750 }, { em: 100, width: 1000, height: 150 }), { width: 300, height: 75 });
});

test('the map is only the path data of the site\'s land and borders', () => {
  const map = '<svg xmlns="http://www.w3.org/2000/svg"><style>.l{}</style><path class="l" d="M1,2L3,4Z"/><path class="b" d="M5,6L7,8"/></svg>';
  assert.deepEqual(mapPaths(map), { land: 'M1,2L3,4Z', borders: 'M5,6L7,8' });
  assert.equal(mapPaths('<svg><path class="l" d="M1,2\'/><script>x</script>"/></svg>'), null);
  assert.deepEqual(mapPaths('<svg><path class="l" d="M1,2Z"/><path class="b" d="M1 url(#x)"/></svg>'), { land: 'M1,2Z', borders: null });
  assert.equal(mapPaths(undefined), null);
});

test('the site fetches only its own photos and its own map, and the map comes back as markup', async () => {
  const asked = [];
  globalThis.fetch = async (url) => {
    asked.push(url);
    if (url === `${SITE}/us-map.svg`) return new Response('<svg><path class="l" d="M1,2Z"/></svg>', { headers: { 'content-type': 'image/svg+xml' } });
    throw new Error(`unexpected fetch ${url}`);
  };
  assert.deepEqual(await fetchPhoto(`${SITE}/us-map.svg`, SITES.rsm), { svg: '<svg><path class="l" d="M1,2Z"/></svg>' });
  for (const src of [`${SITE}/favicon.svg`, 'https://example.com/us-map.svg', `${SITE}/p/x/large.jpg`]) assert.equal(await fetchPhoto(src, SITES.rsm), null, src);
  assert.deepEqual(asked, [`${SITE}/us-map.svg`]);
  // Another site never takes an SVG, even at an address it would fetch.
  assert.equal(SITES.t4g.svg, undefined);
});

const SIGN = {
  kind: 'sign',
  title: 'Osceola',
  place: 'Near Osceola, Missouri',
  day: 'October 22, 2023',
  finders: ['Jamie', 'Tyler'],
  math: '5 + 1 = 6',
  tex: '5 + 1 = 6',
  ways: 3,
  numbers: ['5', '1', '6'],
  published: null,
  categories: [],
};

test('a sign card: the place, the math, the sign and who found it, and the ways past the first', () => {
  const tree = cardFor(SIGN, { site: SITES.rsm, photo: { src: DOT, width: 1200, height: 900 } });
  assert.deepEqual(texts(tree).filter((t) => t.trim()), [
    'NEAR OSCEOLA, MISSOURI',
    'Osceola',
    'Found by Jamie and Tyler',
    '·',
    'October 22, 2023',
    '+2 more ways',
    'Jamie Thingelstad',
    'Road Sign Math',
    'roadsignmath.xyz',
  ]);
  const words = JSON.stringify(tree);
  assert.match(words, /"objectFit":"cover","objectPosition":"center 20%"/);
  assert.match(words, /"fontFamily":"Overpass"/);
  assert.match(words, /"color":"#5cc395"},"children":"Road Sign Math"/);
  assert.equal(RSM_SIGN, 'plate');
  // Overpass's middle dot has no advance, so no rsm text carries one: each dot is
  // Inter's, set apart by margin.
  assert.ok(!texts(tree).some((t) => t.length > 1 && t.includes('\u00b7')));
  assert.match(words, /"fontFamily":"Inter","fontWeight":600,"margin":"0 0.3em"},"children":"\u00b7"/);
  // On the plate: the site's green under the math; over the band, none.
  assert.match(JSON.stringify(cardFor(SIGN, { site: SITES.rsm, photo: null })), /"backgroundColor":"#006348"/);
  assert.ok(!JSON.stringify(cardFor(SIGN, { site: SITES.rsm, photo: null, overlay: { rsm: 'band' } })).includes('#006348'));
  // One way: no count of more.
  assert.ok(!texts(cardFor({ ...SIGN, ways: 1 }, { site: SITES.rsm, photo: null })).some((t) => t.includes('more')));
  assert.ok(texts(cardFor({ ...SIGN, ways: 2 }, { site: SITES.rsm, photo: null })).includes('+1 more way'));
  // LaTeX that can't be drawn falls back to the way's text.
  assert.ok(texts(cardFor({ ...SIGN, tex: '\\frac{1}{' }, { site: SITES.rsm, photo: null })).includes('5 + 1 = 6'));
});

test('an unsolved sign shows its numbers and asks', () => {
  const tree = cardFor({ ...SIGN, math: '', tex: '', ways: 0, numbers: ['7', '19', '12'] }, { site: SITES.rsm, photo: null });
  const words = texts(tree);
  assert.deepEqual(words.slice(1, 5), ['7', '19', '12', 'Can you solve it?']);
});

test('a player card: their photo or their letter, their name and what they found', () => {
  const player = { kind: 'player', title: 'Tammy', color: '#F2B300', counts: { signs: 1, states: 1 }, since: 2021, published: null, categories: [] };
  const letter = cardFor(player, { site: SITES.rsm, photo: null });
  assert.deepEqual(texts(letter).filter((t) => t.trim()).slice(0, 7), ['T', 'ROAD SIGN MATH PLAYER', 'Tammy', '1', 'sign', '1', 'state']);
  // An ink letter on the yellow, as the site draws it.
  assert.match(JSON.stringify(letter), /"backgroundColor":"#F2B300","color":"#18201c"/);
  const face = JSON.stringify(cardFor({ ...player, counts: { signs: 13, states: 5 } }, { site: SITES.rsm, photo: { src: DOT } }));
  assert.match(face, /"src":"data:image\/png;base64,iVBOR[^"]*","style":\{"width":314,"height":314,"borderRadius":157,"objectFit":"cover"/);
  assert.ok(texts(JSON.parse(face)).includes('since 2021'));
});

test('a card of each Road Sign Math kind draws at the card\'s size', async () => {
  const dir = await stageAssets();
  const home = { home: true, kind: 'home', title: 'Road Sign Math', kicker: 'A road trip game', text: 'Find a sign. Make the math true.', pins: [{ x: 55.68, y: 53.46, n: 5 }, { x: 20, y: 58, n: 1 }], counts: { signs: 16, players: 3, states: 6 } };
  const map = { svg: '<svg><path class="l" d="M0,0L975,0L975,610Z"/><path class="b" d="M0,0L975,610"/></svg>' };
  for (const [post, opts] of [
    [SIGN, { site: SITES.rsm, photo: null }],
    [SIGN, { site: SITES.rsm, photo: { src: DOT }, overlay: { rsm: 'band' } }],
    [{ ...SIGN, tex: '\\frac{90 - 82}{8} \\times 1 \\times 2 = \\frac{6}{10 - 7}', ways: 1 }, { site: SITES.rsm, photo: { src: DOT } }],
    [{ ...SIGN, math: '', tex: '', ways: 0 }, { site: SITES.rsm, photo: null }],
    [{ kind: 'player', title: 'Jamie', color: '#006348', counts: { signs: 13, states: 5 }, since: 2021, published: null, categories: [] }, { site: SITES.rsm, photo: null }],
    [home, { site: SITES.rsm, photo: map }],
    [home, { site: SITES.rsm, photo: null }],
  ]) {
    const png = await render(cardFor(post, opts), dir);
    assert.deepEqual(png.subarray(0, 8), PNG);
    assert.equal(png.readUInt32BE(16), WIDTH);
    assert.equal(png.readUInt32BE(20), HEIGHT);
  }
});
