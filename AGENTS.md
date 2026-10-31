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

names https://links.thingelstad.xyz/links/dec34be50cef/. Its lens pages
have sky cards (2026-10-31, below), and its About, Search, Newest and Stats
keep the site's one share image:

    https://cards.thingelstad.com/links/issues/354.png?v=<hash>
    https://cards.thingelstad.com/links/index.png?v=<hash>

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
- **A Linking Things lens page** (2026-10-31; the previews at
  claude.ai/artifact/LDdzAms1CcQ6vA86HwuPtg; Jamie: "Approved: build Linking
  Things sky cards (a sky layout on cards.thingelstad.com, then og:image on
  every lens page), counts on issues and finished years only, the whole-sky
  card on the front page and /sky/") is drawn over the sky the site's front
  page opens on: every star where it stands there, the topics' glows under
  them, and the links the page lists lit in the sky's gold, the view turned
  toward them (`skyField`: a 2D zoom that frames the lit stars right of the
  words, from four times closer to half again farther, three in a hundred
  trimmed each side of a large set). Fewer lit stars draw larger, so a year's
  thousand don't run together. The words sit on the left over the night: the
  page's kicker (`p-kicker`), a gold bar, its name (`p-headline`), and a
  count pill only where the number is fixed (`p-link-count`, which the site
  sets on an issue and a finished year only). The pages are an issue, a year,
  a site (`hosts/`), a kind, a topic, the topics, a day (`on/`), `/sky/` and
  the front page (`index`), each read from its page's h-feed (`home(p,
  entries)` in `src/sites.mjs`); the lit links are its h-entries' `u-url`
  record addresses. The sky is the site's `/sky/card.json` (`u-sky`, the only
  address it may come from), the stars projected onto the card as the front
  page first shows them when the site builds: `{ width, height, ids, stars:
  [x, y, brightness, warmth, ...], glows: [[x, y, r, colour], ...] }`. It
  rides the photo slot (`json: true`), is checked (`isSkyMap`) and kept ten
  minutes in the function, so a crawler sweeping 7,000 site pages fetches it
  once a while; a map that can't be had or isn't one throws, so that card is
  kept five minutes, drawn without the sky. A card over the sky is a JPEG
  (a field of small stars runs to 700 KB as PNG), 120 to 150 KB. Its samples
  in `tools/samples.json` are the front page, an issue, a finished year, a
  site, a topic and a day, so a change to the sky layout is compared before
  the links cache is cleared.
- **A Things 4 Good page** (2026-10-25, the canvas at
  claude.ai/artifact/7knUfs7P2AEjjcnTrDLrea; Jamie: "Approved: build Things 4
  Good cards on cards.thingelstad.com with direction B, owner "The Thingelstad
  Family", the candle photos as shown, no totals on Numbers, not in the sites
  strip") reads as the site does: a candle photo under a warm dark (`#1c140e`),
  the page's eyebrow (`p-kicker`) in candlelight capitals beside the site's
  favicon candle, a marigold bar, the heading (`p-name`) in Newsreader with
  its last words (`p-accent`, "100% for good.") in the site's pale pine
  italic, a line under it (`p-summary`) in Hanken Grotesk, and the sale's
  facts (`p-fact`) as pills. The photo (`u-featured`) is one the site cuts to
  the card's photo area and serves from its own `/images/cards/`, the only
  photos fetched for it. The band names the family, not Jamie (the entry's
  `owner`). Each page publishes these as `<data>` elements in an h-entry
  that `base.njk` writes from the page's `card` front matter; the front
  page's facts come from the site's own sale dates and price, and no card
  carries a running total.
