/**
 * Builds the gallery shell. SVG pages stay as standalone files and every
 * HTML surface references them through lazy images. Keeping each SVG in its
 * own document also isolates gradient and clip-path ids without rewriting.
 *
 * The shell is a specimen catalogue, not a dashboard. Three rules follow
 * from that, and every layout decision here is one of them:
 *
 * 1. The slide is the content and everything else is apparatus. Chrome gets
 *    hairlines, mono captions and the smallest type that still reads. No
 *    surface competes with a slide for attention.
 * 2. Scanning beats clicking. A reviewer's judgement of 24 themes is made in
 *    the vertical scroll, so thumbnails are sized to show composition, the
 *    strips align to one grid, and the verdict controls stay dim until the
 *    pointer is on the card that owns them.
 * 3. Nothing is loaded from anywhere. Fonts are whatever the machine has,
 *    marks are drawn in CSS, and the slides are lazy `<img>` references to
 *    files sitting next to the page.
 */

import { verdictFreshness, type Manifest, type ManifestPage } from "./render"
import type { GalleryThemeCatalogEntry } from "./catalog"

function inlineRule(fn: (...args: never[]) => unknown): string {
  return fn.toString().replace(/__name\([^)]*\);?/g, "")
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

function safe(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function ordinal(index: number): string {
  return String(index + 1).padStart(2, "0")
}

function pageImage(page: ManifestPage, alt: string): string {
  if (!page.file) {
    return `<span class="missing" role="img" aria-label="${esc(alt)} 未能渲染">${esc(page.skipped ?? "未能渲染")}</span>`
  }
  return `<img loading="lazy" src="${esc(page.file)}" width="${page.width}" height="${page.height}" alt="${esc(alt)}">`
}

function badge(text: string, tone = "neutral"): string {
  return `<span class="badge badge-${tone}">${esc(text)}</span>`
}

function themeBadges(theme: GalleryThemeCatalogEntry, detailed = false): string {
  const out: string[] = []
  if (theme.source === "builtin") {
    if (theme.identity) out.push(badge(`identity ${theme.identity}`, `identity-${theme.identity}`))
    out.push(...theme.occasions.map((occasion) => badge(occasion)))
  } else {
    out.push(badge(theme.source, "source"))
    if (theme.base) out.push(badge(`base ${theme.base}`))
    if (theme.identity) out.push(badge(`identity ${theme.identity}`, `identity-${theme.identity}`))
  }
  if (detailed) {
    if (theme.pinOnlyFaces.length > 0) out.push(badge(`pin-only ${theme.pinOnlyFaces.length}`))
    out.push(theme.motif ? badge(`motif ${theme.motif}`, "motif") : badge("no motif", "quiet"))
  } else if (theme.source !== "builtin" && theme.pinOnlyFaces.length > 0) {
    out.push(badge(`pin-only ${theme.pinOnlyFaces.length}`))
  }
  return `<span class="badges">${out.join("")}</span>`
}

const NAV: readonly (readonly [string, string])[] = [
  ["index.html", "总览"],
  ["themes.html", "主题详情"],
  ["skeleton.html", "骨架表"],
  ["layouts.html", "版式表"],
  ["components.html", "组件表"],
]

function documentPage(options: {
  file: string
  title: string
  description: string
  version: string
  slide: { width: number; height: number }
  body: string
  script?: string
}): string {
  const nav = NAV.map(
    ([href, label]) =>
      `<a href="${href}"${href === options.file ? ' aria-current="page"' : ""}>${esc(label)}</a>`,
  ).join("")
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(options.description)}">
<link rel="icon" href="data:,">
<title>${esc(options.title)}</title>
<style>${BASE_CSS}
:root { --ar: ${options.slide.width} / ${options.slide.height}; }
</style>
</head>
<body>
<header class="topbar">
  <a class="mark" href="index.html" aria-label="回到全主题总览"><b>pptwise</b><i>视觉审查</i><em>${esc(options.version)}</em></a>
  <nav class="topnav" aria-label="审查材料">${nav}</nav>
  <div class="surround" role="group" aria-label="底色">
    <button type="button" data-surround-set="light" aria-pressed="true">浅</button>
    <button type="button" data-surround-set="dark" aria-pressed="false">深</button>
  </div>
</header>
${options.body}
${SHELL_SCRIPT}
${options.script ?? ""}
</body>
</html>
`
}

function tableCount(manifest: Manifest, id: string): number {
  return manifest.tables.find((table) => table.id === id)?.pages.length ?? 0
}

const SLIDE_TYPES = ["cover", "chapter", "content", "ending"] as const

function representativePage(
  manifest: Manifest,
  theme: GalleryThemeCatalogEntry,
  slideType: (typeof SLIDE_TYPES)[number],
): ManifestPage | undefined {
  const layoutId = theme.faces[slideType][0]
  const table = theme.source === "builtin" ? "skeleton" : "custom"
  return manifest.pages.find(
    (page) =>
      page.table === table && page.theme === theme.id && page.slideType === slideType && page.subject === layoutId,
  )
}

function overviewBand(theme: GalleryThemeCatalogEntry, manifest: Manifest, index: number): string {
  const href = `themes.html#theme-${safe(theme.id)}`
  const thumbs = SLIDE_TYPES.map((slideType) => {
    const page = representativePage(manifest, theme, slideType)
    const layoutId = theme.faces[slideType][0] ?? "未配置"
    const shot = page
      ? pageImage(page, `${theme.label} ${slideType} ${layoutId}`)
      : `<span class="missing">本次未生成</span>`
    return `<a class="plate" href="${href}">
  <span class="stage">${shot}</span>
  <span class="plate-cap"><i>${slideType}</i><code>${esc(layoutId)}</code></span>
</a>`
  }).join("")

  return `<article class="band" id="overview-${safe(theme.id)}" data-theme-source="${theme.source}">
  <header class="band-head">
    <span class="band-no">${ordinal(index)}</span>
    <h3><a href="${href}">${esc(theme.label)}</a></h3>
    <code class="band-id">${esc(theme.id)}</code>
    ${themeBadges(theme)}
    <a class="band-more" href="${href}">详情</a>
  </header>
  <div class="strip">${thumbs}</div>
</article>`
}

