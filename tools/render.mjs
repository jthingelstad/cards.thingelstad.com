// Draw cards on this Mac, the way the Lambda does, reading the live posts.
//
//   node tools/render.mjs <post URL or card path>... [--out=<dir>]
//
// Takes blog posts, Weekly Thing issues and Another Thing episodes. Writes
// <site>-<slug>.png (or .jpg, for a card with a photo) for each to --out (default .build/preview/). Fetches the
// posts and their photos; writes nothing anywhere else.
import fs from 'node:fs/promises';
import path from 'node:path';
import { cardFor } from '../src/card.mjs';
import { fetchPhoto, fetchPost, postFor } from '../src/post.mjs';
import { render } from '../src/render.mjs';
import { SITES, siteAt } from '../src/sites.mjs';
import { OUT, stageAssets } from './package.mjs';

const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith('--out='))?.slice(6) ?? path.join(OUT, 'preview');
const targets = args.filter((a) => !a.startsWith('--'));
if (!targets.length) {
  console.error('usage: node tools/render.mjs <post URL or card path>... [--out=<dir>]');
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
  if (!post) throw new Error(`${target} is not a post, issue or episode`);
  const started = Date.now();
  const data = await fetchPost(post.url, post);
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
