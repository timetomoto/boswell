// scripts/import/group3.mjs
// Group 3 — Press. Press hub, 34 articles (as posts across 5 categories),
// 9 press releases (as pages), and updated category descriptions.

import { readdirSync, readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { importMedia, upsertPage, upsertPost, wp } from './lib.mjs';

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

const button = (href, label) =>
  `<!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${href}">${label}</a></div><!-- /wp:button -->`;

const buttons = (children, justify = 'left') => {
  const layoutAttr = justify === 'left' ? '' : ` {"layout":{"type":"flex","justifyContent":"${justify}"}}`;
  return `<!-- wp:buttons${layoutAttr} -->\n<div class="wp-block-buttons">${children}</div>\n<!-- /wp:buttons -->`;
};

const quote = (text, cite) =>
  `<!-- wp:quote --><blockquote class="wp-block-quote"><p>${text}</p>${cite ? `<cite>${cite}</cite>` : ''}</blockquote><!-- /wp:quote -->`;

const image = ({ id, url, alt, size = 'large', align = 'center' }) =>
  `<!-- wp:image {"id":${id},"sizeSlug":"${size}","linkDestination":"none","align":"${align}"} --><figure class="wp-block-image align${align} size-${size}"><img src="${url}" alt="${alt}" class="wp-image-${id}"/></figure><!-- /wp:image -->`;

// ---------- Markdown parsing ----------

function parseFrontmatter(filepath) {
  const raw = readFileSync(filepath, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  return { data: load(m[1]) || {}, body: m[2].trim() };
}

// Inline markdown → HTML: `code`, [text](url), **bold**, _italic_, *italic*.
function inlineMd(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?:^|(?<=\s|\W))_([^_\n]+)_(?=\s|\W|$)/g, '<em>$1</em>')
    .replace(/(?:^|(?<=\s|\W))\*([^*\n]+)\*(?=\s|\W|$)/g, '<em>$1</em>');
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

    // Standalone image
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch && resolveImage) {
      const media = resolveImage(imgMatch[2], imgMatch[1]);
      if (media) {
        blocks.push(image({ id: media.id, url: media.url, alt: imgMatch[1] }));
      } else {
        blocks.push(p(`<em>[Image: ${imgMatch[2]}]</em>`));
      }
      i++; continue;
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
      !lines[i].match(/^!\[/) && !lines[i].match(/^<iframe/) &&
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

function buildPressHub() {
  const hero = heroPurple({
    backLabel: 'Home', backHref: '/', eyebrow: 'Section',
    title: 'Press',
    subtitle: 'A century of writing on the Boswells — vintage newspaper pieces, modern press releases, interviews, and video features.',
  });

  const heroQuote = proseSection([
    quote(
      'The way they work out an &ldquo;arrangement&rdquo; is fascinating. One of them plays from an ordinary piano song company, singing the melody. The other two chip in with uncanny instinct on the right harmony and distribution.',
      'The Melody Maker',
    ),
  ]);

  const intro = proseSection([
    p('In our many cruises across the ether waves Bozzies.com has discovered many stories and links of interest to those on the journey to the Land of Boz. What follows is a curated archive: contemporary press about the Boswells from the 1930s onward, along with modern press releases, interviews, and the odd essay about the site itself.', { className: 'bozzies-para-body', fontSize: 'lead' }),
  ]);

  // Category listing — 5 cards linking to the WP category archives.
  const hubs = [
    { slug: 'vintage', kicker: 'From the 1930s', label: 'Vintage Articles', blurb: 'Newspaper and magazine pieces published while the trio was in full swing.' },
    { slug: 'in-their-own-words', kicker: 'Interviews', label: 'In Their Own Words', blurb: 'Firsthand accounts and interview transcripts.' },
    { slug: 'video', kicker: 'On Screen', label: 'Video Features', blurb: 'Documentaries and video essays about the Boswell sound.' },
    { slug: 'feature', kicker: 'Modern Writing', label: 'Features', blurb: 'Contemporary essays and long-form pieces on the trio and Connee.' },
    { slug: 'essay', kicker: 'Bozzies.org', label: 'About the Site', blurb: 'What Getting Bozzed means, and why the site exists.' },
  ];

  const cardHTML = ({ kicker, label, blurb, slug }) => `<!-- wp:group {"className":"is-style-card","layout":{"type":"default"}} -->
<div class="wp-block-group is-style-card">
${p(kicker, { className: 'is-style-eyebrow' })}
${h(3, `<a href="/press/${slug}/">${label}</a>`)}
${p(blurb)}
</div>
<!-- /wp:group -->`;

  const hubsSection = section(
    { backgroundStyle: 'paper', headingWidth: 'reading', align: 'full' },
    `<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column --><div class="wp-block-column">${cardHTML(hubs[0])}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">${cardHTML(hubs[1])}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">${cardHTML(hubs[2])}</div><!-- /wp:column -->
</div>
<!-- /wp:columns -->
<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column --><div class="wp-block-column">${cardHTML(hubs[3])}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column">${cardHTML(hubs[4])}</div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column"></div><!-- /wp:column -->
</div>
<!-- /wp:columns -->`,
  );

  const releasesSection = section(
    { backgroundStyle: 'gold', headingWidth: 'reading', align: 'full' },
    [
      p('The Press Room', { className: 'is-style-eyebrow' }),
      h(2, 'Press releases &amp; media', { fontSize: 'section-title-medium' }),
      p('Original press releases, event announcements, and archival documents. Each opens as a PDF.'),
      p('<a href="/press-releases/">Browse the press-release archive</a>'),
    ].join('\n'),
  );

  return [hero, heroQuote, intro, hubsSection, releasesSection].join('\n\n');
}

function buildArticleContent(data, bodyBlocks) {
  // The single.html template already renders a purple hero (category + title
  // + date + author). Our content adds: publication meta (when frontmatter has
  // one), pull quote, hero image, video embed, body, external-link CTA.
  const metaTop = [];
  if (data.publication) metaTop.push(data.publication);
  if (data.publicationDate) metaTop.push(data.publicationDate);
  const metaLine = metaTop.length
    ? p(`<em>${metaTop.join(' · ')}</em>`, { className: 'is-style-eyebrow' })
    : '';

  const pullQuoteBlock = data.pullQuote ? section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', spacing: 'compact', align: 'full' },
    quote(data.pullQuote, data.pullQuoteAttribution ? `— ${data.pullQuoteAttribution}` : ''),
  ) : '';

  const heroImage = data.heroImageMedia ? section(
    { backgroundStyle: 'paper', width: 'container', headingWidth: 'container', align: 'full' },
    image({ id: data.heroImageMedia.id, url: data.heroImageMedia.url, alt: data.heroImageAlt || data.title, size: 'large' }),
  ) : '';

  const videoEmbed = data.videoEmbed ? section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    `<!-- wp:embed {"url":"${data.videoEmbed}","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} --><figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">${data.videoEmbed}</div></figure><!-- /wp:embed -->`,
  ) : '';

  const bodyWithMeta = [metaLine, ...bodyBlocks].filter(Boolean);
  const body = section(
    { backgroundStyle: 'paper', width: 'narrow', headingWidth: 'container', align: 'full' },
    bodyWithMeta.join('\n'),
  );

  const externalLink = data.externalLink ? section(
    { backgroundStyle: 'gold', width: 'narrow', headingWidth: 'reading', align: 'full' },
    buttons(button(data.externalLink, 'Read the full article'), 'center'),
  ) : '';

  return [pullQuoteBlock, heroImage, videoEmbed, body, externalLink].filter(Boolean).join('\n\n');
}

