// The Lambda behind https://cards.thingelstad.com, reached only through its
// CloudFront distribution (the function URL takes IAM auth, and only that
// distribution may invoke it).
//
//   GET /www/<yyyy>/<mm>/<dd>/<slug>.png   the card for that blog post
//   GET /health                            the package this function runs
//
// A card is drawn once and kept: CloudFront holds it for a year, keyed on
// the path and ?v=, which the theme sets from a hash of the post's words so
// an edited post gets a new card. A post that doesn't exist is a 404, kept
// for five minutes. One log line a request, never a post's words.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardFor } from './card.mjs';
import { fetchPhoto, fetchPost, postFor, SITES } from './post.mjs';
import { prepare, render } from './render.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CODE = process.env.CARDS_CODE || 'local';

// Start loading the fonts and resvg while the first request is on its way.
prepare(DIR).catch(() => {});

const text = (statusCode, body, cache) => ({
  statusCode,
  headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': cache },
  body: `${body}\n`,
});

export async function handler(event) {
  const started = Date.now();
  const method = event.requestContext?.http?.method ?? 'GET';
  const route = event.rawPath ?? '/';
  const log = (status, extra = {}) =>
    console.log(JSON.stringify({ method, path: route, status, ms: Date.now() - started, ...extra }));

  if (method !== 'GET' && method !== 'HEAD') {
    log(405);
    return { ...text(405, 'Method not allowed', 'no-store'), headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' } };
  }
  if (route === '/health') {
    log(200);
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({ ok: true, code: CODE }),
    };
  }
  const target = postFor(route);
  if (!target) {
    log(404);
    return text(404, 'Not a card', 'public, max-age=300');
  }
  try {
    const post = await fetchPost(target.url);
    if (!post) {
      log(404, { reason: 'no post' });
      return text(404, 'No such post', 'public, max-age=300');
    }
    const photo = await fetchPhoto(post.photo);
    const png = await render(cardFor(post, { site: SITES[target.site], photo }), DIR);
    log(200, { bytes: png.length, photo: Boolean(photo), titled: Boolean(post.title) });
    return {
      statusCode: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=86400, s-maxage=31536000',
      },
      body: png.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    log(502, { error: String(error?.message ?? error).slice(0, 300) });
    return text(502, 'The card could not be drawn', 'no-store');
  }
}
