/**
 * Builds the self-contained review page from a manifest plus the rendered
 * SVG markup.
 *
 * Three things drive every decision in here:
 *
 * 1. The reviewer's time is the scarce resource. Four hundred pages is a
 *    long sitting, so the page optimizes for keeping a rhythm — keyboard
 *    verdicts, no dialogs, no confirmations, no page reloads.
 * 2. The shell must not compete with the slide. Themes are judged on
 *    color and weight, so the surround is neutral and switchable between
 *    light and dark rather than opinionated.
 * 3. Verdicts must survive. They are written to localStorage on every
 *    keystroke and exportable as JSON at any point, because losing three
 *    hours of judgements to a closed tab would end this exercise for good.
 *
 * Everything is inlined — markup, styles, script and all 400-odd SVGs — so
 * the file survives being emailed, moved, or opened from a USB stick with
 * no network. SVGs are mounted lazily and their internal ids namespaced on
 * mount, because a few hundred documents sharing one DOM would otherwise
 * cross-wire each other's gradients.
 */

import { slideEdgeFill } from "@/lib/slide-edge"
import { namespaceSvgIds, svgIdPrefix } from "@/lib/svg-ids"
import { FACE_SLOTS } from "./matrix"
import { verdictFreshness, type Manifest } from "./render"

/**
 * Chinese names for the menu slots, so the cross-cut view's rows read as
 * "这一页在讲什么" rather than as schema keys. The English id stays beside
 * each one — it is what the corpus, the manifest and the page ids all use.
 */
const SLOT_LABELS: Record<string, string> = {
  cover: "封面",
  chapter: "章节",
  points: "要点",
  list: "清单",
  comparison: "对比",
  process: "流程",
  data: "数据",
  photo: "图像",
  statement: "断言",
  quote: "引述",
  fact: "数字",
  evidence: "证据",
  hierarchy: "层级",
  ending: "结尾",
}

/**
 * Embed a function's own source in the page's script block.
 *
 * `tsx` and Vite run esbuild with `keepNames: true`, which appends a
 * `__name(fn, "fn")` call after every named declaration — referencing a
 * helper that exists in the Node module scope and nowhere in a standalone
 * page. Stripping it is what makes the embedded copy actually runnable, the
 * same problem `serializePageFunction` solves for the browser audit.
 */
function inlineRule(fn: (...args: never[]) => unknown): string {
  return fn.toString().replace(/__name\([^)]*\);?/g, "")
}

/** Escape for embedding arbitrary text inside an HTML text node/attribute. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Escape a JSON payload for safe embedding inside a `<script>` block: `<`
 * so no substring can close the tag early, and the two Unicode line
 * separators, which are legal inside a JSON string but terminate a
 * JavaScript line and would break the parse.
 */
function jsonScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

export function buildGalleryHtml(manifest: Manifest, svgs: ReadonlyMap<string, string>): string {
  // Namespaced here rather than in the browser: several hundred standalone
  // SVG documents share one page, and their id spaces would otherwise merge
  // (see `src/lib/svg-ids.ts`). Doing it at build time is the same transform
  // `preview --html` applies, and it keeps the client script to mounting.
  const svgRecord: Record<string, string> = {}
  // What each stage should be painted with while the slide sits on it — see
  // `src/lib/slide-edge.ts` for why a neutral grey behind the slide surfaces
  // as a pale hairline down the page edge.
  const edgeRecord: Record<string, string> = {}
  let seq = 0
  for (const [id, markup] of svgs) {
    svgRecord[id] = namespaceSvgIds(markup, svgIdPrefix(seq++))
    const edge = slideEdgeFill(markup)
    if (edge) edgeRecord[id] = edge
  }

  const languages = [...new Set(manifest.pages.map((p) => p.language))]
  const languageLabels: Record<string, string> = {}
  for (const p of manifest.pages) languageLabels[p.language] = p.languageLabel

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pptwise 视觉审查 · ${manifest.pages.length} 页</title>
<style>
:root {
  --bg: #f4f4f2;
  --panel: #ffffff;
  --line: #d9d9d4;
  --ink: #1b1b19;
  --ink-dim: #6d6d66;
  --pass: #2f7d4f;
  --limit: #9a6b16;
  --rework: #a8342d;
  --focus: #2f5fd0;
  --stage: #e8e8e4;
  --radius: 10px;
  font-synthesis-weight: none;
}
/* Scoped to the body element, not to anything carrying the attribute. The
   surround toggle's own buttons carry data-surround="light" / "dark", so an
   unqualified selector redefined the palette inside the dark button itself —
   its label came out near-white on the light header and read as disabled. */
body[data-surround="dark"] {
  --bg: #17181a;
  --panel: #1f2124;
  --line: #34373c;
  --ink: #e9eaec;
  --ink-dim: #9195a0;
  --stage: #101113;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--ink);
  font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }

header.bar {
  position: sticky; top: 0; z-index: 20;
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  padding: 12px 20px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.title { font-weight: 650; letter-spacing: -0.01em; margin-right: 4px; }
.title small { display: block; font-weight: 400; color: var(--ink-dim); font-size: 12px; letter-spacing: 0; }
.spacer { flex: 1 1 auto; }

.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.seg button {
  appearance: none; border: 0; background: transparent; color: var(--ink);
  font: inherit; font-size: 13px; padding: 5px 11px; cursor: pointer;
  border-right: 1px solid var(--line);
}
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--panel); }
.seg button:hover:not([aria-pressed="true"]) { background: var(--stage); }

select, input[type="search"] {
  font: inherit; font-size: 13px; padding: 5px 9px;
  background: var(--panel); color: var(--ink);
  border: 1px solid var(--line); border-radius: 8px;
}
input[type="search"] { min-width: 190px; }

