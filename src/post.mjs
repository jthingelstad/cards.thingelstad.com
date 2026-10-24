// What a card says, read from the post itself.
//
// A card's path names the post: /www/2026/10/15/the-nnxyz-rooms.png is
// https://www.thingelstad.com/2026/10/15/the-nnxyz-rooms.html. The post is
// fetched and read as an h-entry, the microformats every post on the blog
// carries: p-name (titled posts only; a micropost has none), e-content,
// dt-published and p-category. Its first photo is the first <img> in the
// content that is one of Jamie's uploads and not an inline icon (100px wide
// or less stays in the text on the blog too), fetched through micro.blog's
// resizer at 1200px wide.
//
// Only the blog and micro.blog's upload and resizer hosts are ever fetched.
import { mf2 } from 'microformats-parser';
import { parseFragment } from 'parse5';

export const SITES = {
  www: { origin: 'https://www.thingelstad.com', label: 'Blog', host: 'thingelstad.com' },
};

const PATH = /^\/(www)\/(\d{4}\/\d{2}\/\d{2}\/[A-Za-z0-9_-]+)\.png$/;
const UPLOADS = ['https://www.thingelstad.com/uploads/', 'https://cdn.uploads.micro.blog/'];
const RESIZER = 'https://micro.blog/photos/1200x/';
const IMAGE = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
const SKIP = new Set(['img', 'figure', 'figcaption', 'picture', 'video', 'audio', 'iframe', 'script', 'style', 'svg', 'button', 'form']);
const BLOCK = new Set(['p', 'div', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'ul', 'ol', 'pre', 'tr', 'section']);

/** The post a card path names, or null when the path is not a card. */
export function postFor(path) {
  const match = PATH.exec(path);
  if (!match) return null;
  const site = SITES[match[1]];
  return { site: match[1], url: `${site.origin}/${match[2]}.html` };
}

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

const findEntry = (items) => {
  for (const item of items) {
    if (item.type?.includes('h-entry')) return item;
    const child = findEntry(item.children ?? []);
    if (child) return child;
  }
  return null;
};

const first = (values) => {
  const value = values?.[0];
  return typeof value === 'string' ? value : (value?.value ?? undefined);
};

/** The card's words from a post page's HTML. */
export function readPost(html, url) {
  const entry = findEntry(mf2(html, { baseUrl: url }).items);
  if (!entry) throw new Error(`no h-entry at ${url}`);
  const p = entry.properties;
  const content = p.content?.[0];
  const contentHtml = typeof content === 'string' ? '' : (content?.html ?? '');
  return {
    url,
    title: (first(p.name) ?? '').replace(/\s+/g, ' ').trim(),
    text: plainText(contentHtml),
    published: first(p.published) ?? null,
    categories: (p.category ?? []).filter((c) => typeof c === 'string'),
    photo: firstPhoto(contentHtml),
  };
}

const TIMEOUT = 8000;

async function get(url, accept) {
  const response = await fetch(url, {
    headers: { accept, 'user-agent': 'cards.thingelstad.com (+https://www.thingelstad.com/)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT),
  });
  return response;
}

/** The post at url, read for its card; null when the blog has no such post. */
export async function fetchPost(url) {
  const response = await get(url, 'text/html');
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  // A post that redirects off the blog has no card here.
  if (new URL(response.url).origin !== new URL(url).origin) return null;
  return readPost(await response.text(), url);
}

const TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

/** A photo as a data URI the renderer can draw, or null if it can't be had. */
export async function fetchPhoto(src) {
  if (!src) return null;
  try {
    const response = await get(`${RESIZER}${src}`, 'image/jpeg,image/png;q=0.9,image/gif;q=0.8');
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!response.ok || !TYPES.has(type)) return null;
    const data = Buffer.from(await response.arrayBuffer());
    return { src: `data:${type};base64,${data.toString('base64')}`, screenshot: /\.png(\?.*)?$/i.test(src) };
  } catch {
    return null;
  }
}
