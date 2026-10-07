// @vitest-environment node
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../__fixtures__/theme-ctx"
import { listThemes, renderSlideSvg } from "../../api"
import type { PptxIR, Slide } from "../../ir"
import { measureMonoTextUnits, measureTextUnits } from "../../lib/svg-text-layout"
import { installNodePlatform } from "../../platform/node"
import { parseTransform } from "../../audit/svg-audit"
import { isBold, isMonoFontFamily } from "../fonts"
import { parseSvgRoot, renderSvgMarkup } from "../serialize"
import { corpusAssets, themeDeck } from "../../../evals/gallery/corpus/decks"
import { LEXICONS } from "../../../evals/gallery/corpus/lexicon"
import { nativeLexiconFor } from "../../../evals/gallery/corpus/native"
import { assignedThemeIds } from "./assignments"
import { BUILTIN_THEME_FILES, type CanonicalThemeId } from "../../themes"
import { compileBuiltinTheme } from "../../themes/definitions"
import { tryContentHeadingTreatment } from "./render"

installNodePlatform()

const GALLERY_HEADING = "预测准确率提升带来的直接停机减少"
const CHAPTER = "战略与运营部"
const BADGE_X = 96
const BADGE_Y = 96
const BADGE_W = 64
const BADGE_H = 32
const BADGE_LABEL = /^\d+\.\d+$/

interface Box {
  x: number
  y: number
  w: number
  h: number
  label: string
}

function aabbIntersect(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function textWidth(el: Element, content: string, fontSize: number): number {
  const fontFamily = el.getAttribute("font-family") ?? ""
  const units = isMonoFontFamily(fontFamily)
    ? measureMonoTextUnits(content)
    : measureTextUnits(content, { bold: isBold(el.getAttribute("font-weight")), fontFamily })
  return units * fontSize
}

function walkTextBoxes(root: Element): Box[] {
  const out: Box[] = []
  const visit = (el: Element, ox: number, oy: number, os: number) => {
    const { dx, dy, scale } = parseTransform(el)
    const ax = ox + os * dx
    const ay = oy + os * dy
    const as = os * scale
    if (el.tagName.toLowerCase() === "text") {
      const content = (el.textContent ?? "").trim()
      if (content) {
        const fontSize = Number(el.getAttribute("font-size") ?? 16) * as
        const tx = ax + Number(el.getAttribute("x") ?? 0) * as
        const ty = ay + Number(el.getAttribute("y") ?? 0) * as
        const width = textWidth(el, content, fontSize)
        const anchor = el.getAttribute("text-anchor") ?? "start"
        const left = anchor === "end" ? tx - width : anchor === "middle" ? tx - width / 2 : tx
        out.push({
          x: left,
          y: ty - fontSize,
          w: width,
          h: fontSize + fontSize * 0.25,
          label: content.slice(0, 24),
        })
      }
    }
    for (const child of Array.from(el.children)) visit(child, ax, ay, as)
  }
  visit(root, 0, 0, 1)
  return out
}

function walkRects(root: Element): Box[] {
  const out: Box[] = []
  const visit = (el: Element, ox: number, oy: number, os: number) => {
    const { dx, dy, scale } = parseTransform(el)
    const ax = ox + os * dx
    const ay = oy + os * dy
    const as = os * scale
    if (el.tagName.toLowerCase() === "rect") {
      const w = Number(el.getAttribute("width") ?? 0) * as
      const h = Number(el.getAttribute("height") ?? 0) * as
      out.push({
        x: ax + Number(el.getAttribute("x") ?? 0) * as,
        y: ay + Number(el.getAttribute("y") ?? 0) * as,
        w,
        h,
        label: "rect",
      })
    }
    for (const child of Array.from(el.children)) visit(child, ax, ay, as)
  }
  visit(root, 0, 0, 1)
  return out
}

function findRailBadge(root: Element): Box | null {
  const painted = walkRects(root).find(
    (r) => r.x === BADGE_X && r.y === BADGE_Y && r.w === BADGE_W && r.h === BADGE_H,
  )
  if (painted) return { ...painted, label: "badge" }
  // Gallery sankey/kpi values like "1.5" match /^\d+\.\d+$/ and must not
  // be treated as the {chapter}.{n} rail badge. Only a badge-sized rect
  // in the badge slot counts. Never return the decimal label itself.
  const label = walkTextBoxes(root).find((t) => BADGE_LABEL.test(t.label))
  if (!label) return null
  const nearby = walkRects(root).find(
    (r) =>
      aabbIntersect(r, label) &&
      r.w >= 40 &&
      r.w <= 80 &&
      r.h >= 20 &&
      r.h <= 40 &&
      Math.abs(r.x - BADGE_X) <= 8,
  )
  return nearby ? { ...nearby, label: "badge" } : null
}

function isRailNumbered(root: Element): boolean {
  return root.querySelector('[data-face="rail-numbered"]') !== null
}

function titleBoxes(texts: Box[], heading: string): Box[] {
  return texts.filter((t) => {
    if (t.h < 24 * 1.25 - 0.01) return false
    const content = t.label
    return heading.includes(content) || content.includes(heading.slice(0, 8))
  })
}

function kickerBoxes(texts: Box[]): Box[] {
  return texts.filter((t) => {
    if (Array.from(t.label).length !== 1) return false
    if (t.h >= 24 * 1.25) return false
    if (BADGE_LABEL.test(t.label)) return false
    return true
  })
}

function fmt(b: Box): string {
  return `${b.label} x=${b.x.toFixed(1)} y=${b.y.toFixed(1)} w=${b.w.toFixed(1)} h=${b.h.toFixed(1)}`
}

function collisionsAgainst(badge: Box, boxes: Box[]): Box[] {
  return boxes.filter((b) => aabbIntersect(badge, b))
}

/** Axis gap between two boxes. 0 when they intersect. */
function clearance(a: Box, b: Box): number {
  const overlapX = a.x < b.x + b.w && a.x + a.w > b.x
  const overlapY = a.y < b.y + b.h && a.y + a.h > b.y
  if (overlapX && overlapY) return 0
  if (overlapX) return a.y + a.h <= b.y ? b.y - (a.y + a.h) : a.y - (b.y + b.h)
  if (overlapY) return a.x + a.w <= b.x ? b.x - (a.x + a.w) : a.x - (b.x + b.w)
  const dx = a.x + a.w <= b.x ? b.x - (a.x + a.w) : a.x - (b.x + b.w)
  const dy = a.y + a.h <= b.y ? b.y - (a.y + a.h) : a.y - (b.y + b.h)
  return Math.hypot(dx, dy)
}

function findTagBox(root: Element): Box | null {
  const label = walkTextBoxes(root).find((t) =>
    /第.+部分|第.+幕|ROUND \d|PART |ACT |CHAPTER /.test(t.label),
  )
  if (!label) return null
  const box = walkRects(root).find(
    (r) => aabbIntersect(r, label) && r.w >= 80 && r.h >= 20 && r.h <= 50,
  )
  return box ? { ...box, label: "tag-box" } : null
}

const TAG_BOX_CLEARANCE = 20

function deck(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "heading-collision.pptx",
    theme: { id: themeId },
    meta: { organization: "pptwise" },
    assets: { images: {} },
    slides,
  } as PptxIR
}

