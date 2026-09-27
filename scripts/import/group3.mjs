// scripts/import/group3.mjs
// Group 3 — Press. Press hub, 34 articles (as posts across 5 categories),
// 9 press releases (as pages), and updated category descriptions.

import { readdirSync, readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { importMedia, upsertPage, upsertPost, deleteBySlug, wp, heroPhoto } from './lib.mjs';

const ARTICLES_DIR = '/Users/keithhalpin/boswell-poc/src/content/articles';
const RELEASES_DIR = '/Users/keithhalpin/boswell-poc/src/content/press-releases';

const SUBHUB_LABEL = {
  vintage: 'Vintage Articles',
  'in-their-own-words': 'In Their Own Words',
  video: 'Video Features',
  feature: 'Features',
  essay: 'About the Site',
};

// ---------- Block helpers (mirror groups 1+2) ----------

const section = (attrs, inner) =>
  `<!-- wp:bozzies/section ${JSON.stringify(attrs)} -->\n${inner}\n<!-- /wp:bozzies/section -->`;

const h = (level, text, opts = {}) => {
  const cls = ['wp-block-heading'];
  if (opts.className) cls.unshift(opts.className);
  if (opts.align) cls.push(`has-text-align-${opts.align}`);
  if (opts.fontSize) cls.push(`has-${opts.fontSize}-font-size`);
  const a = {
    level,
    ...(opts.className && { className: opts.className }),
    ...(opts.align && { textAlign: opts.align }),
    ...(opts.fontSize && { fontSize: opts.fontSize }),
  };
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

const button = (href, label) =>
  `<!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${href}">${label}</a></div><!-- /wp:button -->`;

const buttons = (children, justify = 'left') => {
  const layoutAttr = justify === 'left' ? '' : ` {"layout":{"type":"flex","justifyContent":"${justify}"}}`;
  return `<!-- wp:buttons${layoutAttr} -->\n<div class="wp-block-buttons">${children}</div>\n<!-- /wp:buttons -->`;
};

const quote = (text, cite) =>
  `<!-- wp:quote --><blockquote class="wp-block-quote"><p>${text}</p>${cite ? `<cite>${cite}</cite>` : ''}</blockquote><!-- /wp:quote -->`;

const image = ({ id, url, alt, size = 'large', align = 'center', link }) => {
  const attrs = { id, sizeSlug: size };
  if (link) { attrs.linkDestination = 'custom'; attrs.href = link; }
  else       attrs.linkDestination = 'none';
  if (align) attrs.align = align;
  const cls = ['wp-block-image', `size-${size}`];
  if (align) cls.push(`align${align}`);
  const img = `<img src="${url}" alt="${alt}" class="wp-image-${id}"/>`;
  const inner = link ? `<a href="${link}">${img}</a>` : img;
  return `<!-- wp:image ${JSON.stringify(attrs)} --><figure class="${cls.join(' ')}">${inner}</figure><!-- /wp:image -->`;
};

// ---------- Markdown parsing ----------

function parseFrontmatter(filepath) {
  const raw = readFileSync(filepath, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  return { data: load(m[1]) || {}, body: m[2].trim() };
}

// Inline markdown → HTML: `code`, [text](url), **bold**, _italic_, *italic*.
// The `(?<!!)` on the link regex prevents matching `![text](url)` (an image);
// image extraction happens block-level before inline runs.
function inlineMd(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => `<a href="${stripAffiliate(url)}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?:^|(?<=\s|\W))_([^_\n]+)_(?=\s|\W|$)/g, '<em>$1</em>')
    .replace(/(?:^|(?<=\s|\W))\*([^*\n]+)\*(?=\s|\W|$)/g, '<em>$1</em>');
}

// The Astro source has a Bette Midler amazon.com link with affiliate tracking.
// Task decision: keep the plain product URL, drop the tag/linkCode/etc. query.
function stripAffiliate(url) {
  if (/^https?:\/\/(www\.)?amazon\.[a-z.]+\//i.test(url)) {
    return url.split('?')[0];
  }
  return url;
}

// Markdown → array of WP block strings.
function mdToBlocks(markdown, resolveImage) {
  const blocks = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // Headings
    let m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = Math.min(m[1].length, 6);
      blocks.push(h(level, inlineMd(m[2].trim())));
      i++; continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const paras = [[]];
      while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) {
        if (lines[i].trim() === '' || lines[i].trim() === '>') {
          if (paras[paras.length - 1].length) paras.push([]);
        } else {
          paras[paras.length - 1].push(lines[i].replace(/^>\s?/, ''));
        }
        i++;
        if (i < lines.length && !lines[i].startsWith('>') && lines[i].trim() !== '') break;
      }
      const html = paras.filter(p => p.length).map(pl => `<p>${inlineMd(pl.join(' '))}</p>`).join('');
      blocks.push(`<!-- wp:quote --><blockquote class="wp-block-quote">${html}</blockquote><!-- /wp:quote -->`);
      continue;
    }

    // Unordered list
    if (line.match(/^[*\-]\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[*\-]\s/)) {
        items.push(inlineMd(lines[i].replace(/^[*\-]\s+/, '')));
        i++;
      }
      const li = items.map(it => `<!-- wp:list-item --><li>${it}</li><!-- /wp:list-item -->`).join('\n');
      blocks.push(`<!-- wp:list -->\n<ul class="wp-block-list">\n${li}\n</ul>\n<!-- /wp:list -->`);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(inlineMd(lines[i].replace(/^\d+\.\s+/, '')));
        i++;
      }
      const li = items.map(it => `<!-- wp:list-item --><li>${it}</li><!-- /wp:list-item -->`).join('\n');
      blocks.push(`<!-- wp:list {"ordered":true} -->\n<ol class="wp-block-list">\n${li}\n</ol>\n<!-- /wp:list -->`);
      continue;
    }

    // Image or linked image at the start of a line — may be followed by
    // paragraph text on the same line. Astro renders that as a single <p>
    // with an inline <img> + text; we split it into a wp:image block + a
    // wp:paragraph block. Text-diff is unaffected (imgs contribute 0 tokens).
    // Patterns handled:
    //   ![alt](img)text                    plain image + trailing text
    //   [![alt](img)](url)text             linked image + trailing text
    const linkedImg = line.match(/^\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)(.*)$/);
    const plainImg  = linkedImg ? null : line.match(/^!\[([^\]]*)\]\(([^)]+)\)(.*)$/);
    if ((linkedImg || plainImg) && resolveImage) {
      const alt   = (linkedImg || plainImg)[1];
      const imgSrc = (linkedImg || plainImg)[2];
      const link  = linkedImg ? stripAffiliate(linkedImg[3]) : null;
      const rest  = ((linkedImg && linkedImg[4]) || (plainImg && plainImg[3]) || '').trim();
      const media = resolveImage(imgSrc, alt);
      if (media) {
        blocks.push(image({ id: media.id, url: media.url, alt, size: 'large', link }));
      } else {
        blocks.push(p(`<em>[Image: ${imgSrc}]</em>`));
      }
      i++;
      if (rest) {
        // Accumulate any continued lines (mirrors the plain-paragraph branch below).
        const para = [rest];
        while (i < lines.length && lines[i].trim() &&
          !lines[i].match(/^#{1,6}\s/) && !lines[i].startsWith('>') &&
          !lines[i].match(/^[*\-]\s/) && !lines[i].match(/^\d+\.\s/) &&
          !lines[i].match(/^!?\[/) && !lines[i].match(/^<iframe/) &&
          !lines[i].match(/^-{3,}$/)) {
          para.push(lines[i]); i++;
        }
        blocks.push(p(inlineMd(para.join(' '))));
      }
      continue;
    }

    // YouTube iframe (embed as core/embed)
    if (line.match(/<iframe[^>]*youtube/i) || line.match(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//)) {
      let url = null;
      let m = line.match(/src="([^"]+)"/);
      if (m) url = m[1];
      else url = line.trim();
      const idm = url.match(/(?:youtube-nocookie\.com|youtube\.com)\/embed\/([^?"&]+)/);
      const idm2 = url.match(/watch\?v=([^&]+)/);
      const idm3 = url.match(/youtu\.be\/([^?&]+)/);
      const videoId = (idm && idm[1]) || (idm2 && idm2[1]) || (idm3 && idm3[1]);
      if (videoId) {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        blocks.push(`<!-- wp:embed {"url":"${watchUrl}","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} --><figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">${watchUrl}</div></figure><!-- /wp:embed -->`);
      }
      i++; continue;
    }

    // Horizontal rule
    if (line.match(/^-{3,}$/) || line.match(/^\*{3,}$/)) {
      blocks.push(`<!-- wp:separator --><hr class="wp-block-separator"/><!-- /wp:separator -->`);
      i++; continue;
    }

    // Paragraph (accumulate until blank line or block-level start)
    const para = [line]; i++;
    while (i < lines.length && lines[i].trim() &&
      !lines[i].match(/^#{1,6}\s/) && !lines[i].startsWith('>') &&
      !lines[i].match(/^[*\-]\s/) && !lines[i].match(/^\d+\.\s/) &&
      !lines[i].match(/^!?\[/) && !lines[i].match(/^<iframe/) &&
      !lines[i].match(/^-{3,}$/)) {
      para.push(lines[i]); i++;
    }
    blocks.push(p(inlineMd(para.join(' '))));
  }

  return blocks;
}

// ---------- Section helpers ----------

const heroPurple = ({ backLabel, backHref, eyebrow, title, subtitle, meta, quote: q, quoteCite }) =>
  section(
    { backgroundStyle: 'purple', backdrop: 'notes', width: 'narrow', headingWidth: 'container', spacing: 'spacious', align: 'full' },
    [
      p(`<a href="${backHref}">← ${backLabel}</a>`),
      eyebrow ? p(eyebrow, { className: 'is-style-eyebrow' }) : '',
      `<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">${title}</h1><!-- /wp:heading -->`,
      meta ? p(meta) : '',
      subtitle ? p(subtitle, { fontSize: 'lead' }) : '',
      q ? quote(q, quoteCite ? `— ${quoteCite}` : '') : '',
    ].filter(Boolean).join('\n'),
  );

const proseSection = (blocks) =>
  section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    blocks.filter(Boolean).join('\n'),
  );

// ---------- Slug helper ----------

function slugFromFile(filename, subhub) {
  const name = filename.replace(/\.md$/, '');
  const stripped = name.replace(new RegExp(`^${subhub}[-_]?`), '');
  return stripped || name;
}

// ---------- Runner ----------

// One sub-hub section: header (kicker/label/blurb) + a Query Loop filtered
// to that category, rendered with our numbered article-list styling. Order
// asc by menu_order (import sets menu_order = Astro's frontmatter `order`
// with `999` for missing values, so Query Loop reproduces Astro's sort).
function buildSubhubSection({ termId, kicker, label, blurb }) {
  const queryAttrs = {
    queryId: 100 + termId,
    query: {
      perPage: 100, pages: 0, offset: 0,
      postType: 'post',
      order: 'asc', orderBy: 'menu_order',
      author: '', search: '', exclude: [],
      sticky: '', inherit: false, parents: [],
      taxQuery: { category: [termId] },
    },
  };
  const queryLoop = `<!-- wp:query ${JSON.stringify(queryAttrs)} -->
<div class="wp-block-query">
<!-- wp:post-template {"className":"bozzies-article-list"} -->
<!-- wp:group {"className":"bozzies-article-row","layout":{"type":"default"}} -->
<div class="wp-block-group bozzies-article-row">
<!-- wp:post-title {"isLink":true,"level":3,"className":"bozzies-article-row__title"} /-->
<!-- wp:paragraph {"className":"is-style-eyebrow bozzies-article-row__meta","metadata":{"bindings":{"content":{"source":"bozzies/article-meta"}}}} -->
<p class="is-style-eyebrow bozzies-article-row__meta"></p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
<!-- /wp:post-template -->
</div>
<!-- /wp:query -->`;

  return section(
    { backgroundStyle: 'paper', headingWidth: 'reading', align: 'full', spacing: 'compact' },
    [
      p(kicker, { className: 'is-style-eyebrow' }),
      h(2, label, { fontSize: 'section-title-medium' }),
      p(blurb, { className: 'bozzies-para-body' }),
      queryLoop,
    ].join('\n'),
  );
}

// One press-release card. Each card links straight to the PDF (target=_blank
// so the PDF opens in a new tab, matching Astro's markup).
function releaseCard({ documentUrl, documentType, title, releaseDate }) {
  const type = (documentType || 'DOC').toUpperCase();
  const inner = [
    p(type, { className: 'is-style-eyebrow release-card__type' }),
    h(3, title, { className: 'release-card__title' }),
    releaseDate ? p(releaseDate, { className: 'release-card__date' }) : '',
  ].filter(Boolean).join('\n');
  return `<!-- wp:group {"className":"release-card","layout":{"type":"default"}} -->
<div class="wp-block-group release-card"><a class="release-card__link" href="${documentUrl}" target="_blank" rel="noopener noreferrer">
${inner}
</a></div>
<!-- /wp:group -->`;
}

function buildPressHub({ hubs, releases, media }) {
  // Astro's /press/ hero is a full-bleed photo (bozbuz.jpg) with title
  // and subtitle. No back-link, no eyebrow.
  const hero = heroPhoto({
    media: media.bozbuz,
    title: 'Press',
    subtitle: 'A century of writing on the Boswells — vintage newspaper pieces, modern press releases, interviews, and video features.',
  });

  const intro = proseSection([
    p('In our many cruises across the ether waves Bozzies.com has discovered many stories and links of interest to those on the journey to the Land of Boz. What follows is a curated archive: contemporary press about the Boswells from the 1930s onward, along with modern press releases, interviews, and the odd essay about the site itself.', { className: 'bozzies-para-body' }),
  ]);

  const subhubs = hubs.filter(h => h.hasEntries).map(buildSubhubSection);

  const releasesGrid = releases.length ? section(
    { backgroundStyle: 'gold', backdrop: 'staves', headingWidth: 'reading', align: 'full' },
    [
      p('The Press Room', { className: 'is-style-eyebrow' }),
      h(2, 'Press releases &amp; media', { fontSize: 'section-title-medium' }),
      p('Original press releases, event announcements, and archival documents. Each opens as a PDF.', { className: 'bozzies-para-body' }),
      `<!-- wp:group {"className":"releases-grid","layout":{"type":"grid","minimumColumnWidth":"16rem"}} -->
<div class="wp-block-group releases-grid">
${releases.map(releaseCard).join('\n')}
</div>
<!-- /wp:group -->`,
    ].join('\n'),
  ) : '';

  return [hero, intro, ...subhubs, releasesGrid].filter(Boolean).join('\n\n');
}

function buildArticleContent(data, bodyBlocks) {
  // Article page structure — mirrors Astro's [purple hero → paper body → gold
  // external-link] layout. The purple hero contains the back link (to the
  // category), the h1, the meta line (author · publication · publicationDate,
  // rendered from post meta via the bozzies/article-meta binding), and the
  // pull quote when present. Astro packages all four together in a single
  // hero band — matching that here removes the "double band" artefact caused
  // by the earlier split single.html hero + separate pull-quote section.
  const hubLabel = (HUB_ORDER.find(h => h.slug === data.subhub) || {}).label || 'Press';
  const backLink = `<a href="/press/${data.subhub}/">← Press &middot; ${hubLabel}</a>`;
  const metaParagraph = `<!-- wp:paragraph {"className":"is-style-eyebrow bozzies-article-meta","metadata":{"bindings":{"content":{"source":"bozzies/article-meta"}}}} -->
<p class="is-style-eyebrow bozzies-article-meta"></p>
<!-- /wp:paragraph -->`;
  const heroInner = [
    p(backLink),
    `<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">${data.title}</h1><!-- /wp:heading -->`,
    metaParagraph,
    data.pullQuote ? quote(data.pullQuote, data.pullQuoteAttribution ? `— ${data.pullQuoteAttribution}` : '') : '',
  ].filter(Boolean).join('\n');
  const hero = section(
    { backgroundStyle: 'purple', backdrop: 'notes', width: 'narrow', headingWidth: 'container', spacing: 'spacious', align: 'full' },
    heroInner,
  );

  const heroImage = data.heroImageMedia ? section(
    { backgroundStyle: 'paper', width: 'container', headingWidth: 'container', align: 'full' },
    image({ id: data.heroImageMedia.id, url: data.heroImageMedia.url, alt: data.heroImageAlt || data.title, size: 'large' }),
  ) : '';

  const videoEmbed = data.videoEmbed ? section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    `<!-- wp:embed {"url":"${data.videoEmbed}","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} --><figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">${data.videoEmbed}</div></figure><!-- /wp:embed -->`,
  ) : '';

  const body = section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    bodyBlocks.join('\n'),
  );

  const externalLink = data.externalLink ? section(
    { backgroundStyle: 'gold', width: 'narrow', headingWidth: 'reading', align: 'full' },
    buttons(button(data.externalLink, 'Read the full article'), 'center'),
  ) : '';

  return [hero, heroImage, videoEmbed, body, externalLink].filter(Boolean).join('\n\n');
}

