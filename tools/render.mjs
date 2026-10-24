// Draw cards on this Mac, the way the Lambda does, reading the live posts.
//
//   node tools/render.mjs <post URL or card path>... [--out=<dir>]
//
// Writes <slug>.png for each to --out (default .build/preview/). Fetches the
// posts and their photos; writes nothing anywhere else.
import fs from 'node:fs/promises';
import path from 'node:path';
import { cardFor } from '../src/card.mjs';
import { fetchPhoto, fetchPost, postFor, SITES } from '../src/post.mjs';
import { render } from '../src/render.mjs';
import { OUT, stageAssets } from './package.mjs';

const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith('--out='))?.slice(6) ?? path.join(OUT, 'preview');
const targets = args.filter((a) => !a.startsWith('--'));
if (!targets.length) {
  console.error('usage: node tools/render.mjs <post URL or card path>... [--out=<dir>]');
  process.exit(2);
}

const dir = await stageAssets();
await fs.mkdir(out, { recursive: true });
for (const target of targets) {
  const cardPath = target.startsWith('http')
    ? `/www${new URL(target).pathname.replace(/\.html$/, '.png')}`
    : target;
  const post = postFor(cardPath);
  if (!post) throw new Error(`${target} is not a blog post`);
  const started = Date.now();
  const data = await fetchPost(post.url);
  if (!data) throw new Error(`${post.url}: no such post`);
  const png = await render(cardFor(data, { site: SITES[post.site], photo: await fetchPhoto(data.photo) }), dir);
  const file = path.join(out, `${path.basename(cardPath)}`);
  await fs.writeFile(file, png);
  console.log(`${file}  ${png.length} bytes  ${Date.now() - started} ms`);
}