function buildPressRelease(data, bodyBlocks) {
  const hero = heroPurple({
    backLabel: 'Press', backHref: '/press/', eyebrow: 'Press Release',
    title: data.title,
    meta: data.releaseDate || null,
  });

  const summarySec = data.summary ? proseSection([p(data.summary, { fontSize: 'lead' })]) : '';

  const documentSec = data.document ? section(
    { backgroundStyle: 'gold', width: 'narrow', headingWidth: 'reading', align: 'full' },
    [
      p('Document', { className: 'is-style-eyebrow', align: 'center' }),
      buttons(button(data.document, `Open ${data.documentType?.toUpperCase() || 'file'}`), 'center'),
    ].join('\n'),
  ) : '';

  const body = bodyBlocks.length ? proseSection(bodyBlocks) : '';

  return [hero, summarySec, body, documentSec].filter(Boolean).join('\n\n');
}

function updateCategoryDescriptions() {
  const hubs = [
    { slug: 'vintage', desc: 'Newspaper and magazine pieces published while the trio was in full swing.' },
    { slug: 'in-their-own-words', desc: 'Firsthand accounts and interview transcripts.' },
    { slug: 'video', desc: 'Documentaries and video essays about the Boswell sound.' },
    { slug: 'feature', desc: 'Contemporary essays and long-form pieces on the trio and Connee.' },
    { slug: 'essay', desc: 'What Getting Bozzed means, and why the site exists.' },
  ];
  const nameMap = {
    vintage: 'Vintage Articles',
    'in-their-own-words': 'In Their Own Words',
    video: 'Video Features',
    feature: 'Features',
    essay: 'About the Site',
  };
  for (const hub of hubs) {
    const id = wp(['term', 'list', 'category', `--slug=${hub.slug}`, '--fields=term_id', '--format=ids'], { allowFail: true }).trim();
    if (id) {
      wp(['term', 'update', 'category', id, `--name=${nameMap[hub.slug]}`, `--description=${hub.desc}`]);
    }
  }
}