function buildIndex(manifest: Manifest, catalog: readonly GalleryThemeCatalogEntry[]): string {
  const builtin = catalog.filter((theme) => theme.source === "builtin")
  const samples = catalog.filter((theme) => theme.source !== "builtin")
  const generatedAt = manifest.generatedAt.slice(0, 16).replace("T", " ")
  const jump = catalog
    .map((theme) => `<a href="#overview-${safe(theme.id)}">${esc(theme.id)}</a>`)
    .join("")

  const routes = [
    ["themes.html", "主题详情", tableCount(manifest, "theme") + tableCount(manifest, "custom"), "每套主题的十页整套"],
    ["skeleton.html", "骨架表", tableCount(manifest, "skeleton"), "四页型锁定面与 sparse"],
    ["layouts.html", "版式表", tableCount(manifest, "layout"), "注册版式的真实样张"],
    ["components.html", "组件表", tableCount(manifest, "component"), "组件与图表变体"],
  ] as const

  const body = `<main class="sheet">
  <div class="masthead">
    <h1>全主题缩略总览</h1>
    <p class="deck">每套主题四张锁定面，先扫骨架和配色，再点进详情看整套十页。${builtin.length} 套内置主题与 ${samples.length} 套自定义样张走同一条渲染链。</p>
    <p class="colophon"><span>pptwise ${esc(manifest.pptwiseVersion)}</span><span>${manifest.pages.length} 张</span><span>生成于 ${esc(generatedAt)}</span></p>
  </div>

  <nav class="routes" aria-label="次级材料">
    ${routes
      .map(
        ([href, label, count, note]) =>
          `<a href="${href}"><b>${esc(label)}</b><em>${count}</em><i>${esc(note)}</i></a>`,
      )
      .join("")}
  </nav>

  <nav class="jump" aria-label="跳到主题">${jump}</nav>

  <section class="chapter" aria-labelledby="builtin-heading">
    <h2 id="builtin-heading">内置主题<em>${builtin.length}</em></h2>
    <div class="bands">${builtin.map((theme, index) => overviewBand(theme, manifest, index)).join("")}</div>
  </section>

  <section class="chapter chapter-custom" aria-labelledby="custom-heading">
    <h2 id="custom-heading">自定义主题对照<em>${samples.length}</em><small>partial 只换色板，complete 换骨架与 motif</small></h2>
    <div class="bands">${samples.map((theme, index) => overviewBand(theme, manifest, index)).join("")}</div>
  </section>
</main>`

  return documentPage({
    file: "index.html",
    title: "pptwise 全主题缩略总览",
    description: "24 套内置主题与 2 套自定义样张的人工视觉审查入口",
    version: manifest.pptwiseVersion,
    slide: manifest.slide,
    body,
  })
}

function findingMarkup(page: ManifestPage): string {
  if (!page.findings?.length) return ""
  const counts = new Map<string, number>()
  for (const finding of page.findings) counts.set(finding.code, (counts.get(finding.code) ?? 0) + 1)
  const chips = [...counts]
    .map(([code, count]) => {
      const label = FINDING_LABELS[code] ?? code
      const severe = SEVERE_FINDINGS.has(code)
      return `<span class="flag${severe ? " flag-severe" : ""}" title="${esc(code)}">${esc(label)}${count > 1 ? `×${count}` : ""}</span>`
    })
    .join("")
  return `<span class="flags">${chips}</span>`
}

const FINDING_LABELS: Record<string, string> = {
  overflow: "溢出",
  "out-of-bounds": "出血",
  "low-contrast": "对比度",
  overlap: "重叠",
  "content-truncated": "截断",
  "content-dropped": "丢内容",
}

const SEVERE_FINDINGS = new Set(["content-dropped", "out-of-bounds", "overflow"])

/** What a card writes under its slide, per table — never the group's own label twice. */
function caption(page: ManifestPage): { lead: string; sub: string } {
  if (page.table === "theme" || page.table === "custom") {
    const position = `p${String(page.page).padStart(2, "0")} · ${page.slideType}`
    return { lead: page.languageLabel === "中文" ? position : `${position} · ${page.languageLabel}`, sub: page.heading }
  }
  if (page.table === "skeleton") return { lead: page.subject, sub: page.slideType }
  // The subject already labels the row, so the card spends its two lines on
  // what actually varies inside it.
  return { lead: page.languageLabel, sub: page.theme }
}

function reviewCard(page: ManifestPage): string {
  const { lead, sub } = caption(page)
  const alt = `${page.subject}，${[page.slideType, page.theme, page.languageLabel].filter(Boolean).join(" · ")}`
  return `<article class="review-card" data-page-id="${esc(page.id)}" data-search="${esc(
    `${page.subject} ${page.theme} ${page.heading} ${page.languageLabel}`.toLowerCase(),
  )}">
  <button class="shot" type="button" data-open-page="${esc(page.id)}" aria-label="放大 ${esc(page.subject)}">
    <span class="stage">${pageImage(page, alt)}</span>
  </button>
  <div class="card-cap">
    <span class="card-text"><b>${esc(lead)}</b><i>${esc(sub)}</i></span>
    ${findingMarkup(page)}
    <span class="verdicts" role="group" aria-label="${esc(page.subject)} 结论">
      <button type="button" data-verdict="pass" title="通过" aria-label="通过">通</button>
      <button type="button" data-verdict="limit" title="限制" aria-label="限制">限</button>
      <button type="button" data-verdict="rework" title="返工" aria-label="返工">返</button>
      <button type="button" data-note-toggle title="备注" aria-label="备注">·</button>
    </span>
  </div>
  <textarea class="note" rows="2" placeholder="备注，自动保存" aria-label="${esc(page.subject)} 备注"></textarea>
  <span class="freshness" aria-live="polite"></span>
</article>`
}

