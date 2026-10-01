// scripts/import/group1.mjs
// Group 1 — Sisters + About.
// Re-runnable: pages are matched by slug and updated in place. Media is deduped
// by title (== filename basename).
//
// Content is taken verbatim from ~/boswell-poc/src/content/sisters/*.md,
// content/pages/{about,sisters,bio-resources}.md, and the mirroring
// Astro page structure in src/pages/about.astro and src/pages/sisters/*.astro.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { load } from 'js-yaml';
import { importMedia, upsertPage, heroPhoto } from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Gutenberg's client-side JSON serializer (same as sisters-timeline.mjs).
const gbJson = (obj) =>
  JSON.stringify(obj)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

function readTimelineEntries(subject) {
  const src = readFileSync(
    resolve(__dirname, `../../../boswell-poc/src/content/timelines/${subject}.md`),
    'utf8'
  );
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`timelines/${subject}.md: no frontmatter found`);
  const data = load(m[1]);
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return entries.map((e) => {
    const year     = e.year != null ? String(e.year) : '';
    const event    = e.event != null ? String(e.event) : '';
    const imageAlt = e.imageAlt || '';
    const astroPath = e.image || '';
    // Astro frontmatter stores a public-dir path like /uploads/timeline/
    // timeline-01.jpg. Pull each referenced file into the WP media library
    // so the owner can swap it in the editor, and so the <img src> on the
    // front resolves instead of 404-ing. Both the local URL and the
    // attachment id get written on the entry — render.php prefers imageId
    // when present (so a later media swap flows through automatically).
    let image = '';
    let imageId = 0;
    if (astroPath) {
      const m = importMedia(astroPath, imageAlt);
      if (m) { image = m.url; imageId = m.id; }
    }
    return { year, event, image, imageId, imageAlt };
  });
}

// ---------- Helper builders (WP block markup as strings) ----------

const section = (attrs, inner) =>
  `<!-- wp:bozzies/section ${JSON.stringify(attrs)} -->\n${inner}\n<!-- /wp:bozzies/section -->`;

const h = (level, text, opts = {}) => {
  const cls = ['wp-block-heading'];
  if (opts.align) cls.push(`has-text-align-${opts.align}`);
  if (opts.fontSize) cls.push(`has-${opts.fontSize}-font-size`);
  const a = { level, ...(opts.align && { textAlign: opts.align }), ...(opts.fontSize && { fontSize: opts.fontSize }) };
  return `<!-- wp:heading ${JSON.stringify(a)} --><h${level} class="${cls.join(' ')}">${text}</h${level}><!-- /wp:heading -->`;
};

const p = (text, opts = {}) => {
  const cls = [];
  if (opts.className) cls.push(opts.className);
  if (opts.align) cls.push(`has-text-align-${opts.align}`);
  if (opts.fontSize) cls.push(`has-${opts.fontSize}-font-size`);
  const attrs = {};
  if (opts.className) attrs.className = opts.className;
  if (opts.align) attrs.align = opts.align;
  if (opts.fontSize) attrs.fontSize = opts.fontSize;
  const attrStr = Object.keys(attrs).length ? ` ${JSON.stringify(attrs)}` : '';
  const classAttr = cls.length ? ` class="${cls.join(' ')}"` : '';
  return `<!-- wp:paragraph${attrStr} --><p${classAttr}>${text}</p><!-- /wp:paragraph -->`;
};

const image = ({ id, url, alt = '', size = 'large', align, className }) => {
  const attrs = { id, sizeSlug: size, linkDestination: 'none' };
  if (align) attrs.align = align;
  if (className) attrs.className = className;
  const cls = ['wp-block-image', `size-${size}`];
  if (align) cls.push(`align${align}`);
  if (className) cls.push(className);
  return `<!-- wp:image ${JSON.stringify(attrs)} --><figure class="${cls.join(' ')}"><img src="${url}" alt="${alt}" class="wp-image-${id}"/></figure><!-- /wp:image -->`;
};

const separator = () =>
  `<!-- wp:separator {"className":"is-style-jazz","align":"wide"} --><hr class="wp-block-separator alignwide is-style-jazz"/><!-- /wp:separator -->`;

const button = (href, label, style = '') => {
  const cls = style ? ` is-style-${style}` : '';
  const attrs = style ? { className: `is-style-${style}` } : {};
  const attrStr = style ? ` ${JSON.stringify(attrs)}` : '';
  return `<!-- wp:button${attrStr} --><div class="wp-block-button${cls}"><a class="wp-block-button__link wp-element-button" href="${href}">${label}</a></div><!-- /wp:button -->`;
};

const buttons = (children, justify = 'left') => {
  const layoutAttr = justify === 'left'
    ? ''
    : ` {"layout":{"type":"flex","justifyContent":"${justify}"}}`;
  return `<!-- wp:buttons${layoutAttr} -->\n<div class="wp-block-buttons">${children}</div>\n<!-- /wp:buttons -->`;
};

const quote = (text, cite) =>
  `<!-- wp:quote --><blockquote class="wp-block-quote"><p>${text}</p>${cite ? `<cite>${cite}</cite>` : ''}</blockquote><!-- /wp:quote -->`;

const pullQuote = (text, cite) =>
  `<!-- wp:pullquote --><figure class="wp-block-pullquote"><blockquote><p>${text}</p>${cite ? `<cite>— ${cite}</cite>` : ''}</blockquote></figure><!-- /wp:pullquote -->`;

