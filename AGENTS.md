# AGENTS.md — cards.thingelstad.com

`CLAUDE.md` is a symlink to this file. Domain rules are in
[`../AGENTS.md`](../AGENTS.md); AWS and secret rules one level above that.

## What this is

The card maker: the 1200 x 630 social card (Open Graph and Twitter image) for
each post on Jamie's sites, drawn from the post itself. Decided with Jamie on
2026-10-24 after micro.blog's own card styles were rejected: the full canvas,
no photo of Jamie, the blog's type in black and white, and photo posts get the
card too (the photo takes the right half).

    https://cards.thingelstad.com/www/2026/10/15/the-nnxyz-rooms.png?v=<last edit>

names https://www.thingelstad.com/2026/10/15/the-nnxyz-rooms.html. Only the
blog (`www`) has cards so far; `SITES` in `src/post.mjs` is where another site
would join. The theme (thing-hugo `partials/meta.html`) sets `og:image` to the
card with `?v=` from the post's last edit, so an edited post gets a new card.

## How it works

- `src/post.mjs` fetches the post and reads its h-entry (p-name, e-content,
  dt-published, p-category) and its first uploaded photo, through micro.blog's
  resizer. It fetches nothing but the blog and micro.blog's photo hosts, and
  a post that redirects off the blog has no card.
- `src/card.mjs` is the layout, as the element tree Satori draws.
- `src/render.mjs` draws it: Satori to SVG, resvg (WebAssembly) to PNG, with
  static Inter and Inter Tight WOFF from Fontsource 5.3.0 (Satori reads no WOFF2
  or variable fonts).
- `src/handler.mjs` is the Lambda: one function URL, IAM auth, invoked only by
  its CloudFront distribution (origin access control). A card is drawn once and
  CloudFront keeps it a year, keyed on the path and `v`; a missing post is a
  404 kept five minutes. One JSON log line a request, never a post's words.

## Working on it

- `npm test` — paths, h-entry reading, excerpts, and a PNG of every card kind.
- `npm run render -- <post URL>...` — draw real posts into `.build/preview/`.
  Look at the cards before shipping a layout change.
- `npm run plan` / `npm run deploy` — the `cards` stack (`infra/cards.json`),
  as the cloud-engineer identity from this Mac (the script refuses any other).
  Deploy uploads the zip by content key and executes a change set; then it
  reads `/health` through CloudFront until it reports the new key.
- `npm run certificate` — the `cards-certificate` stack, printing the ACM
  validation record. DNS is at Namecheap and records there are Jamie's to add.
  Once the certificate is ISSUED, the next deploy gives the distribution its
  `cards.thingelstad.com` alias.

The function's reserved concurrency (10) is the cost ceiling: anyone can ask
for a card under a new `v`, and each miss is a render.

Alarms (draw failures, function errors) go to
`weekly-thing-librarian-alarms`, the queue-only topic the other sites use.