function toolbar(count: number): string {
  return `<div class="toolbar">
  <input id="page-filter" type="search" placeholder="搜索主题、版式或标题" aria-label="搜索当前页面">
  <div class="chips" id="verdict-filter" role="group" aria-label="按结论过滤">
    <button type="button" data-filter="all" aria-pressed="true">全部</button>
    <button type="button" data-filter="none">未评</button>
    <button type="button" data-filter="pass">通过</button>
    <button type="button" data-filter="limit">限制</button>
    <button type="button" data-filter="rework">返工</button>
  </div>
  <p class="tally">
    <span class="t-pass"><b id="n-pass">0</b></span>
    <span class="t-limit"><b id="n-limit">0</b></span>
    <span class="t-rework"><b id="n-rework">0</b></span>
    <span class="t-done"><b id="done-count">0</b>/${count}</span>
  </p>
  <button class="copy" id="export-verdicts" type="button">复制结论</button>
</div>`
}

function themeDetailGroups(
  manifest: Manifest,
  catalog: readonly GalleryThemeCatalogEntry[],
): { pages: ManifestPage[]; markup: string } {
  const pages: ManifestPage[] = []
  const markup = catalog
    .map((theme, index) => {
      const table = theme.source === "builtin" ? "theme" : "custom"
      const group = manifest.pages.filter((page) => page.table === table && page.theme === theme.id)
      pages.push(...group)
      return `<section class="group" id="theme-${safe(theme.id)}" data-review-group>
  ${groupHead(index, theme, `${group.length} 张`)}
  <div class="grid">${group.map((page) => reviewCard(page)).join("") || '<p class="empty">本次未生成这一组。</p>'}</div>
</section>`
    })
    .join("")
  return { pages, markup }
}

function groupHead(index: number, theme: GalleryThemeCatalogEntry, count: string): string {
  return `<header class="group-head">
    <span class="band-no">${ordinal(index)}</span>
    <h3>${esc(theme.label)}</h3>
    <code class="band-id">${esc(theme.id)}</code>
    ${themeBadges(theme, true)}
    <span class="group-count">${esc(count)}</span>
  </header>`
}

function skeletonGroups(
  manifest: Manifest,
  catalog: readonly GalleryThemeCatalogEntry[],
): { pages: ManifestPage[]; markup: string } {
  const builtin = catalog.filter((theme) => theme.source === "builtin")
  const pages = manifest.pages.filter((page) => page.table === "skeleton")
  const markup = builtin
    .map((theme, index) => {
      const row = pages.filter((page) => page.theme === theme.id)
      const sparseIds = new Set(theme.sparse)
      // Curated faces run in one grid rather than one strip per page type:
      // most themes pin a single cover, chapter and ending, and a labelled
      // row each would spend four screens on twelve slides.
      const family = (label: string, note: string, selected: ManifestPage[]) =>
        selected.length
          ? `<div class="family"><h4>${esc(label)}<em>${selected.length}</em><i>${esc(note)}</i></h4><div class="grid grid-tight">${selected
              .map((page) => reviewCard(page))
              .join("")}</div></div>`
          : ""
      return `<section class="group" id="skeleton-${safe(theme.id)}" data-review-group>
  ${groupHead(index, theme, `${row.length} 张`)}
  <div class="families">
    ${family("locked faces", "cover · chapter · content pool · ending", row.filter((page) => !sparseIds.has(page.subject)))}
    ${family("sparse offers", "只在有资格的主题上展开", row.filter((page) => sparseIds.has(page.subject)))}
  </div>
</section>`
    })
    .join("")
  return { pages, markup }
}

function flatTable(manifest: Manifest, table: "layout" | "component"): { pages: ManifestPage[]; markup: string } {
  const pages = manifest.pages.filter((page) => page.table === table)
  const subjects = [...new Set(pages.map((page) => page.subject))].sort((a, b) => a.localeCompare(b))
  const markup = subjects
    .map((subject, index) => {
      const group = pages.filter((page) => page.subject === subject)
      return `<section class="group-flat" data-review-group>
  <header class="flat-head">
    <span class="band-no">${ordinal(index)}</span>
    <h3><code>${esc(subject)}</code></h3>
    <span class="group-count">${group.length} 张</span>
  </header>
  <div class="grid grid-tri">${group.map((page) => reviewCard(page)).join("")}</div>
</section>`
    })
    .join("")
  return { pages, markup }
}

function viewer(initialPage: ManifestPage): string {
  return `<dialog class="viewer" id="viewer">
  <div class="viewer-stage">${initialPage.file ? `<img id="viewer-image" loading="lazy" src="${esc(initialPage.file)}" alt="${esc(initialPage.subject)}">` : ""}</div>
  <div class="viewer-bar">
    <span class="viewer-text"><b id="viewer-subject"></b><i id="viewer-facts"></i></span>
    <span class="verdicts verdicts-big" id="viewer-verdicts" role="group" aria-label="大图结论">
      <button type="button" data-verdict="pass">通过<kbd>1</kbd></button>
      <button type="button" data-verdict="limit">限制<kbd>2</kbd></button>
      <button type="button" data-verdict="rework">返工<kbd>3</kbd></button>
    </span>
    <input id="viewer-note" class="viewer-note" placeholder="备注，自动保存" aria-label="大图备注">
    <span class="viewer-keys"><kbd>←</kbd><kbd>→</kbd>翻页<kbd>Esc</kbd>关闭</span>
    <button class="viewer-close" type="button" data-close-viewer aria-label="关闭大图">✕</button>
  </div>
</dialog>`
}

