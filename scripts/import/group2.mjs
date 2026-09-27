// scripts/import/group2.mjs
// Group 2 — Media. Media hub, Charts, Reviews, Discography, Career Timeline,
// Lessons hub, Lessons 1-5.
//
// Interactive blocks (discography search, career timeline, playlist player)
// are replaced with labeled placeholders per Task 9 rules.

import { importMedia, upsertPage, heroPhoto } from './lib.mjs';
import { readFileSync } from 'node:fs';

// ---------- Block helpers (mirror group1) ----------

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

const separator = () =>
  `<!-- wp:separator {"className":"is-style-jazz","align":"wide"} --><hr class="wp-block-separator alignwide is-style-jazz"/><!-- /wp:separator -->`;

const button = (href, label, style = '') => {
  const cls = style ? ` is-style-${style}` : '';
  const attrs = style ? { className: `is-style-${style}` } : {};
  const attrStr = style ? ` ${JSON.stringify(attrs)}` : '';
  return `<!-- wp:button${attrStr} --><div class="wp-block-button${cls}"><a class="wp-block-button__link wp-element-button" href="${href}">${label}</a></div><!-- /wp:button -->`;
};

const buttons = (children, justify = 'left') => {
  const layoutAttr = justify === 'left' ? '' : ` {"layout":{"type":"flex","justifyContent":"${justify}"}}`;
  return `<!-- wp:buttons${layoutAttr} -->\n<div class="wp-block-buttons">${children}</div>\n<!-- /wp:buttons -->`;
};

const quote = (text, cite) =>
  `<!-- wp:quote --><blockquote class="wp-block-quote"><p>${text}</p>${cite ? `<cite>${cite}</cite>` : ''}</blockquote><!-- /wp:quote -->`;

const pullQuote = (text, cite) =>
  `<!-- wp:pullquote --><figure class="wp-block-pullquote"><blockquote><p>${text}</p>${cite ? `<cite>— ${cite}</cite>` : ''}</blockquote></figure><!-- /wp:pullquote -->`;

// Lesson row — mirrors Astro's .lesson-card ([num][body][cta] grid) via the
// bozzies-lesson-row group + child groups styled in chrome.css.
const lessonRow = ({ order, title, summary, href }) => {
  const num = `<!-- wp:group {"className":"bozzies-lesson-row__num","layout":{"type":"default"}} -->
<div class="wp-block-group bozzies-lesson-row__num">
${p('Lesson', { className: 'is-style-eyebrow' })}
${p(String(order).padStart(2, '0'))}
</div>
<!-- /wp:group -->`;
  const body = `<!-- wp:group {"className":"bozzies-lesson-row__body","layout":{"type":"default"}} -->
<div class="wp-block-group bozzies-lesson-row__body">
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><a href="${href}">${title}</a></h3><!-- /wp:heading -->
${summary ? p(summary) : ''}
</div>
<!-- /wp:group -->`;
  const cta = `<!-- wp:paragraph {"className":"bozzies-lesson-row__cta"} --><p class="bozzies-lesson-row__cta"><a href="${href}">▶ Listen</a></p><!-- /wp:paragraph -->`;
  return `<!-- wp:group {"className":"bozzies-lesson-row","layout":{"type":"default"}} -->
<div class="wp-block-group bozzies-lesson-row">
${num}
${body}
${cta}
</div>
<!-- /wp:group -->`;
};

const lessonRows = (rows) =>
  `<!-- wp:group {"className":"bozzies-lesson-rows","layout":{"type":"default"}} -->
<div class="wp-block-group bozzies-lesson-rows">
${rows.map(lessonRow).join('\n')}
</div>
<!-- /wp:group -->`;

const card = ({ eyebrow, title, body, cta, href }) => {
  const inner = [
    eyebrow ? p(eyebrow, { className: 'is-style-eyebrow' }) : '',
    h(3, title),
    body ? p(body) : '',
    buttons(button(href, cta || 'Open')),
  ].filter(Boolean).join('\n');
  return `<!-- wp:group {"className":"is-style-card","layout":{"type":"default"}} -->
<div class="wp-block-group is-style-card">
${inner}
</div>
<!-- /wp:group -->`;
};