// Card group used by sisters grid and subpage teasers.
// variant: 'card' (dark purple fill, gold ground) or 'card-plain' (paper
// with purple left-accent, paper ground — matches Astro's .sister-card).
// eyebrow: plain text OR { order, nickname } — the second form renders a
// display-face `<span class="bozzies-card-order">` next to a small-caps
// nickname to match Astro's .sister-card__meta row.
const card = ({ eyebrow, title, body, cta, href, className = '', variant = 'card' }) => {
  const base = `is-style-${variant}`;
  let eyebrowBlock = '';
  if (eyebrow && typeof eyebrow === 'object') {
    // Space between spans so innerText yields "01 MBoz" (matches Astro's
    // .sister-card__order + .sister-card__nickname flex row with gap).
    const content = `<span class="bozzies-card-order">${eyebrow.order}</span> ${eyebrow.nickname}`;
    eyebrowBlock = p(content, { className: 'is-style-eyebrow' });
  } else if (eyebrow) {
    eyebrowBlock = p(eyebrow, { className: 'is-style-eyebrow' });
  }
  const inner = [
    eyebrowBlock,
    h(3, title),
    body ? p(body) : '',
    buttons(button(href, cta || 'Open')),
  ].filter(Boolean).join('\n');
  return `<!-- wp:group {"className":"${base}${className ? ' ' + className : ''}","layout":{"type":"default"}} -->
<div class="wp-block-group ${base}${className ? ' ' + className : ''}">
${inner}
</div>
<!-- /wp:group -->`;
};

const cover = ({ id, url, alt = '', innerHTML, opacity = 30 }) => {
  const attrs = { url, id, dimRatio: opacity, minHeight: 420, minHeightUnit: 'px', align: 'full' };
  return `<!-- wp:cover ${JSON.stringify(attrs)} -->
<div class="wp-block-cover alignfull" style="min-height:420px"><span aria-hidden="true" class="wp-block-cover__background has-background-dim-${opacity} has-background-dim"></span><img class="wp-block-cover__image-background wp-image-${id}" alt="${alt}" src="${url}" data-object-fit="cover"/>
<div class="wp-block-cover__inner-container">
${innerHTML}
</div></div>
<!-- /wp:cover -->`;
};

// Facts rendered as Astro's `.facts-strip` <dl> — a native block whose
// render.php emits <section class="section-tight ground-paper facts-strip">
// <div class="container"><dl class="facts">…</dl></div></section> to match
// ~/boswell-poc/src/pages/sisters/[slug].astro lines 65-78 verbatim. Each
// child is a bozzies/fact with label+value attributes; render.php emits
// <div class="facts__pair"><dt class="facts__label">…</dt>
// <dd class="facts__value">…</dd></div>.
// Named entities we accept in facts values (HTML entities from Astro markdown
// / hand-authored strings). Decoded to Unicode here so the serialized block
// attribute survives an editor save unchanged (Gutenberg re-serializes
// literal `&` as `&`, which round-trips visually but not byte-wise).
const FACT_ENTITY_MAP = {
  '&prime;': '′',    // ′
  '&Prime;': '″',    // ″
  '&acute;': '´',    // ´
  '&ndash;': '–',    // –
  '&mdash;': '—',    // —
  '&ldquo;': '“',    // "
  '&rdquo;': '”',    // "
  '&lsquo;': '‘',    // '
  '&rsquo;': '’',    // '
  '&amp;':   '&',
};
const decodeFactValue = (s) =>
  String(s || '').replace(/&(?:prime|Prime|acute|ndash|mdash|ldquo|rdquo|lsquo|rsquo|amp);/g, (m) => FACT_ENTITY_MAP[m] ?? m);

const factsTable = (facts) => {
  const map = [
    ['born', 'Born'],
    ['died', 'Died'],
    ['hairColor', 'Hair'],
    ['eyeColor', 'Eyes'],
    ['complexion', 'Complexion'],
    ['height', 'Height'],
    ['marriage', 'Marriage'],
    ['children', 'Children'],
  ];
  const rows = [];
  for (const [k, label] of map) {
    if (facts[k]) rows.push(`<!-- wp:bozzies/fact ${JSON.stringify({ label, value: decodeFactValue(facts[k]) })} /-->`);
  }
  return `<!-- wp:bozzies/facts -->
${rows.join('\n')}
<!-- /wp:bozzies/facts -->`;
};

// Item hero (purple compact hero used by sub-pages).
const itemHero = ({ backLabel, backHref, eyebrow, title, subtitle }) => {
  const parts = [
    p(`<a href="${backHref}">← ${backLabel}</a>`),
    eyebrow ? p(eyebrow, { className: 'is-style-eyebrow' }) : '',
    `<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">${title}</h1><!-- /wp:heading -->`,
    subtitle ? p(subtitle, { fontSize: 'lead' }) : '',
  ].filter(Boolean).join('\n');
  return section(
    { backgroundStyle: 'purple', width: 'narrow', headingWidth: 'container', spacing: 'spacious', align: 'full' },
    parts,
  );
};

// ---------- Content builders (per-page) ----------