const SHELL_SCRIPT = `<script>
(() => {
  "use strict";
  const KEY = "pptwise-gallery-surround";
  const root = document.documentElement;
  try { if (localStorage.getItem(KEY) === "dark") root.dataset.surround = "dark"; } catch (_) {}
  const buttons = document.querySelectorAll("[data-surround-set]");
  const paint = () => {
    const current = root.dataset.surround || "light";
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.surroundSet === current));
  };
  for (const button of buttons) {
    button.addEventListener("click", () => {
      root.dataset.surround = button.dataset.surroundSet;
      try { localStorage.setItem(KEY, button.dataset.surroundSet); } catch (_) {}
      paint();
    });
  }
  paint();
})();
</script>`

function reviewScript(pages: readonly ManifestPage[]): string {
  return `<script id="manifest-data" type="application/json">${jsonScript({ pages })}</script>
<script>
(() => {
  "use strict";
  const PAGES = JSON.parse(document.getElementById("manifest-data").textContent).pages;
  const PAGE_BY_ID = new Map(PAGES.map((page) => [page.id, page]));
  const STORE_KEY = "pptwise-gallery-verdicts-v1";
${inlineRule(verdictFreshness)}
  let verdicts = {};
  let archive = {};
  try { verdicts = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (_) {}
  try { archive = JSON.parse(localStorage.getItem(STORE_KEY + ":archive") || "{}"); } catch (_) {}

  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(verdicts)); } catch (_) {}
  };
  const saveArchive = () => {
    try { localStorage.setItem(STORE_KEY + ":archive", JSON.stringify(archive)); } catch (_) {}
  };
  const stamp = (id, entry) => {
    const page = PAGE_BY_ID.get(id);
    if (!page) return;
    entry.hash = page.hash;
    entry.geo = page.fingerprint && page.fingerprint.geometry;
    entry.col = page.fingerprint && page.fingerprint.color;
  };

  for (const page of PAGES) {
    const entry = verdicts[page.id];
    if (verdictFreshness(entry, page) !== "stale") continue;
    archive[page.id] = Object.assign({}, entry, { archivedAt: new Date().toISOString() });
    delete verdicts[page.id];
  }
  save();
  saveArchive();

  const cards = new Map();
  for (const card of document.querySelectorAll("[data-page-id]")) cards.set(card.dataset.pageId, card);

  function setVerdict(id, value) {
    const entry = verdicts[id] || (verdicts[id] = {});
    entry.verdict = entry.verdict === value ? undefined : value;
    stamp(id, entry);
    if (!entry.verdict && !entry.note) delete verdicts[id];
    save();
    refresh(id);
  }

  function setNote(id, value) {
    const entry = verdicts[id] || (verdicts[id] = {});
    entry.note = value || undefined;
    stamp(id, entry);
    if (!entry.verdict && !entry.note) delete verdicts[id];
    save();
    refresh(id);
  }

  function refresh(id) {
    const card = cards.get(id);
    if (!card) return;
    const entry = verdicts[id] || {};
    card.dataset.verdict = entry.verdict || "";
    for (const button of card.querySelectorAll(".card-cap [data-verdict]")) {
      button.setAttribute("aria-pressed", String(button.dataset.verdict === entry.verdict));
    }
    const note = card.querySelector(".note");
    if (note && note.value !== (entry.note || "")) note.value = entry.note || "";
    if (entry.note) card.dataset.note = "on";
    const slot = card.querySelector(".freshness");
    if (slot) {
      const state = verdictFreshness(entry, PAGE_BY_ID.get(id));
      slot.textContent = archive[id] ? "旧结论已归档" : state === "recolored" ? "自评起只换过配色" : "";
    }
    tally();
  }

  function tally() {
    const counts = { pass: 0, limit: 0, rework: 0 };
    for (const page of PAGES) {
      const verdict = verdicts[page.id] && verdicts[page.id].verdict;
      if (verdict) counts[verdict] += 1;
    }
    const write = (elementId, value) => {
      const target = document.getElementById(elementId);
      if (target) target.textContent = String(value);
    };
    write("n-pass", counts.pass);
    write("n-limit", counts.limit);
    write("n-rework", counts.rework);
    write("done-count", counts.pass + counts.limit + counts.rework);
  }

  for (const [id, card] of cards) {
    for (const button of card.querySelectorAll(".card-cap [data-verdict]")) {
      button.addEventListener("click", () => setVerdict(id, button.dataset.verdict));
    }
    const toggle = card.querySelector("[data-note-toggle]");
    const note = card.querySelector(".note");
    if (toggle && note) {
      toggle.addEventListener("click", () => {
        card.dataset.note = card.dataset.note === "on" ? "" : "on";
        if (card.dataset.note === "on") note.focus();
      });
    }
    if (note) note.addEventListener("input", (event) => setNote(id, event.target.value));
    refresh(id);
  }

  // Filtering is applied on demand only. Re-running it after every verdict
  // would make each judged card vanish under the pointer mid-pass.
  const search = document.getElementById("page-filter");
  let mode = "all";

  function applyFilter() {
    const query = search ? search.value.trim().toLowerCase() : "";
    for (const [id, card] of cards) {
      const verdict = (verdicts[id] || {}).verdict || "";
      const byText = !query || card.dataset.search.includes(query);
      const byMode = mode === "all" || (mode === "none" ? !verdict : verdict === mode);
      card.hidden = !(byText && byMode);
    }
    for (const group of document.querySelectorAll("[data-review-group]")) {
      group.hidden = !group.querySelector("[data-page-id]:not([hidden])");
    }
    for (const family of document.querySelectorAll(".family")) {
      family.hidden = !family.querySelector("[data-page-id]:not([hidden])");
    }
  }

  if (search) search.addEventListener("input", applyFilter);
  for (const button of document.querySelectorAll("#verdict-filter [data-filter]")) {
    button.addEventListener("click", () => {
      mode = button.dataset.filter;
      for (const other of document.querySelectorAll("#verdict-filter [data-filter]")) {
        other.setAttribute("aria-pressed", String(other === button));
      }
      applyFilter();
    });
  }

  const dialog = document.getElementById("viewer");
  const image = document.getElementById("viewer-image");
  const viewerNote = document.getElementById("viewer-note");
  let activeId = "";

  const visibleIds = () => [...cards].filter(([, card]) => !card.hidden).map(([id]) => id);

  function paintViewer(id) {
    const page = PAGE_BY_ID.get(id);
    if (!page || !page.file) return;
    activeId = id;
    image.src = page.file;
    image.alt = page.subject;
    document.getElementById("viewer-subject").textContent = page.subject;
    document.getElementById("viewer-facts").textContent = [page.slideType, page.theme, page.languageLabel].join(" · ");
    viewerNote.value = (verdicts[id] || {}).note || "";
    const current = (verdicts[id] || {}).verdict;
    for (const button of document.querySelectorAll("#viewer-verdicts [data-verdict]")) {
      button.setAttribute("aria-pressed", String(button.dataset.verdict === current));
    }
  }

  function step(delta) {
    const ids = visibleIds();
    const at = ids.indexOf(activeId);
    if (at === -1) return;
    const next = ids[(at + delta + ids.length) % ids.length];
    paintViewer(next);
    const card = cards.get(next);
    if (card) card.scrollIntoView({ block: "center" });
  }

  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-page]");
    if (open && dialog) {
      paintViewer(open.dataset.openPage);
      dialog.showModal();
    }
    if (event.target.closest("[data-close-viewer]")) dialog.close();
  });
  for (const button of document.querySelectorAll("#viewer-verdicts [data-verdict]")) {
    button.addEventListener("click", () => {
      if (!activeId) return;
      setVerdict(activeId, button.dataset.verdict);
      paintViewer(activeId);
    });
  }
  if (viewerNote) viewerNote.addEventListener("input", () => activeId && setNote(activeId, viewerNote.value));
  if (dialog) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (!dialog || !dialog.open || !activeId) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    if (["1", "2", "3"].includes(event.key)) {
      setVerdict(activeId, ["pass", "limit", "rework"][Number(event.key) - 1]);
      paintViewer(activeId);
    }
  });

  const exportButton = document.getElementById("export-verdicts");
  if (exportButton) {
    exportButton.addEventListener("click", async () => {
      const payload = {
        schema: "pptwise-gallery-verdicts/3",
        total: PAGES.length,
        verdicts: PAGES.filter((page) => verdicts[page.id] && (verdicts[page.id].verdict || verdicts[page.id].note)).map((page) => ({
          id: page.id,
          table: page.table,
          subject: page.subject,
          theme: page.theme,
          verdict: verdicts[page.id].verdict || null,
          note: (verdicts[page.id].note || "").trim() || null,
        })),
      };
      const text = JSON.stringify(payload, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        exportButton.textContent = "已复制 " + payload.verdicts.length + " 条";
      } catch (_) {
        console.log(text);
        exportButton.textContent = "已输出到控制台";
      }
      setTimeout(() => { exportButton.textContent = "复制结论"; }, 1600);
    });
  }
  tally();
})();
</script>`
}