const heroPurple = ({ backLabel, backHref, eyebrow, title, subtitle }) =>
  section(
    { backgroundStyle: 'purple', backdrop: 'staves', width: 'narrow', headingWidth: 'container', spacing: 'spacious', align: 'full' },
    [
      p(`<a href="${backHref}">← ${backLabel}</a>`),
      eyebrow ? p(eyebrow, { className: 'is-style-eyebrow' }) : '',
      `<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">${title}</h1><!-- /wp:heading -->`,
      subtitle ? p(subtitle, { fontSize: 'lead' }) : '',
    ].filter(Boolean).join('\n'),
  );

const proseSection = (blocks) =>
  section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    blocks.filter(Boolean).join('\n'),
  );

// ---------- Simple markdown table -> WP table block converter ----------

function mdTable(mdLines) {
  // mdLines[0] = header row, mdLines[1] = separator, mdLines[2..] = data rows
  const parse = (row) => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const head = parse(mdLines[0]);
  const rows = mdLines.slice(2).map(parse);
  const thead = `<thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<!-- wp:table --><figure class="wp-block-table"><table>${thead}${tbody}</table></figure><!-- /wp:table -->`;
}

// ---------- Page builders ----------

function buildMedia(media) {
  // Astro's media hub hero: full-bleed photo (Boswell_Sisters_Bing_Crosby.jpg)
  // with title, subtitle, and credit line under the image.
  const hero = heroPhoto({
    media: media.bingCrosby,
    title: 'Media',
    subtitle: 'A curated playlist, five audio lessons on the Boswell sound, and chart positions and reviews that recognized them.',
    credit: 'The Boswell Sisters recording with Bing Crosby.',
  });

  const intro = proseSection([
    h(2, 'A living archive of the Boswell sound'),
    p('Everything the Boswell Sisters left behind, arranged so you can hear it. New material lands here as the archive grows.', { className: 'bozzies-para-body', fontSize: 'lead' }),
  ]);

  const playlistPlaceholder = section(
    { backgroundStyle: 'paper', backdrop: 'vinyl', headingWidth: 'reading', align: 'full' },
    [
      p('Music Playlist', { className: 'is-style-eyebrow', align: 'center' }),
      h(2, 'The Boswell Sisters Collection Volume One', { align: 'center', fontSize: 'section-title' }),
      p('[Playlist player: interactive block pending]', { align: 'center' }),
    ].join('\n'),
  );

  const lessonsGrid = section(
    { backgroundStyle: 'paper', headingWidth: 'reading', align: 'full' },
    [
      p('Audio Lessons', { className: 'is-style-eyebrow', align: 'center' }),
      h(2, 'Five keys to the Boswell sound', { align: 'center', fontSize: 'section-title' }),
      p('Cynthia Lucas, one of the best-known Boz historians, narrates five audio lessons that unpack how the Sisters actually did what they did.', { align: 'center' }),
      lessonRows([
        { order: 1, title: 'The Blend',       summary: "Cynthia Lucas walks through the first, and most immediately recognizable, element of the Boswell Sound: three sisters singing so closely blended that they sometimes read as one voice.", href: '/media/lessons/lesson-1/' },
        { order: 2, title: 'The Tempo',       summary: "The Boswells' signature four-to-five tempo shifts within a single arrangement, executed with the kind of precision that most trios would never even attempt.", href: '/media/lessons/lesson-2/' },
        { order: 3, title: 'The Riffs',       summary: "The instrumental-style rhythmic figures the Boswells pulled off with their voices — riffs that would sound at home coming out of a horn section.", href: '/media/lessons/lesson-3/' },
        { order: 4, title: `Melody? Words? Who Needs &rsquo;Em!`, summary: "What happens when the Boswells decide the melody as written is only a starting point — reharmonizations, unexpected returns to the verse, lyrics rendered in something resembling pig Latin.", href: '/media/lessons/lesson-4/' },
        { order: 5, title: 'Scatting, Hand Trumpets, Gibberish and Gulling', summary: "The Boswell bag of tricks — scat lines, hand trumpets, blues refrains, gulling, and whatever else they felt like throwing into an arrangement.", href: '/media/lessons/lesson-5/' },
      ]),
    ].join('\n'),
  );

  const teasers = section(
    { backgroundStyle: 'gold', backdrop: 'vinyl', headingWidth: 'reading', align: 'full' },
    `<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column --><div class="wp-block-column">${card({
  eyebrow: 'Discography',
  title: 'Boz on the Charts',
  body: 'Chart positions from Brunswick 6083 in 1931 to Decca in the late 1930s and beyond — how the Boswell Sisters and Connee actually rated with the record-buying public.',
  cta: 'Explore the charts', href: '/media/charts/',
})}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">${card({
  eyebrow: 'Reviews',
  title: 'Album reviews from the experts',
  body: 'Storyville volumes, Singing the Blues, Shout Sisters Shout, and the lost 1957 RCA classic — hand-picked reviews for anyone starting a Boz collection.',
  cta: 'Read the reviews', href: '/media/reviews/',
})}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">${card({
  eyebrow: 'Discography',
  title: 'Every session, every track',
  body: `128 recording sessions spanning 1925 to 1957, from the trio's first Victor sides through Connee's final solos with Sy Oliver. Searchable by title, matrix, or personnel.`,
  cta: 'Browse the sessions', href: '/media/discography/',
})}</div><!-- /wp:column -->
</div>
<!-- /wp:columns -->`,
  );

  return [hero, intro, separator(), playlistPlaceholder, separator(), lessonsGrid, teasers].join('\n\n');
}

