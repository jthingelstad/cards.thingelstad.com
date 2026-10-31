// Linking Things' lens cards: their paths, a lens page's h-feed, the sky map
// fetched once and checked, the lit stars framed, and the card drawn.
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cardFor, HEIGHT, skyField, WIDTH } from '../src/card.mjs';
import { dimensions, fetchPhoto, isSkyMap, postFor, readPost } from '../src/post.mjs';
import { render } from '../src/render.mjs';
import { SITES } from '../src/sites.mjs';
import { stageAssets } from '../tools/package.mjs';

const real = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = real;
});

const SITE = 'https://links.thingelstad.xyz';
const SKY = `${SITE}/sky/card.json`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Every string a card draws, in order.
const texts = (node) =>
  typeof node === 'string' ? [node] : Array.isArray(node) ? node.flatMap(texts) : node?.props ? texts(node.props.children) : [];

// A sky of n stars, the same every run.
function sky(n, { glows = 6 } = {}) {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const ids = Array.from({ length: n }, (_, i) => i.toString(16).padStart(12, '0'));
  const stars = ids.flatMap(() => [Math.round(random() * 12000) / 10, Math.round(random() * 5620) / 10, 0.4 + 0.6 * random(), random()]);
  const colors = ['#6f8cff', '#ff9f6b', '#7fd6a8'];
  return {
    width: 1200,
    height: 562,
    ids,
    stars,
    glows: Array.from({ length: glows }, (_, i) => [100 + 180 * i, 100 + 60 * i, 140, colors[i % colors.length]]),
  };
}

test('a card path names a Linking Things lens page, its front page or /sky/', () => {
  const lens = (path, at) => assert.deepEqual(postFor(`/links/${path}.png`), { site: 'links', url: `${SITE}${at}`, home: true }, path);
  lens('index', '/');
  lens('sky', '/sky/');
  lens('issues/354', '/issues/354/');
  lens('issues/140-special', '/issues/140-special/');
  lens('years/2012', '/years/2012/');
  lens('hosts/github.com', '/hosts/github.com/');
  lens('hosts/www.nytimes.com', '/hosts/www.nytimes.com/');
  lens('hosts/xn--bcher-kva.example', '/hosts/xn--bcher-kva.example/');
  lens('kinds/video', '/kinds/video/');
  lens('topics', '/topics/');
  lens('topics/ai-agents', '/topics/ai-agents/');
  lens('on/10-31', '/on/10-31/');
  // A record keeps its link card.
  assert.deepEqual(postFor('/links/links/dec34be50cef.png'), { site: 'links', url: `${SITE}/links/dec34be50cef/` });
  for (const path of [
    '/links/hosts/../x.png',
    '/links/hosts/github.png',
    '/links/hosts/.com.png',
    '/links/hosts/github..com.png',
    '/links/hosts/github.com..png',
    '/links/hosts/GitHub.com.png',
    '/links/hosts/github.com/index.png',
    '/links/years/12.png',
    '/links/years/20120.png',
    '/links/issues/1.5.png',
    '/links/issues/354/index.png',
    '/links/kinds/Video.png',
    '/links/kinds/video-2.png',
    '/links/topics/AI.png',
    '/links/topics/-ai.png',
    '/links/topics/ai-.png',
    '/links/topics/ai--agents.png',
    '/links/on/1-31.png',
    '/links/on/10-31/x.png',
    '/links/sky/card.png',
    '/links/search.png',
    '/links/about.png',
    '/links/stats.png',
  ])
    assert.equal(postFor(path), null, path);
});

