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
// photo posts get this card too.

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

// Type sizes by length, with lines kept so nothing runs into the band.
const titleSize = (n, photo) =>
  photo ? (n <= 22 ? 72 : n <= 44 ? 60 : 50) : n <= 26 ? 100 : n <= 50 ? 80 : 64;

function noteStyle(n, photo) {
  if (n <= 40) return { fontSize: photo ? 56 : 76, fontFamily: 'Inter Tight', fontWeight: 700, lines: 4 };
  if (n <= 90) return { fontSize: photo ? 50 : 60, fontFamily: 'Inter Tight', fontWeight: 700, lines: 5 };
  if (n <= 150) return { fontSize: photo ? 38 : 46, fontFamily: 'Inter', fontWeight: 500, lines: photo ? 7 : 6 };
  return { fontSize: photo ? 32 : 38, fontFamily: 'Inter', fontWeight: 500, lines: photo ? 8 : 7 };
}

/** The element tree for a post's card. photo is fetchPhoto's result or null. */
export function cardFor(post, { site, photo }) {
  const meta = [formatDate(post.published), ...post.categories.slice(0, 3)].filter(Boolean).join(' · ');
  const hasPhoto = Boolean(photo);
  const words = [];

  if (post.title) {
    const size = titleSize(post.title.length, hasPhoto);
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
          lineClamp: hasPhoto ? 4 : 3,
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
  } else if (post.text) {
    const text = excerpt(post.text, hasPhoto ? 200 : 260);
    const { lines, ...style } = noteStyle(text.length, hasPhoto);
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

  const column = h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flexShrink: 0,
      width: hasPhoto ? 472 : WIDTH,
      padding: '52px 64px 40px 64px',
    },
    h(
      'div',
      { display: 'block', fontSize: 22, fontWeight: 600, letterSpacing: '0.04em', color: MUTED, lineClamp: 2 },
      meta || ' ',
    ),
    h('div', { display: 'flex', flexDirection: 'column', width: (hasPhoto ? 472 : WIDTH) - 128 }, ...words),
  );

  const main = [column];
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
    h(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        height: 68,
        flexShrink: 0,
        padding: '0 64px',
        backgroundColor: STRIP,
        fontSize: 22,
      },
      h('div', { display: 'block', color: MUTED }, 'Jamie Thingelstad'),
      h('div', { display: 'block', marginLeft: 28, fontWeight: 600, color: INK }, site.label),
      h('div', { display: 'block', marginLeft: 'auto', fontWeight: 500, color: MUTED }, site.host),
    ),
  );
}