function buildCharts() {
  const chartsMd = readFileSync('/Users/keithhalpin/boswell-poc/src/content/pages/charts.md', 'utf8');
  const body = chartsMd.split(/^---\s*$/m).slice(2).join('---').trim();
  const lines = body.split('\n');

  // Convert markdown to WP blocks — targeted: headings, paragraphs, tables, emphasis.
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('## ')) {
      blocks.push(h(2, line.slice(3).trim()));
      i++;
    } else if (line.startsWith('| ')) {
      // Collect the table
      const tbl = [];
      while (i < lines.length && lines[i].startsWith('|')) { tbl.push(lines[i]); i++; }
      blocks.push(mdTable(tbl));
    } else if (line.startsWith('_') && line.endsWith('_')) {
      // Italic wrapper. Strip the outer underscores, convert **bold** to
      // <strong>, then wrap in <em>. Handles "_**BC** = Bing Crosby..._"
      // (bold key + italic outer) as well as plain italic notes.
      const inner = line.slice(1, -1).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      blocks.push(p(`<em>${inner}</em>`));
      i++;
    } else {
      // Merge paragraph until blank line
      const para = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('|') && !lines[i].startsWith('_')) {
        para.push(lines[i]);
        i++;
      }
      blocks.push(p(para.join(' ').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')));
    }
  }

  const hero = heroPurple({
    backLabel: 'Media', backHref: '/media/', eyebrow: 'Discography',
    title: 'On the Charts',
    subtitle: 'Boswell Sisters and Connee Boswell chart positions, 1931 onward.',
  });

  const proseBody = section(
    { backgroundStyle: 'paper', width: 'container', headingWidth: 'container', align: 'full' },
    blocks.join('\n'),
  );

  // Astro's charts page ends with a "See also → discography" gold card.
  const seeAlso = section(
    { backgroundStyle: 'gold', width: 'narrow', headingWidth: 'reading', align: 'full' },
    `<!-- wp:group {"className":"is-style-card","align":"wide","layout":{"type":"default"}} -->
<div class="wp-block-group alignwide is-style-card">
${p('See also', { className: 'is-style-eyebrow', align: 'center' })}
${h(2, `<a href="/media/discography/">The full discography</a>`, { align: 'center', fontSize: 'section-title-medium' })}
${p('Chart positions tell you how the records sold. The discography goes deeper — 128 sessions and 500+ tracks, with matrix numbers, personnel, and label catalog data.', { align: 'center' })}
${buttons(button('/media/discography/', 'Browse the sessions'), 'center')}
</div>
<!-- /wp:group -->`,
  );

  return [hero, proseBody, seeAlso].join('\n\n');
}