.btn {
  appearance: none; font: inherit; font-size: 13px; padding: 5px 12px; cursor: pointer;
  background: var(--panel); color: var(--ink);
  border: 1px solid var(--line); border-radius: 8px;
}
.btn:hover { background: var(--stage); }
.btn.primary { background: var(--ink); color: var(--panel); border-color: var(--ink); }

.progress { font-variant-numeric: tabular-nums; font-size: 13px; color: var(--ink-dim); white-space: nowrap; }
.progress b { color: var(--ink); font-weight: 650; }
.tally { display: inline-flex; gap: 10px; font-size: 13px; font-variant-numeric: tabular-nums; }
.tally span::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: 1px; }
.tally .t-pass::before { background: var(--pass); }
.tally .t-limit::before { background: var(--limit); }
.tally .t-rework::before { background: var(--rework); }

main { padding: 20px; }
.sectionhead { margin: 36px 0 8px; padding-top: 10px; border-top: 2px solid var(--line); scroll-margin-top: 120px; }
.sectionhead:first-child { margin-top: 4px; padding-top: 0; border-top: 0; }
.sectionhead h2 { margin: 0; font-size: 18px; letter-spacing: -0.01em; }
.sectionhead h2 code { font: 500 12px/1 ui-monospace, "SF Mono", Menlo, monospace; color: var(--ink-dim); margin-left: 8px; }
.sectionhead p { margin: 3px 0 0; color: var(--ink-dim); font-size: 13px; max-width: 70ch; }
.bandhead { margin: 20px 0 10px; }
.bandhead h3 { margin: 0; font-size: 14px; letter-spacing: -0.01em; }
.bandhead h3 span { font-weight: 400; color: var(--ink-dim); margin-left: 8px; }
.bandhead p { margin: 2px 0 0; color: var(--ink-dim); font-size: 12px; max-width: 76ch; }
/* One row per slot or per component: the 24 skins sit side by side and scroll
   horizontally, so the comparison the row exists for is a single eye sweep
   rather than a wrapped block the reader has to reassemble. */
.crossrow { margin: 0 0 20px; }
.crossrow h3 { margin: 0 0 8px; font-size: 14px; letter-spacing: -0.01em; }
.crossrow h3 span { font-weight: 400; font-size: 12px; color: var(--ink-dim); margin-left: 8px; }
.strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scroll-snap-type: x proximity; }
.strip .card { flex: 0 0 264px; scroll-snap-align: start; }
#quickmap { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; padding: 14px 18px 4px; }
.qm { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); padding: 0; cursor: pointer; overflow: hidden; text-align: left; }
.qm:hover { border-color: var(--ink-dim); }
.qm[aria-pressed="true"] { outline: 2px solid var(--focus); outline-offset: 1px; }
.qm .qm-stage { aspect-ratio: 16 / 9; background: var(--stage); overflow: hidden; }
.qm .qm-stage svg { display: block; width: 100%; height: 100%; }
.qm .qm-name { display: block; padding: 5px 8px 6px; font: 500 11px/1.3 ui-monospace, "SF Mono", Menlo, monospace; color: var(--ink); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }

.card {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius);
  overflow: hidden; display: flex; flex-direction: column;
}
.card.is-pass { border-color: var(--pass); }
.card.is-limit { border-color: var(--limit); }
.card.is-rework { border-color: var(--rework); }

.stage {
  position: relative; background: var(--stage); cursor: zoom-in;
  aspect-ratio: ${manifest.slide.width} / ${manifest.slide.height};
  overflow: hidden;
}
.stage svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.stage .skip {
  position: absolute; inset: 0; display: grid; place-items: center; padding: 16px;
  color: var(--rework); font-size: 12px; text-align: center; line-height: 1.5;
}

.meta { padding: 9px 11px 4px; }
.meta .subject { font-weight: 600; font-size: 13px; word-break: break-word; }
.meta .facts { color: var(--ink-dim); font-size: 12px; margin-top: 2px; }
.meta .facts span + span::before { content: " · "; }

.verdicts { display: flex; gap: 6px; padding: 8px 11px 0; }
.verdicts button {
  flex: 1 1 0; appearance: none; font: inherit; font-size: 12px; padding: 5px 0; cursor: pointer;
  background: transparent; color: var(--ink-dim);
  border: 1px solid var(--line); border-radius: 7px;
}
.verdicts button:hover { background: var(--stage); }
.verdicts button[aria-pressed="true"] { color: var(--panel); font-weight: 600; }
.verdicts button.v-pass[aria-pressed="true"] { background: var(--pass); border-color: var(--pass); }
.verdicts button.v-limit[aria-pressed="true"] { background: var(--limit); border-color: var(--limit); }
.verdicts button.v-rework[aria-pressed="true"] { background: var(--rework); border-color: var(--rework); }

.note {
  width: 100%; margin: 8px 0 0; padding: 7px 11px 10px; resize: vertical; min-height: 34px;
  font: inherit; font-size: 12px; color: var(--ink);
  background: transparent; border: 0; border-top: 1px solid var(--line);
}
.note:focus { outline: 2px solid var(--focus); outline-offset: -2px; }
.note::placeholder { color: var(--ink-dim); }

dialog.viewer {
  padding: 0; border: 0; background: transparent; max-width: 100vw; max-height: 100vh; width: 100%; height: 100%;
}
dialog.viewer::backdrop { background: rgba(0,0,0,0.82); }
.viewer-inner { display: flex; flex-direction: column; height: 100%; padding: 18px; gap: 12px; }
.viewer-stage {
  flex: 1 1 auto; display: grid; place-items: center; min-height: 0;
}
.viewer-stage .frame {
  background: var(--stage); box-shadow: 0 18px 60px rgba(0,0,0,0.45);
  aspect-ratio: ${manifest.slide.width} / ${manifest.slide.height};
  max-width: min(100%, calc((100vh - 150px) * ${manifest.slide.width} / ${manifest.slide.height}));
  max-height: 100%; width: 100%; position: relative; overflow: hidden;
}
.viewer-stage svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.viewer-bar {
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 14px;
}
.viewer-bar .subject { font-weight: 600; }
.viewer-bar .facts { color: var(--ink-dim); font-size: 12px; }
.viewer-bar .note { border: 1px solid var(--line); border-radius: 7px; padding: 6px 9px; min-height: 0; margin: 0; flex: 1 1 240px; }
.viewer-bar .verdicts { padding: 0; flex: 0 0 300px; }