function updateCategoryDescriptions() {
  const hubs = [
    { slug: 'vintage',            name: 'Vintage Articles',   kicker: 'From the 1930s',  desc: 'Newspaper and magazine pieces published while the trio was in full swing.' },
    { slug: 'in-their-own-words', name: 'In Their Own Words', kicker: 'Interviews',      desc: 'Firsthand accounts and interview transcripts.' },
    { slug: 'video',              name: 'Video Features',     kicker: 'On Screen',       desc: 'Documentaries and video essays about the Boswell sound.' },
    { slug: 'feature',            name: 'Features',           kicker: 'Modern Writing',  desc: 'Contemporary essays and long-form pieces on the trio and Connee.' },
    { slug: 'essay',              name: 'About the Site',     kicker: 'Bozzies.org',     desc: 'What Getting Bozzed means, and why the site exists.' },
  ];
  for (const hub of hubs) {
    const id = wp(['term', 'list', 'category', `--slug=${hub.slug}`, '--fields=term_id', '--format=ids'], { allowFail: true }).trim();
    if (id) {
      wp(['term', 'update', 'category', id, `--name=${hub.name}`, `--description=${hub.desc}`]);
      wp(['term', 'meta', 'update', id, '_bozzies_kicker', hub.kicker]);
    }
  }
}