function chapterSlide(heading = CHAPTER): Slide {
  return { type: "chapter", heading, components: [] } as Slide
}

function contentSlide(heading = GALLERY_HEADING): Slide {
  return {
    type: "content",
    kind: "process",
    heading,
    components: [{ type: "paragraph", text: "正文占位" }],
  } as Slide
}

function renderRailPage(themeId: string, heading = GALLERY_HEADING): { svg: string; root: Element } {
  const ir = deck(themeId, [chapterSlide(), contentSlide(heading)])
  const svg = renderSlideSvg(ir, 1)
  return { svg, root: parseSvgRoot(svg) }
}

function expectBadgeClear(themeId: string, root: Element, heading: string): void {
  const badge = findRailBadge(root)
  expect(badge, `${themeId}: rail-numbered badge must still be painted`).not.toBeNull()
  const texts = walkTextBoxes(root)
  const titles = titleBoxes(texts, heading)
  expect(titles.length, `${themeId}: heading text should render`).toBeGreaterThan(0)
  const titleHits = collisionsAgainst(badge!, titles)
  expect(
    titleHits,
    `${themeId}: badge vs title\n  badge ${fmt(badge!)}\n  ${titleHits.map(fmt).join("\n  ")}`,
  ).toEqual([])
  const kickers = kickerBoxes(texts)
  const kickerHits = collisionsAgainst(badge!, kickers)
  expect(
    kickerHits,
    `${themeId}: badge vs stacked kicker chars\n  badge ${fmt(badge!)}\n  ${kickerHits.map(fmt).join("\n  ")}`,
  ).toEqual([])
}

describe("rail-numbered badge vs heading treatment", () => {
  it("luxe title does not intersect the {chapter}.{n} badge", () => {
    const { root } = renderRailPage("luxe")
    expectBadgeClear("luxe", root, GALLERY_HEADING)
  })

  it("ink title and vertical-kicker chars do not intersect the badge", () => {
    // ink's own process page is its scroll sheet since the 2026-10-07 redesign; its treatment still reaches rail-numbered put there by value.
    const { root } = renderAssignedRailPage("ink")
    expectBadgeClear("ink", root, GALLERY_HEADING)
    const kickers = kickerBoxes(walkTextBoxes(root))
    expect(kickers.length, "ink should still paint a stacked kicker").toBeGreaterThan(0)
  })
})

