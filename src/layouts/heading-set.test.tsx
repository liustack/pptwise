import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { validateIr } from "../validate-core"
import { deckWritesChinese } from "../lib/conf-labels"
import { deckFigureStyle } from "../lib/figure-style"
import { cutLines } from "../render/cut-fields"
import { deckFonts } from "../render/fonts"
import { resolveEffectiveFace } from "../render/layout-selection"
import { resolvePageRenderContext } from "../render/page-context"
import { slideToSvgMarkup } from "../render/render-slide"
import { parseSvgRoot } from "../render/serialize"
import { CANONICAL_THEME_IDS } from "../themes"
import { getThemeDefinition, type ThemeDefinition } from "../themes/definitions"
import { LEGACY_FACE_SAMPLES_BY_ID } from "./__fixtures__/face-samples"
import { headingVerdict, type HeadingVerdict } from "./heading-set"
import { LAYOUT_REGISTRY, type LayoutDefinition } from "./registry"

/**
 * Every cover, chapter and ending face answers validate with the fit its own
 * drawing runs. Here each answer is held to the drawing: on each probe, the
 * longest heading validate passes renders whole, and one step longer renders
 * cut or declined, the way validate said it would.
 */

type BoundaryType = "cover" | "chapter" | "ending"

const HEADINGS = {
  zh: Array.from(
    "同店增速回到正区间而且这一次不是靠促销拉起来的是复购率和客单价一起抬上来的结果我们建议把明年的第一目标定为同店增长并为此调整门店考核与新品节奏试点覆盖华东三个区域共四十二家门店再往后看还要把会员体系和供应链一起改造",
  ),
  // Clause punctuation, where a fit that breaks on a comma breaks.
  zhClauses: Array.from(
    "同店增速回到正区间，而且这一次不是靠促销拉起来的：复购率和客单价一起抬上来，我们建议把明年的第一目标定为同店增长；调整门店考核与新品节奏，试点覆盖华东三个区域、共四十二家门店。再往后看，还要把会员体系和供应链一起改造",
  ),
  en: "Same store growth is back above zero and this time it came from repeat visits and ticket size rather than discounts so we propose making same store growth the first target for next year and changing how stores are measured across every region we serve".split(
    " ",
  ),
  // Chinese with Latin words and figures in it.
  mixed: Array.from("云觅科技 2026 年 Q3 业务评审：SaaS 席位订阅 ARR 增长 38% 而 NRR 回到 112% 我们建议把 2027 年的第一目标定为 Enterprise 客户扩容并为此调整 Sales 考核与 PLG 节奏"),
} as const

type Family = keyof typeof HEADINGS

function heading(family: Family, n: number): string {
  return HEADINGS[family].slice(0, n).join(family === "en" ? " " : "")
}

const BOUNDARY_FACES = Object.values(LAYOUT_REGISTRY).filter((layout) => (["cover", "chapter", "ending"] as const).some((type) => layout.slideTypes.includes(type)))

/** The built-in theme whose menu offers the face, or the gallery's baseline theme for one no menu offers. */
function homeTheme(face: LayoutDefinition, type: BoundaryType, typeScale?: number): ThemeDefinition {
  const home = CANONICAL_THEME_IDS.map((id) => getThemeDefinition(id)).find((theme) => theme.menu[type].face === face.id)
  const base = home ?? getThemeDefinition("brief")
  const style = typeScale === undefined ? base.style : { ...base.style, shape: { ...base.style.shape, typeScale } }
  return { ...base, style, menu: { ...base.menu, [type]: home ? base.menu[type] : { face: face.id } } }
}

function deck(theme: ThemeDefinition, slides: readonly Slide[], meta: PptxIR["meta"] = {}): PptxIR {
  return { version: "5", filename: "heading-set.pptx", theme: { id: theme.id }, meta, assets: { images: {} }, slides: [...slides] } as PptxIR
}

function withHeading(ir: PptxIR, index: number, text: string): PptxIR {
  return { ...ir, slides: ir.slides.map((slide, i) => (i === index ? { ...slide, heading: text } : slide)) }
}

/** What validate's face says about the page's heading. */
function asked(face: LayoutDefinition, ir: PptxIR, index: number, theme: ThemeDefinition): HeadingVerdict | undefined {
  const slide = ir.slides[index]!
  const effective = resolveEffectiveFace(ir, slide, theme)
  return headingVerdict(face, {
    ir,
    slide,
    index,
    params: effective.entry?.params,
    page: resolvePageRenderContext(ir, slide, effective, theme),
    ctx: { fonts: deckFonts(theme.style.fonts, deckWritesChinese(ir)), shape: theme.style.shape, figures: deckFigureStyle(ir) },
  })
}

/** What the drawing did with the page's heading. "silent" is a heading that lost text with no mark on the page. */
function drawn(ir: PptxIR, index: number, theme: ThemeDefinition): HeadingVerdict | "silent" {
  const slide = ir.slides[index]!
  const markup = slideToSvgMarkup(ir, slide, index, theme)
  const root = parseSvgRoot(markup)
  for (const el of Array.from(root.querySelectorAll("[data-dropped]"))) {
    const kind = el.getAttribute("data-dropped-kind")
    if (Number(el.getAttribute("data-dropped")) > 0 && (kind === "label" || kind === "heading" || kind === "title-character")) return "declined"
  }
  if (cutLines(root, slide).some((line) => line.field === "heading")) return "cut"
  const onPage = Array.from(root.querySelectorAll("text"))
    .map((text) => text.textContent ?? "")
    .join("")
    .replace(/\s+/g, "")
  return onPage.includes((slide.heading ?? "").replace(/\s+/g, "")) ? "whole" : "silent"
}