function run() {
  console.log('Group 3: Press');

  // 1. Update category descriptions
  console.log('  updating category descriptions...');
  updateCategoryDescriptions();

  // 2. Press hub page
  console.log('  press hub page...');
  const pressHubRes = upsertPage({
    slug: 'press', title: 'Press', template: 'page-landing',
    content: buildPressHub(),
  });
  console.log(`  ${pressHubRes.created ? '+' : '~'} press (id=${pressHubRes.id})`);

  // 3. Articles → posts
  const articleFiles = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md')).sort();
  console.log(`  ${articleFiles.length} articles...`);
  const mediaResolver = (path, alt) => {
    // Skip external URLs
    if (path.startsWith('http')) return null;
    try {
      return importMedia(path, alt);
    } catch (e) {
      console.error(`    ! failed to import ${path}: ${e.message}`);
      return null;
    }
  };
  for (const filename of articleFiles) {
    const { data, body } = parseFrontmatter(`${ARTICLES_DIR}/${filename}`);
    if (!data.subhub) { console.log(`    ! ${filename} — no subhub, skipping`); continue; }
    const slug = slugFromFile(filename, data.subhub);
    if (data.heroImage) {
      try {
        data.heroImageMedia = importMedia(data.heroImage, data.heroImageAlt || data.title);
      } catch (e) { console.error(`    ! hero image failed: ${e.message}`); }
    }
    const bodyBlocks = mdToBlocks(body, mediaResolver);
    const content = buildArticleContent(data, bodyBlocks);
    const res = upsertPost({
      slug, title: data.title, content,
      postType: 'post', categorySlug: data.subhub,
    });
    console.log(`  ${res.created ? '+' : '~'} [${data.subhub}] ${slug} (id=${res.id})`);
  }

  // 4a. Press-releases index page (linked from press hub)
  const releaseListItems = readdirSync(RELEASES_DIR).filter(f => f.endsWith('.md')).sort().map(f => {
    const base = f.replace(/\.md$/, '').replace(/^press-release-/, '');
    const slug = `press-release-${base}`;
    const { data } = parseFrontmatter(`${RELEASES_DIR}/${f}`);
    return `<!-- wp:list-item --><li><a href="/${slug}/">${data.title}</a>${data.releaseDate ? ` — <em>${data.releaseDate}</em>` : ''}</li><!-- /wp:list-item -->`;
  }).join('\n');
  const releasesIndexContent = [
    heroPurple({ backLabel: 'Press', backHref: '/press/', eyebrow: 'The Press Room', title: 'Press releases &amp; media', subtitle: 'Original press releases, event announcements, and archival documents.' }),
    proseSection([`<!-- wp:list -->\n<ul class="wp-block-list">\n${releaseListItems}\n</ul>\n<!-- /wp:list -->`]),
  ].join('\n\n');
  const relIdx = upsertPage({ slug: 'press-releases', title: 'Press releases & media', template: 'page-landing', content: releasesIndexContent });
  console.log(`  ${relIdx.created ? '+' : '~'} press-releases index (id=${relIdx.id})`);

  // 4b. Press releases → pages under /press-releases/ or standalone
  const releaseFiles = readdirSync(RELEASES_DIR).filter(f => f.endsWith('.md')).sort();
  console.log(`  ${releaseFiles.length} press releases...`);
  for (const filename of releaseFiles) {
    const { data, body } = parseFrontmatter(`${RELEASES_DIR}/${filename}`);
    const baseSlug = filename.replace(/\.md$/, '').replace(/^press-release-/, '');
    const slug = `press-release-${baseSlug}`;
    const bodyBlocks = mdToBlocks(body, mediaResolver);
    const content = buildPressRelease(data, bodyBlocks);
    const res = upsertPage({
      slug, title: data.title, template: 'page-landing',
      content,
    });
    console.log(`  ${res.created ? '+' : '~'} press-release: ${slug} (id=${res.id})`);
  }
}

run();