function buildReviews() {
  const hero = heroPurple({
    backLabel: 'Media', backHref: '/media/', eyebrow: 'Reviews',
    title: 'Reviews',
    subtitle: 'Album reviews from the experts.',
  });

  // Wrap the review rows in a bozzies-reviews group so the h3+p pattern picks
  // up Astro's row treatment (hairline top border on each h3, italic muted
  // paragraph immediately after) via chrome.css.
  const rows = [
    ['Connee Boswell — Singing the Blues', 'Want to hear Connee Boswell full of the feeling and passion that only a mature woman can express?'],
    ['Boswell Sisters — Shout, Sisters, Shout', 'Without a doubt one of the best of all possible albums to begin your trip to Boz.'],
    [`Connee Boswell — They Can&rsquo;t Take These Songs`, 'A treasure trove.'],
    ['Boswell Sisters — Storyville Vol. 1 (of 5)', 'Boswell Sisters start at the top.'],
    ['Boswell Sisters — Storyville Vol. 4 (of 5)', 'Great volume of the hot New Orleans harmonists.'],
    ['Boswell Sisters — Storyville Vol. 5 (of 5)', 'Final volume of the definitive series.'],
    ['Connee Boswell — Original Memphis Five in Hi-Fi (RCA)', 'Lost classic from 1957.'],
  ];
  const reviewsGroup = `<!-- wp:group {"className":"bozzies-reviews","layout":{"type":"default"}} -->
<div class="wp-block-group bozzies-reviews">
${rows.map(([title, body]) => `${h(3, title)}\n${p(body, { className: 'bozzies-review-body' })}`).join('\n')}
</div>
<!-- /wp:group -->`;

  const proseBody = proseSection([
    h(2, 'These reviews come from the experts'),
    reviewsGroup,
  ]);

  return [hero, proseBody].join('\n\n');
}

function buildDiscography() {
  const hero = heroPurple({
    backLabel: 'Media', backHref: '/media/', eyebrow: 'Discography',
    title: 'Discography',
    subtitle: `Every session the Boswell Sisters and Connee Boswell cut — 128 sessions from the trio&rsquo;s first Victor sides in 1925 through Connee&rsquo;s final work with Sy Oliver in 1957.`,
  });

  const placeholder = section(
    { backgroundStyle: 'paper', backdrop: 'staves', headingWidth: 'reading', align: 'full' },
    [
      p('Trio Era + Solo Years', { className: 'is-style-eyebrow', align: 'center' }),
      h(2, `128 sessions, searchable by title, matrix, or personnel`, { align: 'center', fontSize: 'section-title-medium' }),
      p('[Discography search: interactive block pending]', { align: 'center' }),
      p('Adapted from the Boswell Sisters Discography compiled by Paul Gaffey, preserved via web.archive.org.', { align: 'center', className: 'bozzies-para-body' }),
    ].join('\n'),
  );

  return [hero, placeholder].join('\n\n');
}

function buildCareerTimeline() {
  const hero = heroPurple({
    backLabel: 'The Sisters', backHref: '/sisters/', eyebrow: 'Career Timeline',
    title: 'Boswell Sisters — Career Timeline',
    subtitle: `From Martha&rsquo;s birth in 1905 through the trio&rsquo;s final broadcast in 1936 — and the family milestones that followed.`,
  });

  const trioQuote = section(
    { backgroundStyle: 'purple', backdrop: 'notes', headingWidth: 'reading', align: 'full' },
    pullQuote(
      'They (the Boswell Sisters) changed popular music from the 1930s forward.',
      'James Von Schilling',
    ),
  );

  const placeholder = section(
    { backgroundStyle: 'paper', backdrop: 'staves', headingWidth: 'reading', align: 'full' },
    [
      p('The Trio Years', { className: 'is-style-eyebrow', align: 'center' }),
      h(2, '1905 – 1936, year by year', { align: 'center', fontSize: 'section-title-medium' }),
      p('[Sisters timeline: interactive block pending]', { align: 'center' }),
    ].join('\n'),
  );

  return [hero, trioQuote, placeholder].join('\n\n');
}

