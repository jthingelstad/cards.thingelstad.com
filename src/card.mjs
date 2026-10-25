// The card's layout, 1200 x 630, as the element tree Satori draws.
//
// Words first, in the blog's type: Inter Tight 800 for a title, Inter for
// everything else. Over the words, the date and categories; under them, a
// band in the sites strip's grey that reads like the strip (Jamie
// Thingelstad, then the site's label) with the host on the right. A titled
// post shows its title and the start of its text; a micropost shows its own
// words, smaller and lighter the longer they run; a post with a photo gives
// the photo the right half. Black and white, as the blog is.
//
// Decided with Jamie, 2026-10-24: the full canvas, no photo of Jamie, and
// photo posts get this card too. Weekly Thing issues and Another Thing
// episodes got the same card on 2026-10-25 (Jamie: "Weekly Thing and Another
// Thing issues should get custom share images with cards.thingelstad.com
// solution."): the issue number before the date (WT353) and the site's
// label in its sites-strip colour, its one mark. An issue with a cover is
// drawn over it (Jamie: "text overlaid on the issue image with the
// subtitle/dek included. Counts of links and journal entries"): the cover
// fills the card, darkened toward the words; one without keeps this card,
// with its dek and counts under the title.

export const WIDTH = 1200;
export const HEIGHT = 630;

const INK = '#16161a';
const SOFT = '#3d3d47';
const MUTED = '#5a5a66';
const STRIP = '#f3f3f5';

const h = (type, style, ...children) => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

