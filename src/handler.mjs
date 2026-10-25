// The Lambda behind https://cards.thingelstad.com, reached only through its
// CloudFront distribution (the function URL takes IAM auth, and only that
// distribution may invoke it).
//
//   GET /www/<yyyy>/<mm>/<dd>/<slug>.png      the card for that blog post
//   GET /weekly/archive/<n>.png               ... that Weekly Thing issue
//   GET /another/<yyyy>/<mm>/<dd>/<slug>.png  ... that Another Thing episode
//   GET /health                            the package this function runs
//
// A card is drawn only as its page names it: the page's og:image carries the
// v its site hashed from what the card shows, so an edited post gets a new
// card. A request with any other query (another v, none, or a second one) is
// sent to the card the page names, kept five minutes, and nothing is drawn;
// a page whose og:image is
// not this card has none here. A drawn card is kept a year, keyed on the path
// and v, behind Origin Shield so the edges share one copy; one whose photo
// couldn't be had just now is kept five minutes, so it is drawn again with
// it. A post that doesn't exist is a 404, kept five minutes. One log line a
// request, never a post's words.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardFor } from './card.mjs';
import { fetchPhoto, fetchPost, namedVersion, postFor, SITES } from './post.mjs';
import { prepare, render } from './render.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CODE = process.env.CARDS_CODE || 'local';

// Start loading the fonts and resvg while the first request is on its way.
prepare(DIR).catch(() => {});

const BRIEF = 'public, max-age=300';
const YEAR = 'public, max-age=86400, s-maxage=31536000';

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
    return text(404, 'Not a card', BRIEF);
  }
  const query = event.rawQueryString ?? '';
  const v = new URLSearchParams(query).get('v') ?? '';
  try {
    const post = await fetchPost(target.url, target);
    if (!post) {
      log(404, { reason: 'no post' });
      return text(404, 'No such post', BRIEF);
    }
    const named = namedVersion(post.card, route);
    if (named === null) {
      log(404, { reason: 'not named', v });
      return text(404, 'The page names no card here', BRIEF);
    }
    // The query must be exactly the one the page names: CloudFront keys every
    // v it is given (?v=<named>&v=x, an escaped copy of the hash), so a
    // second spelling would be a second drawing of the same card.
    const canonical = named ? `v=${encodeURIComponent(named)}` : '';
    if (query !== canonical) {
      log(302, { reason: 'other v', query: query.slice(0, 200), named });
      return {
        statusCode: 302,
        headers: { location: named ? `${route}?${canonical}` : route, 'cache-control': BRIEF },
        body: '',
      };
    }
    const photoStart = Date.now();
    let photo = null;
    let state = post.photo ? 'drawn' : 'none';
    try {
      photo = await fetchPhoto(post.photo);
      if (post.photo && !photo) state = 'skipped';
    } catch {
      state = 'failed';
    }
    const drawStart = Date.now();
    // A card with a photo is a JPEG, kept under Bluesky's 1 MB; one of type
    // and colour stays PNG. Either is served at its .png path.
    const format = photo ? 'jpeg' : 'png';
    const image = await render(cardFor(post, { site: SITES[target.site], photo, kicker: target.kicker }), DIR, { format });
    log(200, {
      site: target.site,
      v,
      format,
      bytes: image.length,
      photo: state,
      photoMs: drawStart - photoStart,
      drawMs: Date.now() - drawStart,
      titled: Boolean(post.title),
    });
    return {
      statusCode: 200,
      headers: { 'content-type': `image/${format}`, 'cache-control': state === 'failed' ? BRIEF : YEAR },
      body: image.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    log(502, { v, error: String(error?.message ?? error).slice(0, 300) });
    return text(502, 'The card could not be drawn', 'no-store');
  }
}
