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

import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { slideEdgeFill } from "@/lib/slide-edge"
import { namespaceSvgIds, svgIdPrefix } from "@/lib/svg-ids"
import { BOUNDARY_SLOTS, FACE_SLOTS } from "./matrix"
import { MANIFEST_VERSION, verdictFreshness, type Manifest } from "./render"
import { STORY_ZH } from "./stories.zh"
import { effectiveVerdict } from "./verdict"

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

/** One heading on a cross-cut index, and the groups filed under it. */
export interface GroupFamily {
  readonly label: string
  readonly members: readonly string[]
}

/**
 * Headings for the 按讲法 index. Derived from `FACE_SLOTS` rather than
 * restated, so a twelfth content kind lands under 内容页 on its own — a
 * hand-kept list would have to be remembered, and the one thing this corpus
 * refuses is a page quietly falling out of review.
 */
export const SLOT_FAMILIES: readonly GroupFamily[] = [
  { label: "边界页", members: FACE_SLOTS.filter((s) => BOUNDARY_SLOTS.includes(s)) },
  { label: "内容页", members: FACE_SLOTS.filter((s) => !BOUNDARY_SLOTS.includes(s)) },
]

/**
 * Headings for the 按版式 index.
 *
 * Read straight off the layout registry: a face declares which slide type it
 * draws and whether it is one of the four image takeovers, and that is
 * already the only grouping a face audit wants — the four openings sit
 * together, the content faces sit together, the takeovers are their own
 * short shelf. Nothing is hand-kept here, so nothing can rot: a face added
 * to the registry lands under its own heading on the next build.
 *
 * Boundary faces come first and last for the same reason `FACE_SLOTS` puts
 * them there — it is the order a deck is read in.
 */
export const FACE_FAMILIES: readonly GroupFamily[] = (() => {
  const labels: Array<[key: string, label: string]> = [
    ["cover", "封面脸"],
    ["chapter", "章节脸"],
    ["content", "内容脸"],
    ["takeover", "图像接管"],
    ["ending", "结尾脸"],
  ]
  const familyOf = (id: string): string => {
    const def = LAYOUT_REGISTRY[id]!
    return def.kind === "takeover" ? "takeover" : def.slideTypes[0]!
  }
  const ids = Object.keys(LAYOUT_REGISTRY).sort()
  return labels
    .map(([key, label]) => ({ label, members: ids.filter((id) => familyOf(id) === key) }))
    .filter((fam) => fam.members.length > 0)
})()

/**
 * Headings for the 按组件 index, grouped by what the component draws rather
 * than by the `kind` it usually serves.
 *
 * This is a visual review, and the question a reviewer scans the index with
 * is "show me the charts" or "show me the card families" — never "show me
 * everything the `data` kind can reach for". The semantic table in
 * `skills/pptwise/references/components.md` answers the other question and
 * stays the place for it.
 *
 * Hand-kept, because nothing in the engine groups components this way. That
 * makes it the one list here that can rot, so `scripts/gallery.test.mts`
 * fails in both directions: a component the corpus builds and this table
 * does not name, and a name here the corpus no longer builds.
 */
export const COMPONENT_FAMILIES: readonly GroupFamily[] = [
  {
    label: "文字",
    members: [
      "paragraph",
      "bullets",
      "blockquote",
      "code",
      "callout",
      "insight_panel",
      "verdict_banner",
      "tag_row",
    ],
  },
  { label: "卡片", members: ["kpi_cards", "icon_cards", "numbered_cards", "row_cards", "people_cards"] },
  {
    label: "图表",
    members: [
      "chart · line",
      "chart · bar",
      "chart · bar horizontal",
      "chart · area",
      "chart · pie",
      "chart · donut",
      "chart · scatter",
      "chart · funnel",
      "chart · gauge",
      "chart · dumbbell",
      "waterfall",
      "sankey",
      "progress_donuts",
    ],
  },
  {
    label: "表格与框架",
    members: ["data_table", "heatmap", "matrix", "comparison", "swot", "bmc", "pest", "five_forces"],
  },
  {
    label: "流程与结构",
    members: ["steps", "flowchart", "cycle", "hub_spoke", "rings", "architecture", "timeline", "roadmap", "gantt"],
  },
  {
    label: "图像",
    // `device_mockup` files under both its devices, the way `chart` files
    // under each of its drawings: one type name, a browser window and a phone.
    members: ["image", "image_grid", "image_compare", "device_mockup · browser", "device_mockup · phone"],
  },
]

/**
 * Embed a function's own source in the page's script block, under a name the
 * page controls.
 *
 * Two things make a copied-out function stop working, and both are silent.
 *
 * `tsx` and Vite run esbuild with `keepNames: true`, which appends a
 * `__name(fn, "fn")` call after every named declaration — referencing a
 * helper that exists in the Node module scope and nowhere in a standalone
 * page. Stripping it is what makes the embedded copy runnable at all, the
 * same problem `serializePageFunction` solves for the browser audit.
 *
 * The second is the name. `Function.prototype.toString` returns the source as
 * it stands now, not as it was written: run this generator through anything
 * that renames — a minified build, esbuild without `keepNames` — and the
 * declaration arrives as `function $l(...)` while the call sites below still
 * say `verdictOf`'s spelling. The page then throws `ReferenceError` on the
 * first card and the whole review shell is unusable. So the source is bound
 * here, to the name the script uses, and whatever the function calls itself
 * inside that expression stops mattering.
 *
 * The checks are the rest of the contract: the source has to be usable as an
 * expression, and it has to survive being pasted into an HTML `<script>`
 * inside a template literal. A rule that fails any of them is a build error
 * rather than a page that loads and misbehaves.
 */
export function inlineRule(name: string, fn: (...args: never[]) => unknown): string {
  const source = fn.toString().replace(/__name\([^)]*\);?/g, "").trim()
  const fail = (why: string): never => {
    throw new Error(`cannot embed ${name} in the gallery shell: ${why} — see inlineRule in evals/gallery/html.ts`)
  }
  if (!/^(async\s+)?function\b|^\(|^[A-Za-z_$][\w$]*\s*=>/.test(source)) {
    fail("the source is not a plain function expression")
  }
  if (source.includes("__name(")) fail("an esbuild keepNames wrapper survived")
  if (source.includes("`")) fail("a backtick would close the template literal building this page")
  if (source.includes("${")) fail("a template placeholder would be interpolated at build time")
  if (/<\/script/i.test(source)) fail("the text would close the script block")
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7F]/.test(source)) fail("a non-ASCII character would depend on the page's charset")
  return `const ${name} = (${source});`
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
  // A manifest can arrive from `--from`, which means it can be older than
  // this page builder. Say so here rather than shipping a review page whose
  // design cards are silently missing — a reviewer would read that as "these
  // themes have nothing to say", which is a different and wrong statement.
  if (manifest.manifestVersion !== MANIFEST_VERSION) {
    throw new Error(
      `this gallery manifest is version ${String(manifest.manifestVersion)} and the review page is built for version ${MANIFEST_VERSION}. Re-render it with \`pnpm gallery\` first.`,
    )
  }
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

/* One theme's whole menu in one strip, at its section head: fourteen slots,
   the face each is mapped to, an em-dash where the menu declines the kind.
   Hairline-separated cells over the line colour rather than boxes with their
   own borders — an index the eye can skip, not a second headline. */