const lensPage = ({ count = '19', sky: map = SKY, entries = ['0a1b2c3d4e5f', 'abcdefabcdef'] } = {}) => `<!doctype html>
<html><head><meta property="og:image" content="https://cards.thingelstad.com/links/issues/354.png?v=0123456789"></head>
<body><header><div class="h-card"><a class="p-name u-url" href="/">Linking Things</a></div></header>
<main class="site-main h-feed">
  <data class="p-name" value="WT354 — The Long Way"></data>
  <data class="u-url" value="${SITE}/issues/354/"></data>
  <data class="p-kicker" value="Weekly Thing 354 · October 31, 2026"></data>
  <data class="p-headline" value="The   Long Way"></data>
  ${count ? `<data class="p-link-count" value="${count}"></data>` : ''}
  ${map ? `<data class="u-sky" value="${map}"></data>` : ''}
  <h1>WT354 — The Long Way</h1>
  ${entries.map((id) => `<article class="h-entry"><a class="title p-name u-url" href="/links/${id}/">A link</a></article>`).join('\n  ')}
  <article class="h-entry"><a class="title p-name u-url" href="https://example.com/links/aaaaaaaaaaaa/">Elsewhere</a></article>
  <article class="h-entry"><a class="title p-name u-url" href="/hosts/github.com/">Not a record</a></article>
</main></body></html>`;

test('a lens page reads its h-feed: kicker, name, count, the sky and the links it lists', () => {
  const post = readPost(lensPage({ entries: ['0a1b2c3d4e5f', 'abcdefabcdef', '0a1b2c3d4e5f'] }), `${SITE}/issues/354/`, { home: true });
  assert.equal(post.home, true);
  assert.equal(post.kicker, 'Weekly Thing 354 · October 31, 2026');
  assert.equal(post.title, 'The Long Way');
  assert.equal(post.count, 19);
  assert.equal(post.photo, SKY);
  // Only the site's own records, each once, in the page's order.
  assert.deepEqual(post.lit, ['0a1b2c3d4e5f', 'abcdefabcdef']);
  assert.equal(post.card, 'https://cards.thingelstad.com/links/issues/354.png?v=0123456789');

  const open = readPost(lensPage({ count: '' }), `${SITE}/years/2026/`, { home: true });
  assert.equal(open.count, 0, 'no count where the number still changes');
  // The sky comes only from the site's own map.
  for (const map of ['https://example.com/sky/card.json', `${SITE}/sky/stars.json`, '']) {
    assert.equal(readPost(lensPage({ sky: map }), `${SITE}/issues/354/`, { home: true }).photo, null, map);
  }
});

test('a sky map is checked before it is drawn', () => {
  assert.equal(isSkyMap(sky(3)), true);
  assert.equal(isSkyMap({ ...sky(0), glows: [] }), true);
  for (const [why, map] of [
    ['none', null],
    ['no ids', { ...sky(3), ids: undefined }],
    ['an id not a string', { ...sky(3), ids: [1, 2, 3] }],
    ['stars short', { ...sky(3), stars: sky(3).stars.slice(1) }],
    ['a star not a number', { ...sky(3), stars: [...sky(3).stars.slice(1), 'x'] }],
    ['a star not finite', { ...sky(3), stars: [...sky(3).stars.slice(1), null] }],
    ['no size', { ...sky(3), width: 0 }],
    ['a glow short', { ...sky(3), glows: [[1, 2, 3]] }],
    ['a glow colour not hex', { ...sky(3), glows: [[1, 2, 3, 'red"/><script>']] }],
  ])
    assert.equal(isSkyMap(map), false, why);
});

test('the sky map comes only from the site, is checked, and is fetched once a while', async () => {
  const asked = [];
  let answer;
  globalThis.fetch = async (url) => {
    asked.push(url);
    return answer();
  };
  // Not a map: each one throws, so the card is kept briefly and nothing is kept here.
  for (const bad of [
    () => new Response('gone', { status: 404, headers: { 'content-type': 'text/plain' } }),
    () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
    () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    () => new Response('{"ids":[1]}', { headers: { 'content-type': 'application/json' } }),
    () => new Response('busy', { status: 503 }),
  ]) {
    answer = bad;
    await assert.rejects(fetchPhoto(SKY, SITES.links));
  }
  assert.equal(asked.length, 5);
  const map = sky(4);
  answer = () => new Response(JSON.stringify(map), { headers: { 'content-type': 'application/json; charset=utf-8' } });
  assert.deepEqual(await fetchPhoto(SKY, SITES.links), { json: map });
  const again = await fetchPhoto(SKY, SITES.links);
  assert.deepEqual(again, { json: map });
  assert.equal(asked.length, 6, 'kept, not fetched again');
  for (const src of ['https://example.com/sky/card.json', `${SITE}/sky/stars.json`, `${SITE}/share.jpg`, ''])
    assert.equal(await fetchPhoto(src, SITES.links), null, src);
  assert.equal(asked.length, 6);
});