function buildSisters(media) {
  // Astro's sisters hub hero is full-bleed photo (bozbios.jpg) with title
  // and subtitle overlaid.
  const hero = heroPhoto({
    media: media.bozbios,
    title: 'The Sisters',
    subtitle: 'Get to know the Boswell Sisters — Martha at the piano, Connee out front, Vet in the middle.',
  });

  const introProse = section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    [
      p(`There are many fascinating facets to the Boswell Sisters, but none shines as brightly as their music. There are myriad sources on the web where you can stream their music, and in some ways that listening is the best way to come to understand the Sisters. We recommend <a href="http://www.archive.org">archive.org</a> and <a href="http://www.youtube.com">youtube.com</a> for your first entre&rsquo; to the land of Boz.`, { className: 'article-body', fontSize: 'lead' }),
      p(`While there are records, movies, sheet music and many other manifestations of the Boswell Sisters&rsquo; short but meteoric career, it was radio that brought them into the homes of a Depression weary nation. Ephemeral, of the moment, and fleeting, radio would go on to shape what we today might take for granted as the way broadcast entertainment has always been. As pioneers of network radio, the Boswell Sisters created an archetype that lives on to this day in top-billed &ldquo;girl groups&rdquo; that range from the Dixie Chicks to the Pointer Sisters.`, { className: 'article-body' }),
      p(`So who were they? Where did they come from? What all did they do? Put on your headsets and stream a little stream of Boz while you explore the lives and times of Martha, Connie and Vet.`, { className: 'article-body' }),
    ].join('\n'),
  );

  // Astro's sisters hub cards are wrapped in `.sisters-cards` grid with each
  // card as `<li class="sister-card"><a class="sister-card__link">…`. Emitted
  // via the native bozzies/sister-cards + bozzies/sister-card blocks so the
  // owner can edit each card in place; render.php builds Astro's exact DOM.
  // Gutenberg's block serializer normalizes ASCII `"` inside block-comment
  // JSON to `"`. Match its output so opening + saving the page in the
  // editor yields byte-identical post_content (round-trip clean).
  const sisterCard = ({ order, nickname, name, quote, href, ctaLabel = 'Read the bio' }) =>
    `<!-- wp:bozzies/sister-card ${JSON.stringify({ order, nickname, name, quote, href, ctaLabel }).replace(/\\"/g, '\\u0022')} /-->`;
  const sistersGrid = section(
    { backgroundStyle: 'paper', headingWidth: 'reading', align: 'full' },
    [
      p('Meet the Sisters', { className: 'is-style-eyebrow sisters-grid__eyebrow', align: 'center' }),
      h(2, 'Martha, Connie and Vet', { fontSize: 'section-title', align: 'center' }),
      `<!-- wp:bozzies/sister-cards -->
${sisterCard({ order: '01', nickname: 'MBoz', name: 'Martha Boswell', quote: 'If we sang according to orthodox musical traditions, Vet would be the high voice or soprano, I would be the middle or alto, and Connie would be the low or contralto.', href: '/sisters/martha/' })}
${sisterCard({ order: '02', nickname: 'CBoz', name: 'Connee Boswell', quote: 'We had loads of fun with our swinging trio. We were billed one time as musicians and in small print it said, "They also sing".', href: '/sisters/connee/' })}
${sisterCard({ order: '03', nickname: 'VBoz', name: 'Vet Boswell', quote: 'Vet apparently is the domesticated one. She packs the trunks with uncanny skill, arranges the flowers with unerring artistic rights and so on...', href: '/sisters/vet/' })}
<!-- /wp:bozzies/sister-cards -->`,
    ].join('\n'),
  );

  const trioQuote = section(
    { backgroundStyle: 'purple', backdrop: 'notes', headingWidth: 'reading', align: 'full' },
    pullQuote(
      'They (the Boswell Sisters) changed popular music from the 1930s forward.',
      'James Von Schilling',
    ),
  );

  // Astro's sisters-subpages section is emitted verbatim by the
  // bozzies/subpage-cards + bozzies/subpage-card blocks. Container block
  // renders <section class="section ground-gold sisters-subpages"><div
  // class="container sisters-subpages__grid">…</div></section>; each child
  // block renders one <a class="subpage-card"> with Astro's exact inner DOM
  // (eyebrow + h3 + body p + cta span with arrow SVG). Verbatim from
  // ~/boswell-poc/src/pages/sisters/index.astro lines 87-110.
  const subpageCard = ({ eyebrow, title, body, ctaLabel, href }) =>
    `<!-- wp:bozzies/subpage-card ${JSON.stringify({ eyebrow, title, body, ctaLabel, href })} /-->`;
  const teasers = `<!-- wp:bozzies/subpage-cards {"align":"full"} -->
${subpageCard({ eyebrow: 'Further Reading', title: 'Boz Biography', body: 'The definitive family biography of the Boswell Sisters.', ctaLabel: 'Explore the Boz Biography', href: '/sisters/bio-resources/' })}
${subpageCard({ eyebrow: 'Career Timeline', title: 'Their story, year by year', body: 'From Martha’s 1905 birth through the trio’s final broadcast in 1936 — every recording, tour, and turning point in one scrollable timeline.', ctaLabel: 'Open the timeline', href: '/sisters/career-timeline/' })}
<!-- /wp:bozzies/subpage-cards -->`;

  return [hero, introProse, separator(), sistersGrid, trioQuote, teasers].join('\n\n');
}