- **A Road Sign Math page** (2026-10-31; Jamie: "the road sign image should
  be edge-to-edge, the solution (math) should be MathJax rendered as an
  overlay on top of it"). A sign (`/rsm/signs/<slug>.png`, an h-entry) is its
  photo edge to edge, cropped from 20% down since signs stand high in the
  frame, with the place (`p-location`) as the kicker beside the site's logo
  (√(5 − 1) = 2 on its green plate), the first way's math drawn from its
  LaTeX (`p-tex`) by MathJax 3.2.2, the version the site draws it with
  (`src/math.mjs`), the sign's name, who found it and the day
  (`p-finder`, `dt-published`, a bare day written as is), and "+N more ways"
  past the first (`p-way-count`). Two ways to set the math, `RSM_SIGN`:
  `plate`, on the site's green sign plate as the site sets a way (the
  default), and `band`, white over the photo darkened toward its foot
  (`npm run render -- --rsm=band`); which one ships is Jamie's pick. A long way
  steps down to fit (`mathSize`); LaTeX MathJax can't draw falls back to the
  way's text (`p-math`). An unsolved sign shows its numbers (`p-number`) on
  small plates under "Can you solve it?". A player (`/rsm/players/<handle>.png`)
  is read from the page's own h-card (the one whose `u-url` is the page):
  their profile photo (`u-photo`) or their letter in their colour
  (`p-avatar-color`, an ink letter on the yellow, as the site draws it) on a
  white ring, their name, and signs, states and first year as pills. Home
  (`/rsm/index.png`, an h-feed) is the site's map with a pin for each place
  (`p-pin`, "x y signs", x and y in percent of the map) beside its name,
  hero line and counts. The map is the site's own `/us-map.svg` (`u-map`):
  only its land and border path data are taken (`mapPaths`) and drawn in the
  site's dark colours, so that card stays PNG. Photos come only from
  `https://roadsignmath.xyz/p/<id>/large.jpg`, the map only from that one
  address. Type is the site's own Overpass (700 and 800); the band is Inter.
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
  (the blog), `issue`, `episode`, `link`, `sky` (Linking Things' lens
  pages), Things 4 Good's, Road Sign Math's, and the newsletter's front
  page.
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

## Card design

What every card shares, so a new site's card reads as one of the set (the
2026-10-25 design pass; the canvas at
claude.ai/artifact/TF23AaDQfNUH4WibFtdZpb holds the proposals and what was
passed over). A new layout follows these; a change to one of them is Jamie's
call, shown on a canvas first.

- **Dark, always.** Black (`#16161a`), a site's own ground, or a photo
  darkened under the words; words in white. No white cards.
- **The band closes every card**: `band(site)` via `darkCard`, `#0e0e12`, the
  owner's name, the site's label and its host. The label's colour is the
  site's `mark`: its dark-mode `--jt-*-text` value in `shared/tokens.css` (the
  strip's dark-mode colours), or none for the light ink `#ececf0`.
- **Kicker, bar, headline.** The kicker (date, issue or episode number,
  categories) is `kicker()`: 20px, weight 700, letter-spaced small capitals.
  Then `bar()`, a 56 x 5 bar in white or the site's light accent. Then the
  headline, always through `headline()`, which balances its lines with
  `breakLines` and falls back to a clamp only when it can't.
- **One mark of the site's own**: Weekly Thing's W (logo in the kicker, large
  and faint with no cover), Another Thing's three dots (the crimson one the
  play button), the saved link's host, very large and faint. A new site gets
  one, drawn from its own logo or favicon, never a stock icon.
- **Type**: Inter Tight 800 for headlines, Inter for the rest. Only Inter
  400, 500 and 600 and Inter Tight 700 and 800 are loaded (`FONTS` in
  `src/render.mjs`), so an Inter weight of 700 (the kickers) draws as 600;
  load a weight before designing with it. Things 4 Good, which isn't one of
  the strip sites and has its own type, draws its headings in Newsreader 500
  (and its italic) and its line in Hanken Grotesk 500, loaded for it, and
  Road Sign Math in its Overpass 700 and 800; their bands are Inter, as on
  every card. No italics on sans-serif type
  (thingelstad.com AGENTS.md).
