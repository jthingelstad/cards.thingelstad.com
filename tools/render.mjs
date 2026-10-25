// Draw cards on this Mac, the way the Lambda does, reading the live posts.
//
//   node tools/render.mjs <post URL or card path>... [--out=<dir>] [--root=<dir>]
//
// Takes any page a site in sites.mjs has a card for. Writes <site>-<slug>.png
// (or .jpg, for a card with a photo) for each to --out (default
// .build/preview/). Fetches the posts and their photos; writes nothing
// anywhere else. --root reads the pages from a site's local build instead
// (its dist/, say), so a page's card can be seen before the page is live:
// /links/<id>/ is <root>/links/<id>/index.html.
import fs from 'node:fs/promises';
import path from 'node:path';
import { cardFor } from '../src/card.mjs';
import { fetchPhoto, fetchPost, postFor, readPost } from '../src/post.mjs';
import { render } from '../src/render.mjs';
import { SITES, siteAt } from '../src/sites.mjs';
import { OUT, stageAssets } from './package.mjs';

const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith('--out='))?.slice(6) ?? path.join(OUT, 'preview');
const root = args.find((a) => a.startsWith('--root='))?.slice(7);
const targets = args.filter((a) => !a.startsWith('--'));
if (!targets.length) {
  console.error('usage: node tools/render.mjs <post URL or card path>... [--out=<dir>] [--root=<dir>]');
  process.exit(2);
}

// A page's address as its card path: /www/..., /weekly/archive/<n>, /another/...
function pathFor(url) {
  const { pathname } = new URL(url);
  const site = siteAt(url)?.id;
  if (!site) return url;
  // The newsletter's front page is its own card, /weekly/index.png.
  if (pathname === '/') return `/${site}/index.png`;
  return `/${site}${pathname.replace(/\.html$/, '').replace(/\/$/, '')}.png`;
}

const dir = await stageAssets();
await fs.mkdir(out, { recursive: true });
for (const target of targets) {
  const cardPath = target.startsWith('http') ? pathFor(target) : target;
  const post = postFor(cardPath);
  if (!post) throw new Error(`${target} has no card`);
  const started = Date.now();
  const local = root && path.join(root, new URL(post.url).pathname.replace(/\/$/, '/index.html'));
  const data = local ? readPost(await fs.readFile(local, 'utf8'), post.url, post) : await fetchPost(post.url, post);
  if (!data) throw new Error(`${post.url}: no such post`);
  const photo = await fetchPhoto(data.photo, SITES[post.site]).catch((error) => {
    console.warn(`${target}: drawn without its photo (${error.message})`);
    return null;
  });
  const format = photo ? 'jpeg' : 'png';
  const image = await render(cardFor(data, { site: SITES[post.site], photo, kicker: post.kicker }), dir, { format });
  const file = path.join(out, `${post.site}-${path.basename(cardPath, '.png')}.${format === 'jpeg' ? 'jpg' : 'png'}`);
  await fs.writeFile(file, image);
  console.log(`${file}  ${image.length} bytes  ${Date.now() - started} ms`);
}