.skeleton {
  display: flex; gap: 1px; margin: 10px 0 0; overflow-x: auto;
  background: var(--line); border: 1px solid var(--line); border-radius: 8px;
}
.skcell {
  appearance: none; font: inherit; text-align: left; padding: 4px 7px 5px; border: 0;
  flex: 1 1 0; min-width: 68px; display: flex; flex-direction: column; gap: 1px;
  background: var(--panel); color: var(--ink); cursor: pointer;
}
.skcell:hover:not(:disabled) { background: var(--stage); }
.skcell:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
.skcell:disabled { cursor: default; }
.sksl { font-size: 10px; line-height: 1.4; color: var(--ink-dim); }
.skface { font: 500 10.5px/1.4 ui-monospace, "SF Mono", Menlo, monospace; overflow-wrap: anywhere; }
.skcell.is-off .skface { color: var(--ink-dim); }
/* Where a jump landed. Loud for a moment, then gone — the reviewer needs to
   find the card once, not to keep looking at a highlighted one. */
.card.is-target { outline: 2px solid var(--focus); outline-offset: 2px; }
/* ── the two cross-cut views ────────────────────────────────────────────
   Both are two levels deep: an index of one tile per group, then that one
   group across every theme. The heading of whichever level is on screen is
   the first thing in the main column, so the reviewer always knows which of
   the three views they are in and how deep. */
.viewhead { margin: 2px 0 16px; }
.viewhead h2 {
  margin: 0; font-size: 20px; letter-spacing: -0.01em;
  display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
}
.viewhead h2 code { font: 650 19px/1.25 ui-monospace, "SF Mono", Menlo, monospace; color: var(--ink); }
.viewhead h2 code.sub { font-size: 13px; font-weight: 500; color: var(--ink-dim); }
.viewhead h2 .n { font-weight: 400; font-size: 13px; color: var(--ink-dim); font-variant-numeric: tabular-nums; }
.viewhead p { margin: 4px 0 0; color: var(--ink-dim); font-size: 13px; max-width: 70ch; }

.crumbs { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0 0 12px; }
.crumbs .where { color: var(--ink-dim); font-size: 13px; }
.crumbs .where::before { content: "› "; }
.crumbs .btn[disabled] { opacity: 0.4; cursor: default; }
.crumbs .btn[disabled]:hover { background: var(--panel); }

/* A rule per family. With 48 tiles under six headings the grouping is the
   only thing telling the reviewer where they are, so it gets a line rather
   than relying on white space alone. */
.famhead { margin: 24px 0 10px; padding-top: 11px; border-top: 1px solid var(--line); }
.famhead h3 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -0.01em; }
.famhead h3 span { font-weight: 400; font-size: 12px; color: var(--ink-dim); margin-left: 8px; font-variant-numeric: tabular-nums; }
/* On 按版式 the heading is also the way in: a family is a comparison in its
   own right (all six covers side by side), so it opens like a tile does.
   Styled as the heading it already was rather than as a button, with the
   arrow and the hover rule carrying the affordance. */
.famhead h3 button.famopen {
  appearance: none; border: 0; background: transparent; padding: 0; margin: 0;
  font: inherit; color: inherit; letter-spacing: inherit; cursor: pointer;
}
.famhead h3 button.famopen::after { content: " →"; font-weight: 400; color: var(--ink-dim); }
.famhead h3 button.famopen:hover { text-decoration: underline; text-underline-offset: 3px; }
.famhead h3 button.famopen:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; border-radius: 4px; }

/* The face's identity card. A reference the reviewer reads once on the way
   in, so it is a quiet block above the grid rather than a panel competing
   with the slides — one row per 讲法, the themes that route it here in mono
   because they are ids, and the count right-aligned so a face served by two
   themes is distinguishable from one served by twenty at a glance. */
.identity {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 9px 12px 10px; margin: 0 0 16px; max-width: 96ch;
}
.identity h4 { margin: 0 0 5px; font-size: 12px; font-weight: 650; color: var(--ink-dim); }
.idrow { display: flex; gap: 12px; align-items: baseline; padding: 4px 0; border-top: 1px solid var(--line); }
.idslot { flex: 0 0 96px; font-size: 12px; }
.idslot b { font-weight: 600; }
.idslot code { font: 500 11px/1.3 ui-monospace, "SF Mono", Menlo, monospace; color: var(--ink-dim); margin-left: 5px; }
.idthemes {
  flex: 1 1 auto; min-width: 0; word-break: break-word;
  font: 500 11px/1.5 ui-monospace, "SF Mono", Menlo, monospace; color: var(--ink-dim);
}
.idn { flex: 0 0 auto; font-size: 11px; color: var(--ink-dim); font-variant-numeric: tabular-nums; }
.idnote { font-size: 12px; color: var(--ink-dim); }

/* The design card: what this theme or component is, who it is for, and when
   not to reach for it. It sits where the reviewer arrives — the section head
   on 按主题, the group head on 按组件 — because "is this good" is not a
   question anyone can answer without first knowing what it was trying to be.
   Quiet like the identity card above, with the name carrying the only weight
   and the 不适用 line tinted so the reverse positioning is findable at a
   glance, since that is the line that catches a misuse. */
.dstory {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 10px 12px 11px; margin: 0 0 16px; max-width: 96ch;
}
.dstory h4 { margin: 0; font-size: 14px; font-weight: 650; letter-spacing: -0.01em; }
.dstory p { margin: 6px 0 0; font-size: 13px; line-height: 1.6; }
.drow { display: flex; gap: 10px; align-items: baseline; margin-top: 5px; }
.dkey { flex: 0 0 42px; font-size: 11px; font-weight: 600; color: var(--ink-dim); }
.dval { flex: 1 1 auto; min-width: 0; font-size: 12px; line-height: 1.6; }
.dstory .no .dval { color: var(--ink-dim); }
/* Untranslated copy still reads — in English, tagged, so the gap is a work
   list rather than a blank. */
.dtag {
  margin-left: 6px; padding: 0 4px; border: 1px solid var(--line); border-radius: 3px;
  font-size: 10px; line-height: 1.5; color: var(--ink-dim); vertical-align: 1px; white-space: nowrap;
}

.groupgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr)); gap: 14px; }
.gcard {
  appearance: none; font: inherit; color: var(--ink); text-align: left; padding: 0; cursor: pointer;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius);
  overflow: hidden; display: flex; flex-direction: column;
}
.gcard:hover { border-color: var(--ink-dim); }
.gcard:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
.gcard .gstage { position: relative; aspect-ratio: ${manifest.slide.width} / ${manifest.slide.height}; background: var(--stage); overflow: hidden; }
.gcard .gstage svg { display: block; width: 100%; height: 100%; }
/* How far this group has been judged, in the verdict colours the cards use.
   The track is the unjudged remainder — the index is also a work list. */
