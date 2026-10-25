// What a card says, read from the post itself.
//
// A card's path names the post:
//
//   /www/2026/10/15/the-nnxyz-rooms.png      https://www.thingelstad.com/2026/10/15/the-nnxyz-rooms.html
//   /weekly/archive/353.png                  https://weekly.thingelstad.com/archive/353/
//   /another/2025/10/05/how-do-you-start-a.png  https://another.thingelstad.com/2025/10/05/how-do-you-start-a.html
//   /weekly/index.png                        https://weekly.thingelstad.com/ (the newsletter's own card)
//
// The post is fetched and read as an h-entry, the microformats every post,
// issue and episode carries: p-name (titled posts only; a micropost has
// none), p-summary, e-content, dt-published, p-category and u-featured, and
// on an issue p-link-count and p-journal-count, on an episode p-episode and
// p-duration (seconds). An
// issue's or episode's words are its summary when it has one, else its
// content's; a blog post's are always its content's.
//
// The photo: on the blog, the first <img> in the content that is one of
// Jamie's uploads and not an inline icon (100px wide or less stays in the
// text on the blog too), fetched through micro.blog's resizer at 1200px
// wide; on Weekly Thing, the issue's cover (u-featured), from the files CDN.
// Another Thing's episodes share the show's artwork, so its cards have none.
//
// Weekly Thing's front page is an h-feed instead: p-name, p-kicker (the
// eyebrow), e-summary (the hero line, its <em> the accent and its <br> the
// line breaks), u-featured (the newest cover), p-issue-count and
// p-link-count. Every page there but an issue or a topic shares that card.
//
// The page also names its own card: its og:image, with the v the site hashed
// from what the card shows. The handler draws only the card a page names.
//
// Only the sites below and their photo hosts are ever fetched, a redirect is
// followed only within the host it started on, and nothing is read past a
// size limit.
import { mf2 } from 'microformats-parser';
import { parse, parseFragment } from 'parse5';

/** Where the cards are served; a page's og:image names one of them. */
export const CARDS = 'https://cards.thingelstad.com';

const UPLOADS = ['https://www.thingelstad.com/uploads/', 'https://cdn.uploads.micro.blog/'];
const RESIZER = 'https://micro.blog/photos/1200x/';

// label and mark are the site's sites-strip label and colour (thingelstad.com
// AGENTS.md, "The sites strip"); the blog has no mark.
export const SITES = {
  www: { origin: 'https://www.thingelstad.com', label: 'Blog', host: 'thingelstad.com' },
  weekly: { origin: 'https://weekly.thingelstad.com', label: 'Newsletter', host: 'weekly.thingelstad.com', mark: '#1a5eb6' },
  another: { origin: 'https://another.thingelstad.com', label: 'Podcast', host: 'another.thingelstad.com', mark: '#b3123f' },
};

const DATED = /^(\d{4}\/\d{2}\/\d{2}\/[A-Za-z0-9_-]+)$/;
const ISSUE = /^archive\/(\d{1,4}(?:-[a-z]+)?)$/;

/** The post a card path names, or null when the path is not a card. */
export function postFor(path) {
  const match = /^\/(www|weekly|another)\/(.+)\.png$/.exec(path);
  if (!match) return null;
  const [, site, rest] = match;
  const { origin } = SITES[site];
  if (site === 'weekly') {
    if (rest === 'index') return { site, url: `${origin}/`, home: true };
    const issue = ISSUE.exec(rest);
    // WT353 (and WT140 special) over the title, as the issue page's own bar.
    return issue
      ? { site, url: `${origin}/archive/${issue[1]}/`, kicker: `WT${issue[1].replace('-', ' ')}` }
      : null;
  }
  return DATED.test(rest) ? { site, url: `${origin}/${rest}.html` } : null;
}

const IMAGE = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
const SKIP = new Set(['img', 'figure', 'figcaption', 'picture', 'video', 'audio', 'iframe', 'script', 'style', 'svg', 'button', 'form']);
const BLOCK = new Set(['p', 'div', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'ul', 'ol', 'pre', 'tr', 'section']);