function buildSisterBio({ slug, nickname, order, name, portrait, pullQuoteText, pullQuoteAttr, facts, bodyBlocks, hasSoloTimeline }) {
  // Sister-bio hero — the bozzies/bio-hero block emits Astro's exact
  // <section class="bio-hero ground-purple"><div class="music-backdrop">…</div>
  // <div class="container-narrow bio-hero__inner"><a class="bio-hero__back">…</a>
  // <span class="eyebrow bio-hero__eyebrow">…</span><h1 class="bio-hero__name">…</h1>
  // <blockquote class="bio-hero__quote">"…"<cite>—…</cite></blockquote></div></section>
  // DOM verbatim from ~/boswell-poc/src/pages/sisters/[slug].astro lines 46-63.
  // Decode HTML entities on the attribute values so the JSON stored in
  // post_content already contains Unicode glyphs. Otherwise Gutenberg
  // re-serializes `&` as `&` on save, and the editor round-trip diff
  // reports a spurious mismatch even though nothing visible changed.
  const heroAttrs = {
    nickname:             decodeFactValue(nickname),
    name:                 decodeFactValue(name),
    pullQuote:            decodeFactValue(pullQuoteText),
    pullQuoteAttribution: decodeFactValue(pullQuoteAttr || ''),
    backHref: '/sisters/',
    backLabel: 'The Sisters',
    align: 'full',
  };
  const hero = `<!-- wp:bozzies/bio-hero ${JSON.stringify(heroAttrs)} /-->`;

  // The bozzies/facts block emits its own <section class="section-tight
  // ground-paper facts-strip">…, so it goes in the page body directly (no
  // outer bozzies/section wrapper).
  const facts_ = factsTable(facts);

  // Sticky-portrait bio body — the bozzies/bio-body block emits Astro's
  // exact <section class="section ground-paper bio-body"><div class="container
  // bio-body__layout"><figure class="bio-portrait">…</figure><div class="prose">
  // …</div></div></section> DOM verbatim from
  // ~/boswell-poc/src/pages/sisters/[slug].astro lines 80-96. Portrait metadata
  // is carried on the block's attributes; the prose lives in the inner blocks.
  const bioAttrs = portrait
    ? { portraitId: portrait.id, portraitUrl: portrait.url, portraitAlt: portrait.alt, portraitCaption: name, align: 'full' }
    : { align: 'full' };
  const body = `<!-- wp:bozzies/bio-body ${JSON.stringify(bioAttrs)} -->
${bodyBlocks.join('\n')}
<!-- /wp:bozzies/bio-body -->`;

  // Connee has a solo-career timeline embedded on her bio page —
  // Astro's sisters/[slug].astro L98-111 emits <section class="section
  // ground-paper bio-timeline"> with a header + <Timeline color="purple" />.
  // The wp:group wrapper matches the pattern shipped in patterns/timeline.php.
  const timelinePlaceholder = hasSoloTimeline
    ? (() => {
        const conneeEntries = readTimelineEntries('connee');
        const tlAttrs = gbJson({ entries: conneeEntries, color: 'purple' });
        return (
          `<!-- wp:group {"tagName":"section","align":"full","className":"section ground-paper bio-timeline","layout":{"type":"constrained"}} -->\n` +
          `<section class="wp-block-group alignfull section ground-paper bio-timeline">` +
            `<!-- wp:group {"className":"container","layout":{"type":"constrained"}} -->\n` +
            `<div class="wp-block-group container">` +
              `<!-- wp:group {"tagName":"header","className":"bio-timeline__head","layout":{"type":"constrained"}} -->\n` +
              `<header class="wp-block-group bio-timeline__head">` +
                `<!-- wp:paragraph {"className":"eyebrow eyebrow--purple"} --><p class="eyebrow eyebrow--purple">The Solo Years</p><!-- /wp:paragraph -->\n` +
                `<!-- wp:heading {"level":2,"className":"bio-timeline__title"} --><h2 class="wp-block-heading bio-timeline__title">Connee Boswell — Solo Career Timeline</h2><!-- /wp:heading -->` +
              `</header>\n` +
              `<!-- /wp:group -->\n` +
              `<!-- wp:bozzies/timeline ${tlAttrs} /-->` +
            `</div>\n` +
            `<!-- /wp:group -->` +
          `</section>\n` +
          `<!-- /wp:group -->`
        );
      })()
    : '';

  // Sister prev/all/next nav (mirrors Astro's bio-nav). Emits Astro's exact
  // <nav class="section-tight ground-paper bio-nav"> DOM via bozzies/bio-nav.
  const order2 = [
    { slug: 'martha', name: 'Martha Boswell' },
    { slug: 'connee', name: 'Connee Boswell' },
    { slug: 'vet',    name: 'Vet Boswell' },
  ];
  const idx = order2.findIndex(x => x.slug === slug);
  const prev = order2[(idx - 1 + order2.length) % order2.length];
  const next = order2[(idx + 1) % order2.length];
  const navAttrs = {
    prevHref:  `/sisters/${prev.slug}/`,
    prevLabel: 'Previous',
    prevName:  prev.name,
    allHref:   '/sisters/',
    allLabel:  'All',
    allName:   'The Sisters',
    nextHref:  `/sisters/${next.slug}/`,
    nextLabel: 'Next',
    nextName:  next.name,
    ariaLabel: 'Sisters navigation',
    align:     'full',
  };
  const nav = `<!-- wp:bozzies/bio-nav ${JSON.stringify(navAttrs)} /-->`;

  return [hero, facts_, body, timelinePlaceholder, nav].filter(Boolean).join('\n\n');
}

function buildAbout(media) {
  // Astro's about hero: full-bleed photo (Boswell_Sisters_1932.jpg) with
  // "Our Mission" eyebrow, "About" title, subtitle.
  const hero = heroPhoto({
    media: media.boswell1932,
    eyebrow: 'Our Mission',
    title: 'About',
    subtitle: 'A tribute archive to the New Orleans trio who invented swinging close-harmony.',
  });

  const prose = section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    [
      // Intro line renders as a lede paragraph on Astro, not a section-title
      // heading — use is-style-lede so it inherits the site's lead typography.
      p('Bozzies.org is dedicated to preserving the memory of the Boswell Sisters.', { className: 'is-style-lede' }),
      p('Martha, Connee, and Vet Boswell recorded seventy-five sides between 1925 and 1936, invented the swinging vocal harmony that shaped every close-harmony group that came after, and vanished from the popular consciousness before the Second World War. This archive exists to change that.', { className: 'article-body' }),
      p('We pull together the best Boz content available — recordings, press coverage, chart data, biographies, tribute performances, and scholarship — and present it as a living reference for anyone who wants to hear, learn, and share.', { className: 'article-body' }),
      h(2, 'What we do'),
      `<!-- wp:list -->
<ul class="wp-block-list">
<!-- wp:list-item --><li><strong>Preserve</strong> digitized Boswell Sisters recordings from public-domain sources.</li><!-- /wp:list-item -->
<!-- wp:list-item --><li><strong>Publish</strong> audio lessons, essays, and interviews that explain how the Boswells actually did what they did.</li><!-- /wp:list-item -->
<!-- wp:list-item --><li><strong>Track</strong> chart positions, album reviews, and press coverage across a century of writing on the trio.</li><!-- /wp:list-item -->
<!-- wp:list-item --><li><strong>Document</strong> tribute performances, memorials, and community events that keep the Boswell sound alive.</li><!-- /wp:list-item -->
</ul>
<!-- /wp:list -->`,
      h(2, 'Who we are'),
      p('Bozzies.org is a non-profit tribute site, curated with the participation of Boswell family members, historians, musicians, and enthusiasts around the world. The archive is stewarded by a small group of volunteers; the content and technology are open to anyone who wants to contribute.', { className: 'article-body' }),
      h(2, 'Get involved'),
      p(`If you're a researcher, performer, family member, or listener with material to add — recordings, photographs, press clippings, personal recollections — we would love to hear from you. If you can support the archive with a donation, every contribution keeps us Bozzing.`, { className: 'article-body' }),
    ].join('\n'),
  );

  const cta = section(
    { backgroundStyle: 'gold', backdrop: 'notes', width: 'narrow', headingWidth: 'reading', align: 'full' },
    [
      p('Get in touch', { className: 'is-style-eyebrow', align: 'center' }),
      h(2, 'Have something to share, or want to help?', { align: 'center', fontSize: 'section-title-medium' }),
      p('Reach out with material for the archive, corrections, or collaboration ideas — or make a donation to help keep the Boswells&rsquo; legacy alive.', { align: 'center', className: 'article-body' }),
      buttons(
        `${button('#', 'Contact us')}${button('#', 'Donate', 'large')}`,
        'center',
      ),
    ].join('\n'),
  );

  return [hero, separator(), prose, separator(), cta].join('\n\n');
}