/** "October 15, 2026", in Jamie's time zone. */
export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/** Up to limit characters, ended at a sentence where one fits, else at a word. */
export function excerpt(text, limit) {
  if (text.length <= limit) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+["'”’)]*\s*/g) ?? [];
  let kept = '';
  for (const sentence of sentences) {
    if ((kept + sentence).trim().length > limit) break;
    kept += sentence;
  }
  if (kept.trim().length >= limit * 0.5) return kept.trim();
  const cut = text.slice(0, limit + 1);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > limit * 0.6 ? space : limit).replace(/[\s,;:–—-]+$/, '')}…`;
}

// The words' column: the left half beside a photo, else the whole card, less
// 64px either side.
const PAD = 64;
const column = (photo) => (photo ? WIDTH / 2 : WIDTH);

// Type sizes by length, with lines kept so nothing runs into the band.
const titleSize = (n, photo) =>
  photo ? (n <= 22 ? 72 : n <= 44 ? 60 : 50) : n <= 26 ? 100 : n <= 50 ? 80 : 64;

// Smaller still when the longest word would not fit on a line: Satori breaks
// no word, so "Tournament" at 72px beside a photo was cut to "Tourname…".
// em is a generous average advance for the face, so a word fits with room.
export function fitSize(size, text, width, em) {
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  return Math.max(28, Math.min(size, Math.floor(width / (em * longest))));
}

function noteStyle(n, photo) {
  if (n <= 40) return { fontSize: photo ? 56 : 76, fontFamily: 'Inter Tight', fontWeight: 700, lines: 4 };
  if (n <= 90) return { fontSize: photo ? 50 : 60, fontFamily: 'Inter Tight', fontWeight: 700, lines: 5 };
  if (n <= 150) return { fontSize: photo ? 38 : 46, fontFamily: 'Inter', fontWeight: 500, lines: photo ? 7 : 6 };
  return { fontSize: photo ? 32 : 38, fontFamily: 'Inter', fontWeight: 500, lines: photo ? 8 : 7 };
}

/** "19 links · 4 journal entries", leaving out what an issue has none of. */
export function countsLine(counts) {
  const part = (n, one, many) => (n > 0 ? `${n} ${n === 1 ? one : many}` : '');
  return [part(counts?.links, 'link', 'links'), part(counts?.journal, 'journal entry', 'journal entries')]
    .filter(Boolean)
    .join(' · ');
}

const BAND = 68;
const WHITE = '#ffffff';

// Jamie Thingelstad, the site's label and its host, in the strip's grey.
const band = (site) =>
  h(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      height: BAND,
      flexShrink: 0,
      padding: '0 64px',
      backgroundColor: STRIP,
      fontSize: 22,
    },
    h('div', { display: 'block', color: MUTED }, 'Jamie Thingelstad'),
    h('div', { display: 'block', marginLeft: 28, fontWeight: 600, color: site.mark ?? INK }, site.label),
    h('div', { display: 'block', marginLeft: 'auto', fontWeight: 500, color: MUTED }, site.host),
  );

const tree = (type, style, children) => ({ type, props: { style, children: children.filter(Boolean) } });

// An issue over its cover: the photo fills the card above the band, darkened
// at the top for the kicker and toward the bottom for the words.
function overCover(post, { site, photo, meta, counts }) {
  const width = WIDTH - 2 * PAD;
  const height = HEIGHT - BAND;
  const n = post.title.length;
  const size = fitSize(n <= 28 ? 88 : n <= 56 ? 72 : 60, post.title, width, 0.64);
  const shadow = '0 2px 18px rgba(0, 0, 0, 0.45)';
  const fill = { position: 'absolute', top: 0, left: 0, width: WIDTH, height };
  return h(
    'div',
    { display: 'flex', flexDirection: 'column', width: WIDTH, height: HEIGHT, backgroundColor: INK, fontFamily: 'Inter' },
    h(
      'div',
      { display: 'flex', position: 'relative', width: WIDTH, height, flexShrink: 0 },
      { type: 'img', props: { src: photo.src, style: { ...fill, objectFit: 'cover', objectPosition: 'center' } } },
      h('div', {
        ...fill,
        display: 'flex',
        backgroundImage:
          'linear-gradient(180deg, rgba(10,10,14,0.6) 0%, rgba(10,10,14,0) 28%, rgba(10,10,14,0.2) 45%, rgba(10,10,14,0.9) 100%)',
      }),
      tree('div', { ...fill, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', padding: `46px ${PAD}px 40px ${PAD}px`, color: WHITE, textShadow: shadow }, [
        h('div', { display: 'block', fontSize: 24, fontWeight: 700, letterSpacing: '0.04em' }, meta || ' '),
        tree('div', { display: 'flex', flexDirection: 'column', width }, [
          h(
            'div',
            {
              display: 'block',
              fontFamily: 'Inter Tight',
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              // Not 'balance': with a clamp, Satori balances for one line
              // more than it keeps and cuts the title at half the width.
              lineClamp: 2,
            },
            post.title,
          ),
          post.text &&
            h(
              'div',
              { display: 'block', marginTop: 20, fontSize: 27, lineHeight: 1.4, fontWeight: 500, lineClamp: 2 },
              excerpt(post.text, 170),
            ),
          counts && h('div', { display: 'block', marginTop: 18, fontSize: 22, fontWeight: 700, letterSpacing: '0.02em' }, counts),
        ]),
      ]),
    ),
    band(site),
  );
}

/** The element tree for a post's card. photo is fetchPhoto's result or null. */
export function cardFor(post, { site, photo, kicker }) {
  // An early issue titled only with its date ("May 5, 2018") isn't dated twice.
  const date = formatDate(post.published);
  const meta = [kicker, date === post.title ? '' : date, ...post.categories.slice(0, 3)].filter(Boolean).join(' · ');
  const counts = countsLine(post.counts);
  if (photo && post.counts) return overCover(post, { site, photo, meta, counts });
  const hasPhoto = Boolean(photo);
  const width = column(hasPhoto) - 2 * PAD;
  const words = [];

  if (post.title) {
    const size = fitSize(titleSize(post.title.length, hasPhoto), post.title, width, 0.64);
    words.push(
      h(
        'div',
        {
          display: 'block',
          fontFamily: 'Inter Tight',
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: '-0.025em',
          color: INK,
          textWrap: 'balance',
          lineClamp: hasPhoto ? 5 : 3,
        },
        post.title,
      ),
    );
    if (!hasPhoto && post.text)
      words.push(
        h(
          'div',
          {
            display: 'block',
            marginTop: 28,
            fontSize: 28,
            lineHeight: 1.5,
            color: SOFT,
            maxWidth: 1000,
            lineClamp: 2,
          },
          excerpt(post.text, 220),
        ),
      );
    if (!hasPhoto && counts)
      words.push(h('div', { display: 'block', marginTop: 18, fontSize: 22, fontWeight: 600, color: MUTED }, counts));
  } else if (post.text) {
    const text = excerpt(post.text, hasPhoto ? 200 : 260);
    const { lines, ...style } = noteStyle(text.length, hasPhoto);
    style.fontSize = fitSize(style.fontSize, text, width, style.fontFamily === 'Inter' ? 0.62 : 0.64);
    words.push(
      h(
        'div',
        {
          display: 'block',
          ...style,
          lineHeight: style.fontFamily === 'Inter' ? 1.3 : 1.15,
          letterSpacing: style.fontFamily === 'Inter' ? '-0.01em' : '-0.015em',
          color: INK,
          textWrap: 'pretty',
          lineClamp: lines,
        },
        text,
      ),
    );
  }

  const side = h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flexShrink: 0,
      boxSizing: 'border-box',
      width: column(hasPhoto),
      padding: `52px ${PAD}px 40px ${PAD}px`,
    },
    h(
      'div',
      { display: 'block', fontSize: 22, fontWeight: 600, letterSpacing: '0.04em', color: MUTED, lineClamp: 2 },
      meta || ' ',
    ),
    h('div', { display: 'flex', flexDirection: 'column', width }, ...words),
  );

  const main = [side];
  if (hasPhoto)
    main.push(
      h(
        'div',
        {
          display: 'flex',
          flexGrow: 1,
          backgroundColor: photo.screenshot ? STRIP : INK,
          padding: photo.screenshot ? 28 : 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
        {
          type: 'img',
          props: {
            src: photo.src,
            style: {
              width: '100%',
              height: '100%',
              objectFit: photo.screenshot ? 'contain' : 'cover',
              objectPosition: 'center',
            },
          },
        },
      ),
    );

  return h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: '#ffffff',
      fontFamily: 'Inter',
      color: INK,
    },
    h('div', { display: 'flex', flexGrow: 1, minHeight: 0 }, ...main),
    band(site),
  );
}
