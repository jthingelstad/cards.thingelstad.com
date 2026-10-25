// What a card says, read from the post itself.
//
// A card's path names a page on one of the sites in sites.mjs:
//
//   /www/2026/10/15/the-nnxyz-rooms.png      https://www.thingelstad.com/2026/10/15/the-nnxyz-rooms.html
//   /weekly/archive/353.png                  https://weekly.thingelstad.com/archive/353/
//   /another/2025/10/05/how-do-you-start-a.png  https://another.thingelstad.com/2025/10/05/how-do-you-start-a.html
//   /weekly/index.png                        https://weekly.thingelstad.com/ (the newsletter's own card)
//   /links/links/0a1b2c3d4e5f.png            https://links.thingelstad.xyz/links/0a1b2c3d4e5f/
//
// The page is fetched and read as an h-entry, the microformats every post,
// issue and episode carries: p-name (titled posts only; a micropost has
// none), dt-published and p-category here, and the rest (its words, its
// photo, what else its card shows) as its site's entry reads them. A front
// page is read from its h-feed instead.
//
// The page also names its own card: its og:image, with the v the site hashed
// from what the card shows. The handler draws only the card a page names.
//
// Only the sites' pages and the photo hosts their entries name are ever
// fetched, a redirect is followed only within the host it started on, and
// nothing is read past a size limit.
import { mf2 } from 'microformats-parser';
import { parse } from 'parse5';
import { findItem, first, words } from './read.mjs';
import { SITES, siteAt } from './sites.mjs';

/** Where the cards are served; a page's og:image names one of them. */
export const CARDS = 'https://cards.thingelstad.com';

/** The post a card path names, or null when the path is not a card. */
export function postFor(path) {
  const match = /^\/([a-z]+)\/(.+)\.png$/.exec(path);
  const site = match && Object.hasOwn(SITES, match[1]) ? SITES[match[1]] : null;
  const page = site?.page(match[2]);
  if (!page) return null;
  const { path: at, ...named } = page;
  return { site: site.id, url: `${site.origin}${at}`, ...named };
}

/** The card's words from a page's HTML; home reads a front page's h-feed. */
export function readPost(html, url, { home = false } = {}) {
  const site = siteAt(url);
  if (!site) throw new Error(`${url} is on no site here`);
  const items = mf2(html, { baseUrl: url }).items;
  const card = namedCard(html);
  if (home) {
    const feed = site.home && findItem(items, 'h-feed');
    if (!feed) throw new Error(`no h-feed at ${url}`);
    return { url, site: site.id, home: true, published: null, categories: [], ...site.home(feed.properties), card };
  }
  const entry = findItem(items, 'h-entry');
  if (!entry) throw new Error(`no h-entry at ${url}`);
  const p = entry.properties;
  return {
    url,
    site: site.id,
    title: words(p.name),
    published: first(p.published) ?? null,
    categories: (p.category ?? []).filter((c) => typeof c === 'string'),
    counts: null,
    episode: null,
    ...site.read(p),
    card,
  };
}