.gbar { display: flex; height: 4px; background: var(--line); }
.gbar i { display: block; height: 100%; }
.gbar .b-pass { background: var(--pass); }
.gbar .b-limit { background: var(--limit); }
.gbar .b-rework { background: var(--rework); }
.gname { padding: 8px 10px 1px; display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
.gname b { font-weight: 650; font-size: 13px; }
.gname code { font: 600 12px/1.35 ui-monospace, "SF Mono", Menlo, monospace; word-break: break-word; }
.gname code.sub { font-weight: 500; font-size: 11px; color: var(--ink-dim); }
.gfacts { padding: 0 10px 9px; color: var(--ink-dim); font-size: 12px; font-variant-numeric: tabular-nums; }

#quickmap { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; padding: 14px 18px 4px; }
/* The hidden attribute alone loses to the display rule above, and the
   quickmap stands down outside the theme view — see syncChrome. */
#quickmap[hidden] { display: none; }
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

/* Leaving one axis for another, from the page that raised the question.
   Quiet buttons: they are a way out of the current comparison, not a
   verdict, and they must not compete with the three that are. */
.crossjump { display: flex; gap: 6px; flex-wrap: wrap; }
.crossjump:empty { display: none; }
.crossjump button {
  appearance: none; font: inherit; font-size: 12px; padding: 5px 9px; cursor: pointer;
  background: transparent; color: var(--ink); white-space: nowrap;
  border: 1px solid var(--line); border-radius: 7px;
}
.crossjump button:hover { background: var(--stage); }
.crossjump code { font: 500 11px/1 ui-monospace, "SF Mono", Menlo, monospace; color: var(--ink-dim); margin: 0 6px; }

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
    <button data-view="face" aria-pressed="false">按版式</button>
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
      <div class="crossjump" id="viewer-cross"></div>
      <ul class="findings-list" id="viewer-findings"></ul>
      <input class="note" id="viewer-note" placeholder="备注（自动保存）">
      <span class="hint"><kbd>←</kbd><kbd>→</kbd> 翻页 · <span id="viewer-facehint" hidden><kbd>[</kbd><kbd>]</kbd> 换脸 · </span><kbd>Esc</kbd> 关闭</span>
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
  const SLOT_LABELS = ${jsonScript(SLOT_LABELS)};
  const STORY_ZH = ${jsonScript(STORY_ZH)};
  // The menu slots in reading order — the two openings, the eleven content
  // kinds, the close. Shipped rather than read off SLOT_LABELS' key order,
  // which happens to match but would be a silent dependency on it.
  const SLOT_ORDER = ${jsonScript(FACE_SLOTS)};
  // Headings and group order for the three cross-cut indexes. The slot half is
  // built from the corpus' own slot list rather than from whatever order this
  // build's menus happened to emit, and the face half off the layout registry.
  const SLOT_FAMILIES = ${jsonScript(SLOT_FAMILIES)};
  const FACE_FAMILIES = ${jsonScript(FACE_FAMILIES)};
  const COMPONENT_FAMILIES = ${jsonScript(COMPONENT_FAMILIES)};
  const SECTION_ORDER = new Map(MANIFEST.sections.map((s, i) => [s.id, i]));
  // A section carrying a menu is a theme. The appendix is a pile of faces no
  // menu offers, so it has none — which is how the face identity card knows
  // to say "nobody serves this" instead of naming the appendix as a theme.
  const THEME_SECTIONS = new Set(MANIFEST.sections.filter((s) => s.menu).map((s) => s.id));

  /**
   * The pages 按版式 is allowed to show: exactly one per theme-and-face pair.
   *
   * Both bands name the face that drew them, so the axis used to take both —
   * and a deck page's face is whatever its own theme's menu picked, which is
   * by construction the face band's specimen for the same theme and slot. On
   * this build that put 197 of the 330 pairs on screen twice and 35 of them
   * three times, with the deck band contributing not one pair the face band
   * lacked. The reviewer was comparing faces and got shown the same theme's
   * answer two and three times in a row.
   *
   * So the face band wins the pair and the deck band leaves this axis
   * entirely (按主题 still shows every deck page, untouched). The deck page is
   * kept only as a fallback for a pair the face band has no specimen for —
   * today there are none, and scripts/gallery.test.mts fails if a menu
   * change ever creates one, so the fallback is a safety net rather than a
   * quietly-load-bearing path.
   *
   * Decided once, off the whole manifest, rather than per filter pass: which
   * page represents a pair is a fact about the corpus, and deriving it from
   * the filtered set would resurrect a deck page the moment a filter hid its
   * face-band twin.
   */
  const FACE_AXIS_IDS = (() => {
    const chosen = new Map();
    for (const p of MANIFEST.pages) {
      if (p.face === undefined) continue;
      // Section rather than theme so the appendix — whose pages are drawn on
      // the baseline skin but belong to no theme — keeps its own specimens.
      const key = p.section + " " + p.face;
      const held = chosen.get(key);
      if (!held || (held.band !== "face" && p.band === "face")) chosen.set(key, p);
    }
    const ids = new Set();
    for (const p of chosen.values()) ids.add(p.id);
    return ids;
  })();

  // Shipped in as source rather than restated here, so the rule the reviewer
  // sees is byte-for-byte the one render.test.mts tests. See its own doc
  // comment in render.ts for why it is written to survive toString().
${inlineRule("verdictFreshness", verdictFreshness)}

  const VERDICT_LABELS = { pass: "通过", limit: "限制使用", rework: "返工" };
  const VERDICT_FLOOR_REASON = "这一页丢了内容且页面上没有任何提示，至少是 rework";
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

  // The floor, embedded verbatim from verdict.ts so this shell and the
  // automated merge cannot drift apart about a machine-checkable fact.
  ${inlineRule("effectiveVerdict", effectiveVerdict)}

  const findingCodesOf = (id) => ((pageById.get(id) || {}).findings || []).map((f) => f.code);
  /** What this page's verdict is, after the floor. Every reader uses it. */
  const verdictOf = (id) => effectiveVerdict((verdicts[id] || {}).verdict, findingCodesOf(id)).verdict;
  /** True when the page dropped content, so pass and limit are not available. */
  const floored = (id) => findingCodesOf(id).indexOf("content-dropped") !== -1;

  // A verdict already in storage was saved before the floor existed, or under
  // an older build of the same page. It is normalized on load rather than
  // left to be exported as a pass over a page that lost content.
  {
    let changed = false;
    for (const id of Object.keys(verdicts)) {
      const stored = verdicts[id].verdict;
      const eff = effectiveVerdict(stored, findingCodesOf(id));
      if (eff.coerced && eff.verdict !== stored) { verdicts[id].verdict = eff.verdict; changed = true; }
    }
    if (changed) save();
  }

  function setVerdict(id, value) {
    const e = entry(id);
    const next = e.verdict === value ? undefined : value;
    // Coerced rather than refused: the buttons for an unavailable grade are
    // disabled, and a keyboard shortcut still lands on the honest answer.
    e.verdict = effectiveVerdict(next, findingCodesOf(id)).verdict;
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
    return (text || "").replaceAll("**", "");
  }

  function cardFacts(p) {
    // Inside a group detail the heading already named the group, so the facts
    // line drops whatever it repeats and keeps only what varies card to card.
    // A family detail has a sub-heading per face doing the same job.
    const detail = activeGroup() !== null || activeFamily() !== null;
    const bits = [];
    // On a component page the subject is the component id — constant down a
    // component detail, so the heading has it covered. Same for the face id
    // down a 版式 detail. On a face page in the 讲法 view it is the layout
    // this theme's menu picked for the slot, which is the whole thing that
    // detail exists to compare, so it stays.
    if (state.view !== "theme" && !(detail && (state.view === "component" || state.view === "face"))) {
      bits.push(p.subject);
    }
    if (p.band === "deck") bits.push("第 " + p.page + " / " + p.pageCount + " 页", p.slideType);
    // A slot already names the slide type it belongs to, and every component
    // page is a content page — saying so again is noise on 1500 cards. Down a
    // 版式 detail the slot is the variable, and a deck page has one to show
    // even though it carries no menu slot of its own.
    const slot = state.view === "face" ? p.faceSlot : p.slot;
    if (slot && !(detail && state.view === "slot")) {
      bits.push(SLOT_LABELS[slot] ? SLOT_LABELS[slot] + " " + slot : slot);
    }
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
      // A page whose manifest says it dropped content is at least rework, so
      // the other two grades are not on offer and the button says why.
      if (key !== "rework" && floored(p.id)) {
        btn.disabled = true;
        btn.title = VERDICT_FLOOR_REASON;
      }
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
    const v = verdictOf(id);
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
      const v = verdictOf(p.id);
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
      const v = verdictOf(p.id);
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

  // The same deal for the cross-cut index's group tiles. They are rebuilt on
  // every filter change, and mounting 48 documents per debounced keystroke is
  // the kind of cost that makes a 36MB page feel broken.
  const thumbIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      if (mountSvg(e.target, e.target.dataset.page)) thumbIo.unobserve(e.target);
    }
  }, { rootMargin: "600px 0px" });

  // ── filtering and layout ───────────────────────────────────────────────
  // Three views over one set of rendered pages. The two cross-cut views add
  // no render at all: they regroup the same manifest, so the theme axis and
  // the "how does this one face look across all 24 skins" axis cost the same
  // four seconds of generation.
  //
  // Both cross-cut views are two levels deep. Flat, they were one page of 48
  // stacked 26-card rows with nothing to say where one comparison ended and
  // the next began — the reviewer could not see the organization, so there
  // was effectively none. An index of one tile per group answers "what is in
  // here" on the first screen, and a detail answers "how does this one thing
  // look everywhere" with nothing else on the page competing.
  const CROSS = {
    slot: {
      key: "slot",
      label: "按讲法",
      unit: "种讲法",
      noun: "讲法",
      lead: "一格一种讲法，点开看每套主题的菜单给它派了哪张脸。",
      families: SLOT_FAMILIES,
      nameOf: (v) => ({ zh: SLOT_LABELS[v] || "", code: v }),
      // The eleven content moves have a card; 封面/章节/结尾 are boundary
      // pages, not moves, and get none rather than an empty one.
      detailHead: (v) => designCard("kind:" + v),
    },
    // 按讲法 judges the menus: one kind, 24 answers. 按版式 judges the face
    // code itself: one face, everywhere it was sent — across themes and
    // across the kinds different menus point at it for. Same drill-down,
    // opposite question.
    face: {
      key: "face",
      label: "按版式",
      unit: "张脸",
      noun: "张脸",
      lead: "一格一张脸，点开看同一段版式代码被派到各主题上画出来的样子。这条轴比的是脸，所以一套主题一张脸只留一张样张（骨架全脸那一张）：样张带里画法相同的重复页不上轴，组件皮肤那一带也不上轴，它们比的是组件，会把脸淹掉。",
      families: FACE_FAMILIES,
      nameOf: (v) => ({ zh: "", code: v }),
      // Two statements about one face: its own account of itself, then the
      // record of every menu that sends work here.
      detailHead: (v) => {
        const both = document.createDocumentFragment();
        const card = designCard("layout:" + v);
        if (card) both.appendChild(card);
        const routes = faceIdentity(v);
        if (routes) both.appendChild(routes);
        return both.childNodes.length > 0 ? both : null;
      },
    },
    component: {
      key: "component",
      label: "按组件",
      unit: "个组件",
      noun: "组件",
      lead: "一格一个组件，点开看它穿上每套主题的皮各画成什么样。",
      families: COMPONENT_FAMILIES,
      nameOf: (v) => ({ zh: "", code: v }),
      // "chart · pie" and "device_mockup · phone" are drawings of a
      // component, not components. They share the component's card.
      detailHead: (v) => designCard("component:" + v.split(" · ")[0]),
    },
  };

  const groupLabel = (view, value) => {
    const n = view.nameOf(value);
    return n.zh ? n.zh + " " + n.code : n.code;
  };

  /**
   * Every group this build actually has, in family order. Anything the family
   * table does not name is appended under 其他 rather than dropped: a gallery
   * that silently hides a component from review is the one failure this
   * corpus refuses (see assertFullCoverage in matrix.ts), and a visible
   * 其他 heading is how that refusal reaches the reviewer's eye.
   */
  function groupPlan(view) {
    const present = new Set();
    for (const p of MANIFEST.pages) if (p[view.key] !== undefined) present.add(p[view.key]);
    const plan = [];
    const placed = new Set();
    for (const fam of view.families) {
      const members = fam.members.filter((m) => present.has(m));
      for (const m of members) placed.add(m);
      if (members.length > 0) plan.push({ label: fam.label, members });
    }
    const rest = [...present].filter((m) => !placed.has(m)).sort();
    if (rest.length > 0) plan.push({ label: "其他", members: rest });
    return plan;
  }

  const CROSS_KEYS = ["slot", "face", "component"];
  const PLANS = {};
  const FAMILY_OF = {};
  for (const key of CROSS_KEYS) {
    PLANS[key] = groupPlan(CROSS[key]);
    FAMILY_OF[key] = new Map();
    for (const fam of PLANS[key]) for (const m of fam.members) FAMILY_OF[key].set(m, fam.label);
  }

  const state = {
    view: "theme",
    // Which group each cross-cut view is drilled into, null on its index.
    // Kept per view so tabbing away and back puts the reviewer where they
    // left off instead of at the top of the index — and so no view can ever
    // be handed another's group id.
    group: { slot: null, face: null, component: null },
    // 按版式 only: the family being browsed whole, one grid per face under it.
    // A family is a comparison of its own — all six covers, all four
    // takeovers — and it sits between the index and a single face.
    family: null,
    language: "all", theme: "all", verdict: "all", finding: "all", query: "",
  };
  const activeGroup = () => (state.view === "theme" ? null : state.group[state.view]);
  const activeFamily = () => (state.view === "face" && activeGroup() === null ? state.family : null);
  let visible = [];

  /**
   * Everything narrowing the set except which group is drilled into: the
   * view's own band, and the header's five filters.
   *
   * Split out because 按版式's lightbox pages through a whole family, which
   * is wider than the one face on screen — it needs the reviewer's filters
   * without the group narrowing that matches() adds on top.
   */
  function passesFilters(p) {
    // The cross-cut views only have rows for one band each, so a page from
    // another band is not "filtered out", it has nowhere to go. 按版式 picks
    // its own set: one specimen per theme-and-face pair, see FACE_AXIS_IDS.
    if (state.view === "slot" && p.band !== "face") return false;
    if (state.view === "component" && p.band !== "component") return false;
    if (state.view === "face" && !FACE_AXIS_IDS.has(p.id)) return false;
    if (state.language !== "all" && p.language !== state.language) return false;
    if (state.theme !== "all" && p.section !== state.theme) return false;
    if (state.verdict !== "all") {
      const v = verdictOf(p.id);
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

  /**
   * What is on screen: the filters, plus whichever level of the cross-cut
   * view the reviewer has drilled to.
   *
   * Inside a group detail the group is a filter like any other. That is what
   * scopes the header tally, the empty state and the grid to one comparison.
   */
  function matches(p) {
    if (!passesFilters(p)) return false;
    const group = activeGroup();
    if (group !== null) return p[CROSS[state.view].key] === group;
    const family = activeFamily();
    if (family !== null) return FAMILY_OF.face.get(p.face) === family;
    return true;
  }

  function grid(pages, className) {
    const box = document.createElement("div");
    box.className = className;
    for (const p of pages) box.appendChild(buildCard(p));
    return box;
  }

  /**
   * Put one card in front of the reviewer without disturbing anything else.
   *
   * Used by every jump that lands somewhere already on screen — the skeleton
   * strip and the viewer's cross-axis buttons. Returns false when the page is
   * filtered out, which is the caller's cue to say so rather than to scroll
   * nowhere and look broken.
   */
  function revealCard(id) {
    const c = cards.get(id);
    if (!c) return false;
    c.card.scrollIntoView({ behavior: "smooth", block: "center" });
    c.card.classList.add("is-target");
    setTimeout(() => c.card.classList.remove("is-target"), 1500);
    return true;
  }

  /**
   * One theme's menu, laid out slot by slot at its section head.
   *
   * The band headings below it answer "how does this theme draw"; this
   * answers "what is this theme made of" — fourteen slots, one face each,
   * an em-dash where the menu declines the kind. Read off the manifest's own
   * section menu, which is read off the theme, so it cannot drift from the
   * pages under it.
   *
   * A cell is a jump to that slot's page: the face band's, which exists to
   * show exactly that menu choice, or a deck page carrying the same face when
   * the face band was not built.
   */
  function skeletonStrip(section) {
    const strip = document.createElement("div");
    strip.className = "skeleton";
    strip.setAttribute("role", "group");
    strip.setAttribute("aria-label", section.label + " 的菜单骨架");
    for (const slot of SLOT_ORDER) {
      const face = section.menu[slot];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "skcell" + (face ? "" : " is-off");
      cell.appendChild(headText("span", "sksl", SLOT_LABELS[slot] || slot));
      cell.appendChild(headText("span", "skface", face || "—"));
      if (!face) {
        cell.disabled = true;
        cell.title = section.label + " 的菜单不提供 " + slot + " 这一讲法";
        strip.appendChild(cell);
        continue;
      }
      const target =
        visible.find((p) => p.section === section.id && p.band === "face" && p.slot === slot) ||
        visible.find((p) => p.section === section.id && p.faceSlot === slot);
      if (!target) {
        cell.disabled = true;
        cell.title = "当前筛选下没有 " + slot + " → " + face + " 这一页";
      } else {
        cell.title = "跳到 " + slot + " → " + face;
        cell.addEventListener("click", () => revealCard(target.id));
      }
      strip.appendChild(cell);
    }
    return strip;
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
      const story = designCard("theme:" + section.id);
      if (story) head.appendChild(story);
      // The appendix has no menu — it is what no menu asked for — so it gets
      // no strip rather than a row of em-dashes pretending to be one.
      if (section.menu) head.appendChild(skeletonStrip(section));
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

  /** Theme order, the axis every cross-cut group is compared along. */
  function bySection(a, b) {
    const d = (SECTION_ORDER.get(a.section) ?? 0) - (SECTION_ORDER.get(b.section) ?? 0);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  }

  function emptyNote() {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "没有符合条件的页面。";
    return empty;
  }

  /** Heading for whichever level of a cross-cut view is on screen. */
  function viewHead(parts, lead) {
    const head = document.createElement("div");
    head.className = "viewhead";
    const h2 = document.createElement("h2");
    for (const part of parts) h2.appendChild(part);
    head.appendChild(h2);
    if (lead) {
      const p = document.createElement("p");
      p.textContent = lead;
      head.appendChild(p);
    }
    return head;
  }

  const headText = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    return el;
  };

  /**
   * Level one: one tile per group, under its family heading.
   *
   * The tile carries the first page of the detail it opens, so the thumbnail
   * the reviewer clicked is the first slide they land on, and a verdict bar
   * so the index doubles as the work list — which of the 48 still need a look.
   */
  function renderGroupIndex(main, view) {
    const byGroup = new Map();
    for (const p of visible) {
      const value = p[view.key];
      if (value === undefined) continue;
      const list = byGroup.get(value) || [];
      list.push(p);
      byGroup.set(value, list);
    }

    const plan = PLANS[view.key];
    const total = plan.reduce((n, fam) => n + fam.members.length, 0);
    const shown = byGroup.size === total ? String(total) : byGroup.size + " / " + total;
    main.appendChild(
      viewHead([headText("span", "", view.label), headText("span", "n", shown + " " + view.unit)], view.lead),
    );

    for (const fam of plan) {
      const members = fam.members.filter((m) => byGroup.has(m));
      if (members.length === 0) continue;
      const famHead = document.createElement("div");
      famHead.className = "famhead";
      const h3 = document.createElement("h3");
      // On 按版式 the heading opens the family whole — every face in it, one
      // grid each. The other two indexes keep a plain heading: their families
      // are filing, not a comparison anybody asked to see side by side.
      if (view.key === "face") {
        const open = document.createElement("button");
        open.type = "button";
        open.className = "famopen";
        open.textContent = fam.label;
        open.title = "把" + fam.label + "整族一起看";
        open.addEventListener("click", () => openFamily(fam.label));
        h3.appendChild(open);
      } else {
        h3.appendChild(document.createTextNode(fam.label));
      }
      const count = document.createElement("span");
      count.textContent =
        members.length + " " + view.unit + " · " + members.reduce((n, m) => n + byGroup.get(m).length, 0) + " 张";
      h3.appendChild(count);
      famHead.appendChild(h3);
      const box = document.createElement("div");
      box.className = "groupgrid";
      for (const m of members) box.appendChild(buildGroupCard(view, m, byGroup.get(m)));
      main.append(famHead, box);
    }
  }

  function buildGroupCard(view, value, pages) {
    const ordered = pages.slice().sort(bySection);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "gcard";
    cell.dataset.group = value;
    cell.title = "打开 " + groupLabel(view, value);

    const stage = document.createElement("div");
    stage.className = "gstage";
    const sample = ordered.find((p) => !p.skipped);
    if (sample) {
      stage.dataset.page = sample.id;
      thumbIo.observe(stage);
    } else {
      // Nothing in this group rendered. An empty grey tile would be
      // indistinguishable from one still mounting, so it says so.
      stage.appendChild(headText("div", "skip", "未能渲染"));
    }

    const bar = document.createElement("div");
    bar.className = "gbar";
    let judged = 0;
    for (const key of ["pass", "limit", "rework"]) {
      const n = ordered.filter((p) => verdictOf(p.id) === key).length;
      judged += n;
      if (n === 0) continue;
      const seg = document.createElement("i");
      seg.className = "b-" + key;
      seg.style.width = (n / ordered.length) * 100 + "%";
      bar.appendChild(seg);
    }

    const name = document.createElement("div");
    name.className = "gname";
    const parts = view.nameOf(value);
    if (parts.zh) name.appendChild(headText("b", "", parts.zh));
    name.appendChild(headText("code", parts.zh ? "sub" : "", parts.code));

    cell.append(stage, bar, name, headText("div", "gfacts", ordered.length + " 张 · 已评 " + judged));
    cell.addEventListener("click", () => openGroup(view.key, value));
    return cell;
  }

  /**
   * The face's identity card: every menu choice that leads here.
   *
   * A face is reused, and that reuse is the thing a face audit has to hold in
   * mind — the same code draws brief's 要点 and museum's 清单, so a
   * change that suits one can break the other. The card is the reverse of the
   * menu lookup, one row per 讲法 and the themes that route it here.
   *
   * Read off every page on the axis rather than off the filtered set: this
   * is who the face is, not who happens to be on screen. Read off page
   * metadata rather than a second copy of the menus, so it cannot disagree
   * with the pages under it — and off the same deduped set the grid below
   * draws from, so the card cannot count a theme the grid does not show.
   */
  function faceIdentity(faceId) {
    const bySlot = new Map();
    for (const p of MANIFEST.pages) {
      if (!FACE_AXIS_IDS.has(p.id)) continue;
      if (p.face !== faceId || p.faceSlot === undefined) continue;
      const seen = bySlot.get(p.faceSlot) || new Set();
      seen.add(p.section);
      bySlot.set(p.faceSlot, seen);
    }
    if (bySlot.size === 0) return null;

    const box = document.createElement("div");
    box.className = "identity";

    const served = [...bySlot].filter(([, secs]) => [...secs].some((s) => THEME_SECTIONS.has(s)));
    if (served.length === 0) {
      box.appendChild(headText("div", "idnote", "没有任何主题菜单点过这张脸，它只在未上菜版式那一节里露过面。"));
      return box;
    }

    const themes = new Set();
    for (const [, secs] of served) for (const s of secs) if (THEME_SECTIONS.has(s)) themes.add(s);
    box.appendChild(
      headText("h4", "", "这张脸的来路 · " + themes.size + " 套主题 · " + served.length + " 种讲法"),
    );

    served.sort((a, b) => SLOT_ORDER.indexOf(a[0]) - SLOT_ORDER.indexOf(b[0]));
    for (const [slot, secs] of served) {
      const row = document.createElement("div");
      row.className = "idrow";
      const name = document.createElement("span");
      name.className = "idslot";
      if (SLOT_LABELS[slot]) name.appendChild(headText("b", "", SLOT_LABELS[slot]));
      name.appendChild(headText("code", "", slot));
      const list = [...secs].filter((s) => THEME_SECTIONS.has(s)).sort((a, b) => SECTION_ORDER.get(a) - SECTION_ORDER.get(b));
      const who = document.createElement("span");
      who.className = "idthemes";
      who.textContent = list.join(" ");
      who.title = list.length + " 套主题的菜单把 " + slot + " 派给了 " + faceId;
      row.append(name, who, headText("span", "idn", list.length + " 套"));
      box.appendChild(row);
    }
    return box;
  }

  /**
   * Level two: one group across every theme, ordered by theme, and nothing
   * else on the page. The visible set is already narrowed to it (see the
   * group branch in matches),
   * so the header tally and the viewer queue are scoped without asking.
   */
  function renderGroupDetail(main, view, value) {
    const crumbs = document.createElement("div");
    crumbs.className = "crumbs";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn";
    // Back to wherever this face was opened from: the family, when the
    // reviewer came in through one, otherwise the index. A back button that
    // skipped the level they were standing on would lose their place.
    const upFamily = view.key === "face" && state.family !== null ? state.family : null;
    back.textContent = "← " + (upFamily !== null ? upFamily : view.label);
    back.addEventListener("click", () => (upFamily !== null ? openFamily(upFamily) : openGroup(view.key, null)));
    crumbs.appendChild(back);
    const family = FAMILY_OF[view.key].get(value);
    if (family) crumbs.appendChild(headText("span", "where", family));
    crumbs.appendChild(headText("div", "spacer", ""));

    // Straight into the neighbouring group, so working the whole index does
    // not mean bouncing off it between every two comparisons.
    const flat = [];
    for (const fam of PLANS[view.key]) for (const m of fam.members) flat.push(m);
    const at = flat.indexOf(value);
    const nav = (delta, text) => {
      const neighbour = at < 0 ? undefined : flat[at + delta];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = text;
      if (neighbour === undefined) btn.disabled = true;
      else {
        btn.title = groupLabel(view, neighbour);
        // Walking off the end of a family carries the breadcrumb with it,
        // rather than leaving it pointing back at a family this face is no
        // longer in.
        const carry = upFamily !== null ? FAMILY_OF[view.key].get(neighbour) : undefined;
        btn.addEventListener("click", () => openGroup(view.key, neighbour, carry));
      }
      return btn;
    };
    crumbs.append(nav(-1, "← 上一" + view.noun), nav(1, "下一" + view.noun + " →"));
    main.appendChild(crumbs);

    const parts = view.nameOf(value);
    const head = [];
    if (parts.zh) head.push(headText("span", "", parts.zh), headText("code", "sub", parts.code));
    else head.push(headText("code", "", parts.code));
    head.push(headText("span", "n", visible.length + " 张"));
    main.appendChild(viewHead(head, ""));

    // Whatever this view wants said about the group itself before the pages
    // start: the group's own design card on 按讲法, 按版式 and 按组件, and on
    // 按版式 the record of which menus send work here as well.
    const card = view.detailHead ? view.detailHead(value) : null;
    if (card) main.appendChild(card);

    main.appendChild(visible.length === 0 ? emptyNote() : grid(visible.slice().sort(bySection), "grid"));
  }

  /**
   * The design card: one object's own account of itself.
   *
   * Read from the manifest, which reads it from the theme or the component
   * definition, so the card cannot describe a theme that is no longer the
   * theme on screen. Chinese comes from the translation table field by
   * field, and any field it has not reached falls back to the English source
   * under a 未译 tag — a reviewer who cannot read the field still gets to
   * read it, and the tag is the only place the remaining work is counted.
   */
  const STORY_FIELDS = [
    { key: "story", label: "是什么" },
    { key: "positioning", label: "何时用" },
    { key: "audience", label: "讲给谁" },
    { key: "notFor", label: "不适用" },
    { key: "lineage", label: "来路" },
  ];

  function designCard(objectId) {
    const story = MANIFEST.stories[objectId];
    if (!story) return null;
    const zh = STORY_ZH[objectId] || {};

    const box = document.createElement("div");
    box.className = "dstory";

    const h4 = document.createElement("h4");
    h4.textContent = zh.name || story.name;
    if (!zh.name) h4.appendChild(headText("span", "dtag", "未译"));
    box.appendChild(h4);

    for (const field of STORY_FIELDS) {
      const source = story[field.key];
      if (!source) continue;
      const row = document.createElement("div");
      row.className = "drow" + (field.key === "notFor" ? " no" : "");
      row.appendChild(headText("span", "dkey", field.label));
      const val = document.createElement("span");
      val.className = "dval";
      val.textContent = zh[field.key] || source;
      if (!zh[field.key]) {
        val.appendChild(headText("span", "dtag", "未译"));
        val.title = source;
      }
      row.appendChild(val);
      box.appendChild(row);
    }
    return box;
  }

  /**
   * The level between the 按版式 index and one face: a whole family, face by
   * face, one sub-heading and one grid each.
   *
   * The index answers "what faces are there" and a face detail answers "how
   * does this one draw everywhere". Neither answers the question a face
   * audit actually opens with — are these six covers six different ideas, or
   * the same idea six times — because that one needs them on the same screen.
   * The lightbox already pages the whole family (see familyQueue), so this is
   * the level that queue was always implying.
   *
   * Each sub-heading is a way down into the single face, and the breadcrumb
   * there comes back here.
   */
  function renderFamilyDetail(main, label) {
    const view = CROSS.face;
    const crumbs = document.createElement("div");
    crumbs.className = "crumbs";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn";
    back.textContent = "← " + view.label;
    back.addEventListener("click", () => openGroup("face", null));
    crumbs.appendChild(back);
    crumbs.appendChild(headText("div", "spacer", ""));

    const labels = PLANS.face.map((f) => f.label);
    const at = labels.indexOf(label);
    const nav = (delta, text) => {
      const neighbour = at < 0 ? undefined : labels[at + delta];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = text;
      if (neighbour === undefined) btn.disabled = true;
      else {
        btn.title = neighbour;
        btn.addEventListener("click", () => openFamily(neighbour));
      }
      return btn;
    };
    crumbs.append(nav(-1, "← 上一族"), nav(1, "下一族 →"));
    main.appendChild(crumbs);

    const members = (PLANS.face[at] || { members: [] }).members;
    const byFace = new Map();
    for (const p of visible) {
      const list = byFace.get(p.face) || [];
      list.push(p);
      byFace.set(p.face, list);
    }
    const present = members.filter((m) => byFace.has(m));
    main.appendChild(
      viewHead(
        [
          headText("span", "", label),
          headText("span", "n", present.length + " 张脸 · " + visible.length + " 张"),
        ],
        "整族一起看：一张脸一格，每格里是各主题的答卷。点小标题只看那一张脸，点幻灯片进灯箱，← → 会一路走完整族。",
      ),
    );

    if (present.length === 0) {
      main.appendChild(emptyNote());
      return;
    }

    for (const face of present) {
      const pages = byFace.get(face).slice().sort(bySection);
      const head = document.createElement("div");
      head.className = "famhead";
      const h3 = document.createElement("h3");
      const open = document.createElement("button");
      open.type = "button";
      open.className = "famopen";
      open.textContent = face;
      open.title = "只看 " + face;
      open.addEventListener("click", () => openGroup("face", face, label));
      h3.appendChild(open);
      h3.appendChild(headText("span", "", pages.length + " 张"));
      head.appendChild(h3);
      main.append(head, grid(pages, "grid"));
    }
  }

  /**
   * The two axes a page can be left along, and the keys that take them.
   *
   * A page sits on more than one axis at once — this deck page was drawn by a
   * face, that page is one component — and judging it is what raises the
   * neighbouring question: is this face like this everywhere, or is this one
   * theme's problem? Answering it used to mean closing the viewer, switching
   * tabs, and finding the tile. These are that trip in one key.
   */
  const CROSS_JUMPS = [
    { key: "f", view: "face", label: "按此版式" },
    { key: "c", view: "component", label: "按此组件" },
  ];

  /** What a page would be filed under on another axis, or undefined if nothing. */
  const jumpValue = (page, viewKey) => (page ? page[CROSS[viewKey].key] : undefined);

  function crossJump(page, viewKey) {
    const value = jumpValue(page, viewKey);
    if (value === undefined) return;
    if (viewer.open) viewer.close();
    state.view = viewKey;
    state.group[viewKey] = value;
    // Arriving from another axis is not arriving from a family, so the
    // breadcrumb leads back to the index rather than to whichever family the
    // reviewer last browsed.
    if (viewKey === "face") state.family = null;
    // Filters stay exactly as they were — the reviewer changed axis, not
    // subject. The tab buttons are told where the state went, since this is
    // the one path that moves the view without a click on them.
    for (const b of document.getElementById("view-filter").children) {
      b.setAttribute("aria-pressed", String(b.dataset.view === viewKey));
    }
    render();
    // Top first, so the group's own heading and breadcrumb register before
    // the scroll, then straight to the page that raised the question — a
    // 45-card group the reviewer then has to search is not an answer.
    window.scrollTo(0, 0);
    // A deck page is not on 按版式 any more (see FACE_AXIS_IDS), so jumping
    // from one lands the reviewer on its theme's specimen for the same face
    // — the page that answers the question they asked, drawn by the same code
    // on the same skin. Without this the jump arrives and highlights nothing.
    let land = page.id;
    if (viewKey === "face" && !FACE_AXIS_IDS.has(page.id)) {
      const stand = MANIFEST.pages.find(
        (p) => FACE_AXIS_IDS.has(p.id) && p.section === page.section && p.face === page.face,
      );
      if (stand) land = stand.id;
    }
    revealCard(land);
  }

  /**
   * Drill to one group. The family argument is 按版式's third level: pass the family the
   * face was opened from so the breadcrumb leads back to it, and leave it out
   * anywhere the reviewer came straight off the index or across an axis.
   */
  function openGroup(viewKey, value, family) {
    state.group[viewKey] = value;
    if (viewKey === "face") state.family = family === undefined ? null : family;
    render();
    window.scrollTo(0, 0);
  }

  function openFamily(label) {
    state.group.face = null;
    state.family = label;
    render();
    // Landing mid-page after a level change reads as a broken jump, and the
    // heading that says where you now are is at the top.
    window.scrollTo(0, 0);
  }

  /**
   * 主题速览 is a theme-view instrument: every cell is a jump to a section
   * heading, and the cross-cut views have no section headings to jump to.
   * It used to answer a click there by switching the tab back to 按主题 —
   * the reviewer asked for one theme and lost the view they were in.
   *
   * So it stands down outside 按主题 rather than being re-taught to filter.
   * Its filtering twin, the 全部主题 dropdown, is in the header in every
   * view and already shares its state; and its 25 thumbnails directly above
   * an index of group tiles would be a second thumbnail grid competing with
   * the one the reviewer came to read.
   */
  function syncChrome() {
    document.getElementById("quickmap").hidden = state.view !== "theme";
  }

  function render() {
    const main = document.getElementById("main");
    // Every past filter pass left its cards observed: they leave the DOM but
    // stay in the observer, so switching theme or typing in the search box
    // accumulated dead references and callbacks for the life of the page.
    io.disconnect();
    thumbIo.disconnect();
    main.textContent = "";
    cards.clear();
    visible = MANIFEST.pages.filter(matches);
    syncChrome();

    if (state.view === "theme") {
      if (visible.length === 0) main.appendChild(emptyNote());
      else renderThemeView(main);
    } else {
      const view = CROSS[state.view];
      const group = state.group[state.view];
      // A filter that empties a group still renders the group's chrome. The
      // reviewer keeps their place and can widen the filter; bouncing them
      // back to the index would look like the click had been undone.
      const family = activeFamily();
      if (group !== null) renderGroupDetail(main, view, group);
      else if (family !== null) renderFamilyDetail(main, family);
      else if (visible.length === 0) main.appendChild(emptyNote());
      else renderGroupIndex(main, view);
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
  // The set the viewer pages through, always the comparison the reviewer
  // opened it from. In the theme view a page is judged inside its own
  // section, so the queue scopes to that section. In a cross-cut view the
  // group detail is the comparison, and the visible set is narrowed to it
  // — so arrowing off the end of a group stops there instead of walking on
  // into the next one, which is what the flat view used to do.
  let viewerQueue = [];

  /** The faces of one face's family, in the index's own order. */
  function familyMembers(faceId) {
    const label = FAMILY_OF.face.get(faceId);
    const fam = PLANS.face.find((f) => f.label === label);
    return fam ? fam.members : [faceId];
  }

  /**
   * 按版式's queue: the whole family, face after face.
   *
   * The comparison a face audit actually makes is between neighbouring faces
   * — all six covers, all four takeovers — and a queue scoped to the one face
   * on screen stopped at its own last theme, which meant closing the viewer
   * and finding the next tile to ask the obvious next question. So the queue
   * is the family: registry order across faces, theme order inside each, and
   * the viewer's own header names the face so crossing from the last
   * banner-title page into the first band-title page reads as a boundary
   * rather than as a slide that changed under you.
   *
   * Built off the manifest with the group narrowing dropped (see
   * passesFilters), because the family is wider than the face detail the
   * reviewer opened it from. The header's filters still apply: they are the
   * reviewer's own narrowing, not the level they are standing on.
   */
  function familyQueue(opened) {
    const rank = new Map();
    familyMembers(opened.face).forEach((m, i) => rank.set(m, i));
    return MANIFEST.pages
      .filter((p) => rank.has(p.face) && passesFilters(p))
      .sort((a, b) => (rank.get(a.face) - rank.get(b.face)) || bySection(a, b));
  }

  function openViewer(id) {
    const opened = visible.find((p) => p.id === id);
    if (!opened) return;
    // Sorted the way the cards under it are, so ← and → walk the grid in the
    // order the eye just read it.
    viewerQueue =
      state.view === "theme"
        ? visible.filter((p) => p.section === opened.section)
        : state.view === "face"
        ? familyQueue(opened)
        : visible.slice().sort(bySection);
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
    // On 按版式 the queue spans a whole family, so the position alone does not
    // say what is on screen — 3 / 63 could be any of six covers. The family
    // and the face id go in front of it, which is what makes the step from
    // one face's last theme into the next face's first legible.
    const bits = state.view === "face" ? cardFacts(p).filter((b) => b !== p.face) : cardFacts(p);
    if (state.view === "face") {
      const family = FAMILY_OF.face.get(p.face);
      if (family) bits.push(family);
      bits.push(p.face);
    }
    bits.push(viewerIndex + 1 + " / " + viewerQueue.length);
    document.getElementById("viewer-facts").textContent = bits.join(" · ");
    document.getElementById("viewer-facehint").hidden = state.view !== "face";
    const v = verdictOf(p.id);
    for (const btn of document.getElementById("viewer-verdicts").children) {
      btn.setAttribute("aria-pressed", String(btn.dataset.verdict === v));
      // Same floor as the cards: a page that dropped content cannot be
      // called pass or limit here either.
      const unavailable = floored(p.id) && btn.dataset.verdict !== "rework";
      btn.disabled = unavailable;
      btn.title = unavailable ? VERDICT_FLOOR_REASON : "";
    }
    document.getElementById("viewer-note").value = (verdicts[p.id] || {}).note || "";
    // Only the axes this page is actually on. A component page names no face
    // (see Job.face), and nothing outside the component band names a
    // component, so in practice each page offers one of the two.
    const cross = document.getElementById("viewer-cross");
    cross.textContent = "";
    for (const jump of CROSS_JUMPS) {
      const value = jumpValue(p, jump.view);
      if (value === undefined) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = "在" + CROSS[jump.view].label + "里打开 " + value + "，筛选保持不变";
      btn.appendChild(document.createTextNode(jump.label));
      btn.appendChild(headText("code", "", value));
      btn.appendChild(headText("kbd", "", jump.key));
      btn.addEventListener("click", () => crossJump(p, jump.view));
      cross.appendChild(btn);
    }
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

  /**
   * Skip a whole face, in a queue that spans a family.
   *
   * With 24 themes to a face, arrowing from banner-title to the next cover
   * face is two dozen keystrokes through a comparison the reviewer has
   * already finished. These land on the next face's first theme instead.
   * Backwards from anywhere inside a face goes to that face's own first
   * page when there is nothing before it, which is the same clamp the arrow
   * keys use at the ends of the queue.
   */
  function stepFace(delta) {
    const here = viewerQueue[viewerIndex];
    if (!here) return;
    const starts = [];
    let seen;
    for (let i = 0; i < viewerQueue.length; i++) {
      if (viewerQueue[i].face !== seen) {
        seen = viewerQueue[i].face;
        starts.push(i);
      }
    }
    const at = starts.findIndex((i) => viewerQueue[i].face === here.face);
    if (at < 0) return;
    viewerIndex = starts[Math.min(starts.length - 1, Math.max(0, at + delta))];
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
    if (!viewer.open) {
      // Esc backs out one level, the same key that closes the viewer one
      // level further in — so the way out is the same key wherever you are.
      // On 按版式 there are three levels, and a face opened from a family
      // backs out to that family before the index.
      if (ev.key !== "Escape") return;
      const group = activeGroup();
      const family = activeFamily();
      if (group === null && family === null) return;
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      ev.preventDefault();
      if (group !== null && state.view === "face" && state.family !== null) openFamily(state.family);
      else if (group !== null) openGroup(state.view, null);
      else openGroup("face", null);
      return;
    }
    const typing = ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement;
    const key = typeof ev.key === "string" ? ev.key.toLowerCase() : "";
    if (ev.key === "ArrowRight") { ev.preventDefault(); step(1); }
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); step(-1); }
    // Only where the queue spans several faces. Everywhere else the whole
    // queue is one face and these would be a jump to its first page dressed
    // up as a skip.
    else if (!typing && state.view === "face" && (ev.key === "[" || ev.key === "]")) {
      ev.preventDefault();
      stepFace(ev.key === "]" ? 1 : -1);
    }
    else if (!typing && (ev.key === "1" || ev.key === "2" || ev.key === "3")) {
      ev.preventDefault();
      const p = viewerQueue[viewerIndex];
      if (p) { setVerdict(p.id, ["pass", "limit", "rework"][Number(ev.key) - 1]); paintViewer(); }
    }
    else if (!typing && CROSS_JUMPS.some((j) => j.key === key)) {
      const p = viewerQueue[viewerIndex];
      const jump = CROSS_JUMPS.find((j) => j.key === key);
      // Silent on a page that is not on that axis, rather than jumping
      // somewhere arbitrary — the button is not there either.
      if (jumpValue(p, jump.view) !== undefined) { ev.preventDefault(); crossJump(p, jump.view); }
    }
  });

  // ── controls ───────────────────────────────────────────────────────────
  document.getElementById("view-filter").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    state.view = btn.dataset.view;
    for (const b of ev.currentTarget.children) b.setAttribute("aria-pressed", String(b === btn));
    // Filters are deliberately untouched — a view is a different cut of the
    // same narrowed set, not a fresh start. Where each cross-cut view was
    // drilled to survives too, in state.group.
    render();
    window.scrollTo(0, 0);
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
  // 一格一节，取该节样张里的封面。点击就是选中这套主题：它和顶栏的主题下拉
  // 框是同一个 state.theme，两边永远同步，高亮的那一格说的就是当前筛选。再
  // 点一次已选中的格子退回全部主题。选中跟着换视角一起走，按讲法/按版式/按
  // 组件因此也只剩这套主题的页。只在按主题视角出现（见 syncChrome）。
  function syncQuickmap() {
    for (const b of document.querySelectorAll("#quickmap .qm")) {
      const on = b.dataset.section === state.theme;
      b.setAttribute("aria-pressed", String(on));
      b.title = on ? "再点一次看全部主题" : "只看 " + b.dataset.label;
    }
  }

  function jumpToSection(id) {
    const target = document.getElementById("sec-" + id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildQuickmap() {
    const host = document.getElementById("quickmap");
    const select = document.getElementById("theme-filter");
    for (const section of MANIFEST.sections) {
      const sample =
        MANIFEST.pages.find((p) => p.section === section.id && p.band === "deck" && p.slideType === "cover") ||
        MANIFEST.pages.find((p) => p.section === section.id && !p.skipped);
      if (!sample) continue;
      const cell = document.createElement("button");
      cell.className = "qm";
      cell.dataset.section = section.id;
      cell.setAttribute("aria-pressed", "false");
      cell.dataset.label = section.label;
      const stage = document.createElement("div");
      stage.className = "qm-stage";
      mountSvg(stage, sample.id);
      const name = document.createElement("span");
      name.className = "qm-name";
      name.textContent = section.label === section.id ? section.id : section.label + " · " + section.id;
      cell.append(stage, name);
      cell.addEventListener("click", () => {
        // Selecting, not scrolling. A lit cell used to mean nothing but "you
        // clicked here", so the reviewer carried a selection into 按组件 that
        // was never made and read 26 张 as this theme's. Clicking picks the
        // theme, clicking it again puts 全部主题 back.
        state.theme = state.theme === section.id ? "all" : section.id;
        select.value = state.theme;
        syncQuickmap();
        render();
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
          verdict: verdictOf(p.id) || null,
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
  syncQuickmap();
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
