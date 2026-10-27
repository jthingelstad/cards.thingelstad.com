// Draw cards on this Mac, the way the Lambda does, reading the live posts.
//
//   node tools/render.mjs <post URL or card path>... [--out=<dir>] [--root=<dir>] [--overlay=<json>]
//   node tools/render.mjs --samples [--out=<dir>]   (npm run previews)
//
// --samples draws the pages in tools/samples.json, one for each way a card
// is drawn, so every change to a layout is looked at against the same cards.
//
// --overlay='{"wide":0.95,"words":150,"top":0.6}' draws the blog overlay with
// other settings than OVERLAY in src/card.mjs, to compare them.
//
// Takes any page a site in sites.mjs has a card for. Writes <site>-<slug>.png
// (or .jpg, for a card with a photo) for each to --out (default
// .build/preview/). Fetches the posts and their photos; writes nothing
// anywhere else. --root reads the pages from a site's local build instead
// (its dist/, say), so a page's card can be seen before the page is live:
// /links/<id>/ is <root>/links/<id>/index.html.
import fs from 'node:fs/promises';
import path from 'node:path';
import { cardFor, OVERLAY, overPhoto } from '../src/card.mjs';
import { fetchPhoto, fetchPost, postFor, readPost } from '../src/post.mjs';
import { render } from '../src/render.mjs';
import { SITES } from '../src/sites.mjs';
import { pathFor, readSamples } from './compare.mjs';
import { OUT, stageAssets } from './package.mjs';

const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith('--out='))?.slice(6) ?? path.join(OUT, 'preview');
const root = args.find((a) => a.startsWith('--root='))?.slice(7);
const overlay = JSON.parse(args.find((a) => a.startsWith('--overlay='))?.slice(10) ?? '{}');
const samples = args.includes('--samples') ? await readSamples() : [];
const targets = [...samples, ...args.filter((a) => !a.startsWith('--'))];
if (!targets.length) {
  console.error('usage: node tools/render.mjs <post URL or card path>... [--samples] [--out=<dir>] [--root=<dir>] [--overlay=<json>]');
  process.exit(2);
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
  const image = await render(cardFor(data, { site: SITES[post.site], photo, kicker: post.kicker, overlay }), dir, { format });
  const file = path.join(out, `${post.site}-${path.basename(cardPath, '.png')}.${format === 'jpeg' ? 'jpg' : 'png'}`);
  await fs.writeFile(file, image);
  const over = post.site === 'www' && overPhoto(data, photo, { ...OVERLAY, ...overlay }) ? '  over its photo' : '';
  console.log(`${file}  ${image.length} bytes  ${Date.now() - started} ms${over}`);
}