function buildLessonsHub(media) {
  // Astro's lessons hub hero: full-bleed photo (Boswell_Sisters_1932.jpg)
  // with "Audio Lessons" eyebrow, "Lessons" title, subtitle.
  const hero = heroPhoto({
    media: media.boswell1932,
    eyebrow: 'Audio Lessons',
    title: 'Lessons',
    subtitle: 'Five keys to the Boswell sound, narrated by Cynthia Lucas.',
  });

  const grid = section(
    { backgroundStyle: 'paper', headingWidth: 'reading', align: 'full' },
    `<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column --><div class="wp-block-column">${card({
  eyebrow: 'Lesson 01', title: 'The Blend',
  body: 'Cynthia Lucas walks through the first, and most immediately recognizable, element of the Boswell Sound: three sisters singing so closely blended that they sometimes read as one voice.',
  cta: 'Listen', href: '/media/lessons/lesson-1/',
})}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">${card({
  eyebrow: 'Lesson 02', title: 'The Tempo',
  body: `The Boswells&rsquo; signature four-to-five tempo shifts within a single arrangement, executed with the kind of precision that most trios would never even attempt.`,
  cta: 'Listen', href: '/media/lessons/lesson-2/',
})}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">${card({
  eyebrow: 'Lesson 03', title: 'The Riffs',
  body: 'The instrumental-style rhythmic figures the Boswells pulled off with their voices — riffs that would sound at home coming out of a horn section.',
  cta: 'Listen', href: '/media/lessons/lesson-3/',
})}</div><!-- /wp:column -->
</div>
<!-- /wp:columns -->
<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column --><div class="wp-block-column">${card({
  eyebrow: 'Lesson 04', title: `Melody? Words? Who Needs &rsquo;Em!`,
  body: 'What happens when the Boswells decide the melody as written is only a starting point — reharmonizations, unexpected returns to the verse, lyrics rendered in something resembling pig Latin.',
  cta: 'Listen', href: '/media/lessons/lesson-4/',
})}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">${card({
  eyebrow: 'Lesson 05', title: 'Scatting, Hand Trumpets, Gibberish and Gulling',
  body: 'The Boswell bag of tricks — scat lines, hand trumpets, blues refrains, gulling, and whatever else they felt like throwing into an arrangement.',
  cta: 'Listen', href: '/media/lessons/lesson-5/',
})}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column"></div><!-- /wp:column -->
</div>
<!-- /wp:columns -->`,
  );

  return [hero, grid].join('\n\n');
}

const LESSON_TITLES = {
  1: 'The Blend',
  2: 'The Tempo',
  3: 'The Riffs',
  4: `Melody? Words? Who Needs &rsquo;Em!`,
  5: 'Scatting, Hand Trumpets, Gibberish and Gulling',
};

function buildLesson({ order, title, summary, audioMedia }) {
  const hero = heroPurple({
    backLabel: 'Media', backHref: '/media/',
    eyebrow: `Lesson ${String(order).padStart(2, '0')}`,
    title, subtitle: summary,
  });

  const player = section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    [
      // Astro's player has visible <span>Lesson {n}</span><span>{title}</span>
      // labels next to the <audio>. Mirror those as small paragraphs so the
      // text-diff picks them up.
      p(`Lesson ${order}`, { className: 'is-style-eyebrow' }),
      p(`<strong>${title.replace(/&rsquo;/g, "'")}</strong>`),
      `<!-- wp:audio {"id":${audioMedia.id}} --><figure class="wp-block-audio"><audio controls src="${audioMedia.url}"></audio></figure><!-- /wp:audio -->`,
      p(`<a href="${audioMedia.url}" download>Download MP3</a>`),
      p('<em>Narrated by Cynthia Lucas.</em>', { className: 'bozzies-para-body' }),
    ].join('\n'),
  );

  const order2 = [1, 2, 3, 4, 5];
  const idx = order2.indexOf(order);
  const prev = order2[(idx - 1 + 5) % 5];
  const next = order2[(idx + 1) % 5];

  const nav = section(
    { backgroundStyle: 'paper', spacing: 'compact', headingWidth: 'container', align: 'full' },
    `<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column --><div class="wp-block-column">
${p('Previous', { className: 'is-style-eyebrow' })}
${p(`<a href="/media/lessons/lesson-${prev}/">Lesson ${prev} &middot; ${LESSON_TITLES[prev]}</a>`)}
</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">
${p('All', { className: 'is-style-eyebrow', align: 'center' })}
${p(`<a href="/media/lessons/">Lessons</a>`, { align: 'center' })}
</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">
${p('Next', { className: 'is-style-eyebrow', align: 'right' })}
${p(`<a href="/media/lessons/lesson-${next}/">Lesson ${next} &middot; ${LESSON_TITLES[next]}</a>`, { align: 'right' })}
</div><!-- /wp:column -->
</div>
<!-- /wp:columns -->`,
  );

  return [hero, player, nav].join('\n\n');
}