/**
 * The theme's own process page when its menu puts rail-numbered there, else
 * the same theme, under its own id, with rail-numbered put there by value.
 * The treatment table is keyed by theme id, so a renamed copy would carry no
 * treatment at all. brief's process page is gauge-sheet since the 2026-10-02
 * redesign, and its ghost index still reaches a workspace copy of brief that
 * keeps the id and names rail-numbered, so the pairing stays checked.
 */
function renderAssignedRailPage(themeId: string): { svg: string; root: Element } {
  const file = BUILTIN_THEME_FILES[themeId as CanonicalThemeId]
  if (file.menu.content.process?.face === "rail-numbered") return renderRailPage(themeId)
  const theme = compileBuiltinTheme({
    ...file,
    menu: { ...file.menu, content: { ...file.menu.content, process: { face: "rail-numbered" } } },
  })
  const svg = renderSlideSvg(deck(themeId, [chapterSlide(), contentSlide(GALLERY_HEADING)]), 1, { theme })
  return { svg, root: parseSvgRoot(svg) }
}

describe("assigned themes on rail-numbered", () => {
  it.each(assignedThemeIds())("%s: badge vs title and kicker zero intersect", (themeId) => {
    const { root } = renderAssignedRailPage(themeId)
    expectBadgeClear(themeId, root, GALLERY_HEADING)
  })

  it("still paints brief's ghost index on the page it checks", () => {
    const { root } = renderAssignedRailPage("brief")
    const ghost = Array.from(root.querySelectorAll("text")).find(
      (text) => text.textContent === "01" && Number(text.getAttribute("font-size")) >= 200,
    )
    expect(ghost).toBeDefined()
  })
})

describe("gallery theme-table rail-numbered pages", () => {
  it("ledger zh slide 6 is not a rail-numbered false positive after banner-heading retired", async () => {
    const assets = await corpusAssets(LEXICONS.zh)
    const ir = themeDeck("ledger", nativeLexiconFor("ledger"), assets)
    expect(ir.slides[5]?.type).toBe("content")
    const svg = renderSlideSvg(ir, 5)
    const root = parseSvgRoot(svg)
    expect(root.querySelector('[data-face="side-highlight"]')).toBeNull()
    expect(root.querySelector('[data-face="banner-heading"]')).toBeNull()
    expect(isRailNumbered(root)).toBe(false)
    expect(findRailBadge(root)).toBeNull()
  })

  it("every themeDeck content page that paints the badge stays clear", async () => {
    const assets = await corpusAssets(LEXICONS.zh)
    const dirty: string[] = []
    let scanned = 0
    for (const themeId of listThemes().map((t) => t.id)) {
      // The gallery feeds each theme its native lexicon; test the same decks.
      const ir = themeDeck(themeId, nativeLexiconFor(themeId), assets)
      for (let i = 0; i < ir.slides.length; i++) {
        if (ir.slides[i]!.type !== "content") continue
        const svg = renderSlideSvg(ir, i)
        const root = parseSvgRoot(svg)
        if (!isRailNumbered(root)) continue
        const badge = findRailBadge(root)
        if (!badge) {
          dirty.push(`${themeId} slide ${i}: rail-numbered without a badge`)
          continue
        }
        scanned += 1
        const heading = ir.slides[i]!.heading ?? ""
        const texts = walkTextBoxes(root)
        const hits = [
          ...collisionsAgainst(badge, titleBoxes(texts, heading)),
          ...collisionsAgainst(badge, kickerBoxes(texts)),
        ]
        if (hits.length > 0) {
          dirty.push(`${themeId} p${String(i + 1).padStart(2, "0")} ${hits.map(fmt).join(" | ")}`)
        }
        const tagBox = findTagBox(root)
        if (tagBox && (aabbIntersect(badge, tagBox) || clearance(badge, tagBox) < TAG_BOX_CLEARANCE)) {
          dirty.push(
            `${themeId} p${String(i + 1).padStart(2, "0")} tag-box clearance ${clearance(badge, tagBox).toFixed(1)} ${fmt(tagBox)}`,
          )
        }
      }
    }
    expect(scanned, "gallery should include rail-numbered content pages").toBeGreaterThan(0)
    expect(dirty, dirty.join("\n")).toEqual([])
  })
})

describe("no-reserve path", () => {
  it("ledger title still starts at x=96 when tryContentHeadingTreatment is called without a reserve", () => {
    const ir = deck("ledger", [chapterSlide(), contentSlide()])
    const ctx = boundThemeCtx("ledger", {})
    const treated = tryContentHeadingTreatment({ ir, slide: ir.slides[1]!, index: 1, ctx })
    expect(treated).not.toBeNull()
    const root = parseSvgRoot(
      renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
          {treated!.chrome}
        </svg>,
      ),
    )
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes(GALLERY_HEADING.slice(0, 4)),
    )
    expect(title).toBeTruthy()
    expect(Number(title!.getAttribute("x"))).toBe(96)
  })
})
