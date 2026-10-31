// The sites the card maker draws for, one entry a site. Everything that
// differs between them is here, so a site joins with an entry (and a layout
// in card.mjs when none fits); AGENTS.md, "Adding a site", is the checklist.
//
// From the vendored shared/sites.json (npm run sites:sync), a site's origin,
// its label (its strip_label in the sites strip) and the host the band
// shows; the owner's name opens the band. Here:
//
//   mark       the label's colour in the card's dark band, the site's
//              dark-mode sites-strip mark (thingelstad.com AGENTS.md, "The
//              sites strip"); none is the strip's light ink
//   layout     the card.mjs layout that draws its pages
//   page(rest) the page a card path names, rest being the path between
//              /<id>/ and .png: { path, kicker?, home? }, or null when that
//              is no card
//   read(p)    the site's part of a card, from the page's h-entry
//              properties: { text, photo, counts?, episode?, host?, issues? }
//   home(p, entries)  the card of its front page, from the h-feed there,
//              and that h-feed's items (only a site whose page() names one;
//              Linking Things names one for each lens page too)
//   photo(src) where a photo its page names is fetched from, or null for
//              one it never draws: the only photo hosts ever fetched
//   homeLayout the card.mjs layout of its front page (the Weekly Thing's
//              when none is named)
//   svg        true when the site may name an SVG (a map) as its photo
//   json       true when its photo is data its layout draws from (Linking
//              Things' sky map, as { json })
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
// A saved link's id: the first 12 hex of the md5 of its URL as saved.
const LINK = /^links\/[0-9a-f]{12}$/;
// A Linking Things lens page: an issue, a year, a site, a kind, a topic, the
// topics, a day, and /sky/ (the front page is index).
const LENS = /^(?:issues\/\d{1,4}(?:-[a-z]+)?|years\/\d{4}|hosts\/[a-z0-9-]+(?:\.[a-z0-9-]+)+|kinds\/[a-z]+|topics(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|on\/\d{2}-\d{2}|sky)$/;
// The sky every lens card is drawn over: the whole sky as the front page
// first shows it, projected onto the card when the site builds.
const SKY_MAP = 'https://links.thingelstad.xyz/sky/card.json';
// A record's address, the lit stars a lens page lists.
const RECORD = /^https:\/\/links\.thingelstad\.xyz\/links\/([0-9a-f]{12})\/$/;
// A Things 4 Good page (/impact/), and a photo cut for its card.
const T4G_PAGE = /^[a-z0-9-]+$/;
const T4G_PHOTO = /^https:\/\/things4good\.xyz\/images\/cards\/[a-z0-9-]+\.jpe?g$/;
// A Road Sign Math sign or player page, a photo at its large size, and its
// map of the states (the land and the borders Home's pins sit on).
const RSM_PAGE = /^(signs|players)\/([a-z0-9-]{1,80})$/;
const RSM_PHOTO = /^https:\/\/roadsignmath\.xyz\/p\/[0-9A-Za-z]{26}\/large\.jpg$/;
const RSM_MAP = 'https://roadsignmath.xyz/us-map.svg';
const UTC_DAY = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "October 22, 2023" for a YYYY-MM-DD day, as the site writes it (no time
 * zone: the day the sign was found where it was found), or ''. */
export function dayLabel(day) {
  const match = /^(\d{4}-\d{2}-\d{2})$/.exec(day ?? '');
  return match ? UTC_DAY.format(new Date(`${match[1]}T00:00:00Z`)) : '';
}

/** A Road Sign Math pin, "55.68 53.46 5": where it sits on the map in
 * percent of its width and height, and how many signs it stands for. */
export function rsmPin(value) {
  const [x, y, n] = String(value ?? '').trim().split(/\s+/).map(Number);
  const inside = (v) => Number.isFinite(v) && v >= 0 && v <= 100;
  return inside(x) && inside(y) && Number.isInteger(n) && n > 0 ? { x, y, n } : null;
}

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
    mark: '#78acf2',
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
    mark: '#f58aa3',
    layout: 'episode',
    page: dated,
    read: (p) => ({ text: summaryOr(p), photo: null, episode: { number: count(p.episode), seconds: count(p.duration) } }),
    photo: () => null,
  },
  // A saved link's record page (Linking Things): its title, the host it
  // points at (p-host), the day saved, the issues that carried it (p-issue,
  // "WT199"), and its note only when the note is Jamie's own words (p-voice
  // "jamie"; Jamie, 2026-10-25: "Jamie-voice notes only"). A quotation from
  // the page, a mixed note or an agent's summary is never on the card, nor a
  // note on a page that doesn't say whose it is. No photo.
  //
  // Its lens pages (2026-10-31; Jamie: "Approved: build Linking Things sky
  // cards (a sky layout on cards.thingelstad.com, then og:image on every lens
  // page), counts on issues and finished years only, the whole-sky card on
  // the front page and /sky/") are read from their h-feed: the kicker
  // (p-kicker), the card's name (p-headline), a count only where the number
  // is fixed (p-link-count), the sky map (u-sky), and the links the page
  // lists (its h-entries' u-url), which the card lights. The map comes as a
  // photo does, from the one address it may.
  links: {
    layout: 'link',
    homeLayout: 'sky',
    json: true,
    page(rest) {
      if (LINK.test(rest)) return { path: `/${rest}/` };
      if (rest === 'index') return { path: '/', home: true };
      return LENS.test(rest) ? { path: `/${rest}/`, home: true } : null;
    },
    read: (p) => ({
      text: words(p.voice) === 'jamie' ? plainText(markup(p.content)) : '',
      photo: null,
      host: words(p.host),
      issues: (p.issue ?? []).map((issue) => words([issue])).filter(Boolean),
    }),
    home: (p, entries = []) => ({
      title: words(p.headline),
      kicker: words(p.kicker),
      count: count(p['link-count']),
      photo: first(p.sky) === SKY_MAP ? SKY_MAP : null,
      lit: [
        ...new Set(
          entries.flatMap((entry) =>
            entry.type?.includes('h-entry') ? (entry.properties.url ?? []).map((url) => RECORD.exec(url)?.[1]).filter(Boolean) : [],
          ),
        ),
      ],
    }),
    photo: (src) => (src === SKY_MAP ? src : null),
  },
  // Things 4 Good, the family's candle fundraiser (2026-10-25; Jamie:
  // "direction B, owner "The Thingelstad Family", the candle photos as shown,
  // no totals on Numbers, not in the sites strip"). Each page's h-entry gives
  // the eyebrow over its heading (p-kicker), the heading (p-name), the words
  // at its end set apart (p-accent, "100% for good."), a line under it
  // (p-summary), a candle photo already cut to the card (u-featured, from
  // the site's own /images/cards/) and the sale's facts (p-fact) as pills.
  t4g: {
    owner: 'The Thingelstad Family',
    mark: '#f2a65a',
    layout: 't4g',
    page: (rest) => (rest === 'index' ? { path: '/' } : T4G_PAGE.test(rest) ? { path: `/${rest}/` } : null),
    read(p) {
      const name = words(p.name);
      const accent = words(p.accent);
      const featured = first(p.featured) ?? '';
      return {
        kicker: words(p.kicker),
        headline: accent && name.endsWith(accent) ? name.slice(0, -accent.length).trim() : name,
        accent: name.endsWith(accent) ? accent : '',
        text: words(p.summary),
        facts: (p.fact ?? []).map((fact) => words([fact])).filter(Boolean),
        photo: T4G_PHOTO.test(featured) ? featured : null,
      };
    },
    photo: (src) => (T4G_PHOTO.test(src) ? src : null),
  },
  // Road Sign Math, Jamie's road trip game (2026-10-31; Jamie: "the road
  // sign image should be edge-to-edge, the solution (math) should be MathJax
  // rendered as an overlay on top of it"). A sign's page is an h-entry: its
  // name, the day it was found (dt-published, a bare day), its photo
  // (u-photo), where (p-location), who found it (p-finder), the first way
  // as text and LaTeX (p-math, p-tex), how many ways there are (p-way-count)
  // and the sign's numbers (p-number), shown when nobody has solved it. A
  // player's page is an h-card: p-name, the profile photo (u-photo) or the
  // letter avatar's colour (p-avatar-color), p-sign-count, p-state-count
  // and p-first-year. Home is an h-feed: p-name, p-kicker, p-summary, the
  // map (u-map, the site's own /us-map.svg) and a p-pin for each pin on it.
  rsm: {
    mark: '#5cc395',
    layout: 'rsm',
    homeLayout: 'rsmHome',
    svg: true,
    page(rest) {
      if (rest === 'index') return { path: '/', home: true };
      const match = RSM_PAGE.exec(rest);
      if (!match) return null;
      return match[1] === 'signs' ? { path: `/${rest}`, kind: 'sign' } : { path: `/${rest}`, kind: 'player', item: 'h-card' };
    },
    read(p, { kind }) {
      const photo = first(p.photo) ?? '';
      if (kind === 'player') {
        const color = words(p['avatar-color']);
        return {
          kind,
          photo: RSM_PHOTO.test(photo) ? photo : null,
          color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#006348',
          counts: { signs: count(p['sign-count']), states: count(p['state-count']) },
          since: count(p['first-year']),
          text: '',
        };
      }
      return {
        kind: 'sign',
        photo: RSM_PHOTO.test(photo) ? photo : null,
        place: words(p.location),
        day: dayLabel(first(p.published)),
        finders: (p.finder ?? []).map((finder) => words([finder])).filter(Boolean),
        math: words(p.math),
        tex: words(p.tex),
        ways: count(p['way-count']),
        numbers: (p.number ?? []).map((n) => words([n])).filter(Boolean),
        text: words(p.math),
      };
    },
    home(p) {
      const map = first(p.map) ?? '';
      return {
        kind: 'home',
        title: words(p.name),
        kicker: words(p.kicker),
        text: words(p.summary),
        photo: map === RSM_MAP ? map : null,
        pins: (p.pin ?? []).map((pin) => rsmPin(first([pin]))).filter(Boolean),
        counts: { signs: count(p['sign-count']), players: count(p['player-count']), states: count(p['state-count']) },
      };
    },
    photo: (src) => (RSM_PHOTO.test(src) || src === RSM_MAP ? src : null),
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
