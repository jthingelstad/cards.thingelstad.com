# AGENTS.md — cards.thingelstad.com

`CLAUDE.md` is a symlink to this file. Domain rules are in
[`../AGENTS.md`](../AGENTS.md); AWS and secret rules one level above that.

## What this is

The card maker: the 1200 x 630 social card (Open Graph and Twitter image) for
each post on Jamie's sites, drawn from the post itself. Decided with Jamie on
2026-10-24 after micro.blog's own card styles were rejected: the full canvas,
no photo of Jamie, the blog's type in black and white (on black since the
2026-10-25 design pass), and photo posts get the card too.

    https://cards.thingelstad.com/www/2026/10/15/the-nnxyz-rooms.png?v=<hash>

names https://www.thingelstad.com/2026/10/15/the-nnxyz-rooms.html. The
theme (thing-hugo `partials/meta.html`, 2.0.19, live
2026-10-24) sets `og:image` on every post to its card, with `?v=` a hash of
the post's title, date, categories and text (micro.blog gives Hugo no
last-edit date), so an edited post gets a new card.

Weekly Thing issues and Another Thing episodes have cards too (2026-10-25;
Jamie: "Weekly Thing and Another Thing issues should get custom share images
with cards.thingelstad.com solution"). `SITES` in `src/sites.mjs` is the list,
and each site's own `base.njk` sets `og:image`, with `v` a hash of what the
card shows:

    https://cards.thingelstad.com/weekly/archive/353.png?v=<hash>
    https://cards.thingelstad.com/weekly/index.png?v=<hash>
    https://cards.thingelstad.com/another/2025/10/05/how-do-you-start-a.png?v=<hash>

Linking Things records have cards too (2026-10-25; Jamie: "Linking Things
link cards with Jamie-voice notes only"), set by the site's `src/lib/card.ts`:

    https://cards.thingelstad.com/links/links/dec34be50cef.png?v=<hash>

names https://links.thingelstad.xyz/links/dec34be50cef/. Every other page
there keeps the site's one share image.

Then richer (Jamie, 2026-10-25: "make it rich and inviting and equal to the
quality of the thing it is previewing"): every Weekly Thing and Another Thing
card went dark, its words in white.

Then the design pass (2026-10-25, worked out on the canvas at
claude.ai/artifact/TF23AaDQfNUH4WibFtdZpb; Jamie: "Approved: build and deploy
the cards.thingelstad.com redesign (dark Links cards, black blog cards,
photo-card polish, square photos on black), first sentence as headline only
when short, after showing previews"): every card is dark now, under one dark
band (`#0e0e12`) whose site label takes the site's dark-mode strip colour
(`mark` in `src/sites.mjs`; the strip's light ink `#ececf0` for a site with
none). Every kicker is small capitals, every headline sits under a short bar
and is broken into even lines by `breakLines` (Satori's own `textWrap:
'balance'` misbreaks under a clamp), and an issue's counts are pills. Jamie's
calls on it: Links "color: dark mode", the blog "prefer the black ground", and
no running total of links on any card ("that number changes all the time").
Another Thing was added at Jamie's ask the same day ("we didn't get a design
for Another Thing podcast episodes… we need that one too").

- **An issue** is drawn from its page's h-entry: the issue number as kicker,
  the dek (`p-summary`) as its words, and the counts the page publishes as
  `p-link-count` and `p-journal-count` ("19 links · 4 journal entries"). An
  issue with a cover (`u-featured`, only `files.thingelstad.com/weekly-thing/`)
  sets all of that in white over the cover, darkened top and bottom (Jamie:
  "text overlaid on the issue image with the subtitle/dek included. Counts of
  links and journal entries?"); the early issues with none get the same words
  on the newsletter's blue under a large faint W, its logo letter. An issue
  titled only with its date ("May 5, 2018") isn't dated twice.
- **The newsletter's front page** (`/weekly/index.png`) is drawn from the
  h-feed on its hero: the logo and name (`p-name`), the eyebrow (`p-kicker`),
  the hero line (`e-summary`, its line breaks kept and its `em` in the light
  blue), the newest cover (`u-featured`) darkened to the left, and the
  archive's size (`p-issue-count`, `p-link-count`: "353 issues · 6,510
  links"). Every page there but an issue or a topic with its own image shares
  it.
- **An episode** is drawn on the show's slate with its three dots, and the
  dots again, large, at the right: the crimson one is the play button, with
  "Listen" and the running time under it (`p-duration`, seconds, worded as
  the site's `friendlyDuration`: "11 min"). At the foot, the episode's number
  (`p-episode`) and date, its title and summary. A page without them still
  gets the card, without those words. No photo: the show's art is its own.
- **A saved link** is drawn on black, the way its record page reads: the host
  it points at (`p-host`) in a chip and again very large and faint behind
  the words, the issues that carried it (`p-issue`, as "In WT353" chips, two
  and then "+N"), the day saved (`dt-published`), then the title (`p-name`)
  in white, each line underlined in the dark-mode link blue `#78acf2` (a rule
  under the line, since Satori's underline runs through descenders), and the
  note (`e-content`), quoted and marked "Jamie's note",
  only when the page's `p-voice` is `jamie`: a quotation from the page
  (`excerpt`), a note around one (`mixed`), an agent's summary (`agent`) or a
  note on a page that doesn't say whose it is never reaches the card. A
  title too long for its lines is cut at a word before it is drawn, since a
  line Satori clamps loses its underline. No photo yet: the linked page's own
  `og:image` is a later step (Jamie: fine "if it sticks to the metadata"),
  not built.
- The blog reads its own words, never a `p-summary`. The site's label in the
  band takes its sites-strip colour.
- **A blog photo post** sets its words in white over its photo, the way an
  issue sits on its cover (Jamie, 2026-10-24: "I think we can do image
  overlay on blog previews too"), when the photo is wide (at least 1.3 wide
  for each 1 high), isn't a screenshot, its size is known, and the post has a
  title or is a micropost of 80 characters or fewer: the headline large, a
  title's text under it, the photo darkened at the top, toward the foot and
  from the left. A screenshot runs off the card's right edge in a frame beside
  the words. Any other photo (square or tall) stands full height on the right
  half, faded into black under the words, with the band under the words
  only. `overPhoto` in `src/card.mjs` is that rule; `OVERLAY` holds its three settings (`wide`, `words`, and `top`, how dark the top of
  the photo is, which issue covers share), each one Jamie's call. Jamie
  chose 1.3, 80 and 0.72 on 2026-10-25 ("with the defaults: no square
  photos, 80 characters, darker top 0.72"), after previews showed a square
  photo losing its subject to the crop and 150 characters covering it.
- **A blog post with no photo** is white on black. A titled post is its title
  and the start of its text. A micropost past 90 characters whose first
  sentence is 12 to 60 characters leads with that sentence as the headline and
  the rest under it (`lede`; Jamie: "first sentence as headline only when
  short"); any other micropost is set whole, larger the shorter it is.

## How it works

- `src/sites.mjs` holds one entry a site, and everything that differs
  between the sites is there (2026-10-25): which card paths name which pages,
  what its h-entry gives the card (the blog's own words and first upload; an
  issue's dek, cover and counts; an episode's number and running time), its
  front page's h-feed where it has one, the layout that draws it, its mark,
  and where its photos are fetched from. The origin, the label and the host
  come from `src/shared/sites.json`, the vendored copy of the domain's
  `shared/sites.json`, and the band's name from its owner.
- `src/post.mjs` maps a card path to its page, fetches the page and reads its
  h-entry (p-name, dt-published, p-category, then the site's entry for the
  rest), and fetches its photo where the site's entry says (a blog upload
  through micro.blog's resizer, an issue's cover straight from
  `files.thingelstad.com`). It fetches nothing but the sites' pages and those
  photo hosts, follows a redirect only within the host it started on (a post
  that redirects off its site has no card), and reads no page past 2 MB or
  photo past 10 MB. `src/read.mjs` has the reading helpers every site shares.
- `src/card.mjs` is the layouts, as the element trees Satori draws: `post`
  (the blog), `issue`, `episode`, and the newsletter's front page.
- `src/render.mjs` draws it: Satori to SVG, resvg (WebAssembly) to pixels,
  then a JPEG for a card with a photo and a PNG for the rest (2026-10-25). A
  photo card as PNG ran 0.6 to 1.5 MB, past Bluesky's 1,000,000-byte limit
  for a link card's image; as a JPEG (`jpeg-js`, quality 82, no chroma
  subsampling) it is 140 to 250 KB. Type on flat colour stays PNG, about 50
  KB. Both are served at the `.png` path with their own `content-type`; no
  site declares `og:image:type`, so none has to change. Fonts are
  static Inter and Inter Tight WOFF from Fontsource 5.3.0 (Satori reads no WOFF2
  or variable fonts). Emoji are Twemoji SVGs (`@twemoji/svg` 15.0.0, graphics
  CC-BY 4.0) drawn as images in the line; one newer than that set draws as
  nothing, never as a missing-glyph box. Other scripts the fonts lack (CJK,
  Arabic) still draw as boxes: no font is loaded for them.
- `src/handler.mjs` is the Lambda: one function URL, IAM auth, invoked only by
  its CloudFront distribution (origin access control). It draws only the card
  a page names: the page's `og:image` gives the `v`, and a request with any
  other query (another `v`, none, a second `v`, or the hash escaped) gets a
  302 to that one, kept five minutes, with nothing drawn: CloudFront keys
  every `v` it is given, so each spelling would be another drawing. A page whose `og:image` is not this card is a 404, so a site that
  stops pointing at its card stops having one. A drawn card is kept a year,
  keyed on the path and `v`, behind Origin Shield (us-east-1), so the edges
  share one copy and a post going out is drawn about once, not once per edge
  (before 2026-10-25 one post was drawn 12 times). A card whose photo
  couldn't be had just now (unreachable, slow, a 5xx or 429) is kept five
  minutes, so it gets drawn again with it; a photo that is gone or not
  drawable is simply left out. A missing post is a 404 kept five minutes.
  One JSON log line a request, never a post's words: `v`, `format`, `photo`
  (`drawn`, `none`, `skipped`, `failed`), `photoMs` and `drawMs` on a drawn
  card.

## Adding a site

A site joins in two places, its own pages and here, in this order (the card
maker ships first, so the page never names a card it can't draw):

1. **Here.** Its entry in `src/sites.mjs`: `page(rest)` for the paths its
   cards take (`/<id>` then the page's own path, `.png` for its trailing
   `.html` or `/`), `read(p)` for what its h-entry gives the card, a `layout`
   (one in `src/card.mjs`, or a new one), its `mark`, and `photo(src)` naming
   the only photo host it may fetch (`() => null` for none). The site must be
   in `shared/sites.json` (`npm run sites:sync`); its origin and label come
   from there. Tests for its paths and its reading, and previews of real
   pages (`npm run render -- --root=<its dist>`) looked at before it merges.
   Deploy.
2. **Its pages.** An h-entry with the fields its entry reads (the card reads
   nothing else), and in its `<head>`:

       <meta property="og:image" content="https://cards.thingelstad.com/<id>/<path>.png?v=<v>">
       <meta property="og:image:width" content="1200">
       <meta property="og:image:height" content="630">
       <meta property="og:image:alt" content="<what the card says>">
       <meta name="twitter:card" content="summary_large_image">

   `v` is a hash of everything the card shows, so a page that changes gets a
   new card: Weekly Thing and Another Thing take the first 10 hex characters
   of the SHA-256 of a JSON array of those fields (the blog's theme an MD5,
   which is all Hugo has). The card maker draws only at the `v` the page
   names, so the page is the only place it is computed. No `og:image:type`:
   a card is PNG or JPEG at its `.png` path.

## Working on it

- `npm test` — `sites:check` (the vendored `sites.json` matches the domain's;
  from a worktree outside `~/Projects/thingelstad.com/`, set `SITES_SOURCE` to
  that file), then `test:unit`: paths, each site's entry, h-entry reading,
  excerpts, a PNG of every card kind, a JPEG of a photo card under 1 MB, and
  (with fetch stubbed) the `v` check, redirects, size limits and photos.
  GitHub Actions runs `test:unit` on every pull request and on main; it
  checks out only this repo, so the drift check stays local.
- `npm run sites:sync` — copy the domain's `shared/sites.json` in, after it
  changes there.
- `npm run render -- <post URL>...` — draw real posts into `.build/preview/`
  (`.jpg` for a card with a photo). `--out=<dir>` writes elsewhere.
  `--root=<dir>` reads the pages from a site's local build (its `dist/`)
  instead of the live site, to see a page's card before the page that names
  it ships. `--overlay='{"wide":0.95,"words":150,"top":0.6}'` draws the blog
  overlay with other settings than `OVERLAY`, to compare them; the run says
  which posts went over their photo.
  Look at the cards before shipping a layout change.
- `npm run plan` / `npm run deploy` — the `cards` stack (`infra/cards.json`),
  as the cloud-engineer identity from this Mac (the script refuses any other).
  Deploy uploads the zip by content key and executes a change set; then it
  reads `/health` through CloudFront until it reports the new key, and clears
  the whole cache (`/*`) for that key so every card is drawn again by the code
  now live. The invalidation is keyed on the code key, so an unchanged deploy
  or a rerun clears nothing twice. A cleared cache is drawn back on demand.
- `npm run certificate` — the `cards-certificate` stack, printing the ACM
  validation record. DNS is at Namecheap and records there are Jamie's to add.
  Once the certificate is ISSUED, the next deploy gives the distribution its
  `cards.thingelstad.com` alias.

The function's reserved concurrency (10) is the cost ceiling. A made-up `v`
costs a page fetch and a 302, never a drawing; every drawn card is one a page
names.

Alarms (draw failures, function errors, and throttles: a request turned away
at the ceiling never reaches the function, so only the throttle alarm sees it)
go to `weekly-thing-librarian-alarms`, the queue-only topic the other sites use.
None of them sees past Lambda, so DNS, the certificate and CloudFront are
watched from outside: Jamie's updown.io check (2026-10-24; not
Tinylytics, which has no page views here to count). `/health` is the path to
check, never `/`, which is a 404 by design. Keep the ACM validation CNAME
(`_599951081a9a6beba0c85c6a673beb51.cards`) at Namecheap: renewal needs it.