interface Probe {
  label: string
  theme: ThemeDefinition
  ir: PptxIR
  index: number
  family: Family
}

function probes(face: LayoutDefinition): Probe[] {
  const type = face.slideTypes[0] as BoundaryType
  const out: Probe[] = []
  for (const typeScale of [undefined, 1.5]) {
    const theme = homeTheme(face, type, typeScale)
    for (const family of typeScale === undefined ? (Object.keys(HEADINGS) as Family[]) : (["zh", "en"] as const)) {
      out.push({ label: `${family}, bare page, typeScale ${typeScale ?? "theme"}`, theme, ir: deck(theme, [{ type, heading: "x", components: [] } as Slide]), index: 0, family })
    }
  }
  const theme = homeTheme(face, type)
  for (const sample of LEGACY_FACE_SAMPLES_BY_ID.get(face.id) ?? []) {
    for (const family of ["zh", "en"] as const) {
      out.push({ label: `${family}, sample ${sample.variant ?? "page"}`, theme, ir: deck(theme, sample.slides, sample.meta), index: sample.index, family })
    }
  }
  return out
}

const DECLARED = BOUNDARY_FACES.filter((face) => face.headingFit !== undefined || face.headingSet !== undefined)

describe("a boundary face's heading answer holds to its drawing", () => {
  it.each(DECLARED.map((face) => [face.id, face] as const))("%s", (_id, face) => {
    let checked = 0
    for (const probe of probes(face)) {
      const at = (n: number) => withHeading(probe.ir, probe.index, heading(probe.family, n))
      // A page that loses something before its heading is long has nothing to say about the heading.
      if (resolveEffectiveFace(at(1), at(1).slides[probe.index]!, probe.theme).route === "image-cover") continue
      if (drawn(at(1), probe.index, probe.theme) !== "whole") continue
      const max = HEADINGS[probe.family].length
      let limit = 0
      while (limit < max && asked(face, at(limit + 1), probe.index, probe.theme) === "whole") limit += 1
      expect(limit, `${probe.label}: the face holds no heading at all`).toBeGreaterThan(0)
      expect(drawn(at(limit), probe.index, probe.theme), `${probe.label}: validate passes ${limit}`).toBe("whole")
      if (limit < max) {
        const said = asked(face, at(limit + 1), probe.index, probe.theme)
        expect(drawn(at(limit + 1), probe.index, probe.theme), `${probe.label}: validate says ${said} at ${limit + 1}`).toBe(said)
      }
      checked += 1
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("leaves undeclared only the faces that shrink a heading rather than cut it", () => {
    const undeclared = BOUNDARY_FACES.filter((face) => !DECLARED.includes(face)).map((face) => face.id)
    // Both set the heading with `layoutSvgText`, which shrinks it to the meta
    // floor and has no cut: there is no length at which they lose text.
    expect(undeclared.sort()).toEqual(["banner-title", "tone-adaptive-header"])
    for (const id of undeclared) {
      const face = LAYOUT_REGISTRY[id]!
      const theme = homeTheme(face, "cover")
      for (const family of ["zh", "en"] as const) {
        const ir = deck(theme, [{ type: "cover", heading: heading(family, HEADINGS[family].length), components: [] } as Slide])
        expect(drawn(ir, 0, theme), `${id} ${family}`).toBe("whole")
      }
    }
  })
})

describe("validate refuses a boundary heading its face would not set whole", () => {
  const almanac = getThemeDefinition("almanac")
  const cover = (text: string): PptxIR => deck(almanac, [{ type: "cover", heading: text, components: [] } as Slide])

  it("passes the longest heading the face holds, and says what the face holds of a longer one", () => {
    expect(validateIr(cover(heading("zh", 26)), { theme: almanac }).ok).toBe(true)
    const result = validateIr(cover(heading("zh", 31)), { theme: almanac })
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      {
        path: "slides.0.heading",
        page: 1,
        message:
          'face "yearbook-cover" sets a cover heading of about 26 Chinese characters at most, and this one has 31, so the face would cut its end off. Shorten the heading, or move part of it into the subheading.',
      },
    ])
  })

  it("counts an English heading in words", () => {
    const result = validateIr(cover(heading("en", 12)), { theme: almanac })
    expect(result.errors[0]?.message).toContain("of about 9 words at most, and this one has 12")
  })

  it("says the page would be refused when the face declines a heading it cannot hold", () => {
    const stage = getThemeDefinition("stage")
    const result = validateIr(deck(stage, [{ type: "cover", heading: heading("zh", 40), components: [] } as Slide]), { theme: stage })
    expect(result.errors[0]?.message).toMatch(/^face "keynote-cover" sets a cover heading of about \d+ Chinese characters at most, and this one has 40, so the face would refuse the page\./)
  })

  it("leaves out the subheading advice on a face with no place for one", () => {
    const ember = getThemeDefinition("ember")
    const result = validateIr(deck(ember, [{ type: "chapter", heading: heading("zh", 60), components: [] } as Slide]), { theme: ember })
    expect(result.errors[0]?.message).toMatch(/face "pitch-chapter" .*\. Shorten the heading\.$/)
  })
})
