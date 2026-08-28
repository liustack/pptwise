/**
 * Builds the gallery shell. SVG pages stay as standalone files and every
 * HTML surface references them through lazy images. Keeping each SVG in its
 * own document also isolates gradient and clip-path ids without rewriting.
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

function pageImage(page: ManifestPage, alt: string, className = "slide-image"): string {
  if (!page.file) {
    return `<div class="missing-slide" role="img" aria-label="${esc(alt)} 未能渲染">${esc(page.skipped ?? "未能渲染")}</div>`
  }
  return `<img class="${className}" loading="lazy" src="${esc(page.file)}" width="${page.width}" height="${page.height}" alt="${esc(alt)}">`
}

function badge(text: string, tone = "neutral"): string {
  return `<span class="badge badge-${tone}">${esc(text)}</span>`
}

function themeBadges(theme: GalleryThemeCatalogEntry, detailed = false): string {
  const out: string[] = []
  if (theme.source === "builtin") {
    if (theme.identity) out.push(badge(`identity ${theme.identity}`, theme.identity))
    out.push(...theme.occasions.map((occasion) => badge(occasion)))
  } else {
    out.push(badge(theme.source, theme.source === "complete" ? "high" : "medium"))
    if (theme.base) out.push(badge(`base ${theme.base}`))
    if (theme.identity) out.push(badge(`identity ${theme.identity}`, theme.identity))
    if (theme.pinOnlyFaces.length > 0) out.push(badge(`pin-only ${theme.pinOnlyFaces.length}`))
  }
  if (detailed) {
    if (theme.source === "builtin" && theme.pinOnlyFaces.length > 0) {
      out.push(badge(`pin-only ${theme.pinOnlyFaces.length}`))
    }
    out.push(badge(theme.motif ? `motif ${theme.motif}` : "motif none", theme.motif ? "motif" : "quiet"))
  }
  return out.join("")
}

function head(title: string, description: string, version: string): string {
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(description)}">
<link rel="icon" href="data:,">
<title>${esc(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<header class="site-header">
  <a class="wordmark" href="index.html" aria-label="回到全主题总览"><span>pptwise</span><small>${esc(version)}</small></a>
  <nav class="site-nav" aria-label="Gallery 导航">
    <a href="index.html">总览</a>
    <a href="themes.html">主题详情</a>
    <a href="skeleton.html">骨架表</a>
    <a href="layouts.html">版式表</a>
    <a href="components.html">组件表</a>
  </nav>
</header>`
}

function documentPage(title: string, description: string, version: string, body: string, script = ""): string {
  return `<!doctype html>
<html lang="zh-CN">
${head(title, description, version)}
${body}
${script}
</body>
</html>
`
}

function tableCount(manifest: Manifest, id: string): number {
  return manifest.tables.find((table) => table.id === id)?.pages.length ?? 0
}

function representativePage(
  manifest: Manifest,
  theme: GalleryThemeCatalogEntry,
  slideType: "cover" | "chapter" | "content" | "ending",
): ManifestPage | undefined {
  const layoutId = theme.faces[slideType][0]
  const table = theme.source === "builtin" ? "skeleton" : "custom"
  return manifest.pages.find(
    (page) =>
      page.table === table && page.theme === theme.id && page.slideType === slideType && page.subject === layoutId,
  )
}

function overviewTheme(theme: GalleryThemeCatalogEntry, manifest: Manifest): string {
  const types = ["cover", "chapter", "content", "ending"] as const
  const thumbs = types
    .map((slideType) => {
      const page = representativePage(manifest, theme, slideType)
      const layoutId = theme.faces[slideType][0] ?? "未配置"
      const content = page
        ? pageImage(page, `${theme.label} ${slideType} ${layoutId}`, "overview-image")
        : `<div class="missing-slide">本次未生成</div>`
      return `<a class="overview-thumb" href="themes.html#theme-${safe(theme.id)}">
  <span class="thumb-stage">${content}</span>
  <span class="thumb-caption"><b>${slideType}</b><code>${esc(layoutId)}</code></span>
</a>`
    })
    .join("")

  return `<article class="theme-overview" id="overview-${safe(theme.id)}" data-theme-source="${theme.source}">
  <div class="theme-overview-meta">
    <p class="theme-sequence">${esc(theme.id)}</p>
    <h2>${esc(theme.label)}</h2>
    <div class="badges">${themeBadges(theme)}</div>
    <a class="detail-link" href="themes.html#theme-${safe(theme.id)}">查看大图详情 <span aria-hidden="true">→</span></a>
  </div>
  <div class="overview-strip">${thumbs}</div>
</article>`
}

function buildIndex(manifest: Manifest, catalog: readonly GalleryThemeCatalogEntry[]): string {
  const builtin = catalog.filter((theme) => theme.source === "builtin")
  const samples = catalog.filter((theme) => theme.source !== "builtin")
  const generatedAt = manifest.generatedAt.slice(0, 16).replace("T", " ")

  const body = `<main class="overview-main">
  <section class="overview-hero">
    <div>
      <p class="eyebrow">THEME REVIEW INDEX</p>
      <h1>全主题缩略总览</h1>
      <p class="lede">先扫四页型骨架，再进入大图判断细节。24 套内置主题保持一套一个区块，页面从上到下连续浏览。</p>
    </div>
    <dl class="build-facts">
      <div><dt>内置主题</dt><dd>${builtin.length}</dd></div>
      <div><dt>自定义样例</dt><dd>${samples.length}</dd></div>
      <div><dt>生成时间</dt><dd>${esc(generatedAt)}</dd></div>
    </dl>
  </section>

  <nav class="review-routes" aria-label="审查材料">
    <a href="themes.html"><span>01</span><b>主题详情</b><small>${tableCount(manifest, "theme") + tableCount(manifest, "custom")} 张大图</small></a>
    <a href="skeleton.html"><span>02</span><b>骨架表</b><small>${tableCount(manifest, "skeleton")} 张锁定面</small></a>
    <a href="layouts.html"><span>03</span><b>版式表</b><small>${tableCount(manifest, "layout")} 张样张</small></a>
    <a href="components.html"><span>04</span><b>组件表</b><small>${tableCount(manifest, "component")} 张样张</small></a>
  </nav>

  <section class="overview-section" aria-labelledby="builtin-heading">
    <div class="section-heading"><p>BUILT IN</p><h2 id="builtin-heading">24 套内置主题</h2></div>
    <div class="theme-overview-list">${builtin.map((theme) => overviewTheme(theme, manifest)).join("")}</div>
  </section>

  <section class="overview-section custom-section" aria-labelledby="custom-heading">
    <div class="section-heading"><p>THEME FILE V1</p><h2 id="custom-heading">自定义主题对照样张</h2><span>partial 换色板，complete 换骨架与 motif</span></div>
    <div class="theme-overview-list">${samples.map((theme) => overviewTheme(theme, manifest)).join("")}</div>
  </section>
</main>`

  return documentPage("pptwise 全主题缩略总览", "24 套主题的人工视觉审查入口", manifest.pptwiseVersion, body)
}

function findingMarkup(page: ManifestPage): string {
  if (!page.findings?.length) return ""
  const counts = new Map<string, number>()
  for (const finding of page.findings) counts.set(finding.code, (counts.get(finding.code) ?? 0) + 1)
  return `<div class="machine-flags">${[...counts]
    .map(([code, count]) => badge(`${code}${count > 1 ? ` ×${count}` : ""}`, "finding"))
    .join("")}</div>`
}

function reviewCard(page: ManifestPage, caption?: string): string {
  const facts = [page.slideType, page.theme, page.languageLabel].filter(Boolean).join(" · ")
  const alt = `${page.subject}，${facts}`
  return `<article class="review-card" data-page-id="${esc(page.id)}" data-search="${esc(
    `${page.subject} ${page.theme} ${page.heading} ${page.languageLabel}`.toLowerCase(),
  )}">
  <button class="slide-button" type="button" data-open-page="${esc(page.id)}" aria-label="放大 ${esc(page.subject)}">
    <span class="card-stage">${pageImage(page, alt)}</span>
  </button>
  <div class="card-meta">
    <div><code>${esc(caption ?? page.subject)}</code><p>${esc(facts)}</p></div>
    ${findingMarkup(page)}
  </div>
  <div class="verdict-row" role="group" aria-label="${esc(page.subject)} 结论">
    <button type="button" data-verdict="pass">通过</button>
    <button type="button" data-verdict="limit">限制</button>
    <button type="button" data-verdict="rework">返工</button>
  </div>
  <textarea class="review-note" rows="1" placeholder="备注" aria-label="${esc(page.subject)} 备注"></textarea>
  <div class="freshness-slot" aria-live="polite"></div>
</article>`
}

function reviewToolbar(title: string, count: number, intro: string, filter = true): string {
  return `<section class="review-intro">
  <p class="eyebrow">VISUAL REVIEW</p>
  <div class="review-title-row"><div><h1>${esc(title)}</h1><p>${esc(intro)}</p></div><strong>${count}<small> 张</small></strong></div>
  <div class="review-tools">
    ${filter ? '<input id="page-filter" type="search" placeholder="搜索主题、版式或标题" aria-label="搜索当前页面">' : ""}
    <span class="review-progress"><b id="done-count">0</b> / ${count} 已评</span>
    <button class="export-button" id="export-verdicts" type="button">复制当前结论</button>
  </div>
</section>`
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
      return `<section class="detail-group" id="theme-${safe(theme.id)}" data-review-group>
  <header class="detail-group-head">
    <div><p>${String(index + 1).padStart(2, "0")} · ${esc(theme.id)}</p><h2>${esc(theme.label)}</h2></div>
    <div class="badges">${themeBadges(theme, true)}</div>
  </header>
  <div class="review-grid">${group.map((page) => reviewCard(page)).join("") || '<p class="empty-state">本次未生成这一组。</p>'}</div>
</section>`
    })
    .join("")
  return { pages, markup }
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
      const group = (label: string, selected: ManifestPage[]) =>
        selected.length
          ? `<div class="bone-family"><h3>${esc(label)}<span>${selected.length}</span></h3><div class="bone-strip">${selected
              .map((page) => reviewCard(page, page.subject))
              .join("")}</div></div>`
          : ""
      return `<section class="skeleton-theme" id="skeleton-${safe(theme.id)}" data-review-group>
  <header class="skeleton-theme-head">
    <div><p>${String(index + 1).padStart(2, "0")} · ${esc(theme.id)}</p><h2>${esc(theme.label)}</h2></div>
    <div class="badges">${themeBadges(theme, true)}</div>
  </header>
  <div class="bone-families">
    ${group("cover", row.filter((page) => page.slideType === "cover" && !sparseIds.has(page.subject)))}
    ${group("chapter", row.filter((page) => page.slideType === "chapter" && !sparseIds.has(page.subject)))}
    ${group("content pool", row.filter((page) => page.slideType === "content" && !sparseIds.has(page.subject)))}
    ${group("ending", row.filter((page) => page.slideType === "ending" && !sparseIds.has(page.subject)))}
    ${group("sparse offers", row.filter((page) => sparseIds.has(page.subject)))}
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
    .map((subject) => {
      const group = pages.filter((page) => page.subject === subject)
      return `<section class="flat-group" data-review-group>
  <header><h2>${esc(subject)}</h2><span>${group.length} 张</span></header>
  <div class="review-grid compact-grid">${group.map((page) => reviewCard(page)).join("")}</div>
</section>`
    })
    .join("")
  return { pages, markup }
}

function reviewDialog(initialPage: ManifestPage): string {
  return `<dialog class="viewer" id="viewer">
  <div class="viewer-shell">
    <button class="viewer-close" type="button" data-close-viewer aria-label="关闭大图">关闭</button>
    <div class="viewer-stage">${initialPage.file ? `<img id="viewer-image" loading="lazy" src="${esc(initialPage.file)}" alt="${esc(initialPage.subject)}">` : ""}</div>
    <div class="viewer-meta">
      <div><code id="viewer-subject"></code><p id="viewer-facts"></p></div>
      <div class="verdict-row" id="viewer-verdicts" role="group" aria-label="大图结论">
        <button type="button" data-verdict="pass">通过 <kbd>1</kbd></button>
        <button type="button" data-verdict="limit">限制 <kbd>2</kbd></button>
        <button type="button" data-verdict="rework">返工 <kbd>3</kbd></button>
      </div>
      <input id="viewer-note" class="viewer-note" placeholder="备注，自动保存" aria-label="大图备注">
    </div>
  </div>
</dialog>`
}

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
    archive[page.id] = { ...entry, archivedAt: new Date().toISOString() };
    delete verdicts[page.id];
  }
  save();
  saveArchive();

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
    const card = document.querySelector('[data-page-id="' + CSS.escape(id) + '"]');
    if (!card) return;
    const entry = verdicts[id] || {};
    card.dataset.verdict = entry.verdict || "";
    for (const button of card.querySelectorAll("[data-verdict]")) {
      button.setAttribute("aria-pressed", String(button.dataset.verdict === entry.verdict));
    }
    const note = card.querySelector(".review-note");
    if (note && note.value !== (entry.note || "")) note.value = entry.note || "";
    const slot = card.querySelector(".freshness-slot");
    if (slot) {
      const state = verdictFreshness(entry, PAGE_BY_ID.get(id));
      slot.textContent = archive[id] ? "旧结论已归档" : state === "recolored" ? "仅换肤" : "";
    }
    refreshProgress();
  }

  function refreshProgress() {
    const count = PAGES.filter((page) => verdicts[page.id] && verdicts[page.id].verdict).length;
    const target = document.getElementById("done-count");
    if (target) target.textContent = String(count);
  }

  for (const card of document.querySelectorAll("[data-page-id]")) {
    const id = card.dataset.pageId;
    for (const button of card.querySelectorAll("[data-verdict]")) {
      button.addEventListener("click", () => setVerdict(id, button.dataset.verdict));
    }
    card.querySelector(".review-note").addEventListener("input", (event) => setNote(id, event.target.value));
    refresh(id);
  }

  const filter = document.getElementById("page-filter");
  if (filter) {
    filter.addEventListener("input", () => {
      const query = filter.value.trim().toLowerCase();
      for (const card of document.querySelectorAll("[data-page-id]")) {
        card.hidden = Boolean(query && !card.dataset.search.includes(query));
      }
      for (const group of document.querySelectorAll("[data-review-group]")) {
        group.hidden = !group.querySelector("[data-page-id]:not([hidden])");
      }
    });
  }

  const viewer = document.getElementById("viewer");
  const viewerImage = document.getElementById("viewer-image");
  const viewerNote = document.getElementById("viewer-note");
  let activeId = "";

  function paintViewer(id) {
    const page = PAGE_BY_ID.get(id);
    if (!page || !page.file) return;
    activeId = id;
    viewerImage.src = page.file;
    viewerImage.alt = page.subject;
    document.getElementById("viewer-subject").textContent = page.subject;
    document.getElementById("viewer-facts").textContent = [page.slideType, page.theme, page.languageLabel].join(" · ");
    viewerNote.value = (verdicts[id] || {}).note || "";
    const current = (verdicts[id] || {}).verdict;
    for (const button of document.querySelectorAll("#viewer-verdicts [data-verdict]")) {
      button.setAttribute("aria-pressed", String(button.dataset.verdict === current));
    }
  }

  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-open-page]");
    if (open) {
      paintViewer(open.dataset.openPage);
      viewer.showModal();
    }
    if (event.target.closest("[data-close-viewer]")) viewer.close();
  });
  for (const button of document.querySelectorAll("#viewer-verdicts [data-verdict]")) {
    button.addEventListener("click", () => {
      if (!activeId) return;
      setVerdict(activeId, button.dataset.verdict);
      paintViewer(activeId);
    });
  }
  viewerNote.addEventListener("input", () => activeId && setNote(activeId, viewerNote.value));
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) viewer.close();
  });
  document.addEventListener("keydown", (event) => {
    if (!viewer.open || !activeId) return;
    if (["1", "2", "3"].includes(event.key) && !(event.target instanceof HTMLInputElement)) {
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
      setTimeout(() => { exportButton.textContent = "复制当前结论"; }, 1600);
    });
  }
})();
</script>`
}

function buildReviewDocument(
  manifest: Manifest,
  title: string,
  intro: string,
  content: { pages: ManifestPage[]; markup: string },
): string {
  const body = `<main class="review-main">
  ${reviewToolbar(title, content.pages.length, intro)}
  <div class="review-content">${content.markup || '<p class="empty-state">本次未生成这一张表。</p>'}</div>
</main>
${content.pages[0] ? reviewDialog(content.pages[0]) : ""}`
  return documentPage(
    `pptwise ${title}`,
    intro,
    manifest.pptwiseVersion,
    body,
    content.pages.length > 0 ? reviewScript(content.pages) : "",
  )
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
        "主题详情",
        "每套内置主题运行同一组十页内容。自定义主题各保留四页型对照样张。",
        themes,
      ),
    ],
    [
      "skeleton.html",
      buildReviewDocument(
        manifest,
        "骨架表",
        "逐主题展开四页型全部策展面、sparse offers 与 motif 状态，版式 id 写在每张图下。",
        skeleton,
      ),
    ],
    [
      "layouts.html",
      buildReviewDocument(manifest, "版式表", "全部注册版式按语料和适用主题展开。", layouts),
    ],
    [
      "components.html",
      buildReviewDocument(manifest, "组件表", "全部组件、图表变体和主题 form 的真实渲染样张。", components),
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
  --paper: #f2f1ed;
  --panel: #fffefa;
  --panel-strong: #ffffff;
  --ink: #1d211d;
  --muted: #6d716b;
  --line: #d7d8d1;
  --line-strong: #b8bbb2;
  --accent: #245b45;
  --accent-soft: #e3eee8;
  --amber: #93671c;
  --red: #9b3b32;
  --stage: #e6e7e2;
  --radius: 8px;
  color-scheme: light;
  font-synthesis: none;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 84px; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Avenir Next", Avenir, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
button, input, textarea { font: inherit; }
code, .eyebrow, .theme-sequence, .detail-group-head p, .skeleton-theme-head p {
  font-family: "SFMono-Regular", "Cascadia Code", "Liberation Mono", monospace;
}
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 10px clamp(20px, 4vw, 64px);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(14px);
}
.wordmark { display: inline-flex; align-items: baseline; gap: 10px; font-weight: 750; letter-spacing: -0.03em; }
.wordmark small { color: var(--muted); font-size: 11px; font-weight: 500; letter-spacing: 0; }
.site-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.site-nav a { padding: 6px 10px; color: var(--muted); border-radius: 5px; font-size: 12px; }
.site-nav a:hover, .site-nav a:focus-visible { color: var(--ink); background: var(--paper); outline: none; }
.overview-main, .review-main { width: min(1600px, 100%); margin: 0 auto; padding: 0 clamp(20px, 4vw, 64px) 96px; }
.overview-hero {
  min-height: 285px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 56px;
  align-items: end;
  padding: 64px 0 38px;
  border-bottom: 1px solid var(--line-strong);
}
.eyebrow { margin: 0 0 12px; color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: 0.15em; }
h1, h2, h3, p { margin-top: 0; }
.overview-hero h1, .review-intro h1 { margin: 0; font-size: clamp(36px, 5vw, 66px); line-height: 0.98; letter-spacing: -0.055em; font-weight: 670; }
.lede { max-width: 660px; margin: 22px 0 0; color: var(--muted); font-size: 17px; }
.build-facts { display: grid; grid-template-columns: repeat(3, auto); gap: 1px; margin: 0; background: var(--line); border: 1px solid var(--line); }
.build-facts div { min-width: 116px; padding: 14px 16px; background: var(--panel); }
.build-facts dt { color: var(--muted); font-size: 11px; }
.build-facts dd { margin: 4px 0 0; font-weight: 700; font-variant-numeric: tabular-nums; }
.review-routes { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--line-strong); border-top: 0; background: var(--panel); }
.review-routes a { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; padding: 18px; border-right: 1px solid var(--line); }
.review-routes a:last-child { border-right: 0; }
.review-routes a:hover { background: var(--accent-soft); }
.review-routes span { grid-row: 1 / 3; color: var(--accent); font: 11px/1 "SFMono-Regular", monospace; }
.review-routes b { font-size: 14px; }
.review-routes small { color: var(--muted); font-size: 11px; }
.overview-section { margin-top: 72px; }
.section-heading { display: flex; align-items: end; gap: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--line-strong); }
.section-heading p { margin: 0 0 4px; color: var(--accent); font: 10px/1 "SFMono-Regular", monospace; letter-spacing: .14em; }
.section-heading h2 { margin: 0; font-size: 24px; letter-spacing: -0.035em; }
.section-heading span { margin-left: auto; color: var(--muted); font-size: 12px; }
.theme-overview-list { display: grid; }
.theme-overview {
  display: grid;
  grid-template-columns: minmax(220px, 0.82fr) minmax(0, 3.2fr);
  gap: clamp(24px, 4vw, 56px);
  padding: 30px 0;
  border-bottom: 1px solid var(--line);
}
.theme-overview-meta { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
.theme-sequence { margin: 0 0 7px; color: var(--accent); font-size: 11px; }
.theme-overview h2 { margin: 0 0 12px; font-size: clamp(22px, 2.3vw, 34px); line-height: 1.05; letter-spacing: -0.045em; }
.badges { display: flex; flex-wrap: wrap; gap: 5px; }
.badge { display: inline-flex; align-items: center; min-height: 21px; padding: 2px 7px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: var(--panel); font-size: 10px; white-space: nowrap; }
.badge-low, .badge-quiet { color: #60645f; background: #f0f0ec; }
.badge-medium { color: #265d48; border-color: #b8d0c3; background: #ebf4ef; }
.badge-high { color: #7a4222; border-color: #dfc2aa; background: #f9eee5; }
.badge-motif { color: #3f4d7d; border-color: #c8cee2; background: #f0f2f9; }
.badge-finding { color: var(--red); border-color: #dfc2be; background: #faefed; }
.detail-link { margin-top: auto; padding-top: 18px; color: var(--accent); font-size: 12px; font-weight: 650; }
.overview-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; min-width: 0; }
.overview-thumb { min-width: 0; }
.thumb-stage, .card-stage { display: block; overflow: hidden; background: var(--stage); border: 1px solid var(--line); aspect-ratio: 16 / 9; }
.overview-image, .slide-image { display: block; width: 100%; height: 100%; object-fit: contain; }
.overview-thumb:hover .thumb-stage { border-color: var(--accent); }
.thumb-caption { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 7px; align-items: baseline; margin-top: 7px; min-width: 0; }
.thumb-caption b { color: var(--muted); font-size: 9px; font-weight: 600; text-transform: uppercase; }
.thumb-caption code { overflow: hidden; color: var(--ink); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.custom-section { margin-top: 88px; padding-top: 38px; border-top: 5px solid var(--ink); }
.review-intro { padding: 52px 0 22px; border-bottom: 1px solid var(--line-strong); }
.review-title-row { display: flex; justify-content: space-between; gap: 24px; align-items: end; }
.review-title-row p { max-width: 760px; margin: 15px 0 0; color: var(--muted); font-size: 15px; }
.review-title-row strong { font-size: 42px; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.05em; }
.review-title-row strong small { color: var(--muted); font-size: 12px; letter-spacing: 0; }
.review-tools { display: flex; align-items: center; gap: 10px; margin-top: 24px; }
.review-tools input { min-width: min(380px, 55vw); padding: 9px 11px; color: var(--ink); background: var(--panel); border: 1px solid var(--line-strong); border-radius: 5px; }
.review-progress { margin-left: auto; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.review-progress b { color: var(--ink); }
.export-button { padding: 9px 13px; border: 1px solid var(--ink); border-radius: 5px; color: var(--panel); background: var(--ink); cursor: pointer; font-size: 12px; }
.review-content { padding-top: 22px; }
.detail-group, .skeleton-theme { padding: 34px 0 44px; border-bottom: 1px solid var(--line-strong); }
.detail-group-head, .skeleton-theme-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 17px; }
.detail-group-head p, .skeleton-theme-head p { margin: 0 0 5px; color: var(--accent); font-size: 10px; }
.detail-group-head h2, .skeleton-theme-head h2 { margin: 0; font-size: 26px; letter-spacing: -0.04em; }
.review-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.compact-grid { grid-template-columns: repeat(auto-fill, minmax(245px, 1fr)); }
.review-card { overflow: hidden; min-width: 0; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); }
.review-card[data-verdict="pass"] { border-color: #6b9b7d; }
.review-card[data-verdict="limit"] { border-color: #c09a55; }
.review-card[data-verdict="rework"] { border-color: #c17870; }
.slide-button { display: block; width: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; }
.slide-button:hover .card-stage { filter: brightness(.97); }
.card-meta { display: flex; align-items: start; justify-content: space-between; gap: 8px; padding: 10px 11px 7px; }
.card-meta code { display: block; overflow-wrap: anywhere; font-size: 11px; font-weight: 650; }
.card-meta p { margin: 3px 0 0; color: var(--muted); font-size: 10px; }
.machine-flags { display: flex; flex-wrap: wrap; justify-content: end; gap: 3px; }
.verdict-row { display: flex; gap: 5px; padding: 4px 10px 8px; }
.verdict-row button { flex: 1 1 0; padding: 5px 3px; color: var(--muted); background: transparent; border: 1px solid var(--line); border-radius: 4px; cursor: pointer; font-size: 10px; }
.verdict-row button:hover { color: var(--ink); border-color: var(--line-strong); }
.verdict-row button[aria-pressed="true"] { color: white; background: var(--ink); border-color: var(--ink); }
.review-note { display: block; width: 100%; min-height: 34px; padding: 8px 10px; resize: vertical; color: var(--ink); background: #fafaf7; border: 0; border-top: 1px solid var(--line); font-size: 11px; }
.freshness-slot { min-height: 0; padding: 0 10px; color: var(--muted); font-size: 9px; }
.freshness-slot:not(:empty) { min-height: 24px; padding-top: 5px; padding-bottom: 5px; border-top: 1px solid var(--line); }
.bone-families { display: grid; gap: 22px; }
.bone-family h3 { display: flex; align-items: baseline; gap: 8px; margin: 0 0 8px; color: var(--muted); font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .08em; }
.bone-family h3 span { font-size: 9px; font-weight: 500; }
.bone-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.bone-strip .review-card { border-radius: 4px; }
.flat-group { padding: 18px 0 30px; border-bottom: 1px solid var(--line); }
.flat-group > header { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 10px; }
.flat-group > header h2 { margin: 0; font: 650 14px/1.3 "SFMono-Regular", monospace; }
.flat-group > header span { color: var(--muted); font-size: 10px; }
.missing-slide { display: grid; width: 100%; height: 100%; place-items: center; padding: 12px; color: var(--red); background: #f6e9e7; text-align: center; font-size: 11px; aspect-ratio: 16 / 9; }
.empty-state { grid-column: 1 / -1; padding: 32px; color: var(--muted); background: var(--panel); border: 1px dashed var(--line-strong); text-align: center; }
.viewer { width: 100vw; max-width: none; height: 100vh; max-height: none; padding: 0; border: 0; background: rgba(18, 20, 18, .96); }
.viewer::backdrop { background: rgba(18, 20, 18, .96); }
.viewer-shell { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; width: 100%; height: 100%; padding: 18px; }
.viewer-close { justify-self: end; padding: 7px 11px; color: white; background: transparent; border: 1px solid #5e625e; border-radius: 4px; cursor: pointer; }
.viewer-stage { display: grid; min-height: 0; place-items: center; padding: 14px; }
.viewer-stage img { display: block; width: auto; max-width: 100%; height: auto; max-height: 100%; box-shadow: 0 18px 70px rgba(0,0,0,.45); }
.viewer-meta { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(260px, 420px) minmax(220px, 1fr); gap: 18px; align-items: center; padding: 10px 14px; color: var(--ink); background: var(--panel); border-radius: 6px; }
.viewer-meta code { font-size: 12px; font-weight: 650; }
.viewer-meta p { margin: 2px 0 0; color: var(--muted); font-size: 10px; }
.viewer-meta .verdict-row { padding: 0; }
.viewer-note { width: 100%; padding: 8px 9px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 4px; }
kbd { font: inherit; font-size: 9px; }
[hidden] { display: none !important; }
@media (max-width: 980px) {
  .overview-hero { grid-template-columns: 1fr; gap: 28px; }
  .build-facts { grid-template-columns: repeat(3, 1fr); }
  .theme-overview { grid-template-columns: 1fr; }
  .detail-link { margin-top: 0; }
  .review-routes { grid-template-columns: repeat(2, 1fr); }
  .review-routes a:nth-child(2) { border-right: 0; }
  .review-routes a:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
  .viewer-meta { grid-template-columns: 1fr; gap: 8px; }
}
@media (max-width: 680px) {
  .site-header { align-items: flex-start; }
  .site-nav { justify-content: flex-end; }
  .overview-strip { grid-template-columns: repeat(2, 1fr); }
  .build-facts { grid-template-columns: 1fr; }
  .review-title-row, .detail-group-head, .skeleton-theme-head { align-items: flex-start; flex-direction: column; }
  .review-tools { align-items: stretch; flex-direction: column; }
  .review-tools input { min-width: 0; width: 100%; }
  .review-progress { margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
`