// ---------- Runner ----------

function run() {
  console.log('Group 2: Media');

  const audios = {
    l1: importMedia('/uploads/audio/lesson1.mp3', 'Lesson 1 — The Blend', 'lesson1'),
    l2: importMedia('/uploads/audio/lesson2.mp3', 'Lesson 2 — The Tempo', 'lesson2'),
    l3: importMedia('/uploads/audio/lesson3.mp3', 'Lesson 3 — The Riffs', 'lesson3'),
    l4: importMedia('/uploads/audio/lesson4.mp3', `Lesson 4 — Melody? Words?`, 'lesson4'),
    l5: importMedia('/uploads/audio/lesson5.mp3', 'Lesson 5 — Scatting, Hand Trumpets, Gibberish and Gulling', 'lesson5'),
  };
  console.log('  audio:', Object.fromEntries(Object.entries(audios).map(([k, v]) => [k, v.id])));

  // Media hub + lessons hub full-bleed photo hero images.
  const media = {
    bingCrosby:   importMedia('/uploads/Boswell_Sisters_Bing_Crosby.jpg', 'The Boswell Sisters recording with Bing Crosby.'),
    boswell1932:  importMedia('/uploads/Boswell_Sisters_1932.jpg', 'Portrait of the Boswell Sisters, circa 1932.'),
  };
  console.log('  media:', Object.fromEntries(Object.entries(media).map(([k, v]) => [k, v.id])));

  const lessons = [
    { order: 1, title: 'The Blend', summary: 'Cynthia Lucas walks through the first, and most immediately recognizable, element of the Boswell Sound: three sisters singing so closely blended that they sometimes read as one voice.', audioMedia: audios.l1 },
    { order: 2, title: 'The Tempo', summary: `The Boswells&rsquo; signature four-to-five tempo shifts within a single arrangement, executed with the kind of precision that most trios would never even attempt.`, audioMedia: audios.l2 },
    { order: 3, title: 'The Riffs', summary: 'The instrumental-style rhythmic figures the Boswells pulled off with their voices — riffs that would sound at home coming out of a horn section.', audioMedia: audios.l3 },
    { order: 4, title: `Melody? Words? Who Needs &rsquo;Em!`, summary: 'What happens when the Boswells decide the melody as written is only a starting point — reharmonizations, unexpected returns to the verse, lyrics rendered in something resembling pig Latin.', audioMedia: audios.l4 },
    { order: 5, title: 'Scatting, Hand Trumpets, Gibberish and Gulling', summary: 'The Boswell bag of tricks — scat lines, hand trumpets, blues refrains, gulling, and whatever else they felt like throwing into an arrangement.', audioMedia: audios.l5 },
  ];

  const pages = [
    { slug: 'media',            title: 'Media',           template: 'page-landing', content: buildMedia(media) },
    { slug: 'charts',           title: 'On the Charts',   template: 'page-subpage', content: buildCharts() },
    { slug: 'reviews',          title: 'Reviews',         template: 'page-subpage', content: buildReviews() },
    { slug: 'discography',      title: 'Discography',     template: 'page-subpage', content: buildDiscography() },
    { slug: 'career-timeline',  title: 'Career Timeline', template: 'page-subpage', content: buildCareerTimeline() },
    { slug: 'lessons',          title: 'Lessons',         template: 'page-landing', content: buildLessonsHub(media) },
    ...lessons.map(l => ({
      slug: `lesson-${l.order}`,
      title: `Lesson ${l.order} — ${l.title.replace(/&rsquo;/g, "'")}`,
      template: 'page-subpage',
      content: buildLesson(l),
    })),
  ];

  for (const page of pages) {
    const res = upsertPage(page);
    console.log(`  ${res.created ? '+' : '~'} ${page.slug} (id=${res.id})`);
  }
}

run();
