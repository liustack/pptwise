// @vitest-environment node
//
// One render of the gallery matrix, six constitutional scans.
//
// Six files used to each call listThemes → corpusAssets → buildMatrix →
// renderMatrix, each writing the matrix to its own temp dir. Vitest gives
// each file a worker, so a full gate paid for six copies of the same
// ~2450-page paint. `beforeAll` paints it once. The describes below read
// that paint. `scripts/gallery.test.mts` and
// `cross-language-capacity.test.mts` are a different job and stay put.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Fragment, createElement } from "react"
import { beforeAll, describe, expect, it } from "vitest"
import { listThemes, renderSlideSvg, validateIr } from "@/api"
import { MIN_CARTESIAN_BOX_W } from "@/components/cartesian-axis"
import { chart } from "@/components/chart"
import type { ComponentCtx } from "@/components/types"
import { CANVAS_H_PX, CANVAS_W_PX, META_FONT_FLOOR_PX, pxToPt } from "@/constants"
import type { PptxIR, Slide } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { getPlatform } from "@/platform/registry"
import { parseEmphasis, renderEmphasisTspans, stripEmphasis } from "@/render/emphasis"
import { renderSvgMarkup } from "@/render/serialize"
import { assertSubset } from "@/render/subset-validate"
import { getThemeDefinition } from "@/themes/definitions"
import { COMPONENT_BUILDERS } from "./corpus/components"
import { corpusAssets, layoutPage, type CorpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { checkPageFidelity, exempt, faceOf, jobSlide, scanned, widened } from "./fidelity"
import {
  ROOT_TEXT_STYLE,
  collectInkFindings,
  collectLabelFindings,
  inheritTextStyle,
  leafInkBoxes,
} from "./ink-containment"
import { auditL1, classifyL1, type L1Result } from "./l1"
import { buildMatrix, type Job } from "./matrix"
import { renderMatrix, type Manifest } from "./render"
import { repeatedRuns } from "./repeats"

await installNodePlatform()

interface CorpusPage {
  readonly id: string
  readonly svg: string
  readonly job: Job
  readonly ir: PptxIR
  readonly slideIndex: number
  readonly l1: L1Result
  readonly l1Codes: string[] // classifyL1(l1)
}

interface CorpusScan {
  readonly jobs: readonly Job[]
  readonly svgs: ReadonlyMap<string, string>
  readonly manifest: Manifest
  readonly assets: Record<LanguageId, CorpusAssets>
  readonly pages: readonly CorpusPage[]
}

let corpus: CorpusScan

beforeAll(async () => {
  const themeIds = listThemes()
    .map((t) => t.id)
    .sort()
  const assets = Object.fromEntries(
    await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
  ) as Record<LanguageId, CorpusAssets>
  const jobs = buildMatrix(themeIds, assets)
  const outDir = mkdtempSync(join(tmpdir(), "pptwise-corpus-scan-"))
  const { svgs, manifest } = renderMatrix(jobs, outDir, "corpus-scan")
  const pages: CorpusPage[] = []
  for (const job of jobs) {
    const svg = svgs.get(job.id)
    if (!svg) continue
    const l1 = auditL1(svg)
    pages.push({
      id: job.id,
      svg,
      job,
      ir: job.ir,
      slideIndex: job.slideIndex,
      l1,
      l1Codes: classifyL1(l1),
    })
  }
  corpus = { jobs, svgs, manifest, assets, pages }
}, 300_000)

// ---------------------------------------------------------------------------
// no-drops.test.mts
// ---------------------------------------------------------------------------

/** Every `data-dropped` declaration on one page, as `count × kind`. */
function drops(svg: string): string[] {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
  return Array.from(root.querySelectorAll("[data-dropped]"))
    .filter((el) => Number(el.getAttribute("data-dropped")) > 0)
    .map((el) => `${el.getAttribute("data-dropped")}×${el.getAttribute("data-dropped-kind") ?? "component"}`)
}

/**
 * Nail two: no page prints the same line twice.
 *
 * `step-aside-corpus.test.mts` already holds its three pages to this, and it
 * found the fault that put it there: the lead-in and the `rings` builder drew
 * from the same end of the sentence pool, so the runway page printed one
 * sentence above the onion and again inside its third ring. The same shape
 * came back the moment the capacity-1 annotation slot stopped carrying a
 * source and started carrying a sentence — `steps` writes `sentences[0]` into
 * step one, the note beside it was `sentences[0]` too, and 24 `rail-numbered`
 * pages said it twice. A corpus page is product content, and product content
 * does not repeat itself in two places on one slide.
 *
 * The scan reads the page the way a reader does (`repeats.ts`): whitespace
 * removed, so a sentence wrapped in one place and whole in another is still
 * one sentence, which is exactly how the 24 pages hid from an
 * element-by-element comparison, and the lines of one paragraph joined back
 * together, so a caption wrapped in both places is still one caption.
 */

/** A run that closes on a full stop is a sentence, not a label. */
const SENTENCE_END = /[。．.！!？?]$/

/**
 * The labels the corpus repeats today, page by page.
 *
 * Corpus writing, not a lead-in drawn from the wrong end: playbill's
 * `icon_cards` title opens one of its own sentences, and one page reuses one
 * phrase in two rows. Those are pinned here and the set can only shrink: an
 * entry leaves when someone writes the missing line, as `show-gallery`'s did
 * when its six frames got six captions. Nothing may join it, and a repeated
 * *sentence* may never be listed at all.
 */
const KNOWN_LABEL_REPEATS: readonly string[] = [
  "playbill--comp--icon-cards--zh\t首演两场七百张票三天售罄",
  "terminal--deck--p04\t三次重写RFC与否决记录",
]

// The two constitutional nails that need the whole corpus rendered: no page
// declares a content drop, and no page says the same thing twice.
//
// Nail one: no gallery page may declare a content drop.
//
// `data-dropped` means a page lost authored content and says nothing about
// it on its own face, and the export gate refuses any deck carrying one
// (`checkContentDropGate`, `src/pptx/generate.ts`). A review specimen that
// drops content is therefore two useless things at once: an unexportable
// deck, and a page that does not show the thing it exists to show. A
// `data_table` page without its table reviews nothing.
//
// So the corpus itself has to stay inside what each face can hold. This test
// is the guard on that: author a page past its face's capacity and it goes
// red here, at the corpus, rather than turning up months later as a drop
// nobody was watching. The fix belongs on whichever side is wrong, and the
// two sides are told apart the same way every time: trim the corpus when the
// page asks for more than the face was ever meant to hold, fix the engine
// when a component measures one size and paints another, or a face hands a
// component less than its own declared minimum.
//
// There is no exclusion list, and there must not be one. A page allowed to
// drop is a page nobody reviews.
//
// What this covers is exactly the gallery, which is narrower than the whole
// product of theme, face and language. `buildMatrix` draws the deck and face
// bands in each theme's own Chinese lexicon, and adds English and mixed
// script only for `brief`, the theme the corpus gives the shared
// three-language duty (`corpus/native/index.ts`). So of the pages below,
// every deck, face and adjacency page is Chinese, and the only Latin and
// mixed pages are brief's component band. The adjacency pairings do
// get Latin and mixed coverage, but as renders inside the sweep test, not
// as gallery pages. An
// English component page on another theme is a legal deck this scan says
// nothing about — `cross-language-capacity.test.mts` is the sweep that does,
// and it holds a ratchet of the shapes that still overflow there.
describe("the gallery corpus", () => {
  it("declares no content drops, and repeats no sentence", () => {
    const { svgs, manifest, jobs } = corpus
    expect(svgs.size).toBeGreaterThan(0)
    expect(manifest.pages.length).toBe(jobs.length)

    const declared: string[] = []
    const sentences: string[] = []
    const labels: string[] = []
    for (const [id, svg] of svgs) {
      const found = drops(svg)
      if (found.length > 0) declared.push(`${id}: ${found.join(", ")}`)
      for (const run of repeatedRuns(svg)) {
        ;(SENTENCE_END.test(run) ? sentences : labels).push(`${id}\t${run}`)
      }
    }
    expect(declared, "a page lost authored content").toEqual([])
    expect(sentences, "a page says the same sentence twice").toEqual([])
    expect(labels.sort(), "a page repeats a label the pinned list does not name").toEqual([...KNOWN_LABEL_REPEATS].sort())
  })
})

// ---------------------------------------------------------------------------
// the export subset, on the whole matrix
// ---------------------------------------------------------------------------

/**
 * `assertSubset` is the gate that decides whether a page can be exported at
 * all: it reads the vocabulary of SVG primitives the renderer emitted and
 * throws on anything DrawingML has no equivalent for.
 *
 * It used to be run per face, each of the 74 face tests sweeping all 24
 * canonical themes for a verdict a theme cannot change — a theme supplies
 * colours, fonts, and parameters, never a new primitive. Those tests now run
 * two themes each (`render/subset-sample-themes.ts`), and the full sweep
 * lives here, where the whole 24-theme matrix is already painted: every
 * theme, every face, every component, every language track, one parse per
 * page. That is more pages under the gate than the per-face sweeps ever
 * reached, not fewer.
 */
describe("every page in the corpus stays inside the exportable SVG subset", () => {
  it("scans every theme/layout/component/density page in zh/en/mixed", () => {
    const Parser = getPlatform().domParser ?? globalThis.DOMParser
    if (!Parser) throw new Error("DOMParser unavailable")
    expect(corpus.svgs.size).toBeGreaterThan(0)

    const violations: string[] = []
    for (const [id, svg] of corpus.svgs) {
      const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
      try {
        assertSubset(root)
      } catch (error) {
        violations.push(`${id}: ${(error as Error).message}`)
      }
    }
    expect(violations, "a page paints a primitive svg2pptx cannot export").toEqual([])
  })
})

// ---------------------------------------------------------------------------
// no-ellipsis.test.mts
// ---------------------------------------------------------------------------

const STANDALONE_DOTS = /(?<![.])\.\.\.(?![.])/

function textContents(svg: string): string[] {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
  return Array.from(root.querySelectorAll("text")).map((el) => el.textContent ?? "")
}

// Zero-hit nail: no gallery page may paint leftover-count phrasing or an
// ellipsis substitute. Academic statement gold dots are <circle>s, not text,
// so this test has no page exclusion list. validate already rejects the same
// phrasing in authored strings. L1 overflow-marker is the renderer-side backstop.
//
// Two assertions, because they do not see the same things:
//
//   - L1 overflow-marker walks trimmed <text> nodes and flags leftover
//     plus-count phrasing, remainder-count phrasing, and ellipsis substitutes.
//   - The regex below only looks at each <text> node's raw textContent for a
//     unicode ellipsis or a standalone three-dot ellipsis. It does not trim,
//     and it does not look at leftover-count phrases.
describe("gallery SVG text never paints an overflow ellipsis", () => {
  it("scans every theme/layout/component/density page in zh/en/mixed", () => {
    expect(corpus.svgs.size).toBeGreaterThan(0)
    expect(corpus.manifest.pages.length).toBe(corpus.jobs.length)

    const overflowMarkers: string[] = []
    for (const page of corpus.pages) {
      for (const finding of page.l1.findings.filter((f) => f.code === "overflow-marker")) {
        overflowMarkers.push(`${page.id}: ${finding.message}`)
      }
    }
    expect(overflowMarkers).toEqual([])

    const hits: string[] = []
    for (const [id, svg] of corpus.svgs) {
      for (const content of textContents(svg)) {
        if (content.includes("…") || STANDALONE_DOTS.test(content)) {
          hits.push(`${id}: ${JSON.stringify(content.slice(0, 80))}`)
        }
      }
    }
    expect(hits).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// font-floor.test.mts
// ---------------------------------------------------------------------------

function hasDecor(el: Element): boolean {
  let cur: Element | null = el
  while (cur) {
    if (cur.hasAttribute("data-decor") || cur.getAttribute("data-depth") === "mid") return true
    cur = cur.parentElement
  }
  return false
}

// Every rendered gallery <text> that is not decorative must sit on or
// above the 12pt (16px) readable floor. Body shrink is separately
// floored at 18pt in bullets.tsx. This scan is the gate that stops a
// new minFontSize of 8 from shipping.
describe("gallery SVG text respects the readable font floor", () => {
  it("scans every theme/layout/component/density/heading page", () => {
    expect(corpus.svgs.size).toBeGreaterThan(0)
    expect(corpus.manifest.pages.length).toBe(corpus.jobs.length)

    const Parser = getPlatform().domParser ?? globalThis.DOMParser
    if (!Parser) throw new Error("DOMParser unavailable")

    const undersized: string[] = []
    const l1Font: string[] = []
    for (const page of corpus.pages) {
      const root = new Parser().parseFromString(page.svg, "image/svg+xml").documentElement
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const content = (el.textContent ?? "").trim()
        if (
          !content ||
          hasDecor(el) ||
          ["gauge-spec", "show-spec", "notice-spec", "grid-spec", "panel-spec", "seal-spec"].includes(el.getAttribute("data-font-floor-exempt") ?? "")
        ) continue
        const fontSize = Number(el.getAttribute("font-size") ?? 16)
        if (fontSize < META_FONT_FLOOR_PX) {
          undersized.push(
            `${page.id}: ${fontSize}px (${pxToPt(fontSize).toFixed(1)}pt) ${JSON.stringify(content.slice(0, 40))}`,
          )
        }
      }
      if (page.l1Codes.includes("font-size")) l1Font.push(page.id)
    }
    expect(undersized, undersized.slice(0, 20).join("\n")).toEqual([])
    expect(l1Font, l1Font.slice(0, 20).join("\n")).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// device-frame.test.mts
// ---------------------------------------------------------------------------

/**
 * What the corpus holds today: 26 component-band specimens per device — the
 * component band draws this type twice, once as a browser window and once as a
 * phone — plus the four sample-deck pages whose narrative includes a product
 * screenshot. Pinned per device, because a corpus that covered only browsers
 * left the phone branch of both the component and this test unexecuted.
 */
const EXPECTED_DEVICE_PAGES = 56
const EXPECTED_BY_DEVICE = { browser: 30, phone: 26 }
const EXPECTED_DECK_PAGES = [
  "bulletin--deck--p09",
  "homeroom--deck--p07",
  "luxe--deck--p07",
  "terminal--deck--p07",
]

/** The browser frame's declared proportion, window bar included. */
const BROWSER_ASPECT = 1.6

/**
 * A property as this element declares it, from its attribute or its inline
 * style, or `undefined` when it says nothing about it.
 */
function declared(el: Element, name: string): string | undefined {
  const attr = el.getAttribute(name)
  if (attr !== null) return attr
  const style = el.getAttribute("style")
  if (!style) return undefined
  const hit = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, "i").exec(style)
  return hit ? hit[1]!.trim() : undefined
}

/**
 * What is left of an element's opacity once every ancestor has had its say,
 * and zero as soon as anything in the chain is hidden outright.
 *
 * `opacity` composites rather than inherits, so it multiplies down the chain.
 * Reading only the element's own attributes proved a local property, not a
 * visible one: setting `opacity="0"` on the `[data-device-mockup]` group hid
 * the bar, the dots, the pill, the outline, the body and the notch on all 56
 * pages while every one of them still reported paint.
 */
function effectiveOpacity(el: Element): number {
  let opacity = 1
  for (let node: Element | null = el; node; node = node.parentElement) {
    const display = declared(node, "display")
    const visibility = declared(node, "visibility")
    if (display === "none" || visibility === "hidden" || visibility === "collapse") return 0
    const own = declared(node, "opacity")
    if (own !== undefined) opacity *= Number(own)
  }
  return opacity
}

/**
 * A painting property as it actually resolves, walking up for the nearest
 * ancestor that declares it.
 *
 * `fill`, `stroke` and their opacities are inherited, so a child that says
 * nothing takes its parent's. Reading only the leaf left a second way to hide
 * the whole frame: `fill-opacity="0"` and `stroke-opacity="0"` on the
 * `[data-device-mockup]` group pass down to the bar, dots, pill, outline, body
 * and notch — none of which override them — and all 56 pages still reported
 * every part painted.
 */
function inherited(el: Element, name: string, fallback: string): string {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const value = declared(node, name)
    if (value !== undefined) return value
  }
  return fallback
}

/** Whether this element would put ink on the page at all. */
function paints(el: Element): boolean {
  if (effectiveOpacity(el) <= 0) return false
  // No `fill` anywhere up the chain means SVG's own default, which is black.
  const fill = inherited(el, "fill", "black")
  const filled = fill !== "none" && Number(inherited(el, "fill-opacity", "1")) > 0
  const stroke = inherited(el, "stroke", "none")
  const stroked =
    stroke !== "none" &&
    Number(inherited(el, "stroke-opacity", "1")) > 0 &&
    Number(inherited(el, "stroke-width", "1")) > 0
  return filled || stroked
}

/** Whether this element has somewhere to put that ink. */
function hasArea(el: Element): boolean {
  if (el.tagName === "circle") return Number(el.getAttribute("r")) > 0
  if (el.tagName === "path") {
    const numbers = (el.getAttribute("d") ?? "").match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
    if (numbers.length < 4) return false
    const xs = numbers.filter((_, i) => i % 2 === 0)
    const ys = numbers.filter((_, i) => i % 2 === 1)
    return Math.max(...xs) - Math.min(...xs) > 0 && Math.max(...ys) - Math.min(...ys) > 0
  }
  return Number(el.getAttribute("width")) > 0 && Number(el.getAttribute("height")) > 0
}

/** Drawn: present, with paint, and with an area to paint. */
function drawn(el: Element | undefined): boolean {
  return el !== undefined && el !== null && paints(el) && hasArea(el)
}

function parse(svg: string): Element {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  return new Parser().parseFromString(svg, "image/svg+xml").documentElement
}

/** Absolute page offset of an element, accumulating ancestor translates. */
function offsetOf(el: Element): { x: number; y: number } {
  let x = 0
  let y = 0
  for (let node: Element | null = el; node; node = node.parentElement) {
    const m = (node.getAttribute("transform") ?? "").match(/translate\(([-\d.]+),\s*([-\d.]+)\)/)
    if (m) {
      x += Number(m[1])
      y += Number(m[2])
    }
  }
  return { x, y }
}

// Constitutional nail: a `device_mockup` page never loses its device.
//
// The frame — a browser's window bar, traffic lights and address pill, a
// phone's bezel and notch — is the whole component. Take it away and a product
// screenshot is just a picture pasted on a slide, which is the exact gap the
// component was added to close. Four takeover faces used to accept a
// `device_mockup` as "one picture" and paint the screen contents alone, so on
// most themes the component quietly rendered as an `image` and nothing on the
// page said so.
//
// Pages are found by looking at what each job's slide actually contains, not
// by matching output ids: the id filter this started as read `--comp--` and
// silently skipped the four sample-deck pages that carry a mockup too. And the
// assertions look for the drawn window, not for the marker the same
// implementation writes about itself — a bare picture wrapped in a
// `data-device-mockup` group would satisfy a marker check and show no device.
//
// Counting nodes is not enough either. Setting every fill and stroke inside
// the frame to `none` leaves the whole structure in place — the bar path, the
// three dots, the pill, the outline — while the page shows a bare screenshot
// and nothing around it. So each part has to carry paint that would actually
// land: a fill or a stroke that is not `none`, opacity above zero, and an area
// to put it in.
describe("every device_mockup page in the corpus shows its frame", () => {
  it("draws a real window or bezel on each one", () => {
    const { jobs, svgs } = corpus

    // Which pages carry a device comes from the IR, never from the page id,
    // and the authored component travels with it so the assertions can ask
    // what this page actually declared rather than assume.
    const devicePages = new Map<string, { device: string; url?: string; assetId: string; src?: string }>()
    for (const job of jobs) {
      const mockup = job.ir.slides[job.slideIndex]?.components.find((c) => c.type === "device_mockup")
      if (mockup && mockup.type === "device_mockup") {
        devicePages.set(job.id, {
          device: mockup.device,
          url: mockup.url,
          assetId: mockup.asset_id,
          src: job.ir.assets.images?.[mockup.asset_id]?.src,
        })
      }
    }

    expect(devicePages.size).toBe(EXPECTED_DEVICE_PAGES)
    const byDevice = { browser: 0, phone: 0 }
    for (const { device } of devicePages.values()) byDevice[device as "browser" | "phone"]++
    expect(byDevice).toEqual(EXPECTED_BY_DEVICE)
    expect([...devicePages.keys()].filter((id) => !id.includes("--comp--")).sort()).toEqual(EXPECTED_DECK_PAGES)

    const offenders: string[] = []
    for (const [id, authored] of devicePages) {
      const svg = svgs.get(id)
      if (!svg) {
        offenders.push(`${id}: not rendered`)
        continue
      }
      const root = parse(svg)
      const frame = root.querySelector("[data-device-mockup]")
      if (!frame) {
        offenders.push(`${id}: no device frame`)
        continue
      }
      const device = frame.getAttribute("data-device-mockup")
      if (device !== authored.device) {
        offenders.push(`${id}: authored ${authored.device}, drew ${device}`)
        continue
      }
      const origin = offsetOf(frame)
      const rects = Array.from(frame.querySelectorAll("rect"))

      // The screen is the point of the whole component. A frame drawn around
      // the component's own "Image missing" placeholder satisfies every bezel
      // assertion below and shows the reviewer nothing: dropping the phone
      // fixture from the corpus left 26 pages exactly like that, framed and
      // empty, with no drop mark because nothing had been dropped.
      const screens = Array.from(frame.querySelectorAll("image")).filter(
        (img) => (img.getAttribute("href") ?? img.getAttribute("xlink:href")) === authored.src,
      )
      if (!authored.src) offenders.push(`${id}: corpus has no asset for "${authored.assetId}"`)
      else if (screens.length !== 1) offenders.push(`${id}: ${screens.length} screens showing ${authored.assetId}`)
      if ((frame.textContent ?? "").includes("Image missing")) {
        offenders.push(`${id}: frame drawn around the missing-asset placeholder`)
      }

      if (device === "browser") {
        // The window bar is a drawn path carrying paint, not an attribute claim.
        const bar = Array.from(frame.querySelectorAll("path")).find((p) =>
          /^M \d[\d.]* \d[\d.]* A /.test(p.getAttribute("d") ?? ""),
        )
        if (!drawn(bar)) offenders.push(`${id}: no painted window bar`)
        const dots = Array.from(frame.querySelectorAll("circle"))
        if (dots.length !== 3) offenders.push(`${id}: ${dots.length} traffic lights`)
        if (!dots.every(drawn)) offenders.push(`${id}: traffic lights carry no paint`)
        // The address pill exists only when the page authored a url — the
        // schema makes it optional, and a browser without one is legal.
        if (authored.url !== undefined) {
          const pill = rects.find((r) => {
            const h = Number(r.getAttribute("height"))
            return h > 0 && Math.abs(Number(r.getAttribute("rx")) - h / 2) < 0.51
          })
          if (!drawn(pill)) offenders.push(`${id}: no painted address pill`)
          if (!(root.textContent ?? "").includes(authored.url)) offenders.push(`${id}: url not on the page`)
        }
        // The outline proves the window's own edges, and carries its size.
        const outline = rects.find((r) => r.getAttribute("fill") === "none" && r.getAttribute("stroke"))
        if (!drawn(outline)) {
          offenders.push(`${id}: no painted window outline`)
          continue
        }
        const w = Number(outline!.getAttribute("width"))
        const h = Number(outline!.getAttribute("height"))
        if (Math.abs(w / h - BROWSER_ASPECT) > 0.12) offenders.push(`${id}: aspect ${(w / h).toFixed(2)}`)
        const x = origin.x + Number(outline!.getAttribute("x"))
        const y = origin.y + Number(outline!.getAttribute("y"))
        if (x < 0 || y < 0 || x + w > CANVAS_W_PX + 0.5 || y + h > CANVAS_H_PX + 0.5) {
          offenders.push(`${id}: window at ${x},${y} ${w}x${h} leaves the page`)
        }
      } else if (device === "phone") {
        const body = rects[0]
        const bodyW = Number(body?.getAttribute("width"))
        const bodyH = Number(body?.getAttribute("height"))
        if (!drawn(body)) offenders.push(`${id}: no painted phone body`)
        if (!(bodyH > bodyW)) offenders.push(`${id}: body ${bodyW}x${bodyH} is not portrait`)
        // A notch: wider than it is tall, sitting on the body's top edge.
        const notch = rects.find(
          (r) =>
            Number(r.getAttribute("y")) === 0 &&
            Number(r.getAttribute("width")) > Number(r.getAttribute("height")) &&
            Number(r.getAttribute("width")) < bodyW,
        )
        if (!drawn(notch)) offenders.push(`${id}: no painted notch on the body's top edge`)
        const x = origin.x + Number(body?.getAttribute("x") ?? 0)
        const y = origin.y + Number(body?.getAttribute("y") ?? 0)
        if (x < 0 || y < 0 || x + bodyW > CANVAS_W_PX + 0.5 || y + bodyH > CANVAS_H_PX + 0.5) {
          offenders.push(`${id}: phone at ${x},${y} ${bodyW}x${bodyH} leaves the page`)
        }
      } else {
        offenders.push(`${id}: unknown device "${device}"`)
      }
    }
    expect(offenders).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// fidelity.test.mts
// ---------------------------------------------------------------------------

// Constitutional nail: a face renders authored content completely or it
// declines the page. See `fidelity.ts` for the rule, the scope, and the
// exemption table — this file is the sweep that holds it.
//
// Two page sets, for two different jobs:
//
//   - the whole gallery corpus, which is what the product actually draws;
//   - a short list of contract pages that load a face to the edge of what
//     its own slots say it accepts. The corpus authors a stat-hero page with
//     one metric because that is how such a page is written; nothing in it
//     asks the face what it does when handed four. A rule nobody exercises
//     is a rule that quietly stops holding, so the contract pages ask.

interface ScanPage {
  readonly id: string
  readonly ir: PptxIR
  readonly slideIndex: number
}

/**
 * Pages that put a face under the load its own declaration invites.
 *
 * `stat-hero` accepts a `kpi_cards`, and a `kpi_cards` carries as many items
 * as an author writes. One metric is the page the corpus draws; four is the
 * page the face has to have an answer for.
 */
function contractPages(lex: (typeof LEXICONS)[LanguageId], assets: CorpusAssets): ScanPage[] {
  const statHero = layoutPage("stat-hero", lex, assets, "brief", "fact")
  const heroSlide = statHero.slides[0] as Slide
  heroSlide.components = [COMPONENT_BUILDERS.kpi_cards!(lex)]

  const pullQuote = layoutPage("pull-quote", lex, assets, "brief", "quote")
  const quoteSlide = pullQuote.slides[0] as Slide
  quoteSlide.components = [COMPONENT_BUILDERS.blockquote!(lex)]

  // An ending that sets each item's label apart from its gloss, the colon
  // between them the break: swiss's closing page.
  const resolution = layoutPage("resolution-ending", lex, assets, "swiss")
  const resolutionSlide = resolution.slides[0] as Slide
  resolutionSlide.components = [
    { type: "bullets", items: lex.metrics.slice(0, 3).map((m) => `${m.label}${lex.id === "en" ? ": " : "："}${m.value}${m.unit ?? ""}`) },
  ]

  return [
    { id: "contract--stat-hero--four-metrics", ir: statHero, slideIndex: 0 },
    { id: "contract--pull-quote--authored-quote", ir: pullQuote, slideIndex: 0 },
    { id: "contract--resolution-ending--label-gloss", ir: resolution, slideIndex: 0 },
  ]
}

describe("every face renders the content it was given, or says what it dropped", () => {
  it("scans the gallery corpus and the face contract pages", () => {
    expect(corpus.svgs.size).toBeGreaterThan(0)

    const pages: { id: string; svg: string; ir: PptxIR; slideIndex: number }[] = []
    for (const job of corpus.jobs) {
      const svg = corpus.svgs.get(job.id)
      if (svg) pages.push({ id: job.id, svg, ir: job.ir, slideIndex: job.slideIndex })
    }
    for (const page of contractPages(LEXICONS.zh, corpus.assets.zh)) {
      const validated = validateIr(page.ir)
      expect(validated.ok, `${page.id}: ${validated.ok ? "" : JSON.stringify(validated.errors)}`).toBe(true)
      pages.push({ ...page, svg: renderSlideSvg(validated.ir!, page.slideIndex) })
    }

    let scannedPages = 0
    let widenedPages = 0
    const losses: string[] = []
    for (const page of pages) {
      const slide = page.ir.slides[page.slideIndex]!
      const face = faceOf(page.ir, slide, getThemeDefinition(page.ir.theme.id))
      const fieldPicking = scanned(face)
      if (fieldPicking) scannedPages += 1
      else widenedPages += 1
      for (const missing of checkPageFidelity(page.svg, slide).missing) {
        // A field-picking face answers for every authored field on its page.
        // Any other face answers for the fields `WIDENED_PATHS` names — the
        // ones whose shared renderer was fixed and is now held to it.
        if (fieldPicking ? exempt(face?.id, missing.path) : !widened(missing.path, slide)) continue
        losses.push(
          `${page.id} [${face?.id}] ${missing.path}: ${JSON.stringify(missing.text.slice(0, 60))}`,
        )
      }
    }

    // A scope that has silently collapsed would pass this sweep without ever
    // looking at a page. 284 of the corpus' 1820 pages are drawn by a
    // field-picking face today, and the rest are now read for the widened
    // fields; both floors are well under the real counts so an ordinary
    // corpus edit does not trip them, and well over zero so a broken scope
    // does.
    expect(scannedPages).toBeGreaterThan(200)
    expect(widenedPages).toBeGreaterThan(1000)
    expect(losses).toEqual([])
  })
})

// The gutter reading, in isolation. The corpus sweep above proves the 28
// false losses are gone; this proves *why* they were false and that the
// exclusion did not buy that with a blind spot — drop a line from the
// listing and the scan must still call it.
describe("a line-number gutter is the renderer's counting, not the author's text", () => {
  const listing = "const a = 1\nconst b = 2\nconst c = 3"
  const slide = {
    type: "content",
    kind: "evidence",
    heading: "Listing",
    components: [{ type: "code", language: "ts", code: listing }],
  } as unknown as Slide

  /** One `<text>` per line, each preceded by its gutter number — code.tsx's own shape. */
  function page(lines: readonly string[], gutter: boolean): string {
    const body = lines
      .map(
        (line, i) =>
          `${gutter ? `<text data-gutter="1">${i + 1}</text>` : ""}<text>${line}</text>`,
      )
      .join("")
    return `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`
  }

  it("finds the whole listing even though a number sits between every line", () => {
    expect(checkPageFidelity(page(listing.split("\n"), true), slide).missing).toEqual([])
  })

  it("still reports the listing when one of its lines never reached the page", () => {
    const cut = ["const a = 1", "const c = 3"]
    const missing = checkPageFidelity(page(cut, true), slide).missing
    expect(missing.map((m) => m.path)).toEqual(["components[0](code).code"])
  })

  it("reports a dropped line whether or not the gutter is drawn", () => {
    expect(checkPageFidelity(page(["const a = 1"], false), slide).missing).toHaveLength(1)
  })
})

// The scan is a recurrence-prevention test, so the thing it must survive is
// someone *fooling* it. Each case below is a page on which a component field
// reached nobody, dressed up so that a page-wide reading calls it painted.

describe("a heading is not evidence that a component reached the page", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Same conclusion",
    components: [{ type: "paragraph", text: "Same conclusion" }],
  } as unknown as Slide

  it("reports the paragraph when the only text on the page is the heading", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Same conclusion</text>` +
      `</g></svg>`
    expect(checkPageFidelity(svg, slide).missing.map((m) => m.path)).toEqual([
      "components[0](paragraph).text",
    ])
  })

  it("accepts the paragraph once the face paints it in its own right", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Same conclusion</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">Same conclusion</text>` +
      `</g></g></g></svg>`
    expect(checkPageFidelity(svg, slide).missing).toEqual([])
  })

  it("consumes only one rendering of a subheading, not every element resembling it", () => {
    const twice = {
      type: "content",
      kind: "points",
      heading: "Head",
      subheading: "Shared line",
      components: [{ type: "paragraph", text: "Shared line" }],
    } as unknown as Slide
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<text x="96" y="180" font-size="20">Shared line</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">Shared line</text>` +
      `</g></g></g></svg>`
    expect(checkPageFidelity(svg, twice).missing).toEqual([])
  })
})

describe("a drop declaration speaks only for the component that made it", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Head",
    components: [
      { type: "paragraph", text: "LOST" },
      { type: "bullets", items: ["kept one", "kept two"], style: "default" },
    ],
  } as unknown as Slide

  /** `SvgContent`'s own shape: one `data-audit-box` per placed component. */
  function page(marker: string, pageLevelMarker = ""): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<g data-audit-rect="96,228,1088,412">` +
      `<g data-audit-box="96,244,1088"><text x="96" y="260" font-size="18">kept one</text>` +
      `<text x="96" y="290" font-size="18">kept two</text>${marker}</g>` +
      `${pageLevelMarker}</g></g></svg>`
    )
  }

  it("reports the unpainted paragraph even though the bullets declared a drop", () => {
    const missing = checkPageFidelity(page(`<g data-dropped="3" />`), slide).missing
    expect(missing.map((m) => m.path)).toEqual(["components[0](paragraph).text"])
  })

  it("accepts it when the page itself declares the component was never placed", () => {
    const svg = page("", `<g data-dropped="1" />`)
    expect(checkPageFidelity(svg, slide).missing).toEqual([])
  })

  it("still lets a component's own marker speak for its own lost items", () => {
    const overflowing = {
      ...slide,
      components: [{ type: "bullets", items: ["kept one", "kept two", "cut away"], style: "default" }],
    } as unknown as Slide
    expect(checkPageFidelity(page(`<g data-dropped="1" />`), overflowing).missing).toEqual([])
  })
})

describe("a live component that declines outright is not fifty unexplained fields", () => {
  // 24 series, not 16. A directly-labelled line chart's measured minimum grows
  // with the count, and up to 20 the face now steps aside
  // (`render/step-aside.tsx`) and the whole sheet holds the chart, so nothing
  // declines. Past 20 no rendering of the page can hold it and the decline is
  // the honest answer — that is the page this test is about.
  it("a 24-series line chart no rendering can hold reports zero missing fields", () => {
    const ir = validateIr({
      version: "5",
      filename: "declined-chart",
      theme: { id: "brief" },
      meta: {},
      assets: { images: {} },
      slides: [
        {
          type: "content",
          kind: "data",
          heading: "二十四条系列的折线图",
          components: [
            {
              type: "chart",
              chart_type: "line",
              series: Array.from({ length: 24 }, (_, i) => ({
                name: `系列 ${i + 1}`,
                data: [
                  { x: "Q1", y: i + 1 },
                  { x: "Q2", y: i + 2 },
                ],
              })),
            },
          ],
        },
      ],
    }).ir!
    const slide = jobSlide(ir, 0)
    const svg = renderSlideSvg(ir, 0)
    // The chart really did decline, inside its own box, painting no field.
    expect(svg).toMatch(/data-dropped="[1-9]/)
    const result = checkPageFidelity(svg, slide)
    expect(result.authored).toBeGreaterThan(40)
    expect(result.missing).toEqual([])
  })
})

describe("a component that painted nothing is answered for by its own empty box", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Head",
    components: [
      { type: "bullets", items: ["kept one", "kept two"], style: "default" },
      { type: "paragraph", text: "VANISHED" },
    ],
  } as unknown as Slide

  /** Two boxes: one with painted bullets, one holding only a declaration. */
  const page = (secondBox: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
    `<text x="96" y="150" font-size="46">Head</text>` +
    `<g data-audit-rect="96,228,1088,412">` +
    `<g data-audit-box="96,244,1088"><text x="96" y="260" font-size="18">kept one</text>` +
    `<text x="96" y="290" font-size="18">kept two</text></g>` +
    `${secondBox}</g></g></svg>`

  it("accepts the loss when the empty box declares it", () => {
    const svg = page(`<g data-audit-box="96,400,1088"><g data-dropped="1" /></g>`)
    expect(checkPageFidelity(svg, slide).missing).toEqual([])
  })

  it("still reports it when the empty box declares nothing", () => {
    const svg = page(`<g data-audit-box="96,400,1088"></g>`)
    expect(checkPageFidelity(svg, slide).missing.map((m) => m.path)).toEqual([
      "components[1](paragraph).text",
    ])
  })

  it("one empty box answers for one component however many markers it holds", () => {
    // A component may declare more than once inside its own box, now that
    // each declaration names its own unit. Counting markers instead of boxes
    // let one empty box license two vanished components.
    const twoGone = {
      ...slide,
      components: [
        { type: "bullets", items: ["kept one", "kept two"], style: "default" },
        { type: "paragraph", text: "VANISHED" },
        { type: "paragraph", text: "ALSO VANISHED" },
      ],
    } as unknown as Slide
    const svg = page(
      `<g data-audit-box="96,400,1088">` +
        `<g data-dropped="1" data-dropped-kind="item" />` +
        `<g data-dropped="2" data-dropped-kind="label" />` +
        `</g>`,
    )
    expect(checkPageFidelity(svg, twoGone).missing.map((m) => m.path)).toEqual([
      "components[2](paragraph).text",
    ])
  })

  it("one empty declaration answers for one component, not for both", () => {
    const twoGone = {
      ...slide,
      components: [
        { type: "bullets", items: ["kept one", "kept two"], style: "default" },
        { type: "paragraph", text: "VANISHED" },
        { type: "paragraph", text: "ALSO VANISHED" },
      ],
    } as unknown as Slide
    const svg = page(
      `<g data-audit-box="96,400,1088"><g data-dropped="1" /></g><g data-audit-box="96,500,1088"></g>`,
    )
    expect(checkPageFidelity(svg, twoGone).missing).toHaveLength(1)
  })
})

describe("two texts from different places on the page do not add up to one field", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Head",
    components: [{ type: "paragraph", text: "ABC" }],
  } as unknown as Slide

  it("reports the paragraph when only unrelated fragments spell it out", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<text x="96" y="640" font-size="14">A</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">BC</text></g></g></g></svg>`
    expect(checkPageFidelity(svg, slide).missing.map((m) => m.path)).toEqual([
      "components[0](paragraph).text",
    ])
  })

  it("still finds a field its own block wrapped over two lines", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">A</text>` +
      `<text x="96" y="290" font-size="18">BC</text></g></g></g></svg>`
    expect(checkPageFidelity(svg, slide).missing).toEqual([])
  })
})

describe("a truncation mark speaks only for the field it cut", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Head",
    components: [
      { type: "paragraph", text: "The first sentence" },
      { type: "callout", variant: "warn", text: "The first warning never drawn" },
    ],
  } as unknown as Slide

  /** Two placed components, so each cut has an owner. */
  function page(second: string): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<g data-audit-rect="96,228,1088,412">` +
      `<g data-audit-box="96,244,1088">` +
      `<text data-truncated="1" x="96" y="260" font-size="18">The first…</text></g>` +
      `<g data-audit-box="96,400,1088">${second}</g>` +
      `</g></g></svg>`
    )
  }

  it("reports a field whose only witness is another field's cut", () => {
    expect(checkPageFidelity(page(""), slide).missing.map((m) => m.path)).toEqual([
      "components[1](callout).text",
    ])
  })

  it("accepts a field whose own block shows the cut", () => {
    const own = `<text data-truncated="1" x="96" y="420" font-size="18">The first warning…</text>`
    expect(checkPageFidelity(page(own), slide).missing).toEqual([])
  })
})

describe("CJK punctuation carries meaning the scan may not fold away", () => {
  function slideWith(text: string): Slide {
    return {
      type: "content",
      kind: "points",
      heading: "Head",
      components: [{ type: "paragraph", text }],
    } as unknown as Slide
  }

  function page(painted: string): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">${painted}</text></g></g></g></svg>`
    )
  }

  it("does not accept an exclamation in place of the author's question mark", () => {
    expect(checkPageFidelity(page("是否批准！"), slideWith("是否批准？")).missing).toHaveLength(1)
  })

  it("does not accept a question dropped from the end of the line", () => {
    expect(checkPageFidelity(page("是否批准"), slideWith("是否批准？")).missing).toHaveLength(1)
  })

  it("keeps the full stop, the enumeration comma and the colon", () => {
    expect(checkPageFidelity(page("已批准"), slideWith("已批准。")).missing).toHaveLength(1)
    expect(checkPageFidelity(page("甲乙"), slideWith("甲、乙")).missing).toHaveLength(1)
    expect(checkPageFidelity(page("结论如下"), slideWith("结论：如下")).missing).toHaveLength(1)
  })

  it("still ignores the comma a vertical column sets as a change of column", () => {
    expect(checkPageFidelity(page("春风得意"), slideWith("春风，得意")).missing).toEqual([])
  })

  it("checks a field that is nothing but punctuation rather than passing it blind", () => {
    expect(checkPageFidelity(page("。"), slideWith("。")).missing).toEqual([])
    expect(checkPageFidelity(page(""), slideWith("。")).missing).toHaveLength(1)
  })
})