// The circles a sky field draws, as [x, y, r] by fill.
function circles(src) {
  const markup = Buffer.from(src.replace(/^data:image\/svg\+xml;base64,/, ''), 'base64').toString('utf8');
  const golds = markup.slice(markup.lastIndexOf('<g fill="#ffe2ad">'));
  const lit = [...golds.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"\/>/g)].map((m) => m.slice(1).map(Number));
  const dust = [...markup.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="1.15"/g)].map((m) => m.slice(1).map(Number));
  return { markup, lit, dust };
}

test('the sky turns toward the lit stars, right of the words', () => {
  const map = sky(400);
  const lit = [3, 40, 41, 200, 399];
  const { lit: drawn, dust } = circles(skyField(map, lit));
  assert.equal(drawn.length, lit.length);
  for (const [x, y] of drawn) {
    assert.ok(x >= 560 - 0.1 && x <= 1150 + 0.1, `x ${x}`);
    assert.ok(y >= 48 - 0.1 && y <= 514 + 0.1, `y ${y}`);
  }
  assert.ok(dust.length > 0, 'the rest of the sky is there too');
  // Few lit stars are drawn larger than many.
  assert.ok(drawn[0][2] > circles(skyField(map, Array.from({ length: 350 }, (_, i) => i))).lit[0][2]);
  // Nothing lit is the whole sky; an index past the map is no star.
  assert.equal(circles(skyField(map, [])).lit.length, 0);
  assert.equal(circles(skyField(map, [-1, 400, 1.5])).lit.length, 0);
  assert.ok(circles(skyField(map, [])).dust.length > 300);
});

const ISSUE = { home: true, title: 'The Long Way', kicker: 'Weekly Thing 354 · October 31, 2026', count: 19, published: null, categories: [] };

test('a lens card: the kicker, the name and the count, over the sky with its links lit', () => {
  const map = sky(20);
  const tree = cardFor({ ...ISSUE, lit: [map.ids[2], 'ffffffffffff'] }, { site: SITES.links, photo: { json: map } });
  const words = texts(tree);
  assert.ok(words.includes('WEEKLY THING 354 · OCTOBER 31, 2026'), words.join('|'));
  assert.ok(words.includes('links.thingelstad.xyz'), 'the band names the site');
  assert.ok(words.join(' ').includes('The Long Way'));
  assert.ok(words.includes('19') && words.includes('links'), words.join('|'));
  assert.ok(!texts(cardFor({ ...ISSUE, count: 0 }, { site: SITES.links, photo: null })).includes('links'));
  assert.ok(texts(cardFor({ ...ISSUE, count: 1 }, { site: SITES.links, photo: null })).includes('link'));
  // No name: the site's label.
  assert.equal(texts(cardFor({ ...ISSUE, title: '' }, { site: SITES.links, photo: null })).filter((w) => w === SITES.links.label).length, 2);
});

test('a lens card over the whole sky is a 1200 x 630 JPEG under 1 MB; without the sky, a PNG', async () => {
  const dir = await stageAssets();
  const map = sky(16000, { glows: 100 });
  for (const lit of [map.ids.slice(0, 19), map.ids.slice(0, 1200), []]) {
    const image = await render(cardFor({ ...ISSUE, lit }, { site: SITES.links, photo: { json: map } }), dir, { format: 'jpeg' });
    assert.deepEqual([...image.subarray(0, 2)], [0xff, 0xd8]);
    assert.deepEqual(dimensions(image), { width: WIDTH, height: HEIGHT });
    assert.ok(image.length < 1_000_000, `${image.length} bytes`);
  }
  const png = await render(cardFor({ ...ISSUE, lit: [] }, { site: SITES.links, photo: null }), dir);
  assert.deepEqual(png.subarray(0, 8), PNG);
  assert.equal(png.readUInt32BE(16), WIDTH);
  assert.equal(png.readUInt32BE(20), HEIGHT);
});