function buildBioResources(media) {
  // Astro's bio-resources hero: gold ground with yellow "A Family Affair"
  // eyebrow + ink title, then a full-width purple pull-quote section with
  // the notes backdrop, then a two-column body (article prose left, book
  // cover right), then a CTA button.
  const hero = section(
    { backgroundStyle: 'gold', width: 'narrow', headingWidth: 'container', spacing: 'spacious', align: 'full' },
    [
      p(`<a href="/sisters/">← The Sisters</a>`),
      p('A Family Affair', { className: 'is-style-eyebrow' }),
      `<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Boz Biography</h1><!-- /wp:heading -->`,
      p('The definitive family biography of the Boswell Sisters.', { fontSize: 'lead' }),
    ].join('\n'),
  );

  // Full-bleed purple pull-quote — matches Astro's dedicated section on this
  // page. Uses the site pullquote treatment (chrome.css → curly quotes,
  // uppercased brass cite, white body on ground-purple).
  const heroQuote = section(
    { backgroundStyle: 'purple', backdrop: 'notes', width: 'container', headingWidth: 'reading', align: 'full' },
    pullQuote(
      'They were special. They were unique. And although they were born elsewhere, Martha, Connie, and Helvetia &ldquo;Vet&rdquo; Boswell were pure New Orleans.',
      'Steve Steinberg, Offbeat Magazine',
    ),
  );

  // Two-column body: article prose on the left, book cover on the right
  // (image column ~40 %). Matches Astro's `.book-body` grid.
  const legacyImage = image({ id: media.legacy.id, url: media.legacy.url, alt: 'Boswell Legacy', size: 'large' });
  const proseBody = p(`Get the inside skinny on the home life of the Boswell Sisters as seen through the eyes of VBoz&rsquo; grand daughter, Kyla Titus. <em>The Boswell Legacy</em> takes a deep dive into the family legends passed down all the way from the 1850s that the author uses as a perspective to frame their lives. The book is a great way to glimpse the personal lives of the Bozzies through the lens of a descendant. Long on personal stories, letters and family tradition, the book answers some of the questions Boswell devotees may have about these performers. While the mystery of the musical magic is not addressed and there are no sources to direct the Boz bedazzled to more resources, it will quench the thirst for more, more, more.`, { className: 'article-body', fontSize: 'lead' });

  const prose = section(
    { backgroundStyle: 'paper', width: 'container', headingWidth: 'container', align: 'full' },
    `<!-- wp:columns {"verticalAlignment":"top"} -->
<div class="wp-block-columns are-vertically-aligned-top">
<!-- wp:column {"verticalAlignment":"top","width":"60%"} --><div class="wp-block-column is-vertically-aligned-top" style="flex-basis:60%">
${proseBody}
</div><!-- /wp:column -->
<!-- wp:column {"verticalAlignment":"top","width":"40%"} --><div class="wp-block-column is-vertically-aligned-top" style="flex-basis:40%">
${legacyImage}
</div><!-- /wp:column -->
</div>
<!-- /wp:columns -->`,
  );

  const bookCta = section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'reading', align: 'full', spacing: 'compact' },
    buttons(button('http://www.babybeebooks.com/Boswell.htm', 'Get the Book at Baby Bee Books', 'large')),
  );

  return [hero, heroQuote, prose, bookCta].join('\n\n');
}

// ---------- Sister bios: body content, verbatim from Astro markdown ----------