// The ruling that a single series names itself through the page's own
// semantics (see `WIDENED_PATHS`) only holds if the *narrower* loss is still
// caught. Two series get a legend, and a legend that stops being drawn is a
// regression the corpus sweep has to report on any face.
describe("a multi-series legend stays under the scan on every face", () => {
  function chartSlide(names: readonly string[]): Slide {
    return {
      type: "content",
      kind: "data",
      heading: "Quarterly trend",
      components: [
        {
          type: "chart",
          chart_type: "bar",
          series: names.map((name) => ({
            name,
            data: [
              { x: "Q1", y: 1 },
              { x: "Q2", y: 2 },
            ],
          })),
        },
      ],
    } as unknown as Slide
  }

  const twoSeries = chartSlide(["Net Revenue", "Gross Margin"])

  /** Bars and categories drawn, both legend names deleted. */
  const legendless =
    `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
    `<text x="96" y="150" font-size="46">Quarterly trend</text>` +
    `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
    `<text x="96" y="600" font-size="14">Q1</text><text x="300" y="600" font-size="14">Q2</text>` +
    `</g></g></g></svg>`

  it("reports both series names as lost", () => {
    const missing = checkPageFidelity(legendless, twoSeries).missing
    expect(missing.map((m) => m.path)).toEqual([
      "components[0](chart).series[0].name",
      "components[0](chart).series[1].name",
    ])
  })

  it("keeps them through the widened-path filter a non-field-picking face runs", () => {
    const missing = checkPageFidelity(legendless, twoSeries).missing
    expect(missing.filter((m) => widened(m.path, twoSeries)).map((m) => m.path)).toEqual([
      "components[0](chart).series[0].name",
      "components[0](chart).series[1].name",
    ])
  })

  it("leaves a lone series' name absorbed by the page semantics, as ruled", () => {
    const oneSeries = chartSlide(["Net Revenue"])
    const missing = checkPageFidelity(legendless, oneSeries).missing
    expect(missing.map((m) => m.path)).toEqual(["components[0](chart).series[0].name"])
    expect(missing.filter((m) => widened(m.path, oneSeries))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// ink-containment.test.mts
// ---------------------------------------------------------------------------

// The geometry gate. Every component on every page of the review matrix
// paints inside the box it was handed, and every data label stays clear of
// its neighbours and of the marks it names.
//
// Both scans were red when they were written. Sixteen pages painted past the
// bottom of their content rect — every one of them a cartesian chart on
// brief's `gauge-stats` face, which handed the content region a
// hard-coded 208px band and got 316px of chart drawn into it. Twenty-seven
// pages, every line chart in the corpus, had an endpoint value label sitting
// on a plot mark, because a pairwise nudger only ever looks at other labels.
// See `ink-containment.ts` for what each half measures and why.

/** One box declaration wrapping one painted thing, for the helper checks. */
function boxed(inner: string, w = 100, h = 100, attrs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"${attrs}><g data-audit-rect="0,0,${w},${h}"><g data-audit-box="0,0,${w}">${inner}</g></g></svg>`
}

/** The same, with the box declaring the height it was allocated. */
function boxedWithHeight(inner: string, w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,${w},${h}"><g data-audit-box="0,0,${w},${h}">${inner}</g></g></svg>`
}

function parseFirst(markup: string): Element {
  const Parser = getPlatform().domParser!
  return new Parser().parseFromString(markup, "image/svg+xml").documentElement.querySelector("text")!
}

describe("the ink-box helper measures what the page actually paints", () => {
  it("counts letter-spacing, which fitSvgLine budgets for and advance widths do not", () => {
    // `letter-spacing` is absolute px between glyphs: it never appears in
    // `measureTextUnits` and never scales with the font size. `image_compare`
    // fits its labels without it and then paints them with it, which is how a
    // real component ran 41px past its box while this scan stayed green.
    const run = "i".repeat(17)
    const plain = boxed(`<text x="0" y="50" font-size="10">${run}</text>`)
    const spaced = boxed(`<text x="0" y="50" font-size="10" letter-spacing="1">${run}</text>`)
    expect(collectInkFindings(plain)).toEqual([])
    expect(collectInkFindings(spaced).map((f) => f.side)).toEqual(["right"])
  })

  it("puts a positioned tspan where it says it goes, not where its parent starts", () => {
    const markup = boxed(`<text x="10" y="50" font-size="10">ok<tspan x="200">OUT</tspan></text>`)
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeGreaterThan(100)
  })

  it("reads type properties off the ancestors that declare them", () => {
    // `image_compare` sets letter-spacing on the <text> and the family on a
    // <g> above it. SVG cascades both; a scanner that reads only the <text>'s
    // own attributes measures a different string than the browser draws.
    const run = "i".repeat(17)
    const onText = boxed(`<text x="0" y="50" font-size="10" letter-spacing="1">${run}</text>`)
    const onAncestor = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100" letter-spacing="1"><g data-audit-box="0,0,100"><text x="0" y="50" font-size="10">${run}</text></g></g></svg>`
    expect(collectInkFindings(onAncestor).map((f) => f.side)).toEqual(["right"])
    expect(collectInkFindings(onAncestor)[0]!.px).toBeCloseTo(collectInkFindings(onText)[0]!.px, 5)
  })

  it("measures an inherited bold at its real width, not the regular one", () => {
    const el = parseFirst(`<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="50" font-size="16">Widths differ</text></svg>`)
    const regular = leafInkBoxes(el, ROOT_TEXT_STYLE)[0]!
    const bold = leafInkBoxes(el, { ...ROOT_TEXT_STYLE, fontWeight: "700" })[0]!
    expect(bold.w).toBeGreaterThan(regular.w)
  })

  it("lets a declared attribute override what it inherited", () => {
    const el = parseFirst(`<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="50" font-size="32">A</text></svg>`)
    expect(inheritTextStyle(el, { ...ROOT_TEXT_STYLE, fontSize: 10 }).fontSize).toBe(32)
    expect(inheritTextStyle(el, { ...ROOT_TEXT_STYLE, fontFamily: "Georgia" }).fontFamily).toBe("Georgia")
  })
})

describe("consecutive tspans are one anchored chunk, the way SVG lays them out", () => {
  it("sums two unpositioned runs under an end anchor instead of stacking them", () => {
    // Anchoring each <tspan> on its own put both runs at the same right edge,
    // on top of each other, and reported the widest single run rather than
    // their sum. Under text-anchor="end" that hid a real 37px left overflow.
    const chunked = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="95" y="50" font-size="10" text-anchor="end"><tspan>AAAAAAAAAA</tspan><tspan>AAAAAAAAAA</tspan></text></g></g></svg>`
    const findings = collectInkFindings(chunked)
    expect(findings.map((f) => f.side)).toEqual(["left"])
    expect(findings[0]!.px).toBeGreaterThan(30)
    // The same twenty glyphs as one text node must measure the same.
    const flat = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="95" y="50" font-size="10" text-anchor="end">${"A".repeat(20)}</text></g></g></svg>`
    expect(findings[0]!.px).toBeCloseTo(collectInkFindings(flat)[0]!.px, 5)
  })

  it("measures a real emphasis line the same as its own unmarked text", () => {
    // `renderEmphasisTspans` is the live producer of consecutive tspans with
    // no position of their own — one per **marked** run.
    const segments = parseEmphasis("总量增长 **四成**，续约率同步回升到九成")
    const tspans = renderEmphasisTspans(segments, { accent: "#B45309", baseFill: "#111827" })
    const markup = (inner: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,200,100"><g data-audit-box="0,0,200"><text x="195" y="50" font-size="20" text-anchor="end">${inner}</text></g></g></svg>`
    const marked = collectInkFindings(markup(renderSvgMarkup(createElement(Fragment, null, tspans))))
    const plain = collectInkFindings(markup(stripEmphasis("总量增长 **四成**，续约率同步回升到九成")))
    expect(marked).toHaveLength(1)
    expect(marked[0]!.side).toBe("left")
    expect(marked[0]!.px).toBeCloseTo(plain[0]!.px, 5)
  })

  it("keeps a positioned tspan starting a chunk of its own", () => {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="10" y="50" font-size="10">ok<tspan x="200">OUT</tspan></text></g></g></svg>`
    expect(collectInkFindings(markup).map((f) => f.side)).toEqual(["right"])
  })
})

describe("the walker keeps the current text position", () => {
  it("resumes a y-only tspan where the last glyph ended, not where the chunk began", () => {
    // A tspan giving only `y` starts a new chunk on that axis and keeps the
    // current x. Reading the *previous chunk's start* instead put the second
    // line back under the first and hid the overflow entirely.
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="10" y="30" font-size="10">AAAAAAAAAA<tspan y="60">BBBBBBBBBB</tspan></text></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeCloseTo(42, 0)
  })

  it("collapses whitespace the way the default SVG rule does", () => {
    // Four source spaces are painted as one. Measuring all four reported an
    // overflow the page does not have.
    const markup = (inner: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,33,100"><g data-audit-box="0,0,33"><text x="0" y="50" font-size="10">${inner}</text></g></g></svg>`
    expect(collectInkFindings(markup(`<tspan>AA    </tspan><tspan>BB</tspan>`))).toEqual([])
    // …and the one space a boundary really does paint still counts: the same
    // glyphs with no space between them are narrower.
    const spaced = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="0" y="50" font-size="10">AAAAAAAAAA<tspan> </tspan>AAAAAAAAAA</text></g></g></svg>`
    const tight = spaced.replace("<tspan> </tspan>", "")
    expect(collectInkFindings(spaced)[0]!.px).toBeGreaterThan(collectInkFindings(tight)[0]!.px)
  })

  it("shifts by dx without starting a chunk", () => {
    // Tspans in the live corpus carry dx: the sparse faces write them.
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="10" y="50" font-size="10">AAAA<tspan dx="80">BBBB</tspan></text></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeCloseTo(42.8, 1)
  })

  it("shifts by dy without starting a chunk", () => {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="10" y="20" font-size="10">A<tspan dy="-30">B</tspan></text></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["top"])
    expect(findings[0]!.px).toBeCloseTo(17.2, 1)
  })

  it("no page in the corpus asks the walker to read a per-glyph dx or dy list", () => {
    // The walker reads a `dx`/`dy` list as no shift, which under-reports a
    // real per-glyph offset — and asserting *that* is asserting the
    // simplification. What makes the simplification safe is the fact
    // underneath it: nothing in this renderer emits a list. Every live
    // producer of either attribute writes one number. So the
    // contract to hold is the absence, checked against every page the
    // matrix renders rather than against a hand-written string.
    expect(corpus.svgs.size).toBeGreaterThan(0)
    const offenders: string[] = []
    for (const [id, svg] of corpus.svgs) {
      for (const m of svg.matchAll(/\sd[xy]="([^"]*)"/g)) {
        if (/[\s,]/.test(m[1]!.trim())) offenders.push(`${id}: ${m[0]}`)
      }
    }
    expect(offenders, offenders.slice(0, 10).join("\n")).toEqual([])
  })
})

describe("the walker resolves whitespace the way SVG does", () => {
  const box = (inner: string, w = 100) =>
    `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,${w},100"><g data-audit-box="0,0,${w}">${inner}</g></g></svg>`

  it("measures every character of an xml:space=preserve line", () => {
    // 173 text nodes in the live corpus carry it — every line `code.tsx`
    // paints, where the indentation is the author's content. Collapsing it
    // measured one line 105px narrower than the page draws it.
    const line = `${" ".repeat(20)}AAAAAAAAAA`
    const preserved = box(`<text x="0" y="50" font-family="Consolas" font-size="10" xml:space="preserve">${line}</text>`)
    const findings = collectInkFindings(preserved)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeCloseTo(36, 0)
    // The same characters under the default mode collapse away, as they should.
    expect(collectInkFindings(preserved.replace(' xml:space="preserve"', ""))).toEqual([])
  })

  it("inherits the preserve mode from an ancestor", () => {
    const line = `${" ".repeat(20)}AAAAAAAAAA`
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g xml:space="preserve" data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="0" y="50" font-family="Consolas" font-size="10">${line}</text></g></g></svg>`
    expect(collectInkFindings(markup).map((f) => f.side)).toEqual(["right"])
  })

  it("collapses a blank pair straddling a run boundary before laying anything out", () => {
    // `renderEmphasisTspans(parseEmphasis("AA ** BB**"))` writes exactly this.
    // Measuring both blanks reported an overflow the page does not have.
    const markup = box(`<text x="0" y="50" font-size="10"><tspan>AA </tspan><tspan font-weight="600"> BB</tspan></text>`, 27.2)
    expect(collectInkFindings(markup)).toEqual([])
  })

  it("keeps an interior blank that lands at a positioned chunk's edge", () => {
    // The blank is interior to the <text>, so it survives and advances the
    // cursor the next chunk continues from. Trimming it per chunk put the
    // second line 10px to the left and hid the overflow again.
    const markup = box(`<text x="0" y="35" font-size="30">A <tspan y="75">B</tspan></text>`, 40)
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeCloseTo(10.1, 1)
  })
})

describe("a tspan's position addresses its own subtree, nearest declaration first", () => {
  // Browser-verified with getStartPositionOfChar(0): an x on a tspan
  // addresses the first character that element or a descendant actually
  // paints. A tspan whose whole subtree collapses away addresses nothing, and
  // the sibling after it keeps the position it already had.
  const bx = (inner: string) => {
    const Parser = getPlatform().domParser!
    const el = new Parser()
      .parseFromString(`<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="50" font-size="10">${inner}</text></svg>`, "image/svg+xml")
      .documentElement.querySelector("text")!
    return leafInkBoxes(el as Element, ROOT_TEXT_STYLE).map((box) => box.x)
  }

  it("hands an outer x down to a descendant's first surviving character", () => {
    expect(bx(`<tspan x="150"> <tspan>B</tspan></tspan>`)).toEqual([150])
  })

  it("does not hand it to a following sibling when the subtree collapsed away", () => {
    expect(bx(`<tspan x="150"> </tspan><tspan>B</tspan>`)).toEqual([0])
  })

  it("lets a nearer x win over the one that encloses it", () => {
    expect(bx(`<tspan x="150"> <tspan x="20">B</tspan></tspan>`)).toEqual([20])
    expect(bx(`<tspan x="150"> </tspan><tspan x="20">B</tspan>`)).toEqual([20])
  })

  it("reports no overflow for the sibling case, which starts at the root x", () => {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="0" y="50" font-size="10"><tspan x="150"> </tspan><tspan>B</tspan></text></g></g></svg>`
    expect(collectInkFindings(markup)).toEqual([])
  })
})

describe("nested audit boxes cannot launder an outer overflow", () => {
  it("charges a child's ink to every box scope above it", () => {
    // `matrix`, `icon_cards`, `row_cards`, `sankey` and `flowchart` all
    // declare one box per cell inside the component's own box. Charging the
    // ink only to the innermost let an inner box vouch for its own escape
    // with its own declaration while the outer one measured nothing at all.
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><g data-audit-box="200,0,10"><rect x="200" y="0" width="10" height="10"/></g></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.box)).toEqual(["0,0,100"])
    expect(findings[0]!.side).toBe("right")
    expect(findings[0]!.px).toBeCloseTo(110)
  })
})

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF", surface: "#F4F4F4", primary: "#006A4E", accent: "#00A878",
    text: "#1A2421", muted: "#5D6B65",
    chartPalette: ["#006A4E", "#00A878", "#FF6B35", "#FFD166"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}

describe("a chart with one category keeps its tick inside the box", () => {
  for (const chart_type of ["line", "area"] as const) {
    for (const [label, name] of [
      ["CJK", "\u5fae\u670d\u52a1\u67b6\u6784\u4e0b\u7684\u5206\u5e03\u5f0f\u4e8b\u52a1\u4e00\u81f4\u6027\u4fdd\u969c\u673a\u5236"],
      ["Latin", "Quarterly recurring revenue guidance"],
    ] as const) {
      it(`${chart_type}: a long ${label} name on the only category stays inside`, () => {
        // `i / (n - 1)` at n === 1 put the point on the y-axis and the
        // middle-anchored tick half a name to the left of the component.
        const component = {
          type: "chart" as const,
          chart_type,
          series: [{ name: "S", data: [{ x: name, y: 10 }] }],
        }
        const w = 1120
        const h = chart.measure(component, w, ctx)
        const markup = boxed(renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx)), w, h)
        expect(collectInkFindings(markup)).toEqual([])
      })
    }
  }
})

describe("a component is held to its own allocated height", () => {
  it("catches a block that paints into the block below it", () => {
    // The review's A-over-B case. Component A is allocated 100px at the top
    // of a 400px content rect and paints 220, straight through component B,
    // which starts at 120. Every pixel of that is inside the content rect,
    // which was the only vertical limit this scan knew — so it reported
    // nothing at all.
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="0,0,400,100"><rect x="0" y="0" width="400" height="220"/></g>` +
      `<g data-audit-box="0,120,400,100"><rect x="0" y="120" width="400" height="60"/></g>` +
      `</g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["bottom"])
    expect(findings[0]!.px).toBeCloseTo(120)
    expect(findings[0]!.message).toContain("its own allocated height")
  })

  it("keeps the content rect as the limit for a declaration with no height", () => {
    // A three-number declaration states no height, so the rect bottom stays
    // the only line there is.
    const inside =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="0,0,400"><rect x="0" y="0" width="400" height="220"/></g></g></svg>`
    expect(collectInkFindings(inside)).toEqual([])
    const past =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="0,0,400"><rect x="0" y="0" width="400" height="460"/></g></g></svg>`
    const findings = collectInkFindings(past)
    expect(findings.map((f) => f.side)).toEqual(["bottom"])
    expect(findings[0]!.message).toContain("the content rect")
  })

  it("lets a radial chart's leader stubs stay inside the band it was given", () => {
    // Every slice hangs a leader stub off its own arc, and only the
    // horizontal side ever paid for it — a slice near six o'clock put its
    // leader 6px below the box, on 46 corpus pages.
    for (const chart_type of ["pie", "donut"] as const) {
      const component = {
        type: "chart" as const,
        chart_type,
        series: [
          {
            name: "Share",
            data: [
              { x: "Enterprise", y: 45 },
              { x: "SMB", y: 30 },
              { x: "Consumer", y: 25 },
            ],
          },
        ],
      }
      for (const h of [240, 324, 400]) {
        const markup = boxedWithHeight(
          renderSvgMarkup(chart.render(component, { x: 0, y: 0, w: 1088, h }, ctx)),
          1088,
          h,
        )
        expect(collectInkFindings(markup), `${chart_type} h=${h}`).toEqual([])
      }
    }
  })
})

describe("a declared box travels with the ink it declares", () => {
  it("carries a nested box through the ancestor transform above it", () => {
    // `assertion-evidence`, `fitted-evidence` and `content-stacked-poster`
    // all wrap `renderComponent(component, { x: 0, y: 0, w })` in a
    // translate+scale. A component that declares its own box inside that
    // wrapper states it in local coordinates while its ink is measured in
    // page coordinates, and the two were compared against each other: a
    // 100px overflow finding for a component painting exactly inside its own
    // declaration.
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="100,0,200"><g transform="translate(100,0)">` +
      `<g data-audit-box="0,0,200"><rect x="0" y="0" width="200" height="10"/></g>` +
      `</g></g></g></svg>`
    expect(collectInkFindings(markup)).toEqual([])
  })

  it("scales a nested declaration by the same factor as the ink under it", () => {
    const inside =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="0,0,100"><g transform="translate(0,0) scale(0.5)">` +
      `<g data-audit-box="0,0,200"><rect x="0" y="0" width="200" height="10"/></g>` +
      `</g></g></g></svg>`
    expect(collectInkFindings(inside)).toEqual([])
  })

  it("still catches ink that leaves a nested box under a transform", () => {
    // The transform must not become a way to launder an escape.
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="100,0,300"><g transform="translate(100,0)">` +
      `<g data-audit-box="0,0,100"><rect x="0" y="0" width="200" height="10"/></g>` +
      `</g></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.box)).toEqual(["0,0,100"])
    expect(findings[0]!.side).toBe("right")
    expect(findings[0]!.px).toBeCloseTo(100)
  })

  it("reads a box on a transforming element in that element's own frame", () => {
    // `verdict-banner.tsx` puts `translate(box.x,box.y)` and its own
    // declaration on the same `<g>`. The declaration is stated the way its
    // children are stated — at the local origin — and the transform carries
    // both to the page together.
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g transform="translate(100,0)" data-audit-box="0,0,200">` +
      `<rect x="0" y="0" width="200" height="10"/></g></g></svg>`
    expect(collectInkFindings(markup)).toEqual([])
  })
})

describe("an unbounded axis label cannot push the plot out of its box", () => {
  it("keeps a 200-character y unit inside the component box", () => {
    const component = {
      type: "chart" as const,
      chart_type: "line" as const,
      axes: { y_unit: "W".repeat(200) },
      series: [{ name: "S", data: [{ x: "A", y: 1 }, { x: "B", y: 2 }] }],
    }
    const w = 400
    const h = chart.measure(component, w, ctx)
    const markup = boxed(renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx)), w, h)
    expect(collectInkFindings(markup)).toEqual([])
  })

  it("keeps the gutter inside the box at widths where the comfort floor cannot fit", () => {
    // The 36px minimum gutter used to be re-applied outside the 32% cap, so
    // the cap was not a cap: below ~31px the plot origin alone landed outside
    // the box. 400px is where the cap binds and the old code looked fine —
    // these two are where it did not.
    for (const w of [30, 20]) {
      const component = {
        type: "chart" as const,
        chart_type: "line" as const,
        axes: { x_title: "月", y_title: "数" },
        series: [{ name: "S", data: [{ x: "A", y: 1 }, { x: "B", y: 2 }] }],
      }
      const h = chart.measure(component, w, ctx)
      const markup = boxed(renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx)), w, h)
      expect(collectInkFindings(markup), `w=${w}`).toEqual([])
    }
  })

  /**
   * The contract for a directly-labelled chart, at the exact width it starts
   * painting: **every series is named, or nothing is.**
   *
   * This used to assert "there is still a plot mark at
   * `MIN_CARTESIAN_BOX_W`", which is a fact about the implementation. Then it
   * asserted `labels > 0` at a constant width, which is a weaker fact about
   * a different implementation — at that width the chart painted `"2"`,
   * `"1"`, `"4"`, `"3"`, four numbers with no series name anywhere and no
   * silent marker, and the export passed. The threshold is not a constant at
   * all: it moves with the y-tick gutter, so the test finds it instead of
   * naming it.
   */
  const firstPaintedWidth = (component: Parameters<typeof chart.render>[0]) => {
    for (let w = 40; w <= 900; w++) {
      const h = chart.measure(component, w, ctx)
      const markup = renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx))
      if ((markup.match(/data-plot-mark/g) ?? []).length > 0) return w
    }
    throw new Error("never painted below 900px")
  }

  const shot = (component: Parameters<typeof chart.render>[0], w: number) => {
    const h = chart.measure(component, w, ctx)
    const markup = renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx))
    return {
      markup,
      marks: (markup.match(/data-plot-mark/g) ?? []).length,
      labels: [...markup.matchAll(/data-value-label[^>]*>([^<]*)</g)].map((m) => m[1]!),
      declared: /data-dropped/.test(markup),
      findings: collectInkFindings(boxed(markup, w, h)),
    }
  }

  const namedLine = (ys: readonly number[]) => ({
    type: "chart" as const,
    chart_type: "line" as const,
    axes: { x_title: "月", y_title: "数" },
    series: [
      { name: "Alpha", data: [{ x: "A", y: ys[0]! }, { x: "B", y: ys[1]! }] },
      { name: "Beta", data: [{ x: "A", y: ys[2]! }, { x: "B", y: ys[3]! }] },
    ],
  })

  for (const [label, ys] of [
    ["short ticks", [1, 2, 3, 4]],
    // The y-tick gutter is capped at a share of the box, so nine-digit ticks
    // leave a different plot at the same width. At 200px this painted six
    // marks, zero labels and `data-dropped="4"` — drawing and
    // declaring at once.
    ["nine-digit ticks", [100_000_000, 200_000_000, 300_000_000, 400_000_000]],
  ] as const) {
    it(`${label}: paints with every series named, or declines`, () => {
      const component = namedLine(ys)
      const w = firstPaintedWidth(component)

      const tooNarrow = shot(component, w - 1)
      expect(tooNarrow.marks).toBe(0)
      expect(tooNarrow.labels).toEqual([])
      expect(tooNarrow.declared).toBe(true)
      expect(tooNarrow.findings).toEqual([])

      const wideEnough = shot(component, w)
      expect(wideEnough.marks).toBeGreaterThan(0)
      expect(wideEnough.declared).toBe(false)
      expect(wideEnough.findings).toEqual([])
      // Every series carries its own name at the boundary — a real prefix of
      // it, with its end value still attached — not a bare number. A name
      // cut short says so with `data-truncated`; a name cut to nothing is
      // the silent case, and that is what the chart declines instead of
      // painting.
      const ends = [ys[1], ys[3]]
      for (const [i, name] of ["Alpha", "Beta"].entries()) {
        // Printed the English way, grouped in threes (`groupDigits`).
        const value = ends[i]!.toLocaleString("en-US")
        const own = wideEnough.labels.find((text) => text.endsWith(` ${value}`))
        expect(own, `${name} ${value} in ${JSON.stringify(wideEnough.labels)}`).toBeDefined()
        const printedName = own!.slice(0, own!.length - value.length - 1)
        expect(printedName.length).toBeGreaterThan(0)
        expect(name.startsWith(printedName), `${printedName} is a prefix of ${name}`).toBe(true)
        if (printedName !== name) {
          expect(wideEnough.markup).toContain('data-truncated="1"')
        }
      }
    })
  }

  it("never paints a line and declares a silent drop at the same time", () => {
    // Sweep the whole range the two contracts meet in: at no width may a
    // chart both put a mark on the page and say it lost something silently.
    for (const ys of [[1, 2, 3, 4], [100_000_000, 200_000_000, 300_000_000, 400_000_000]] as const) {
      const component = namedLine(ys)
      for (let w = 40; w <= 420; w += 2) {
        const s = shot(component, w)
        expect(s.marks > 0 && s.declared, `w=${w} ys=${ys[0]}`).toBe(false)
      }
    }
  })

  it("still declines a bar chart below the width at which a plot exists", () => {
    // Bar carries no gutters, so `MIN_CARTESIAN_BOX_W` is its whole floor.
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [{ name: "S", data: [{ x: "A", y: 1 }, { x: "B", y: 2 }] }],
    }
    const render = (w: number) => {
      const h = chart.measure(component, w, ctx)
      const markup = renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx))
      return {
        marks: (markup.match(/data-plot-mark/g) ?? []).length,
        findings: collectInkFindings(boxed(markup, w, h)),
      }
    }
    expect(render(MIN_CARTESIAN_BOX_W - 1).marks).toBe(0)
    const wideEnough = render(MIN_CARTESIAN_BOX_W)
    expect(wideEnough.marks).toBeGreaterThan(0)
    expect(wideEnough.findings).toEqual([])
  })
})

describe("the label-on-mark check sees radial marks and follows a stroke", () => {
  it("marks a pie's wedges and a donut's rings as plot marks", () => {
    // Wedges carried no `data-plot-mark`, so the check that exists to keep a
    // label off the data it names was blind to every radial chart.
    for (const chart_type of ["pie", "donut"] as const) {
      const component = {
        type: "chart" as const,
        chart_type,
        series: [{ name: "Share", data: [{ x: "A", y: 40 }, { x: "B", y: 35 }, { x: "C", y: 25 }] }],
      }
      const h = chart.measure(component, 600, ctx)
      const markup = renderSvgMarkup(chart.render(component, { x: 0, y: 0, w: 600, h }, ctx))
      expect((markup.match(/data-plot-mark/g) ?? []).length, chart_type).toBe(3)
      // And the labels still sit clear of them.
      expect(collectLabelFindings(markup), chart_type).toEqual([])
    }
  })

  it("catches a label parked on a wedge", () => {
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<path data-plot-mark="1" d="M 100 100 L 100 0 A 100 100 0 0 1 200 100 Z" fill="#000"/>` +
      `<text data-value-label="1" x="130" y="60" font-size="16">40</text></svg>`
    expect(collectLabelFindings(markup).map((f) => f.message)).toEqual([
      'data label "40" sits on a data mark',
    ])
  })

  it("measures a diagonal polyline by its stroke, not the rectangle around it", () => {
    // A line from the plot's bottom-left to its top-right claims the whole
    // plot as its bounding box, so a label parked in the empty corner beside
    // it read as sitting on the line while being 60px clear of the stroke.
    const clear =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<polyline data-plot-mark="1" points="0,90 90,0" fill="none" stroke="#000"/>` +
      `<text data-value-label="1" x="0" y="10" font-size="10">ok</text></svg>`
    expect(collectLabelFindings(clear)).toEqual([])
    // A label actually sitting on the same diagonal is still caught.
    const on =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<polyline data-plot-mark="1" points="0,90 90,0" fill="none" stroke="#000"/>` +
      `<text data-value-label="1" x="40" y="50" font-size="10">on</text></svg>`
    expect(collectLabelFindings(on).map((f) => f.message)).toEqual([
      'data label "on" sits on a data mark',
    ])
  })
})

describe("gallery geometry", () => {
  it("no component paints outside the box it accepted", () => {
    expect(corpus.svgs.size).toBeGreaterThan(0)
    const offenders: string[] = []
    for (const [id, svg] of corpus.svgs) {
      for (const finding of collectInkFindings(svg)) offenders.push(`${id}: ${finding.message}`)
    }
    expect(offenders, offenders.slice(0, 20).join("\n")).toEqual([])
  })

  it("no data label lands on another label or on a data mark", () => {
    const offenders: string[] = []
    for (const [id, svg] of corpus.svgs) {
      for (const finding of collectLabelFindings(svg)) offenders.push(`${id}: ${finding.message}`)
    }
    expect(offenders, offenders.slice(0, 20).join("\n")).toEqual([])
  })
})
