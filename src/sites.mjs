// The sites the card maker draws for, one entry a site. Everything that
// differs between them is here, so a site joins with an entry (and a layout
// in card.mjs when none fits); AGENTS.md, "Adding a site", is the checklist.
//
// From the vendored shared/sites.json (npm run sites:sync), a site's origin,
// its label (its strip_label in the sites strip) and the host the band
// shows; the owner's name opens the band. Here:
//
//   mark       the label's colour, the site's sites-strip mark
//              (thingelstad.com AGENTS.md, "The sites strip"); none is ink
//   layout     the card.mjs layout that draws its pages
//   page(rest) the page a card path names, rest being the path between
//              /<id>/ and .png: { path, kicker?, home? }, or null when that
//              is no card
//   read(p)    the site's part of a card, from the page's h-entry
//              properties: { text, photo, counts?, episode? }
//   home(p)    the card of its front page, from the h-feed there
//              (only a site whose page() names one)
//   photo(src) where a photo its page names is fetched from, or null for
//              one it never draws: the only photo hosts ever fetched
import { parseFragment } from 'parse5';
import shared from './shared/sites.json' with { type: 'json' };
import { count, first, headlineLines, markup, plainText, words } from './read.mjs';

const UPLOADS = ['https://www.thingelstad.com/uploads/', 'https://cdn.uploads.micro.blog/'];
const RESIZER = 'https://micro.blog/photos/1200x/';
const IMAGE = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
// A Weekly Thing cover, as WT Builder files it.
const COVER = /^https:\/\/files\.thingelstad\.com\/weekly-thing\/[A-Za-z0-9/_.-]+\.(jpe?g|png)$/i;

const DATED = /^(\d{4}\/\d{2}\/\d{2}\/[A-Za-z0-9_-]+)$/;
const ISSUE = /^archive\/(\d{1,4}(?:-[a-z]+)?)$/;

/** A dated post's page: /2026/10/15/the-nnxyz-rooms.html. */
const dated = (rest) => (DATED.test(rest) ? { path: `/${rest}.html` } : null);

/** An issue's or episode's words: its summary when it has one, else its
 * content's. */
const summaryOr = (p) => words(p.summary) || plainText(markup(p.content));

/** The first of Jamie's uploaded photos in the content, or null. */
export function firstPhoto(content) {
  let found = null;
  const walk = (node) => {
    if (found) return;
    if (node.nodeName === 'img') {
      const attr = Object.fromEntries((node.attrs ?? []).map((a) => [a.name, a.value]));
      const width = Number.parseInt(attr.width, 10);
      const src = attr.src ?? '';
      if (IMAGE.test(src) && UPLOADS.some((prefix) => src.startsWith(prefix)) && !(width > 0 && width <= 100)) found = src;
      return;
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(parseFragment(content ?? ''));
  return found;
}

const ENTRIES = {
  // The blog's cards read the post's own words, never a summary. The photo is
  // the first <img> in the content that is one of Jamie's uploads and not an
  // inline icon (100px wide or less stays in the text on the blog too),
  // fetched through micro.blog's resizer at 1200px wide.
  www: {
    layout: 'post',
    page: dated,
    read: (p) => ({ text: plainText(markup(p.content)), photo: firstPhoto(markup(p.content)) }),
    photo: (src) => (UPLOADS.some((prefix) => src.startsWith(prefix)) ? `${RESIZER}${src}` : null),
  },
  // An issue: its dek (p-summary), its cover (u-featured, from the files CDN,
  // already 1200px wide) and the counts it publishes (p-link-count,
  // p-journal-count). The front page is an h-feed: p-name, p-kicker (the
  // eyebrow), e-summary (the hero line, its <em> the accent and its <br> the
  // line breaks), u-featured (the newest cover), p-issue-count and
  // p-link-count. Every page there but an issue or a topic shares that card.
  weekly: {
    mark: '#1a5eb6',
    layout: 'issue',
    page(rest) {
      if (rest === 'index') return { path: '/', home: true };
      const issue = ISSUE.exec(rest);
      // WT353 (and WT140 special) over the title, as the issue page's own bar.
      return issue ? { path: `/archive/${issue[1]}/`, kicker: `WT${issue[1].replace('-', ' ')}` } : null;
    },
    read(p) {
      const featured = first(p.featured) ?? '';
      return {
        text: summaryOr(p),
        photo: COVER.test(featured) ? featured : null,
        counts: { links: count(p['link-count']), journal: count(p['journal-count']) },
      };
    },
    home(p) {
      const summary = p.summary?.[0];
      const featured = first(p.featured) ?? '';
      const headline = headlineLines(typeof summary === 'string' ? summary : (summary?.html ?? ''));
      return {
        title: words(p.name),
        kicker: words(p.kicker),
        headline,
        text: headline.map((runs) => runs.map((run) => run.text).join('')).join(' '),
        photo: COVER.test(featured) ? featured : null,
        counts: { issues: count(p['issue-count']), links: count(p['link-count']) },
      };
    },
    photo: (src) => (COVER.test(src) ? src : null),
  },
  // An episode: its summary, number (p-episode) and running time
  // (p-duration, seconds; both 0 when the page lacks them). No photo: the
  // show's art is its own.
  another: {
    mark: '#b3123f',
    layout: 'episode',
    page: dated,
    read: (p) => ({ text: summaryOr(p), photo: null, episode: { number: count(p.episode), seconds: count(p.duration) } }),
    photo: () => null,
  },
};

export const OWNER = shared.owner.name;

export const SITES = Object.freeze(
  Object.fromEntries(
    Object.entries(ENTRIES).map(([id, entry]) => {
      const listed = shared.sites.find((site) => site.id === id);
      if (!listed) throw new Error(`${id} is not in shared/sites.json`);
      const { origin, host } = new URL(listed.url);
      return [id, Object.freeze({ id, origin, label: listed.strip_label, host: host.replace(/^www\./, ''), owner: OWNER, ...entry })];
    }),
  ),
);

/** The site whose origin url is on, or null. */
export const siteAt = (url) => Object.values(SITES).find((site) => site.origin === new URL(url).origin) ?? null;