/** The page's og:image, from its head, or null. */
export function namedCard(html) {
  let found = null;
  const walk = (node) => {
    if (found !== null || node.nodeName === 'body') return;
    if (node.nodeName === 'meta') {
      const attr = Object.fromEntries((node.attrs ?? []).map((a) => [a.name, a.value]));
      if (attr.property === 'og:image') found = attr.content ?? '';
      return;
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(parse(html ?? ''));
  return found || null;
}

/** The v a page gives the card at path: '' when it names that card with no
 * v, null when its og:image is not that card. */
export function namedVersion(card, path) {
  let url;
  try {
    url = new URL(card ?? '');
  } catch {
    return null;
  }
  if (url.origin !== CARDS || url.pathname !== path) return null;
  return url.searchParams.get('v') ?? '';
}

const TIMEOUT = 8000;
const HOPS = 3;
// Far past anything real: an issue page is under 100 KB, a resized photo
// under 2 MB.
const PAGE_LIMIT = 2 * 1024 * 1024;
const PHOTO_LIMIT = 10 * 1024 * 1024;

// A body not wanted is cancelled, never waited on.
const discard = (response) => response.body?.cancel().catch(() => {});

/** Up to limit bytes of the response's body, or null when it runs past. */
async function readCapped(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) {
    discard(response);
    return null;
  }
  const chunks = [];
  let size = 0;
  // Leaving the loop early cancels the rest of the body.
  for await (const chunk of response.body ?? []) {
    size += chunk.length;
    if (size > limit) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** GET url, following a redirect only within url's own origin (three at
 * most), all within one timeout. { status, offsite, type, body }: body is the
 * Buffer of a 2xx answer, null for anything else or one past limit; offsite
 * is true when the answer was a redirect to another origin, never followed.
 * Throws when the host can't be reached in time. */
export async function get(url, accept, limit) {
  const signal = AbortSignal.timeout(TIMEOUT);
  const { origin } = new URL(url);
  let at = url;
  for (let hop = 0; ; hop++) {
    const response = await fetch(at, {
      headers: { accept, 'user-agent': 'cards.thingelstad.com (+https://www.thingelstad.com/)' },
      redirect: 'manual',
      signal,
    });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      discard(response);
      const next = new URL(location, at);
      if (next.origin !== origin) return { status: response.status, offsite: true, type: '', body: null };
      if (hop >= HOPS) return { status: response.status, offsite: false, type: '', body: null };
      at = next.href;
      continue;
    }
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!response.ok) {
      discard(response);
      return { status: response.status, offsite: false, type, body: null };
    }
    return { status: response.status, offsite: false, type, body: await readCapped(response, limit) };
  }
}

/** The post at url, read for its card; null when the site has no such post.
 * home: url is the newsletter's front page. */
export async function fetchPost(url, { home = false } = {}) {
  const response = await get(url, 'text/html', PAGE_LIMIT);
  if (response.status === 404 || response.status === 410) return null;
  // A post that redirects off its site has no card here.
  if (response.offsite) return null;
  if (!response.body) throw new Error(`${url}: HTTP ${response.status}${response.status < 300 ? ', too large' : ''}`);
  return readPost(response.body.toString('utf8'), url, { home });
}

const TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

/** A photo as a data URI the renderer can draw, or null when there is none
 * it can draw: no photo, one its site never draws, gone, too large, or a type
 * it can't draw. Throws when the photo couldn't be had just now (unreachable,
 * slow, a server error), so the handler keeps that card only briefly. The
 * site's entry says where it is fetched from (sites.mjs). */
export async function fetchPhoto(src, site) {
  const from = src ? site.photo(src) : null;
  if (!from) return null;
  const response = await get(from, 'image/jpeg,image/png;q=0.9,image/gif;q=0.8', PHOTO_LIMIT);
  if (response.status === 429 || response.status >= 500) throw new Error(`${from}: HTTP ${response.status}`);
  if (!response.body || !TYPES.has(response.type)) return null;
  return {
    src: `data:${response.type};base64,${response.body.toString('base64')}`,
    screenshot: /\.png(\?.*)?$/i.test(src),
    ...dimensions(response.body),
  };
}

/** A JPEG's or PNG's size in pixels, from its header: { width, height }, or
 * {} when the header can't be read (a GIF, a broken file). */
export function dimensions(data) {
  if (data.length >= 24 && data.readUInt32BE(0) === 0x89504e47)
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  if (data[0] !== 0xff || data[1] !== 0xd8) return {};
  // A JPEG: walk its segments to the frame header (SOF0 to SOF15, which are
  // C0 to CF less DHT C4, JPG C8 and DAC CC).
  for (let at = 2; at + 9 <= data.length; ) {
    if (data[at] !== 0xff) return {};
    const marker = data[at + 1];
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { height: data.readUInt16BE(at + 5), width: data.readUInt16BE(at + 7) };
    if (marker === 0xd9 || marker === 0xda) return {};
    at += 2 + data.readUInt16BE(at + 2);
  }
  return {};
}