function buildReviewDocument(
  manifest: Manifest,
  file: string,
  title: string,
  intro: string,
  content: { pages: ManifestPage[]; markup: string },
): string {
  const body = `<main class="sheet sheet-review">
  <div class="masthead masthead-review">
    <h1>${esc(title)}<em>${content.pages.length}</em></h1>
    <p class="deck">${esc(intro)}</p>
  </div>
  ${toolbar(content.pages.length)}
  <div class="review-body">${content.markup || '<p class="empty">本次未生成这一张表。</p>'}</div>
</main>
${content.pages[0] ? viewer(content.pages[0]) : ""}`
  return documentPage({
    file,
    title: `pptwise ${title}`,
    description: intro,
    version: manifest.pptwiseVersion,
    slide: manifest.slide,
    body,
    script: content.pages.length > 0 ? reviewScript(content.pages) : "",
  })
}

export function buildGalleryPages(
  manifest: Manifest,
  catalog: readonly GalleryThemeCatalogEntry[],
): ReadonlyMap<string, string> {
  const themes = themeDetailGroups(manifest, catalog)
  const skeleton = skeletonGroups(manifest, catalog)
  const layouts = flatTable(manifest, "layout")
  const components = flatTable(manifest, "component")

  return new Map([
    ["index.html", buildIndex(manifest, catalog)],
    [
      "themes.html",
      buildReviewDocument(
        manifest,
        "themes.html",
        "主题详情",
        "每套内置主题运行同一组十页内容，自定义主题各保留四页型对照样张。点图放大，1/2/3 记结论，←→ 翻页。",
        themes,
      ),
    ],
    [
      "skeleton.html",
      buildReviewDocument(
        manifest,
        "skeleton.html",
        "骨架表",
        "逐主题展开四页型全部锁定面、sparse offers 与 motif 状态，版式 id 写在每张图下。",
        skeleton,
      ),
    ],
    [
      "layouts.html",
      buildReviewDocument(manifest, "layouts.html", "版式表", "全部注册版式按语料和适用主题展开。", layouts),
    ],
    [
      "components.html",
      buildReviewDocument(
        manifest,
        "components.html",
        "组件表",
        "全部组件、图表变体和主题 form 的真实渲染样张。",
        components,
      ),
    ],
  ])
}