// The 5 press sub-hubs in Astro's stated `order` (from src/content/press-hubs/*.md).
const HUB_ORDER = [
  { slug: 'vintage',            kicker: 'From the 1930s',  label: 'Vintage Articles' },
  { slug: 'in-their-own-words', kicker: 'Interviews',      label: 'In Their Own Words' },
  { slug: 'video',              kicker: 'On Screen',       label: 'Video Features' },
  { slug: 'feature',            kicker: 'Modern Writing',  label: 'Features' },
  { slug: 'essay',              kicker: 'Bozzies.org',     label: 'About the Site' },
];
const HUB_BLURBS = {
  vintage: 'Newspaper and magazine pieces published while the trio was in full swing.',
  'in-their-own-words': 'Firsthand accounts and interview transcripts.',
  video: 'Documentaries and video essays about the Boswell sound.',
  feature: 'Contemporary essays and long-form pieces on the trio and Connee.',
  essay: 'What Getting Bozzed means, and why the site exists.',
};

function run() {
  console.log('Group 3: Press');

  const mediaResolver = (path, alt) => {
    if (path.startsWith('http')) return null;
    try { return importMedia(path, alt); }
    catch (e) { console.error(`    ! failed to import ${path}: ${e.message}`); return null; }
  };

  // 1. Update category descriptions + labels.
  console.log('  updating category descriptions...');
  updateCategoryDescriptions();

  // 2. Articles → posts. Sort by filename so menu_order matches Astro's
  // getCollection ordering for anything with `order` unset.
  const articleFiles = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md')).sort();
  console.log(`  ${articleFiles.length} articles...`);
  const perSubhubIndex = {};
  for (const filename of articleFiles) {
    const { data, body } = parseFrontmatter(`${ARTICLES_DIR}/${filename}`);
    if (!data.subhub) { console.log(`    ! ${filename} — no subhub, skipping`); continue; }
    const slug = slugFromFile(filename, data.subhub);
    if (data.heroImage) {
      try { data.heroImageMedia = importMedia(data.heroImage, data.heroImageAlt || data.title); }
      catch (e) { console.error(`    ! hero image failed: ${e.message}`); }
    }
    const bodyBlocks = mdToBlocks(body, mediaResolver);
    const content = buildArticleContent(data, bodyBlocks);

    // menu_order = Astro's frontmatter `order` when present, else a
    // deterministic slot based on alphabetical file order within the
    // subhub (starting at 500 so vintage's `order: 2..12` stays first).
    perSubhubIndex[data.subhub] = (perSubhubIndex[data.subhub] || 0) + 1;
    const menuOrder = typeof data.order === 'number'
      ? data.order
      : 500 + perSubhubIndex[data.subhub];

    // post_date: derive a sortable date from publicationDate. Frontmatter
    // has year-only strings ("1932") so we treat them as Jan 1 of that year.
    // If publicationDate is missing, leave post_date alone.
    let postDate;
    if (data.publicationDate) {
      const y = String(data.publicationDate).match(/^\d{4}/);
      if (y) postDate = `${y[0]}-01-01 00:00:00`;
    }

    const res = upsertPost({
      slug, title: data.title, content,
      postType: 'post', categorySlug: data.subhub,
      menuOrder, postDate,
      meta: {
        _bozzies_author:            data.author || '',
        _bozzies_publication:       data.publication || '',
        _bozzies_publication_date:  data.publicationDate || '',
      },
    });
    console.log(`  ${res.created ? '+' : '~'} [${data.subhub}] ${slug} (id=${res.id}) menu_order=${menuOrder}${postDate ? ` date=${postDate.slice(0,10)}` : ''}`);
  }

  // 3. Import PDFs into the media library. Astro links straight to
  // /uploads/docs/*.pdf on the press hub — no per-release pages exist. We
  // clean up any /press-releases/ index and the 9 release pages left over
  // from the earlier import.
  const releaseFiles = readdirSync(RELEASES_DIR).filter(f => f.endsWith('.md')).sort();
  console.log(`  ${releaseFiles.length} press releases (PDFs into media library)...`);
  const releases = [];
  for (const filename of releaseFiles) {
    const { data } = parseFrontmatter(`${RELEASES_DIR}/${filename}`);
    if (!data.document) { console.log(`    ! ${filename} — no document`); continue; }
    const pdf = importMedia(data.document, data.title);
    releases.push({
      documentUrl: pdf.url,
      documentType: data.documentType || 'PDF',
      title: data.title,
      releaseDate: data.releaseDate || null,
    });
    // Delete the standalone page created in the previous pass (Astro has no
    // per-release page; the link goes straight to the PDF).
    const baseSlug = filename.replace(/\.md$/, '').replace(/^press-release-/, '');
    const del = deleteBySlug(`press-release-${baseSlug}`, 'page');
    if (del.deleted) console.log(`    - deleted old release page: press-release-${baseSlug} (id=${del.id})`);
  }
  // Delete the /press-releases/ index — Astro has no such route.
  const relIdxDel = deleteBySlug('press-releases', 'page');
  if (relIdxDel.deleted) console.log(`    - deleted press-releases index (id=${relIdxDel.id})`);

  // Astro sorts by title alphabetical.
  releases.sort((a, b) => a.title.localeCompare(b.title));

  // 4. Press hub page — Query Loop per sub-hub + releases grid.
  console.log('  press hub page...');
  const hubs = HUB_ORDER.map(hub => {
    const termId = parseInt(wp(['term', 'list', 'category', `--slug=${hub.slug}`, '--fields=term_id', '--format=ids'], { allowFail: true }).trim(), 10);
    const count  = parseInt(wp(['post', 'list', `--category=${hub.slug}`, '--post_type=post', '--format=count'], { allowFail: true }).trim(), 10);
    return { ...hub, termId, blurb: HUB_BLURBS[hub.slug], hasEntries: count > 0 };
  });
  const media = {
    bozbuz: importMedia('/uploads/bozbuz.jpg', 'A Boswell Sisters press photograph.'),
  };
  console.log('  media:', Object.fromEntries(Object.entries(media).map(([k, v]) => [k, v.id])));
  const pressHubRes = upsertPage({
    slug: 'press', title: 'Press', template: 'page-landing',
    content: buildPressHub({ hubs, releases, media }),
  });
  console.log(`  ${pressHubRes.created ? '+' : '~'} press (id=${pressHubRes.id})`);
}

run();