.hint { color: var(--ink-dim); font-size: 12px; }
kbd {
  font: inherit; font-size: 11px; padding: 1px 5px; border: 1px solid var(--line);
  border-bottom-width: 2px; border-radius: 4px; background: var(--panel);
}
.empty { color: var(--ink-dim); padding: 40px 0; text-align: center; }

/* The whole gallery is one self-contained file, so the browser parses
   several megabytes of inline SVG before the first card can exist —
   measured at roughly 240ms to first paint and 370ms to first card on the
   full 431-page build. Fast, but not instant, and the gap grows with the
   corpus. The header and this notice sit ahead of the payload in the
   document, so something is on screen for that gap instead of white. The
   first render pass replaces this. */
.booting { color: var(--ink-dim); padding: 60px 0; text-align: center; line-height: 2; }

/* Machine findings. Deliberately quiet — the auditor is an assistant to the
   reviewer's eye, not a verdict. A loud red panel on 90 of 431 cards would
   train the reviewer to stop reading it. */
.flags { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 11px 0; }
.flag {
  font-size: 11px; padding: 1px 7px; border-radius: 999px;
  background: var(--stage); color: var(--ink-dim); border: 1px solid var(--line);
  cursor: default;
}
.flag.sev { color: var(--rework); border-color: var(--rework); }
/* A verdict recorded against a version of the page that no longer exists is
   auto-archived at load — the card returns to the unjudged state and only
   this quiet chip records that an older judgement was filed away. The page
   is current, so the slide is not dimmed. */
.flag.stale { color: var(--ink-dim); border-color: var(--line); }
/* A verdict whose page only changed color since it was made. Quieter than
   stale and the slide is not dimmed: the judgement still stands, the reviewer
   is only being told the palette moved under it. */
.flag.recolored { color: var(--ink-dim); border-color: var(--line); }
.findings-list { margin: 0; padding: 0 0 0 16px; font-size: 12px; color: var(--ink-dim); max-height: 84px; overflow-y: auto; }
.findings-list li { margin: 2px 0; }
.viewer-bar .findings-list { flex: 1 1 260px; }
.booting small { font-size: 12px; }
</style>
</head>
<body data-surround="light">

<header class="bar">
  <div class="title">pptwise 视觉审查<small>${esc(manifest.pptwiseVersion)} · 生成于 ${esc(manifest.generatedAt.slice(0, 16).replace("T", " "))}</small></div>

  <select id="theme-filter" aria-label="主题">
    <option value="all">全部主题</option>
    ${manifest.sections
      .map((sec) => `<option value="${esc(sec.id)}">${esc(sec.label)}${sec.label === sec.id ? "" : ` · ${esc(sec.id)}`}</option>`)
      .join("\n    ")}
  </select>

  <div class="seg" id="view-filter" role="group" aria-label="视角">
    <button data-view="theme" aria-pressed="true">按主题</button>
    <button data-view="slot" aria-pressed="false">按讲法</button>
    <button data-view="component" aria-pressed="false">按组件</button>
  </div>

  <select id="lang-filter" aria-label="语料">
    <option value="all">全部语料</option>
    ${languages.map((l) => `<option value="${esc(l)}">${esc(languageLabels[l] ?? l)}</option>`).join("\n    ")}
  </select>

  <select id="verdict-filter" aria-label="结论">
    <option value="all">全部结论</option>
    <option value="none">未评</option>
    <option value="pass">通过</option>
    <option value="limit">限制使用</option>
    <option value="rework">返工</option>
  </select>

  <select id="finding-filter" aria-label="机器发现">
    <option value="all">全部页面</option>
    <option value="any">机器有发现</option>
    <option value="clean">机器无发现</option>
    <option value="stale">已归档旧结论</option>
    <option value="recolored">仅换肤</option>
  </select>

  <input type="search" id="search" placeholder="搜标题或 id" aria-label="搜索">

  <div class="spacer"></div>

  <div class="progress" id="progress" title=""><b id="done-count">0</b> / <span id="total-count">${manifest.pages.length}</span> 已评</div>
  <div class="tally">
    <span class="t-pass"><b id="n-pass">0</b></span>
    <span class="t-limit"><b id="n-limit">0</b></span>
    <span class="t-rework"><b id="n-rework">0</b></span>
  </div>

  <div class="seg" id="surround" role="group" aria-label="背景">
    <button data-surround="light" aria-pressed="true">浅</button>
    <button data-surround="dark" aria-pressed="false">深</button>
  </div>

  <button class="btn primary" id="export">复制结论</button>
</header>

<section id="quickmap" aria-label="主题速览（跳转索引）"></section>

<main id="main"><p class="booting">正在装入 ${manifest.pages.length} 页……<br><small>整页自包含，所有幻灯片都在这个文件里，首次装入约需几秒。</small></p></main>

<dialog class="viewer" id="viewer">
  <div class="viewer-inner">
    <div class="viewer-stage"><div class="frame" id="viewer-frame"></div></div>
    <div class="viewer-bar">
      <div>
        <div class="subject" id="viewer-subject"></div>
        <div class="facts" id="viewer-facts"></div>
      </div>
      <div class="verdicts" id="viewer-verdicts">
        <button class="v-pass" data-verdict="pass" aria-pressed="false">通过 <kbd>1</kbd></button>
        <button class="v-limit" data-verdict="limit" aria-pressed="false">限制 <kbd>2</kbd></button>
        <button class="v-rework" data-verdict="rework" aria-pressed="false">返工 <kbd>3</kbd></button>
      </div>
      <ul class="findings-list" id="viewer-findings"></ul>
      <input class="note" id="viewer-note" placeholder="备注（自动保存）">
      <span class="hint"><kbd>←</kbd><kbd>→</kbd> 翻页 · <kbd>Esc</kbd> 关闭</span>
    </div>
  </div>
