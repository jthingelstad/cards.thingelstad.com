// Reading a page's microformats into a card's words: the helpers every site
// shares. What each site reads, and where, is its entry in sites.mjs.
import { parseFragment } from 'parse5';

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

/** The first item of type in the parsed items, at any depth, or null. */
export const findItem = (items, type) => {
  for (const item of items) {
    if (item.type?.includes(type)) return item;
    const child = findItem(item.children ?? [], type);
    if (child) return child;
  }
  return null;
};

/** A property's first value as a string, or undefined. */
export const first = (values) => {
  const value = values?.[0];
  return typeof value === 'string' ? value : (value?.value ?? undefined);
};

/** A property's first value with its white space run together, or ''. */
export const words = (values) => (first(values) ?? '').replace(/\s+/g, ' ').trim();

/** A property's first value as a count above zero, else 0. */
export const count = (values) => {
  const n = Number.parseInt(first(values) ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** An e- property's HTML, or '' when it has none. */
export const markup = (values) => {
  const value = values?.[0];
  return typeof value === 'string' ? '' : (value?.html ?? '');
};