- **Words**: only what the page publishes as its h-entry, and on Linking
  Things only Jamie's own notes. No photo of Jamie, no running totals that
  change by the day (Jamie: "that number changes all the time"; it would also
  break the page's `v`). Counts that belong to the thing itself, like an
  issue's links, are fine, as pills.
- **Photos**: a wide photo goes under the words (`OVERLAY`, Jamie's three
  settings), a square or tall one stands beside them, a screenshot runs off
  the corner in a frame. A photo card is a JPEG under 1 MB.

What Satori does differently from a browser, found the hard way:

- Every element with more than one child needs `display: 'flex'`; `h()` and
  `tree()` build them. Text sits in `display: 'block'`
  leaves.
- No `gap`; use margins. `position: 'absolute'` with `top`/`left`/`right`,
  `borderRadius` with `overflow: 'hidden'`, `boxShadow`, `objectFit` and
  linear gradients all work (the current layouts use each).
- `textWrap: 'balance'` misbreaks under a `lineClamp` (it balances for one
  line more than it keeps), hence `breakLines`.
- Its underline runs through descenders, and `textDecorationSkipInk: 'auto'`
  chops it into pieces: underline a line with a `borderBottom` rule instead
  (`headline(..., { rule })`).
- It breaks no word: a word wider than its line is cut, hence `fitSize`.
- A Satori `lineClamp` drops a decoration on the clamped line, so a title
  that must keep its underline is cut with `clip` before it is drawn.

## Adding a site

A site joins in two places, its own pages and here, in this order (the card
maker ships first, so the page never names a card it can't draw):

1. **Here.** Its entry in `src/sites.mjs` (its id, from `shared/sites.json`,
   is a lowercase letter then letters or digits: `t4g`): `page(rest)` for the paths its
   cards take (`/<id>` then the page's own path, `.png` for its trailing
   `.html` or `/`), `read(p)` for what its h-entry gives the card, a `layout`
   (one in `src/card.mjs`, or a new one), its `mark`, and `photo(src)` naming
   the only photo host it may fetch (`() => null` for none). A page read
   from another microformat (Road Sign Math's players, an h-card) names it
   as `item` in `page()`; a front page with a layout of its own names it as
   `homeLayout`. The site must be
   in `shared/sites.json` (`npm run sites:sync`); its origin and label come
   from there. Its card follows "Card design" above: a proposal on a canvas
   beside the site's current share image first when it needs a new layout.
   Tests for its paths and its reading, a page for each of its layouts in
   `tools/samples.json`, and previews of real pages (`npm run render --
   --root=<its dist>`, then `npm run previews`) looked at before it merges.
   Deploy. A site not yet in `shared/sites.json` (nnxyz, say) starts with its
   entry there: its id, origin and label, and whether it joins the sites
   strip, which is Jamie's call.
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
- `npm run previews` — draw the pages in `tools/samples.json`, one for each
  way a card is drawn (every blog layout, an issue with and without a cover,
  the newsletter's front page, an episode, saved links with and without a
  note), into `.build/preview/` or `--out=<dir>`. Run it before and after a
  layout change and look at every card, not only the one that changed.
- `npm run plan` / `npm run deploy` — the `cards` stack (`infra/cards.json`),
  as the cloud-engineer identity from this Mac (the script refuses any other).
  Deploy uploads the zip by content key and executes a change set; then it
  reads `/health` through CloudFront until it reports the new key, and clears
  the cached cards of only the sites whose cards now draw differently
  (2026-10-27; Jamie: "only purge the cache when we know that the outcome is
  different", after crawlers drew about 18,000 cards in one night).
  `tools/compare.mjs` draws every page in `tools/samples.json` with the
  package the cache was drawn by and with the new one; a site whose samples
  come out the same byte for byte stays cached, and one that differs (twice
  running), fails to draw, or has no sample is cleared (`/<site>/*`, or `/*`
  when every site is). `cache/drawn-by.json` in the code bucket names the
  package the cache was drawn by; deploy writes it only once the clearing is
  done, so a rerun after a failed deploy compares from the same package and
  clears what the first run missed. Plan prints what apply would clear. The
  samples are the whole test, so a change that shows only on a page no
  sample is like (CJK text, say) isn't seen: add a sample for every new way a
  card is drawn, or deploy with `npm run deploy -- --clear-all`.
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
The throttle alarm wants 50 or more turned away in each of three quarter
hours running (2026-10-27; Jamie: "I don't think a single request turned
away shoudl be an alarm"). Crawlers reach the ceiling as a matter of course
(AhrefsBot sweeping the blog's photo cards held it at 10 for three and a
half hours on 2026-10-27, about $0.45 of drawing over two days), and a
turned-away request is not cached, so the crawler gets the card on its next
try.
None of them sees past Lambda, so DNS, the certificate and CloudFront are
watched from outside: Jamie's updown.io check (2026-10-24; not
Tinylytics, which has no page views here to count). `/health` is the path to
check, never `/`, which is a 404 by design.

CloudFront's access logs (2026-10-26, Jamie: "can you add similar logging
to all 10 of the ones that log nothing?") go to the `/cards/web-access` log
group, kept 24 months (731 days; Jamie, 2026-10-28), through the
`cards-web-access` delivery, the same shape as Linking Things: the request's path, status, bytes, timing, cache result,
edge, protocol and user agent, never the client IP or the query string.

Keep the ACM validation CNAME
(`_599951081a9a6beba0c85c6a673beb51.cards`) at Namecheap: renewal needs it.