</dialog>

<script id="manifest-data" type="application/json">${jsonScript(manifest)}</script>
<script id="svg-data" type="application/json">${jsonScript(svgRecord)}</script>
<script id="edge-data" type="application/json">${jsonScript(edgeRecord)}</script>
<script>
(() => {
  "use strict";
  const MANIFEST = JSON.parse(document.getElementById("manifest-data").textContent);
  const SVGS = JSON.parse(document.getElementById("svg-data").textContent);
  const EDGES = JSON.parse(document.getElementById("edge-data").textContent);
  const STORE_KEY = "pptwise-gallery-verdicts-v1";
  // Row order for the cross-cut view, straight from the corpus' own slot list
  // rather than from whatever order this build's menus happened to emit.
  const SLOT_ORDER = ${jsonScript(FACE_SLOTS)};
  const SLOT_LABELS = ${jsonScript(SLOT_LABELS)};
  const SECTION_ORDER = new Map(MANIFEST.sections.map((s, i) => [s.id, i]));

  // Shipped in as source rather than restated here, so the rule the reviewer
  // sees is byte-for-byte the one render.test.mts tests. See its own doc
  // comment in render.ts for why it is written to survive toString().
${inlineRule(verdictFreshness)}

  const VERDICT_LABELS = { pass: "通过", limit: "限制使用", rework: "返工" };
  // Short Chinese labels for the auditor's codes, plus which ones are worth
  // drawing in the alarm color. Truncation and dropped content mean the
  // reader is missing text outright; the rest are worth knowing but are
  // judgement calls the human is making anyway.
  const FINDING_LABELS = {
    "overflow": "溢出",
    "out-of-bounds": "出血",
    "low-contrast": "对比度",
    "overlap": "重叠",
    "content-truncated": "截断",
    "content-dropped": "内容丢失",
  };
  const SEVERE = new Set(["content-dropped", "out-of-bounds", "overflow"]);

  function summarizeFindings(findings) {
    const counts = new Map();
    for (const f of findings || []) counts.set(f.code, (counts.get(f.code) || 0) + 1);
    return [...counts].map(([code, n]) => ({
      code,
      label: (FINDING_LABELS[code] || code) + (n > 1 ? " ×" + n : ""),
      severe: SEVERE.has(code),
    }));
  }

  // ── verdict state ──────────────────────────────────────────────────────
  // Keyed by page id, which is derived from theme/layout/component identity
  // rather than from render order — so re-running the gallery after a code
  // change keeps every judgement that still applies.
  let verdicts = {};
  try { verdicts = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (_) { verdicts = {}; }

  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(verdicts)); }
    catch (_) { /* private mode: the export button is still the escape hatch */ }
  };

  const entry = (id) => verdicts[id] || (verdicts[id] = {});

  // Every write stamps the page's current fingerprints. That is what makes a
  // later run able to say "this judgement was made about a page that has
  // since changed" instead of presenting it as current — and, since the
  // fingerprint comes in two halves, to tell a redrawn page from a recolored
  // one. The whole-markup hash is still written too, so a verdict exported
  // from here stays readable by anything holding the older single-hash shape.
  const pageById = new Map(MANIFEST.pages.map((p) => [p.id, p]));
  const stampHash = (id, e) => {
    const page = pageById.get(id);
    if (!page) return;
    e.hash = page.hash;
    if (page.fingerprint) { e.geo = page.fingerprint.geometry; e.col = page.fingerprint.color; }
  };
  const freshness = (id) => verdictFreshness(verdicts[id], pageById.get(id));
  const isRecolored = (id) => freshness(id) === "recolored";

  // A stale verdict was made about a page version that no longer exists —
  // almost always because the flagged defect got fixed. Presenting it as a
  // live judgement on every open forces the reviewer to re-dismiss the same
  // ghosts. So on load, stale entries move out of the active store into an
  // archive (nothing is destroyed; the "已归档旧结论" filter lists them),
  // and the card returns to the unjudged state ready for a fresh look.
  let archive = {};
  try { archive = JSON.parse(localStorage.getItem(STORE_KEY + ":archive") || "{}"); } catch (_) { archive = {}; }
  {
    let moved = false;
    for (const id of Object.keys(verdicts)) {
      if (verdictFreshness(verdicts[id], pageById.get(id)) === "stale") {
        archive[id] = { ...verdicts[id], archivedAt: new Date().toISOString() };
        delete verdicts[id];
        moved = true;
      }
    }
    if (moved) {
      try { localStorage.setItem(STORE_KEY + ":archive", JSON.stringify(archive)); } catch (_) { /* export remains the escape hatch */ }
      save();
    }
  }
  const isArchived = (id) => Boolean(archive[id]);

  function setVerdict(id, value) {
    const e = entry(id);
    e.verdict = e.verdict === value ? undefined : value;
    stampHash(id, e);
    if (!e.verdict && !e.note) delete verdicts[id];
    save(); refreshCard(id); refreshTally();
  }
  function setNote(id, text) {
    const e = entry(id);
    e.note = text || undefined;
    stampHash(id, e);
    if (!e.verdict && !e.note) delete verdicts[id];
    save(); refreshCard(id); refreshTally();
  }

  // ── svg mounting ───────────────────────────────────────────────────────
  // Ids were already namespaced at build time (src/lib/svg-ids.ts), so
  // mounting is a plain innerHTML — no rewriting in the hot path.
  //
  // Opening the viewer does put a second copy of one slide in the DOM
  // alongside its card, and those two copies share a namespace. That is the
  // one duplicate this scheme allows, and it is safe by construction rather
  // than by luck: both copies are the same document, so every colliding id
  // resolves to a byte-identical definition.
  //
  // The stage is repainted in the slide's own edge colour on the way in. A
  // stage box rarely lands on whole device pixels, and whatever is painted
  // under the slide survives in the boundary column as a one-to-two pixel
  // strip — a neutral grey there reads as a pale line down the page edge.
  // See src/lib/slide-edge.ts.
  function mountSvg(container, id) {
    const markup = SVGS[id];
    if (!markup) return false;
    container.innerHTML = markup;
    container.style.background = EDGES[id] || "";
    return true;
  }

  // ── card rendering ─────────────────────────────────────────────────────
  const cards = new Map();

  // In the theme view the section heading already says which theme this is,
  // so the card names what it shows. In a cross-cut row the opposite holds:
  // every card in the row shows the same thing, and the theme is the variable.
  function cardTitle(p) {
    if (state.view !== "theme") return p.sectionLabel === p.section ? p.section : p.sectionLabel + " · " + p.section;
    // A deck page's subject is its own theme, which the section heading right
    // above it already said. Its heading is the thing worth naming.
    // Emphasis runs are author markup for the renderer, not for chrome text.
    if (p.band === "deck") return stripEmphasis(p.heading) || p.subject;
    return p.subject;
  }

  function stripEmphasis(text) {
    return (text || "").replace(/\*\*([^*]+)\*\*/g, "$1");
  }

  function cardFacts(p) {
    const bits = [];
    if (state.view !== "theme") bits.push(p.subject);
    if (p.band === "deck") bits.push("第 " + p.page + " / " + p.pageCount + " 页", p.slideType);
    // A slot already names the slide type it belongs to, and every component
    // page is a content page — saying so again is noise on 1500 cards.
    if (p.slot) bits.push(SLOT_LABELS[p.slot] ? SLOT_LABELS[p.slot] + " " + p.slot : p.slot);
    bits.push(p.languageLabel);
    return bits;
  }

  function buildCard(p) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = p.id;

    const stage = document.createElement("div");
    stage.className = "stage";
    stage.setAttribute("role", "button");
    stage.setAttribute("tabindex", "0");
    stage.setAttribute("aria-label", "放大 " + p.id);
    if (p.skipped) {
      const s = document.createElement("div");
      s.className = "skip";
      s.textContent = "未能渲染 — " + p.skipped;
      stage.appendChild(s);
    }
    stage.addEventListener("click", () => openViewer(p.id));
    stage.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openViewer(p.id); }
    });

    const meta = document.createElement("div");
    meta.className = "meta";
    const subject = document.createElement("div");
    subject.className = "subject";
    subject.textContent = cardTitle(p);
    const facts = document.createElement("div");
    facts.className = "facts";
    for (const bit of cardFacts(p)) {
      const span = document.createElement("span");
      span.textContent = bit;
      facts.appendChild(span);
    }
    meta.append(subject, facts);

    const verdictsRow = document.createElement("div");
    verdictsRow.className = "verdicts";
    for (const key of ["pass", "limit", "rework"]) {
      const btn = document.createElement("button");
      btn.className = "v-" + key;
      btn.dataset.verdict = key;
      btn.type = "button";
      btn.textContent = VERDICT_LABELS[key];
      btn.addEventListener("click", () => setVerdict(p.id, key));
      verdictsRow.appendChild(btn);
    }

    const note = document.createElement("textarea");
    note.className = "note";
    note.rows = 1;
    note.placeholder = "备注";
    // Stored verbatim while typing. Trimming on every input event and writing
    // the trimmed value straight back deleted a space the moment it was
    // typed, so "needs more spacing" came out "needsmore spacing". Trimming
    // is an export-time concern, not a per-keystroke one.
    note.addEventListener("input", () => setNote(p.id, note.value));

    card.append(stage, meta, verdictsRow, note);

    // Machine findings ride along with the page instead of the reviewer
    // re-deriving them by eye. Placed under the verdict row so they inform
    // the judgement without pre-empting it.
    const flags = summarizeFindings(p.findings);
    if (isArchived(p.id)) {
      flags.unshift({ code: "stale", label: "旧结论已归档", severe: false, mark: "stale" });
    } else if (isRecolored(p.id)) {
      flags.unshift({ code: "recolored", label: "仅换肤", severe: false, mark: "recolored" });
    }
    if (flags.length > 0) {
      const row = document.createElement("div");
      row.className = "flags";
      for (const f of flags) {
        const chip = document.createElement("span");
        chip.className = "flag" + (f.severe ? " sev" : "") + (f.mark ? " " + f.mark : "");
        chip.textContent = f.label;
        chip.title = f.mark === "stale"
          ? "上一轮的结论是对这一页的旧版本做出的，那一版已经修掉了 — 旧结论收进档案，这一页等你重新看"
          : f.mark === "recolored"
          ? "这一页自上次评审以来只换了配色，几何没动 — 结论仍然有效，除非它本来就是在说颜色"
          : (p.findings || []).filter((x) => x.code === f.code).map((x) => x.message).join("\\n");
        row.appendChild(chip);
      }
      card.insertBefore(row, note);
    }
    cards.set(p.id, { card, stage, verdictsRow, note, page: p, mounted: false });
    refreshCard(p.id);
    return card;
  }

  function refreshCard(id) {
    const c = cards.get(id);
    if (!c) return;
    const v = (verdicts[id] || {}).verdict;
    c.card.classList.toggle("is-pass", v === "pass");
    c.card.classList.toggle("is-limit", v === "limit");
    c.card.classList.toggle("is-rework", v === "rework");
    for (const btn of c.verdictsRow.children) {
      btn.setAttribute("aria-pressed", String(btn.dataset.verdict === v));
    }
    const note = (verdicts[id] || {}).note || "";
    if (c.note.value !== note) c.note.value = note;
  }

  function refreshTally() {
    // Counted over what is on screen, not over everything in storage and not
    // over the whole build. A reviewer working through one theme wants "12 /
    // 67 of this theme", and the old whole-manifest denominator made a
    // finished section look barely started. The build-wide numbers are still
    // one hover away, in the tooltip.
    let pass = 0, limit = 0, rework = 0;
    for (const p of visible) {
      const v = (verdicts[p.id] || {}).verdict;
      if (v === "pass") pass++;
      else if (v === "limit") limit++;
      else if (v === "rework") rework++;
    }
    // Verdicts persist across runs by design (that is what makes the ids
    // stable), so a narrowed run still sees the full matrix's judgements in
    // localStorage. The global tally counts this build's pages only, which is
    // what the export already does.
    let gp = 0, gl = 0, gr = 0;
    for (const p of MANIFEST.pages) {
      const v = (verdicts[p.id] || {}).verdict;
      if (v === "pass") gp++;
      else if (v === "limit") gl++;
      else if (v === "rework") gr++;
    }
    document.getElementById("n-pass").textContent = String(pass);
    document.getElementById("n-limit").textContent = String(limit);
    document.getElementById("n-rework").textContent = String(rework);
    document.getElementById("done-count").textContent = String(pass + limit + rework);
    document.getElementById("total-count").textContent = String(visible.length);
    const globalTip = "全库 " + MANIFEST.pages.length + " 页，已评 " + (gp + gl + gr) +
      " 页（通过 " + gp + " · 限制 " + gl + " · 返工 " + gr + "）";
    document.getElementById("progress").title = globalTip;
    document.querySelector(".tally").title = globalTip;
  }

  // Only slides near the viewport are mounted: several hundred inline SVG
  // documents in one DOM at once is what makes a page like this crawl. The
  // observer watches the card element, which carries the page id.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const c = cards.get(e.target.dataset.id);
      if (c && !c.mounted && !c.page.skipped) {
        c.mounted = mountSvg(c.stage, c.page.id);
        if (c.mounted) io.unobserve(e.target);
      }
    }
  }, { rootMargin: "600px 0px" });

  // ── filtering and layout ───────────────────────────────────────────────
  // Three views over one set of rendered pages. The two cross-cut views add
  // no render at all: they regroup the same manifest, so the theme axis and
  // the "how does this one face look across all 24 skins" axis cost the same
  // four seconds of generation.
  const state = { view: "theme", language: "all", theme: "all", verdict: "all", finding: "all", query: "" };
  let visible = [];

  function matches(p) {
    // The cross-cut views only have rows for one band each, so a page from
    // another band is not "filtered out", it has nowhere to go.
    if (state.view === "slot" && p.band !== "face") return false;
    if (state.view === "component" && p.band !== "component") return false;
    if (state.language !== "all" && p.language !== state.language) return false;
    if (state.theme !== "all" && p.section !== state.theme) return false;
    if (state.verdict !== "all") {
      const v = (verdicts[p.id] || {}).verdict;
      if (state.verdict === "none" ? Boolean(v) : v !== state.verdict) return false;
    }
    if (state.finding === "stale") {
      if (!isArchived(p.id)) return false;
    } else if (state.finding === "recolored") {
      if (!isRecolored(p.id)) return false;
    } else if (state.finding !== "all") {
      const has = (p.findings || []).length > 0;
      if (state.finding === "any" ? !has : has) return false;
    }
    if (state.query) {
      const hay = (p.subject + " " + p.heading + " " + p.id + " " + p.sectionLabel).toLowerCase();
      if (!hay.includes(state.query)) return false;
    }
    return true;
  }

  function grid(pages, className) {
    const box = document.createElement("div");
    box.className = className;
    for (const p of pages) box.appendChild(buildCard(p));
    return box;
  }

  function renderThemeView(main) {
    for (const section of MANIFEST.sections) {
      const pages = visible.filter((p) => p.section === section.id);
      if (pages.length === 0) continue;

      const head = document.createElement("div");
      head.className = "sectionhead";
      head.id = "sec-" + section.id;
      const h2 = document.createElement("h2");
      h2.textContent = section.label + " — " + pages.length + " 页";
      if (section.label !== section.id) {
        const code = document.createElement("code");
        code.textContent = section.id;
        h2.appendChild(code);
      }
      const blurb = document.createElement("p");
      blurb.textContent = section.blurb;
      head.append(h2, blurb);
      main.appendChild(head);

      for (const band of MANIFEST.bands) {
        const bandPages = pages.filter((p) => p.band === band.id);
        if (bandPages.length === 0) continue;
        const bandHead = document.createElement("div");
        bandHead.className = "bandhead";
        const h3 = document.createElement("h3");
        h3.textContent = band.label;
        const count = document.createElement("span");
        count.textContent = bandPages.length + " 页";
        h3.appendChild(count);
        const q = document.createElement("p");
        q.textContent = band.question;
        bandHead.append(h3, q);
        main.append(bandHead, grid(bandPages, "grid"));
      }
    }
  }

  /**
   * One row per value of the grouping key, each row's pages ordered by
   * section — so a row reads left to right as the same thing wearing 24 skins.
   */
  function renderCrossView(main, key, rowOrder, labelFor) {
    const rows = new Map();
    for (const p of visible) {
      const value = p[key];
      if (value === undefined) continue;
      const list = rows.get(value) || [];
      list.push(p);
      rows.set(value, list);
    }
    const ordered = [...rows.keys()].sort((a, b) => {
      const ia = rowOrder.indexOf(a), ib = rowOrder.indexOf(b);
      // A value the fixed order does not know sinks below the ones it does,
      // rather than silently taking position 0 the way indexOf -1 would.
      if (ia !== ib) return (ia < 0 ? rowOrder.length : ia) - (ib < 0 ? rowOrder.length : ib);
      return String(a).localeCompare(String(b));
    });
    for (const value of ordered) {
      const pages = rows.get(value).slice().sort((a, b) => {
        const d = (SECTION_ORDER.get(a.section) ?? 0) - (SECTION_ORDER.get(b.section) ?? 0);
        return d !== 0 ? d : a.id.localeCompare(b.id);
      });
      const row = document.createElement("section");
      row.className = "crossrow";
      const h3 = document.createElement("h3");
      h3.textContent = labelFor(value);
      const count = document.createElement("span");
      count.textContent = pages.length + " 张";
      h3.appendChild(count);
      row.append(h3, grid(pages, "strip"));
      main.appendChild(row);
    }
  }

  function render() {
    const main = document.getElementById("main");
    // Every past filter pass left its cards observed: they leave the DOM but
    // stay in the observer, so switching theme or typing in the search box
    // accumulated dead references and callbacks for the life of the page.
    io.disconnect();
    main.textContent = "";
    cards.clear();
    visible = MANIFEST.pages.filter(matches);

    if (visible.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "没有符合条件的页面。";
      main.appendChild(empty);
      refreshTally();
      return;
    }

    if (state.view === "theme") renderThemeView(main);
    else if (state.view === "slot") {
      renderCrossView(main, "slot", SLOT_ORDER, (slot) =>
        (SLOT_LABELS[slot] ? SLOT_LABELS[slot] + " " : "") + slot);
    } else {
      const order = [...new Set(MANIFEST.pages.filter((p) => p.component).map((p) => p.component))];
      renderCrossView(main, "component", order, (id) => id);
    }

    // Observed after insertion, so the first screenful has real geometry
    // and mounts immediately instead of one frame late.
    for (const [, c] of cards) io.observe(c.card);
    refreshTally();
  }

  // ── viewer ─────────────────────────────────────────────────────────────
  const viewer = document.getElementById("viewer");
  const frame = document.getElementById("viewer-frame");
  let viewerIndex = -1;
  // The set the viewer pages through. In the theme view a page is judged
  // inside its own section, so the queue scopes to that section; a cross-cut
  // view is itself the comparison set, so the queue is the visible set.
  let viewerQueue = [];

  function openViewer(id) {
    const opened = visible.find((p) => p.id === id);
    if (!opened) return;
    viewerQueue = state.view === "theme" ? visible.filter((p) => p.section === opened.section) : visible;
    viewerIndex = viewerQueue.findIndex((p) => p.id === id);
    if (viewerIndex < 0) return;
    paintViewer();
    if (!viewer.open) viewer.showModal();
  }

  function paintViewer() {
    const p = viewerQueue[viewerIndex];
    if (!p) return;
    frame.textContent = "";
    frame.style.background = "";
    if (p.skipped) {
      const s = document.createElement("div");
      s.className = "skip";
      s.textContent = "未能渲染 — " + p.skipped;
      frame.appendChild(s);
    } else {
      mountSvg(frame, p.id);
    }
    document.getElementById("viewer-subject").textContent = cardTitle(p);
    document.getElementById("viewer-facts").textContent =
      cardFacts(p).join(" · ") + " · " + (viewerIndex + 1) + " / " + viewerQueue.length;
    const v = (verdicts[p.id] || {}).verdict;
    for (const btn of document.getElementById("viewer-verdicts").children) {
      btn.setAttribute("aria-pressed", String(btn.dataset.verdict === v));
    }
    document.getElementById("viewer-note").value = (verdicts[p.id] || {}).note || "";
    const list = document.getElementById("viewer-findings");
    list.textContent = "";
    for (const f of p.findings || []) {
      const li = document.createElement("li");
      li.textContent = (FINDING_LABELS[f.code] || f.code) + " — " + f.message;
      list.appendChild(li);
    }
  }

  function step(delta) {
    if (viewerIndex < 0) return;
    viewerIndex = Math.min(viewerQueue.length - 1, Math.max(0, viewerIndex + delta));
    paintViewer();
  }

  for (const btn of document.getElementById("viewer-verdicts").children) {
    btn.addEventListener("click", () => {
      const p = viewerQueue[viewerIndex];
      if (p) { setVerdict(p.id, btn.dataset.verdict); paintViewer(); }
    });
  }
  document.getElementById("viewer-note").addEventListener("input", (ev) => {
    const p = viewerQueue[viewerIndex];
    if (p) { setNote(p.id, ev.target.value); refreshCard(p.id); }
  });

  document.addEventListener("keydown", (ev) => {
    if (!viewer.open) return;
    const typing = ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement;
    if (ev.key === "ArrowRight") { ev.preventDefault(); step(1); }
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); step(-1); }
    else if (!typing && (ev.key === "1" || ev.key === "2" || ev.key === "3")) {
      ev.preventDefault();
      const p = viewerQueue[viewerIndex];
      if (p) { setVerdict(p.id, ["pass", "limit", "rework"][Number(ev.key) - 1]); paintViewer(); }
    }
  });

  // ── controls ───────────────────────────────────────────────────────────
  document.getElementById("view-filter").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    state.view = btn.dataset.view;
    for (const b of ev.currentTarget.children) b.setAttribute("aria-pressed", String(b === btn));
    render();
  });
  document.getElementById("surround").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    document.body.dataset.surround = btn.dataset.surround;
    for (const b of ev.currentTarget.children) b.setAttribute("aria-pressed", String(b === btn));
  });
  document.getElementById("lang-filter").addEventListener("change", (e) => { state.language = e.target.value; render(); });
  document.getElementById("theme-filter").addEventListener("change", (e) => { state.theme = e.target.value; render(); syncQuickmap(); });

  // ── 主题速览 ────────────────────────────────────────────────────────────
  // 一格一节，取该节样张里的封面。点击是跳转，不是第二套筛选状态：切回主题
  // 视角、滚到那一节。当前主题筛选选中的那一格仍然高亮，好让下拉框和速览条
  // 说的是同一件事。
  function syncQuickmap() {
    for (const b of document.querySelectorAll("#quickmap .qm")) {
      b.setAttribute("aria-pressed", String(b.dataset.section === state.theme));
    }
  }

  function jumpToSection(id) {
    const target = document.getElementById("sec-" + id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildQuickmap() {
    const host = document.getElementById("quickmap");
    const select = document.getElementById("theme-filter");
    const viewButtons = document.getElementById("view-filter").children;
    for (const section of MANIFEST.sections) {
      const sample =
        MANIFEST.pages.find((p) => p.section === section.id && p.band === "deck" && p.slideType === "cover") ||
        MANIFEST.pages.find((p) => p.section === section.id && !p.skipped);
      if (!sample) continue;
      const cell = document.createElement("button");
      cell.className = "qm";
      cell.dataset.section = section.id;
      cell.setAttribute("aria-pressed", "false");
      cell.title = "跳到 " + section.label;
      const stage = document.createElement("div");
      stage.className = "qm-stage";
      mountSvg(stage, sample.id);
      const name = document.createElement("span");
      name.className = "qm-name";
      name.textContent = section.label === section.id ? section.id : section.label + " · " + section.id;
      cell.append(stage, name);
      cell.addEventListener("click", () => {
        let rerender = false;
        if (state.view !== "theme") {
          state.view = "theme";
          for (const b of viewButtons) b.setAttribute("aria-pressed", String(b.dataset.view === "theme"));
          rerender = true;
        }
        // A theme filter narrowed to some other section would leave nothing to
        // scroll to, so widen it rather than jumping into an empty page.
        if (state.theme !== "all" && state.theme !== section.id) {
          select.value = "all";
          state.theme = "all";
          syncQuickmap();
          rerender = true;
        }
        if (rerender) render();
        jumpToSection(section.id);
      });
      host.appendChild(cell);
    }
  }
  document.getElementById("verdict-filter").addEventListener("change", (e) => { state.verdict = e.target.value; render(); });
  document.getElementById("finding-filter").addEventListener("change", (e) => { state.finding = e.target.value; render(); });
  let searchTimer;
  document.getElementById("search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const value = e.target.value.trim().toLowerCase();
    searchTimer = setTimeout(() => { state.query = value; render(); }, 160);
  });

  // Copy, not download. The judgements exist to be handed to an agent, and
  // a file on disk has to be found and attached before that can happen —
  // whereas a clipboard paste goes straight into the conversation. The
  // 2026-08-16 round was handed over by pasting, which is what prompted this.
  document.getElementById("export").addEventListener("click", async () => {
    const btn = document.getElementById("export");
    const payload = {
      // 4 since the review is cut theme first: every verdict names the
      // section and band it was made in, where /3 named a table that no
      // longer exists.
      schema: "pptwise-gallery-verdicts/4",
      pptwiseVersion: MANIFEST.pptwiseVersion,
      renderedAt: MANIFEST.generatedAt,
      total: MANIFEST.pages.length,
      verdicts: MANIFEST.pages
        .filter((p) => verdicts[p.id] && (verdicts[p.id].verdict || verdicts[p.id].note))
        .map((p) => ({
          id: p.id,
          section: p.section,
          band: p.band,
          subject: p.subject,
          language: p.language,
          theme: p.theme,
          page: p.page,
          verdict: verdicts[p.id].verdict || null,
          note: (verdicts[p.id].note || "").trim() || null,
          findings: (p.findings || []).map((f) => f.code),
          // Stale verdicts never reach this export: they are auto-archived
          // at load, so an active entry here is always about the page as it
          // renders now.
          // Set when the page changed color and nothing else since. The
          // judgement still holds — unless it was about the color — so it
          // travels flagged rather than either dropped or silently passed on
          // as untouched.
          ...(isRecolored(p.id) ? { recolored: true } : {}),
        })),
    };
    const text = JSON.stringify(payload, null, 2);

    const flash = (msg) => {
      const original = btn.textContent;
      btn.textContent = msg;
      setTimeout(() => { btn.textContent = original; }, 1600);
    };

    try {
      await navigator.clipboard.writeText(text);
      const n = payload.verdicts.length;
      const stale = payload.verdicts.filter((v) => v.stale).length;
      const recolored = payload.verdicts.filter((v) => v.recolored).length;
      const notes = [];
      if (stale > 0) notes.push(stale + " 条已过期");
      if (recolored > 0) notes.push(recolored + " 条仅换肤");
      flash(notes.length > 0 ? "已复制 " + n + " 条（" + notes.join("，") + "）" : "已复制 " + n + " 条");
      return;
    } catch (_) {
      // Clipboard API unavailable or permission-denied (some browsers gate
      // it on file:// despite it being a secure context). Fall through.
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-1000px;left:-1000px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      flash(ok ? "已复制 " + payload.verdicts.length + " 条" : "复制失败，见控制台");
      if (!ok) console.log(text);
    } catch (_) {
      flash("复制失败，见控制台");
      console.log(text);
    }
  });

  buildQuickmap();
  render();
})();
</script>
</body>
</html>
`
}

/** One-line summary for the CLI to print after a run. */
export function summarize(manifest: Manifest): string {
  const rendered = manifest.pages.filter((p) => p.file).length
  const skipped = manifest.pages.length - rendered
  const byBand = manifest.bands
    .map((b) => `${b.label} ${manifest.pages.filter((p) => p.band === b.id).length}`)
    .join(" · ")
  return `${rendered} pages rendered${skipped > 0 ? `, ${skipped} skipped` : ""} across ${manifest.sections.length} sections (${byBand})`
}
