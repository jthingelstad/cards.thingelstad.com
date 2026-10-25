import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { handler } from '../src/handler.mjs';
import { fetchPhoto, fetchPost, get, namedCard, namedVersion, readPost } from '../src/post.mjs';

// Every fetch here is answered by the table; nothing reaches the network.
const real = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = real;
});
function serve(table) {
  const asked = [];
  globalThis.fetch = async (url, init) => {
    asked.push(url);
    assert.equal(init.redirect, 'manual');
    const answer = table[url];
    if (!answer) throw new Error(`unexpected fetch ${url}`);
    if (answer instanceof Error) throw answer;
    // A Response with a body is given as a function, so each fetch gets its own.
    return typeof answer === 'function' ? answer() : answer;
  };
  return asked;
}
const html = (body, head = '') =>
  new Response(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
const moved = (location, status = 301) => new Response(null, { status, headers: { location } });

const POST = 'https://www.thingelstad.com/2026/10/24/red-leaves.html';
const CARD = '/www/2026/10/24/red-leaves.png';
const ENTRY = '<article class="h-entry"><div class="e-content"><p>Red leaves.</p></div></article>';
const og = (content) => `<meta property="og:image" content="${content}">`;

test('a page names its card in its og:image', () => {
  const head = `<meta property="og:title" content="x">${og(`https://cards.thingelstad.com${CARD}?v=ae477a0f1b`)}`;
  const page = `<!doctype html><html><head>${head}</head><body>${ENTRY}</body></html>`;
  assert.equal(namedCard(page), `https://cards.thingelstad.com${CARD}?v=ae477a0f1b`);
  assert.equal(readPost(page, POST).card, `https://cards.thingelstad.com${CARD}?v=ae477a0f1b`);
  assert.equal(namedCard(`<html><body>${og('https://cards.thingelstad.com/x.png')}</body></html>`), null);
  assert.equal(namedCard('<p>No head</p>'), null);
});

test('the v a page gives a card, only for that card', () => {
  assert.equal(namedVersion(`https://cards.thingelstad.com${CARD}?v=abc`, CARD), 'abc');
  assert.equal(namedVersion(`https://cards.thingelstad.com${CARD}`, CARD), '');
  assert.equal(namedVersion('https://cards.thingelstad.com/www/2026/10/24/other.png?v=abc', CARD), null);
  assert.equal(namedVersion(`https://elsewhere.example${CARD}?v=abc`, CARD), null);
  assert.equal(namedVersion('https://files.thingelstad.com/weekly-thing/353/cover.jpg', CARD), null);
  assert.equal(namedVersion(null, CARD), null);
  assert.equal(namedVersion('not a url', CARD), null);
});

test('a redirect is followed only within its own origin', async () => {
  serve({
    'http://www.thingelstad.com/a.html': moved('https://www.thingelstad.com/a.html', 308),
    'https://weekly.thingelstad.com/archive/353': moved('/archive/353/'),
    'https://weekly.thingelstad.com/archive/353/': () => html('<p>353</p>'),
    'https://www.thingelstad.com/gone.html': moved('https://example.com/x.html'),
    'https://www.thingelstad.com/loop.html': moved('/loop.html', 302),
  });
  const followed = await get('https://weekly.thingelstad.com/archive/353', 'text/html', 1000);
  assert.equal(followed.status, 200);
  assert.match(followed.body.toString(), /353/);
  // http to https is another origin: not followed.
  assert.equal((await get('http://www.thingelstad.com/a.html', 'text/html', 1000)).offsite, true);
  const offsite = await get('https://www.thingelstad.com/gone.html', 'text/html', 1000);
  assert.deepEqual([offsite.offsite, offsite.body], [true, null]);
  const loop = await get('https://www.thingelstad.com/loop.html', 'text/html', 1000);
  assert.deepEqual([loop.status, loop.offsite, loop.body], [302, false, null]);
});

test('nothing is read past its limit', async () => {
  serve({
    'https://www.thingelstad.com/declared.html': () =>
      new Response('x'.repeat(50), { headers: { 'content-length': '50' } }),
    'https://www.thingelstad.com/streamed.html': () =>
      new Response(
        new ReadableStream({
          start(controller) {
            for (let i = 0; i < 5; i++) controller.enqueue(new TextEncoder().encode('x'.repeat(10)));
            controller.close();
          },
        }),
      ),
  });
  assert.equal((await get('https://www.thingelstad.com/declared.html', 'text/html', 40)).body, null);
  assert.equal((await get('https://www.thingelstad.com/streamed.html', 'text/html', 40)).body, null);
  assert.equal((await get('https://www.thingelstad.com/streamed.html', 'text/html', 50)).body.length, 50);
});

test('a post that redirects off its site has no card; a server error is a failure', async () => {
  serve({
    [POST]: moved('https://example.com/elsewhere.html'),
    'https://www.thingelstad.com/2026/10/24/broken.html': () => new Response('no', { status: 503 }),
  });
  assert.equal(await fetchPost(POST), null);
  await assert.rejects(fetchPost('https://www.thingelstad.com/2026/10/24/broken.html'), /HTTP 503/);
});

const UPLOAD = 'https://cdn.uploads.micro.blog/890/2026/leaves.jpg';
const RESIZED = `https://micro.blog/photos/1200x/${UPLOAD}`;
const jpeg = () => new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { 'content-type': 'image/jpeg' } });