const conneeBody = [
  `<!-- wp:heading {"level":2} --><h2 class="wp-block-heading">Connie Boswell aka Connee Boswell aka CBOZ</h2><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p><strong>The Boz whose voice could make us lie on the levy, turn black as coal, and our hearts won&rsquo;t be heavy &rsquo;cause we got CBoz in our soul &ndash; Oh Lord!</strong></p><!-- /wp:paragraph -->`,
  `<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Music</h4><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p>CBoz is music. She fits the metaphor completely. After a bout of polio left her legs partially paralyzed her mother used music as therapy. Giving CBoz a half-sized cello (an instrument she could play seated) she began lessons at age 4. Her talents came to the fore quickly and she soon performed with MBoz on the piano, at the Philharmonic as a featured artist and as a soloist in local programs including the passion play Veronica&rsquo;s Veil staged at the French Opera House.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>Like her sisters, CBoz studied music with Professor Otto Finck and became proficient on the piano at an early age. But it was New Orleans. It was the beginning of the jazz age. And the Bach fugues soon gave way to ragtime and CBoz learned to play the saxophone (which she played in a &ldquo;barrelhouse style&rdquo;). But neither she nor her sisters ever took voice lessons. They listened to their parents sing barbershop-style with their aunt and uncle, and began harmonizing along the way.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>CBoz recalled her greatest musical influences were Enrico Caruso (she marveled at his breathing and the way it allowed him to hold notes) and Mamie Smith, an African American blues singer. A lot of Mamie and a little bit of Bessie Smith can he heard in CBoz&rsquo;s first recorded solo, Cryin&rsquo; Blues. How wonderfully strange it must have been in 1925 to see this tiny, young, middle class white girl belting and growling through a song of unrequited love. But it became a hit record in the south and paved the way for a great singing career.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>As a soloist, CBoz was one of the first to truly appreciate what a microphone could do for a singer. Although capable of projecting her voice to be heard unmiked into the rafters of the largest auditorium, she sang soft and low into the microphone, creating an intimacy that singers would imitate forever after. Unlike most of her contemporaries, she sang in a style closer to her speaking voice the than falsetto favored by European singers. She borrowed liberally from African-American, Latin, jazz and folk idioms and rolled it up into a style that generations of musicians would follow. Her pitch was low and range not wide, but the beauty of her voice, the preciseness of her diction, and flawless phrasing set the standard for popular singing. Irving Berlin preferred her interpretations of his songs above all others and Ella Fitzgerald has always credited her with being the one person who influenced her. Although her style changed over time, and years in smoky nightclubs quickened her vibrato and made her voice huskier, she remained one of the greatest voices in America until the end.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>CBoz is generally credited with being the primary arranger of the Boswell Sister&rsquo;s music. While there is no doubt that CBoz wrote the charts, the Sisters worked out the harmonies as a unit. She told a reporter that she and her sisters would work out an arrangement by having Martha play the music through once as it was written. Then they would begin working on the harmonies at the end of the song and work their way to the beginning.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>She also provided a great musical foil for Bing Crosby, and their friendly, intimate banter helped them launch a series of hits in the 30s and 40s.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>Another trend born of the mind of CBoz was swinging the classics. She took the English lyrics to Von Flotow&rsquo;s &ldquo;M&rsquo;appari tutt&rsquo;amor&rdquo; and turned it into the jazz classic, Martha. She later gave Ah, Sweet Mystery of Life a bounce.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>There were also several songs written by CBoz and under her nom de plume Diana Foore. She performed most of them, including Never Had A Lesson in My Life, Lummir Alla Zingen, Main Street on Saturday Night, You Ain&rsquo;t Got Nothin&rsquo;, and I Don&rsquo;t Mind.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>Active on stage and radio since 1922, Connie would record, make movies, appear on Broadway and tour across the globe for the next 40 years. She even starred in the TV series Pete Kelly&rsquo;s Blues in 1959. When you add the Boswell Sisters and CBoz&rsquo;s recordings together they cut over 300 sides and sold over 75 million records.</p><!-- /wp:paragraph -->`,
  `<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Personality</h4><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p>CBoz has been described as tiny, intense and brilliant. She loved to talk. She told an interviewer that sometimes when she was on the road she&rsquo;d be asked to make an appearance at a TV or radio station. But then they might tell her they didn&rsquo;t have a script and needed 30 minutes worth of interview. She laughed and said for her that was as easy as falling off a log.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>Her sister Vet described her as &ldquo;silly.&rdquo; She loved to play pranks and the trio was known to terrorize their neighbors with practical jokes. She also loved sports and could often be found out for a football or baseball game.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>Songwriter Jack Lawrence described CBoz as &ldquo;Always smiling.&rdquo; Kay Starr recalled her compassion and her willingness to give her time to help those whose handicaps had left them despondent.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>She loved to exercise, ride her bike and became very physically fit. She could party with the best of them and could hold her own with Mae West or Dean Martin. She was also a dedicated Democrat and loved to talk politics.</p><!-- /wp:paragraph -->`,
];