/** The content's words, without its photos, captions or embeds. */
export function plainText(html) {
  const out = [];
  const walk = (node) => {
    if (node.nodeName === '#text') out.push(node.value);
    if (SKIP.has(node.nodeName)) return;
    const block = BLOCK.has(node.nodeName);
    if (block) out.push('\n');
    for (const child of node.childNodes ?? []) walk(child);
    if (block) out.push('\n');
  };
  walk(parseFragment(html ?? ''));
  return out
    .join('')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

/** The first of Jamie's uploaded photos in the content, or null. */
export function firstPhoto(html) {
  let found = null;
  const walk = (node) => {
    if (found) return;
    if (node.nodeName === 'img') {
      const attr = Object.fromEntries((node.attrs ?? []).map((a) => [a.name, a.value]));
      const width = Number.parseInt(attr.width, 10);
      const src = attr.src ?? '';
      if (
        IMAGE.test(src) &&
        UPLOADS.some((prefix) => src.startsWith(prefix)) &&
        !(width > 0 && width <= 100)
      )
        found = src;
      return;
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(parseFragment(html ?? ''));
  return found;
}

const findItem = (items, type) => {
  for (const item of items) {
    if (item.type?.includes(type)) return item;
    const child = findItem(item.children ?? [], type);
    if (child) return child;
  }
  return null;
};

const first = (values) => {
  const value = values?.[0];
  return typeof value === 'string' ? value : (value?.value ?? undefined);
};

/** A headline's HTML as lines of runs: its <br> end a line, and the words in
 * its <em> or <strong> are the accent. */
export function headlineLines(html) {
  const lines = [[]];
  const walk = (node, accent) => {
    if (node.nodeName === '#text') lines.at(-1).push({ text: node.value, accent });
    else if (node.nodeName === 'br') lines.push([]);
    else for (const child of node.childNodes ?? []) walk(child, accent || node.nodeName === 'em' || node.nodeName === 'strong');
  };
  walk(parseFragment(html ?? ''), false);
  return lines
    .map((runs) => {
      const tidy = runs.map((run) => ({ ...run, text: run.text.replace(/\s+/g, ' ') })).filter((run) => run.text);
      if (tidy.length) {
        tidy[0].text = tidy[0].text.trimStart();
        tidy.at(-1).text = tidy.at(-1).text.trimEnd();
      }
      return tidy.filter((run) => run.text);
    })
    .filter((runs) => runs.length);
}

/** The newsletter's own card, from its front page's h-feed. */
function readFeed(feed, html, url) {
  const p = feed.properties;
  const summary = p.summary?.[0];
  const featured = first(p.featured) ?? '';
  const headline = headlineLines(typeof summary === 'string' ? summary : (summary?.html ?? ''));
  return {
    url,
    site: 'weekly',
    home: true,
    title: (first(p.name) ?? '').replace(/\s+/g, ' ').trim(),
    kicker: (first(p.kicker) ?? '').replace(/\s+/g, ' ').trim(),
    headline,
    text: headline.map((runs) => runs.map((run) => run.text).join('')).join(' '),
    published: null,
    categories: [],
    photo: COVER.test(featured) ? featured : null,
    counts: { issues: count(p['issue-count']), links: count(p['link-count']) },
    card: namedCard(html),
  };
}

/** The card's words from a post page's HTML; home reads the newsletter's
 * front page. */
export function readPost(html, url, { home = false } = {}) {
  const items = mf2(html, { baseUrl: url }).items;
  if (home) {
    const feed = findItem(items, 'h-feed');
    if (!feed) throw new Error(`no h-feed at ${url}`);
    return readFeed(feed, html, url);
  }
  const entry = findItem(items, 'h-entry');
  if (!entry) throw new Error(`no h-entry at ${url}`);
  const p = entry.properties;
  const content = p.content?.[0];
  const contentHtml = typeof content === 'string' ? '' : (content?.html ?? '');
  const summary = (first(p.summary) ?? '').replace(/\s+/g, ' ').trim();
  const featured = first(p.featured) ?? '';
  const site = Object.keys(SITES).find((id) => SITES[id].origin === new URL(url).origin);
  return {
    url,
    site,
    title: (first(p.name) ?? '').replace(/\s+/g, ' ').trim(),
    // The blog's cards keep reading the post's own words.
    text: (site !== 'www' && summary) || plainText(contentHtml),
    published: first(p.published) ?? null,
    categories: (p.category ?? []).filter((c) => typeof c === 'string'),
    photo:
      site === 'www' ? firstPhoto(contentHtml) : site === 'weekly' && COVER.test(featured) ? featured : null,
    // An issue's links and journal entries, as its page counts them.
    counts: site === 'weekly' ? { links: count(p['link-count']), journal: count(p['journal-count']) } : null,
    // An episode's number and running time, as its page gives them.
    episode: site === 'another' ? { number: count(p.episode), seconds: count(p.duration) } : null,
    card: namedCard(html),
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

const count = (values) => {
  const n = Number.parseInt(first(values) ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// A Weekly Thing cover, as WT Builder files it.
const COVER = /^https:\/\/files\.thingelstad\.com\/weekly-thing\/[A-Za-z0-9/_.-]+\.(jpe?g|png)$/i;

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
 * it can draw: no photo, another host, gone, too large, or a type it can't
 * draw. Throws when the photo couldn't be had just now (unreachable, slow, a
 * server error), so the handler keeps that card only briefly. A blog upload
 * comes through micro.blog's resizer; a Weekly Thing cover is already 1200px
 * wide and comes as it is. */
export async function fetchPhoto(src) {
  if (!src) return null;
  const from = COVER.test(src) ? src : UPLOADS.some((prefix) => src.startsWith(prefix)) ? `${RESIZER}${src}` : null;
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
