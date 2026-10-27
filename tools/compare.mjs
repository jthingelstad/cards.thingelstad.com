// Which sites' cards a new package draws differently from the package the
// cache was drawn by, so a deploy clears only those (Jamie, 2026-10-27: "only
// purge the cache when we know that the outcome is different").
//
// Each package is a zip built by tools/package.mjs. Both are unpacked into
// .build/compare/ and their handlers draw every page in tools/samples.json,
// one for each way a card is drawn, the way CloudFront asks: first with no
// query, then at the v the 302 names. A site whose samples come out byte for
// byte the same in both is left in the cache. A site is cleared when any of
// its samples differs twice running (once could be a photo fetched a moment
// apart), when either package fails to draw one, or when it has no sample.
//
// The samples are the whole test: a change that shows only on a page no
// sample is like (a script the fonts lack, say) is not seen, and those cards
// keep the old drawing until their post changes. Add a sample for any new
// way of drawing a card, or deploy with --clear-all.
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { siteAt } from '../src/sites.mjs';
import { OUT } from './package.mjs';

/** A page's address as its card path: /www/..., /weekly/archive/<n>, /another/... */
export function pathFor(url) {
  const { pathname } = new URL(url);
  const site = siteAt(url)?.id;
  if (!site) return url;
  // A site's front page is its own card, /<site>/index.png.
  if (pathname === '/') return `/${site}/index.png`;
  return `/${site}${pathname.replace(/\.html$/, '').replace(/\/$/, '')}.png`;
}

/** The entries of a zip tools/package.mjs wrote (stored sizes, deflate or none). */
export function unzip(archive) {
  const entries = [];
  let at = 0;
  while (archive.readUInt32LE(at) === 0x04034b50) {
    const method = archive.readUInt16LE(at + 8);
    const packed = archive.readUInt32LE(at + 18);
    const nameLength = archive.readUInt16LE(at + 26);
    const extra = archive.readUInt16LE(at + 28);
    const name = archive.toString('utf8', at + 30, at + 30 + nameLength);
    const start = at + 30 + nameLength + extra;
    const raw = archive.subarray(start, start + packed);
    entries.push({ name, data: method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw) });
    at = start + packed;
  }
  if (!entries.length) throw new Error('not a zip from tools/package.mjs');
  return entries;
}

/** Unpack a package and load its handler. */
export async function load(archive) {
  const dir = path.join(OUT, 'compare', createHash('sha256').update(archive).digest('hex').slice(0, 16));
  for (const { name, data } of unzip(archive)) {
    const file = path.join(dir, name);
    if (!file.startsWith(dir + path.sep)) throw new Error(`${name} leaves the package`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }
  const { handler } = await import(pathToFileURL(path.join(dir, 'index.mjs')).href);
  return handler;
}

const request = (rawPath, rawQueryString = '') => ({
  rawPath,
  rawQueryString,
  requestContext: { http: { method: 'GET' } },
});

/** One card as a handler draws it: its status, type and bytes. */
export async function draw(handler, cardPath) {
  const quiet = console.log;
  console.log = () => {};
  try {
    let response = await handler(request(cardPath));
    if (response.statusCode === 302) {
      const query = new URL(response.headers.location, 'https://cards.invalid').search.slice(1);
      response = await handler(request(cardPath, query));
    }
    return {
      status: response.statusCode,
      type: response.headers?.['content-type'] ?? '',
      body: response.body ?? '',
    };
  } finally {
    console.log = quiet;
  }
}

const same = (a, b) => a.status === 200 && b.status === 200 && a.type === b.type && a.body === b.body;

/**
 * The sites whose cards differ between two handlers, each with the reason.
 * `sites` is every site id the card maker draws; one with no sample is
 * always listed.
 */
export async function changedSites(before, after, samples, sites) {
  const changed = new Map();
  for (const url of samples) {
    const cardPath = pathFor(url);
    const site = cardPath.split('/')[1];
    if (changed.has(site)) continue;
    let a = await draw(before, cardPath);
    let b = await draw(after, cardPath);
    if (!same(a, b)) {
      a = await draw(before, cardPath);
      b = await draw(after, cardPath);
    }
    if (a.status !== 200 || b.status !== 200) changed.set(site, `${url} drew ${a.status} before, ${b.status} after`);
    else if (!same(a, b)) changed.set(site, `${url} draws differently`);
  }
  const sampled = new Set(samples.map((url) => pathFor(url).split('/')[1]));
  for (const site of sites) if (!sampled.has(site)) changed.set(site, 'no sample to compare');
  return changed;
}

export async function readSamples() {
  const file = new URL('./samples.json', import.meta.url);
  return JSON.parse(await fs.readFile(file, 'utf8')).samples.map((sample) => sample.url);
}