const marthaBody = [
  `<!-- wp:heading {"level":2} --><h2 class="wp-block-heading">Martha Boswell aka MBoz</h2><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p><strong>The Boz we&acute;d most like to party with!</strong></p><!-- /wp:paragraph -->`,
  `<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Music</h4><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p>MBoz played piano accompaniment on most of the Sisters recordings and was a gifted concert pianist as well. She could play almost anything with keys. MBoz wrote music including three songs that were recorded by the Sisters (Cryin&rsquo; Blues, Nights When I am Lonely, and Rainy Days) and a song that became the theme of Connie&rsquo;s radio show, Pal O&rsquo; Mine.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>MBoz and Connie performed classical music as prodigies when they were still quite young. Rag and blues entered MBoz&rsquo;s musical vocabulary at an early age as well. She accompanied others and sang through her youth. Her ability to play with just about anyone and her sparkling good looks helped attract young jazzmen and musicians of the day to the home on 3937 Camp Street. One of those musicians was Emmett Hardy who is said to have taught Bix Beiderbecke to play and who has been accorded the legendary status of one of the best to ever blow a horn. When he met Martha romance bloomed, but Emmett contracted tuberculosis and died at age 23.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>Early in the Sister&rsquo;s singing career MBoz played multiple roles: pianist, manager and occasional lead singer. MBoz&rsquo;s solo voice was slightly higher than Connie&rsquo;s, but when she harmonized she and CBoz could both get very low. Her lead lines diminished once the trio began recording for Brunswick, but you can occasionally hear MBoz out front on songs like Wha&rsquo;d Ja Do To Me, Why Don&rsquo;t You Practice What You Preach, and Every Little Moment. But the melody line seldom stayed with any sister for long which is what, according to MBoz, resulted in the &ldquo;Boswell Sound&rdquo;. The Times Picayune published these comment from MBoz in a January 4, 1935 article entitled &ldquo;Blending Termed Secret of Boswell Success&rdquo;.</p><!-- /wp:paragraph -->`,
  `<!-- wp:quote --><blockquote class="wp-block-quote"><p>&ldquo;I&rsquo;ll explain it as simply as I can,&rdquo; said the eldest sister. &ldquo;If we sang according to orthodox musical traditions, Vet would be the high voice or soprano, I would be the middle or alto, and Connie would be the low or contralto.&rdquo;</p><p>&ldquo;But we don&rsquo;t sing in the orthodox musical way,&rdquo; Martha Boswell continued. &ldquo;Instead, when we sing as a trio we achieve an unusual and unorthodox effect by deserting out own particular tone and singing in another tone. We call that blending.</p><p>&ldquo;If you know anything about music, for example, you know that a soprano is rarely about to hit a low &ldquo;C&rdquo; note effectively, but Vet can do that when we sing as a unit thereby producing an effect which is out of the ordinary and which accounts for our own peculiar type of individuality.</p><p>&ldquo;Blending and cross-blending of voices achieve by a desertion at various times of the tones in which we would normally sing is an important factor in the production of the think you have heard called &ldquo;Boswell Rhythm,&rdquo; Martha Boswell explained.</p><p>&ldquo;This blending,&rdquo; the eldest of the trio continued, &ldquo;takes varied forms. Sometimes all three of us will strike a crescendo in the same tone. At other times we achieve a cross blending effect as when the soprano sings contralto and the contralto sings soprano. If we sang out of tone separately it wouldn&sup1;t be so good, but doing together produces the blending effect that goes over.&rdquo;</p></blockquote><!-- /wp:quote -->`,
  `<!-- wp:paragraph --><p>But it is her fabulous jazz piano, thundering left hand, and ability to conduct the trio with the movement of her body AND sing that makes Martha Boswell a most amazing Bozzie.</p><!-- /wp:paragraph -->`,
  `<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Personality</h4><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p>MBoz has been described as &ldquo;wonderfully alive&rdquo; with sparkling bright eyes that want to take in everything around her. She had a great memory and could beat her sisters in trivia. MBoz loved to chat, have fun with friends and cook. She was trusting to the point of gullibility, once famously failing to ask a theater manager how much they would be paid for three performances and receiving a check for three dollars.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>A love for New Orleans ran deep in Martha and she returned often until her father died.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>There was a melancholy side to MBoz as well. She felt things deeply and passionately and it shows in her artistry.</p><!-- /wp:paragraph -->`,
];

const vetBody = [
  `<!-- wp:heading {"level":2} --><h2 class="wp-block-heading">Helvetia (Vet) Boswell aka VBoz</h2><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p><strong>The Boz who we&rsquo;d most like to be caught with on a slow boat to China</strong></p><!-- /wp:paragraph -->`,
  `<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Music</h4><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p>Blessed with a remarkable ability to blend, VBoz had the high voice of the trio. She was classically trained on the violin by Professor Otto Finck and made her first public performance in the Passion Play Veronica&rsquo;s Veil. With Martha and Connie on piano and cello, Vet would soon make the Boswell Sisters into a precocious trio of gifted musicians much admired by the citizens of the Crescent City.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>But growing up in New Orleans, the sounds of early jazz were infused into her musical mind. In later life she told of listening to the songs coming from black churches and listening to records of the hot jazz groups. Like her sisters, VBoz was multi-instrumental, and the banjo became her vehicle for hot licks.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>You hear VBoz on the famous first Victor recording making the &ldquo;gargle&rdquo; background with CBoz on Crynin&rsquo; Blues, and her high voice stands out on the chorus of Nights When I am Lonely. She is 13 years old.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>The music really moved this Boswell &ndash; so much so that she had a tap and clog routine that she worked up and added to the act. So book the Boswell Sisters and get:</p><!-- /wp:paragraph -->`,
  `<!-- wp:list -->
<ul class="wp-block-list">
<!-- wp:list-item --><li>Classical string trio</li><!-- /wp:list-item -->
<!-- wp:list-item --><li>Piano solos from MBoz</li><!-- /wp:list-item -->
<!-- wp:list-item --><li>Swing trio</li><!-- /wp:list-item -->
<!-- wp:list-item --><li>Harmony singing and whistling (yes, they whistled in three part harmony, too)</li><!-- /wp:list-item -->
<!-- wp:list-item --><li>Solos from CBoz</li><!-- /wp:list-item -->
<!-- wp:list-item --><li>Dancing from VBoz</li><!-- /wp:list-item -->
</ul>
<!-- /wp:list -->`,
  `<!-- wp:paragraph --><p>Such a deal &ndash; and they&rsquo;re pretty too!</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>VBoz was the acknowledged perfectionist of the group who tore CBoz and MBoz away from fun and frivolity to work on their numbers. And boy did it pay off. Although the baby sister, Vet was the one who kept things in line onstage, too. She stood behind Martha and Connie who were seated on the piano bench, bent over slightly so their voices would be about evenly distant from the microphone. But this positioning also gave the Sisters a physical connection as they sang: a visceral, tactile link that allowed them to sing, move, breath as a single unit. It also gave VBoz access to her two &ldquo;silly&rdquo; sisters and she was known to give their shoulders a hard squeeze when they got tickled or otherwise unruly.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>Shy and reserved, VBoz never sought out solos and seldom had them. But she was as integral to the Boswell sound as MBoz or CBoz. The trio worked out all the vocal arrangements together, never wrote them down, just memorized them. Vet remembered the trio staying up late and working on their music, making suggestions and arguing their points until they agreed.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>And we agree, too, it was great stuff.</p><!-- /wp:paragraph -->`,
  `<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Personality</h4><!-- /wp:heading -->`,
  `<!-- wp:paragraph --><p>An article from Melody Maker written on July 1, 1933 while the Sisters were in London provides a wonderful description of VBoz:</p><!-- /wp:paragraph -->`,
  `<!-- wp:quote --><blockquote class="wp-block-quote"><p>&ldquo;Next came Vet &ndash; grave-eyed and quietly dignified. She seems more reserved than her sisters, though sometimes her reserve falls away like a cloak and she talks and laughs as animatedly as Martha &ndash; which is saying a lot&hellip;. Vet apparently is the domesticated one. She packs the trunks with uncanny skill, arranges the flowers with unerring artistic rights and so on&hellip;&rdquo;</p></blockquote><!-- /wp:quote -->`,
  `<!-- wp:paragraph --><p>VBoz was notoriously shy and quiet, but behind the silent demeanor lived a razor sharp mind and a dry, acerbic wit. She didn&rsquo;t say much, but when she did it was right on target. It was probably the best possible tact for the baby sister of two wildly outgoing and vocal personalities like Martha and Connie. When she got a word in edgewise it had to be good!</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>In her later years she flirted with the idea of making a professional comeback with Connie, but some have suggested the perfectionist in her would not be happy with anything less than what they had been in the 30s.</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>She collaborated with Stuart Ross and Mark Hampton in staging a review of the Boswell Sisters music in the 80s called Heebie Jeebies. This wasn&rsquo;t the only Boswell revival she helped inspire. Her return trip to New Orleans, nearly 40 years after her family had left town, renewed interest in the Boswell legacy. During that trip she joined the Bozzie inspired Pfister Sisters onstage. She still remembered all the parts and as Yvette Voelker recalled &ldquo;She didn&rsquo;t have any problem correcting us!&rdquo;</p><!-- /wp:paragraph -->`,
  `<!-- wp:paragraph --><p>Family remained important to Vet and after her husband&rsquo;s retirement she moved from Canada to New York to be nearer her sisters. She got to enjoy her grandchildren and great grandchildren before she passed away in 1988.</p><!-- /wp:paragraph -->`,
];