export function summarize(manifest: Manifest): string {
  const rendered = manifest.pages.filter((page) => page.file).length
  const skipped = manifest.pages.length - rendered
  const byTable = manifest.tables.map((table) => `${table.label} ${table.pages.length}`).join(" · ")
  return `${rendered} pages rendered${skipped > 0 ? `, ${skipped} skipped` : ""} (${byTable})`
}

const BASE_CSS = String.raw`
:root {
  --paper: #f6f5f1;
  --card: #fcfbf8;
  --stage: #eceae4;
  --ink: #17181a;
  --ink-2: #5c5d5a;
  --ink-3: #74756f;
  --line: #dfddd5;
  --line-2: #c7c4b9;
  --mark: #a8391c;
  --ring: rgba(23, 24, 26, 0.14);
  --pass: #2d6a46;
  --limit: #8a6413;
  --rework: #a8391c;
  --serif: "Iowan Old Style", Charter, "Palatino Linotype", Palatino, "Songti SC", "Source Han Serif SC", "Noto Serif CJK SC", serif;
  --sans: "Avenir Next", Avenir, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, "Cascadia Mono", "Liberation Mono", monospace;
  --gutter: clamp(18px, 2.4vw, 40px);
  color-scheme: light;
  font-synthesis: none;
}
[data-surround="dark"] {
  --paper: #16171a;
  --card: #1d1f22;
  --stage: #0f1012;
  --ink: #edece8;
  --ink-2: #a3a49f;
  --ink-3: #7f8079;
  --line: #2e3135;
  --line-2: #43464b;
  --mark: #e0774f;
  --ring: rgba(255, 255, 255, 0.16);
  --pass: #6bb187;
  --limit: #c9a44a;
  --rework: #e0774f;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 104px; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: inherit; text-decoration: none; }
button, input, textarea { font: inherit; color: inherit; }
h1, h2, h3, h4, p { margin: 0; }
code, kbd { font-family: var(--mono); }
[hidden] { display: none !important; }
:focus-visible { outline: 2px solid var(--mark); outline-offset: 2px; }
.viewer :focus-visible { outline-color: #e0774f; }
::selection { background: var(--mark); color: #fff; }

/* ── shell ─────────────────────────────────────────────────────────── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: stretch;
  gap: 24px;
  height: 46px;
  padding: 0 var(--gutter);
  background: color-mix(in srgb, var(--paper) 88%, transparent);
  backdrop-filter: saturate(1.4) blur(12px);
  border-bottom: 1px solid var(--line-2);
}
.mark { display: flex; align-items: baseline; gap: 8px; align-self: center; }
.mark b { font-family: var(--serif); font-size: 17px; font-weight: 600; letter-spacing: 0.01em; }
.mark i { font-style: normal; font-size: 12px; color: var(--ink-2); }
.mark em { font-family: var(--mono); font-style: normal; font-size: 10px; color: var(--ink-3); }
.topnav { display: flex; align-items: stretch; margin-left: auto; }
.topnav a {
  display: flex;
  align-items: center;
  padding: 0 13px;
  color: var(--ink-2);
  font-size: 12.5px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.topnav a:hover { color: var(--ink); }
.topnav a[aria-current="page"] { color: var(--ink); border-bottom-color: var(--mark); }
.surround { display: flex; align-self: center; border: 1px solid var(--line-2); border-radius: 3px; overflow: hidden; }
.surround button {
  padding: 3px 8px;
  font-size: 11px;
  color: var(--ink-3);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.surround button[aria-pressed="true"] { color: var(--paper); background: var(--ink); }

.sheet { width: 100%; max-width: 1840px; margin: 0 auto; padding: 0 var(--gutter) 120px; }

/* ── mastheads ─────────────────────────────────────────────────────── */
.masthead { padding: 46px 0 18px; border-bottom: 1px solid var(--ink); }
.masthead h1 {
  font-family: var(--serif);
  font-size: clamp(30px, 3.4vw, 42px);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: 0.01em;
}
.masthead h1 em {
  margin-left: 12px;
  font-family: var(--mono);
  font-style: normal;
  font-size: 13px;
  color: var(--mark);
  vertical-align: 0.6em;
}
.deck { max-width: 760px; margin-top: 12px; color: var(--ink-2); font-size: 14px; line-height: 1.65; }
.colophon { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 18px; font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); }
.colophon span + span { position: relative; }
.colophon span + span::before { content: ""; position: absolute; left: -10px; top: 4px; bottom: 4px; border-left: 1px solid var(--line-2); }
.masthead-review { padding: 34px 0 14px; }
.masthead-review h1 { font-size: clamp(24px, 2.4vw, 32px); }

/* ── index navigation ──────────────────────────────────────────────── */
.routes { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--line); }
.routes a {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 2px 10px;
  padding: 14px 16px 13px 0;
  border-right: 1px solid var(--line);
}
.routes a:last-child { border-right: 0; }
.routes a + a { padding-left: 16px; }
.routes a:hover b { color: var(--mark); }
.routes b { font-size: 14px; font-weight: 600; }
.routes em { font-family: var(--mono); font-style: normal; font-size: 12px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.routes i { grid-column: 1 / -1; font-style: normal; font-size: 11.5px; color: var(--ink-3); }
.jump { display: flex; flex-wrap: wrap; gap: 0 14px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.jump a { font-family: var(--mono); font-size: 10.5px; color: var(--ink-2); }
.jump a:hover { color: var(--mark); }

/* ── chapters and bands ────────────────────────────────────────────── */
.chapter { margin-top: 44px; }
.chapter h2 {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ink);
  font-family: var(--serif);
  font-size: 19px;
  font-weight: 500;
}
.chapter h2 em { font-family: var(--mono); font-style: normal; font-size: 11px; color: var(--mark); }
.chapter h2 small { margin-left: auto; font-size: 11.5px; color: var(--ink-3); font-family: var(--sans); }
.chapter-custom { margin-top: 64px; }
.band { padding: 18px 0 20px; border-bottom: 1px solid var(--line); }
.band-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; min-width: 0; }
.band-no { font-family: var(--mono); font-size: 10px; color: var(--mark); letter-spacing: 0.04em; }
.band-head h3 { font-family: var(--serif); font-size: 18px; font-weight: 600; letter-spacing: 0.01em; }
.band-head h3 a:hover { color: var(--mark); }
.band-id { font-size: 10.5px; color: var(--ink-3); }
.band-more { margin-left: auto; font-size: 11.5px; color: var(--ink-2); white-space: nowrap; }
.band-more::after { content: " →"; }
.band-more:hover { color: var(--mark); }
.badges { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.badge {
  padding: 1px 6px;
  border: 1px solid var(--line-2);
  border-radius: 2px;
  color: var(--ink-2);
  font-size: 10px;
  line-height: 1.5;
  white-space: nowrap;
}
.badge-identity-high { color: var(--mark); border-color: color-mix(in srgb, var(--mark) 40%, var(--line-2)); }
.badge-identity-medium { border-style: dashed; }
.badge-identity-low, .badge-quiet { color: var(--ink-3); border-style: dotted; }
.badge-source { color: var(--paper); background: var(--ink); border-color: var(--ink); }
.badge-motif { color: var(--ink); border-color: var(--ink-2); }

.strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.plate { display: block; min-width: 0; }
.stage {
  display: block;
  position: relative;
  overflow: hidden;
  aspect-ratio: var(--ar);
  background: var(--stage);
  box-shadow: inset 0 0 0 1px var(--ring);
}
.stage img { display: block; width: 100%; height: 100%; object-fit: contain; }
.plate:hover .stage { box-shadow: inset 0 0 0 1px var(--mark), 0 2px 14px color-mix(in srgb, var(--ink) 14%, transparent); }
.plate-cap { display: flex; align-items: baseline; gap: 7px; margin-top: 6px; min-width: 0; }
.plate-cap i { font-style: normal; font-family: var(--mono); font-size: 9.5px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; }
.plate-cap code { overflow: hidden; font-size: 10.5px; color: var(--ink-2); text-overflow: ellipsis; white-space: nowrap; }
.plate:hover .plate-cap code { color: var(--ink); }
.missing {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 10px;
  color: var(--rework);
  text-align: center;
  font-size: 10.5px;
}

/* ── review toolbar ────────────────────────────────────────────────── */
.toolbar {
  position: sticky;
  top: 46px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line-2);
}
.toolbar input {
  width: min(300px, 40vw);
  padding: 5px 9px;
  background: var(--card);
  border: 1px solid var(--line-2);
  border-radius: 3px;
  font-size: 12px;
}
.toolbar input:focus-visible { outline-offset: -1px; }
.chips { display: flex; border: 1px solid var(--line-2); border-radius: 3px; overflow: hidden; }
.chips button {
  padding: 5px 10px;
  font-size: 11.5px;
  color: var(--ink-2);
  background: transparent;
  border: 0;
  border-right: 1px solid var(--line);
  cursor: pointer;
}
.chips button:last-child { border-right: 0; }
.chips button:hover { color: var(--ink); }
.chips button[aria-pressed="true"] { color: var(--paper); background: var(--ink); }
.tally { display: flex; align-items: center; gap: 14px; margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.tally span::before { content: ""; display: inline-block; width: 6px; height: 6px; margin-right: 5px; border-radius: 50%; }
.tally .t-pass::before { background: var(--pass); }
.tally .t-limit::before { background: var(--limit); }
.tally .t-rework::before { background: var(--rework); }
.tally .t-done::before { display: none; }
.tally b { color: var(--ink); font-weight: 600; }
.copy { padding: 5px 11px; color: var(--paper); background: var(--ink); border: 1px solid var(--ink); border-radius: 3px; font-size: 11.5px; cursor: pointer; }
.copy:hover { background: var(--mark); border-color: var(--mark); }

/* ── review groups ─────────────────────────────────────────────────── */
.review-body { padding-top: 4px; }
.group { padding: 26px 0 30px; border-bottom: 1px solid var(--line-2); }
.group-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.group-head h3 { font-family: var(--serif); font-size: 18px; font-weight: 600; }
.group-count { margin-left: auto; font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); }
/* A flat table is a specimen list: the subject is a label in the margin and
   its samples run along the row, so 150-odd subjects do not each spend a
   heading's worth of vertical space. */
.group-flat { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 0 20px; padding: 16px 0; border-bottom: 1px solid var(--line); }
.flat-head { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: baseline; gap: 2px 7px; align-content: start; }
.flat-head h3 { font-family: var(--mono); font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }
.flat-head .group-count { grid-column: 2; margin-left: 0; }
.families { display: grid; gap: 18px; }
.family h4 {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 7px;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.09em;
}
.family h4 em { font-style: normal; color: var(--ink-3); }
.family h4 i { font-style: normal; text-transform: none; letter-spacing: 0; color: var(--ink-3); opacity: 0.85; }
.family h4::after { content: ""; flex: 1; border-bottom: 1px solid var(--line); transform: translateY(-3px); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(272px, 1fr)); gap: 14px 12px; }
.grid-tight { grid-template-columns: repeat(auto-fill, minmax(236px, 1fr)); }
/* One column per language, always three: the row reads as one subject
   rendered in 中文 / English / 中英混排, so the columns split the width
   evenly instead of leaving trailing gaps at wide viewports. */
.grid-tri { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.empty { padding: 28px; color: var(--ink-3); border: 1px dashed var(--line-2); text-align: center; }

/* ── card ──────────────────────────────────────────────────────────── */
.review-card { position: relative; min-width: 0; }
.review-card[data-verdict]:not([data-verdict=""])::before {
  content: "";
  position: absolute;
  left: -6px;
  top: 0;
  bottom: 0;
  width: 2px;
}
.review-card[data-verdict="pass"]::before { background: var(--pass); }
.review-card[data-verdict="limit"]::before { background: var(--limit); }
.review-card[data-verdict="rework"]::before { background: var(--rework); }
.shot { display: block; width: 100%; padding: 0; background: none; border: 0; cursor: zoom-in; }
.shot:focus-visible .stage { box-shadow: inset 0 0 0 2px var(--mark); }
.shot:hover .stage { box-shadow: inset 0 0 0 1px var(--line-2), 0 2px 14px color-mix(in srgb, var(--ink) 14%, transparent); }
.card-cap { display: flex; align-items: baseline; gap: 8px; margin-top: 6px; min-width: 0; }
.card-text { min-width: 0; flex: 1; }
.card-text b {
  display: block;
  overflow: hidden;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-text i { display: block; overflow: hidden; font-style: normal; font-size: 10.5px; color: var(--ink-3); text-overflow: ellipsis; white-space: nowrap; }
.flags { display: flex; flex-wrap: wrap; gap: 3px; }
.flag { padding: 0 5px; border: 1px solid var(--line-2); border-radius: 2px; color: var(--ink-3); font-size: 9.5px; line-height: 15px; }
.flag-severe { color: var(--rework); border-color: color-mix(in srgb, var(--rework) 45%, transparent); }
/* Apparatus, not content: the three marks sit at a quarter strength until
   the pointer or the keyboard is on the card that owns them, or the card
   already carries a verdict worth seeing from across the grid. */
.verdicts { display: flex; gap: 2px; opacity: 0.25; transition: opacity 120ms ease; }
.review-card:hover .verdicts,
.review-card:focus-within .verdicts,
.review-card[data-verdict]:not([data-verdict=""]) .verdicts { opacity: 1; }
.verdicts button {
  width: 19px;
  height: 19px;
  padding: 0;
  color: var(--ink-3);
  background: transparent;
  border: 1px solid var(--line-2);
  border-radius: 2px;
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}
.verdicts button:hover { color: var(--ink); border-color: var(--ink-2); }
.verdicts [data-verdict="pass"][aria-pressed="true"] { color: #fff; background: var(--pass); border-color: var(--pass); }
.verdicts [data-verdict="limit"][aria-pressed="true"] { color: #fff; background: var(--limit); border-color: var(--limit); }
.verdicts [data-verdict="rework"][aria-pressed="true"] { color: #fff; background: var(--rework); border-color: var(--rework); }
.note { display: none; width: 100%; margin-top: 5px; padding: 6px 8px; resize: vertical; background: var(--card); border: 1px solid var(--line-2); border-radius: 3px; font-size: 11px; }
.review-card[data-note="on"] .note { display: block; }
.note:focus-visible { outline-offset: -1px; }
.freshness { display: block; font-size: 9.5px; color: var(--ink-3); }
.freshness:not(:empty) { margin-top: 3px; }

/* ── viewer ────────────────────────────────────────────────────────── */
.viewer {
  width: 100vw;
  max-width: none;
  height: 100vh;
  max-height: none;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  padding: 0;
  border: 0;
  background: #101112;
}
.viewer:not([open]) { display: none; }
.viewer::backdrop { background: #101112; }
.viewer-stage { display: grid; place-items: center; min-height: 0; padding: 26px; }
.viewer-stage img { display: block; max-width: 100%; max-height: 100%; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55); }
.viewer-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  background: #17181a;
  border-top: 1px solid #2b2d30;
  color: #e9e8e4;
}
.viewer-text b { font-family: var(--mono); font-size: 12px; }
.viewer-text i { display: block; font-style: normal; font-size: 10.5px; color: #8f908b; }
.verdicts-big { opacity: 1; }
.verdicts-big button { width: auto; height: 26px; padding: 0 11px; display: inline-flex; align-items: center; gap: 6px; color: #c9c8c3; border-color: #3a3c40; font-size: 12px; }
.verdicts-big kbd { color: #7c7d78; font-size: 9.5px; }
.viewer-note { flex: 1; min-width: 120px; padding: 5px 9px; color: #e9e8e4; background: #202225; border: 1px solid #34363a; border-radius: 3px; font-size: 12px; }
.viewer-keys { display: flex; align-items: center; gap: 5px; color: #75766f; font-size: 10.5px; }
.viewer-keys kbd { padding: 1px 4px; border: 1px solid #3a3c40; border-radius: 3px; font-size: 9.5px; }
.viewer-close { width: 28px; height: 26px; color: #c9c8c3; background: transparent; border: 1px solid #3a3c40; border-radius: 3px; cursor: pointer; }
.viewer-close:hover { color: #fff; border-color: #75766f; }

@media (max-width: 900px) {
  .group-flat { grid-template-columns: 1fr; gap: 8px; }
  .flat-head { grid-template-columns: auto auto minmax(0, 1fr); }
  .flat-head .group-count { grid-column: auto; margin-left: auto; }
}
@media (max-width: 1100px) {
  .routes { grid-template-columns: repeat(2, 1fr); }
  .routes a:nth-child(2) { border-right: 0; }
  .routes a:nth-child(-n + 2) { border-bottom: 1px solid var(--line); }
  .routes a:nth-child(3) { padding-left: 0; }
}
@media (max-width: 900px) {
  .grid-tri { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .topbar { height: auto; flex-wrap: wrap; gap: 8px 14px; padding: 8px var(--gutter); }
  .topnav { margin-left: 0; }
  .strip { grid-template-columns: repeat(2, 1fr); }
  .grid-tri { grid-template-columns: 1fr; }
  .toolbar { position: static; flex-wrap: wrap; }
  .tally { margin-left: 0; }
  .viewer-bar { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  * { transition: none !important; }
}
`