test('a photo that is gone or not drawable is none; one not had just now is a failure', async () => {
  serve({ [RESIZED]: jpeg });
  assert.match((await fetchPhoto(UPLOAD)).src, /^data:image\/jpeg;base64,/);
  serve({ [RESIZED]: () => new Response('gone', { status: 404 }) });
  assert.equal(await fetchPhoto(UPLOAD), null);
  serve({ [RESIZED]: () => new Response('<html>', { headers: { 'content-type': 'text/html' } }) });
  assert.equal(await fetchPhoto(UPLOAD), null);
  serve({ [RESIZED]: moved('https://elsewhere.example/leaves.jpg') });
  assert.equal(await fetchPhoto(UPLOAD), null);
  serve({ [RESIZED]: () => new Response('busy', { status: 503 }) });
  await assert.rejects(fetchPhoto(UPLOAD), /HTTP 503/);
  serve({ [RESIZED]: () => new Response('slow down', { status: 429 }) });
  await assert.rejects(fetchPhoto(UPLOAD), /HTTP 429/);
  serve({ [RESIZED]: new TypeError('fetch failed') });
  await assert.rejects(fetchPhoto(UPLOAD), /fetch failed/);
  assert.equal(await fetchPhoto('https://example.com/a.jpg'), null);
});

const request = (rawPath, rawQueryString = '') => ({
  rawPath,
  rawQueryString,
  requestContext: { http: { method: 'GET' } },
});
const quiet = (t) => t.mock.method(console, 'log', () => {});

test('a card asked for with another v, or none, is sent to the one the page names', async (t) => {
  quiet(t);
  serve({ [POST]: () => html(ENTRY, og(`https://cards.thingelstad.com${CARD}?v=ae477a0f1b`)) });
  for (const query of ['v=0000000000', '', 'v=']) {
    const answer = await handler(request(CARD, query));
    assert.equal(answer.statusCode, 302, query);
    assert.equal(answer.headers.location, `${CARD}?v=ae477a0f1b`);
    assert.equal(answer.headers['cache-control'], 'public, max-age=300');
  }
});

test('a page whose og:image is not this card has no card here', async (t) => {
  quiet(t);
  serve({ [POST]: () => html(ENTRY, og('https://files.thingelstad.com/weekly-thing/353/cover.jpg')) });
  const answer = await handler(request(CARD, 'v=ae477a0f1b'));
  assert.equal(answer.statusCode, 404);
  assert.equal(answer.headers['cache-control'], 'public, max-age=300');
  serve({ [POST]: () => html(ENTRY) });
  assert.equal((await handler(request(CARD, 'v=ae477a0f1b'))).statusCode, 404);
});

test('a page that names its card with no v is sent there without one', async (t) => {
  quiet(t);
  serve({ [POST]: () => html(ENTRY, og(`https://cards.thingelstad.com${CARD}`)) });
  const answer = await handler(request(CARD, 'v=abc'));
  assert.equal(answer.statusCode, 302);
  assert.equal(answer.headers.location, CARD);
});