// ---------- Runner ----------

function run() {
  console.log('Group 1: Sisters + About');

  // 1. Import media assets.
  const media = {
    bozbios:      importMedia('/uploads/bozbios.jpg', 'The Boswell Sisters.'),
    boswell1932:  importMedia('/uploads/Boswell_Sisters_1932.jpg', 'Portrait of the Boswell Sisters, circa 1932.'),
    connee:       importMedia('/uploads/connee-portrait.jpg', 'Portrait of Connee Boswell, 1941.'),
    martha:       importMedia('/uploads/martha-portrait.jpg', 'Portrait of Martha Boswell, 1931.'),
    vet:          importMedia('/uploads/vet-portrait.jpg', 'Portrait of Vet Boswell, 1932.'),
    legacy:       importMedia('/uploads/Boswell-Legacy.jpg', 'Boswell Legacy'),
  };
  console.log('  media:', Object.fromEntries(Object.entries(media).map(([k, v]) => [k, v.id])));

  const pages = [
    { slug: 'sisters',       title: 'The Sisters',    template: 'page-landing', content: buildSisters(media) },
    { slug: 'connee',        title: 'Connee Boswell', template: 'page-subpage', content: buildSisterBio({
      slug: 'connee', hasSoloTimeline: true,
      nickname: 'CBoz', order: 2, name: 'Connee Boswell',
      portrait: media.connee,
      pullQuoteText: 'We had loads of fun with our swinging trio. We were billed one time as musicians and in small print it said, &ldquo;They also sing&rdquo;.',
      pullQuoteAttr: 'Connee Boswell',
      facts: {
        born: 'Kansas City, MO, December 3, 1907',
        died: 'New York City, October 12, 1976',
        hairColor: 'Black-Brown', eyeColor: 'Dark Brown', complexion: 'Fair',
        height: '4&prime; 11&Prime;', marriage: 'Harry Leedy 1935',
        children: 'No children but lots of dogs',
      },
      bodyBlocks: conneeBody,
    }) },
    { slug: 'martha', title: 'Martha Boswell', template: 'page-subpage', content: buildSisterBio({
      slug: 'martha',
      nickname: 'MBoz', order: 1, name: 'Martha Boswell',
      portrait: media.martha,
      pullQuoteText: 'If we sang according to orthodox musical traditions, Vet would be the high voice or soprano, I would be the middle or alto, and Connie would be the low or contralto.',
      pullQuoteAttr: 'Martha Boswell',
      facts: {
        born: 'Kansas City, MO, July 9, 1905',
        died: 'Peekskill, NY, July 2, 1958',
        hairColor: 'Black-Brown', eyeColor: 'Dark Brown', complexion: 'Fair',
        height: '5&acute;-2&rdquo;',
        children: 'Jules Boswell Lloyd (born Jules L. Picard.) 1926 &ndash; 2004',
      },
      bodyBlocks: marthaBody,
    }) },
    { slug: 'vet', title: 'Vet Boswell', template: 'page-subpage', content: buildSisterBio({
      slug: 'vet',
      nickname: 'VBoz', order: 3, name: 'Vet Boswell',
      portrait: media.vet,
      pullQuoteText: 'Vet apparently is the domesticated one. She packs the trunks with uncanny skill, arranges the flowers with unerring artistic rights and so on...',
      pullQuoteAttr: 'Melody Maker, 1933',
      facts: {
        born: 'Birmingham, AL, May 20, 1911',
        died: 'Peekskill, NY November 12, 1988',
        hairColor: 'Black-Brown', eyeColor: 'Dark Brown', complexion: 'Fair',
        height: '5&acute;-4&rdquo;',
        children: 'Vet Boswell Jones, August 22, 1936 &ndash; October 26, 2010',
      },
      bodyBlocks: vetBody,
    }) },
    { slug: 'about',         title: 'About',        template: 'page-landing', content: buildAbout(media) },
    { slug: 'bio-resources', title: 'Bio Resources', template: 'page-subpage', content: buildBioResources(media) },
  ];

  for (const page of pages) {
    const res = upsertPage(page);
    console.log(`  ${res.created ? '+' : '~'} ${page.slug} (id=${res.id})`);
  }
}

run();
