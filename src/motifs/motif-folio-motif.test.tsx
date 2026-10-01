// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { THEME_DEFINITIONS, __registerStructuralTheme, __resetRegisteredThemes } from "../themes/definitions"
import type { Menu, MenuEntry, ThemeFile } from "../themes/schema"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { blendOver, contrastRatio, metaInk } from "../render/ink"
import type { PageRenderContext } from "../render/page-context"
import { BoundSlideSvg } from "../render/__fixtures__/bound-slide"
import { DARK_RULE_MIX, DARK_TEXT_MIX, FolioMotif } from "./motif-folio-motif"
import { countDecorPieces } from "./decor-budget"

type PageType = Slide["type"]

const slideOf = (type: PageType): Slide => ({ type, heading: type, components: [] }) as Slide

const META: PptxIR["meta"] = { organization: "Halden Partners", confidentiality: "confidential", date: "2026-10-14" }

function irOf(slide: Slide, extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "folio.pptx",
    theme: { id: "brief" },
    meta: META,
    assets: { images: {} },
    slides: [slide],
    ...extra,
  } as PptxIR
}

function pageWith(over: Partial<PageRenderContext>): PageRenderContext {
  return {
    motifOn: true,
    brandOn: true,
    branding: "full",
    metadataOn: true,
    documentMetaOn: true,
    geometry: { imageBottomCaptionBottomY: 680 },
    ...over,
  }
}

function draw(type: PageType, opts: { ir?: Partial<PptxIR>; page?: PageRenderContext } = {}) {
  const tokens = resolveStyle("brief")
  const slide = slideOf(type)
  const ground = resolveBackgroundHex(tokens.defaultBackgrounds[type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, ground)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <FolioMotif ir={irOf(slide, opts.ir)} slide={slide} ctx={ctx} page={opts.page} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens, ground }
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text"))
const lineCoords = (line: Element) => ["x1", "y1", "x2", "y2"].map((n) => Number(line.getAttribute(n)))

describe("FolioMotif", () => {
  it("leaves the cover alone, which draws its own footer", () => {
    const { root } = draw("cover", { page: pageWith({}) })
    expect(root.children).toHaveLength(0)
  })

  it.each(["chapter", "content", "ending"] as const)(
    "%s: one structural piece, a 1px rule at y664 from x96 to x1184",
    (type) => {
      const { root } = draw(type, { page: pageWith({}) })
      expect(countDecorPieces(root)).toBe(1)
      const piece = root.querySelector('[data-decor-piece="folio"]')!
      expect(piece.getAttribute("data-decor-role")).toBe("structure")
      const lines = piece.querySelectorAll("line")
      expect(lines).toHaveLength(1)
      expect(lineCoords(lines[0]!)).toEqual([96, 664, 1184, 664])
      expect(lines[0]!.getAttribute("stroke-width")).toBe("1")
      expect(root.querySelectorAll("rect, path, circle, polygon, polyline")).toHaveLength(0)
      expect(() => assertSubset(root)).not.toThrow()
    },
  )

  it("sets the organization left and the confidentiality label right, 16px on one baseline", () => {
    const { root } = draw("content", { page: pageWith({}) })
    const [org, label] = texts(root)
    expect(org!.textContent).toBe("Halden Partners")
    expect(org!.getAttribute("x")).toBe("96")
    expect(org!.getAttribute("text-anchor")).toBeNull()
    expect(label!.textContent).toBe("Confidential")
    expect(label!.getAttribute("x")).toBe("1184")
    expect(label!.getAttribute("text-anchor")).toBe("end")
    for (const t of [org!, label!]) {
      expect(t.getAttribute("font-size")).toBe("16")
      expect(t.getAttribute("y")).toBe("694")
      expect(t.getAttribute("data-contrast-tier")).toBe("meta")
    }
  })

  it("reads the label from the shared confidentiality map, not a literal", () => {
    const { root } = draw("content", { ir: { meta: { ...META, confidentiality: "restricted" } }, page: pageWith({}) })
    expect(texts(root).map((t) => t.textContent)).toEqual(["Halden Partners", "Restricted"])
  })

  it.each(["cover-only", "minimal"] as const)(
    "draws no footer at all, rule or words, when the deck's posture is %s",
    (branding) => {
      for (const type of ["chapter", "content", "ending"] as const) {
        const { root } = draw(type, { page: pageWith({ branding, documentMetaOn: false }) })
        expect(root.children, `${type} @ ${branding}`).toHaveLength(0)
      }
    },
  )

  it("follows the deck posture when rendered on its own: omitted is cover-only, full draws", () => {
    expect(draw("content").root.children).toHaveLength(0)
    expect(draw("content", { ir: { branding: "cover-only" } }).root.children).toHaveLength(0)
    const declared = draw("content", { ir: { branding: "full" } })
    expect(texts(declared.root).map((t) => t.textContent)).toEqual(["Halden Partners", "Confidential"])
    expect(declared.root.querySelectorAll("line")).toHaveLength(1)
  })

  it("draws nothing on a page whose menu entry silences the brand", () => {
    const { root } = draw("content", { ir: { branding: "full" }, page: pageWith({ brandOn: false, branding: "none", metadataOn: false, documentMetaOn: false }) })
    expect(root.children).toHaveLength(0)
  })

  it("never prints a page number", () => {
    for (const type of ["chapter", "content", "ending"] as const) {
      const { root } = draw(type, { page: pageWith({}) })
      for (const t of texts(root)) expect(t.textContent).not.toMatch(/\d/)
    }
  })

  it("keeps the rule when there is no metadata to set", () => {
    const { root } = draw("content", { ir: { meta: {} }, page: pageWith({}) })
    expect(root.querySelectorAll("line")).toHaveLength(1)
    expect(texts(root)).toHaveLength(0)
  })

  it("marks a truncated organization instead of dropping it silently", () => {
    const long = "Halden Partners Strategy and Operations Advisory Group ".repeat(3).trim()
    const { root } = draw("content", { ir: { meta: { ...META, organization: long } }, page: pageWith({}) })
    const org = texts(root)[0]!
    expect(org.getAttribute("data-truncated")).toBe("1")
    expect(long.startsWith(org.textContent!)).toBe(true)
  })

  it("light pages: border rule, muted meta ink", () => {
    const { root, tokens, ground } = draw("content", { page: pageWith({}) })
    expect(root.querySelector("line")!.getAttribute("stroke")).toBe(tokens.colors.border)
    for (const t of texts(root)) {
      expect(t.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, ground))
      expect(contrastRatio(t.getAttribute("fill")!, ground)).toBeGreaterThanOrEqual(3)
    }
  })

  it("dark chapter: rule and text are the navy ground mixed toward white", () => {
    const { root, tokens, ground } = draw("chapter", { page: pageWith({}) })
    expect(ground).toBe(tokens.colors.primary)
    const rule = root.querySelector("line")!.getAttribute("stroke")!
    expect(rule).toBe(blendOver("#FFFFFF", ground, DARK_RULE_MIX))
    // Visible: never fainter than the same theme's light-page hairline.
    const lightRatio = contrastRatio(tokens.colors.border!, tokens.colors.bg)
    expect(contrastRatio(rule, ground)).toBeGreaterThanOrEqual(lightRatio)
    // Still a hairline, not a white stroke.
    expect(contrastRatio(rule, ground)).toBeLessThan(3)
    for (const t of texts(root)) {
      const fill = t.getAttribute("fill")!
      expect(fill).toBe(metaInk(blendOver("#FFFFFF", ground, DARK_TEXT_MIX), ground))
      expect(t.getAttribute("data-contrast-tier")).toBe("meta")
      expect(contrastRatio(fill, ground)).toBeGreaterThanOrEqual(3)
    }
  })

  it("stands down when the face reserves the footer band", () => {
    const { root } = draw("content", { page: pageWith({ decorKeepOut: [{ x: 0, y: 650, w: 1280, h: 70 }] }) })
    expect(root.querySelector("[data-decor-piece]")).toBeNull()
  })

  it("never paints the accent and renders deterministically", () => {
    for (const type of ["chapter", "content", "ending"] as const) {
      const a = draw(type, { page: pageWith({}) })
      const b = draw(type, { page: pageWith({}) })
      expect(a.markup).toBe(b.markup)
      expect(a.markup).not.toContain(a.tokens.colors.accent)
    }
  })
})

describe("FolioMotif on a full page", () => {
  afterEach(() => __resetRegisteredThemes())

  /** brief's tokens and menu with folio-motif on every entry and the footer row handed to the motif. */
  function registerFolioTheme(): string {
    const id = "folio-motif-page-test"
    const source = THEME_DEFINITIONS.brief
    const decor = { kind: "motif", id: "folio-motif" } as const
    const withDecor = (entry: MenuEntry): MenuEntry => ({ ...structuredClone(entry), decor })
    const content: Menu["content"] = {}
    for (const [kind, entry] of Object.entries(source.menu.content)) {
      content[kind as keyof Menu["content"]] = withDecor(entry!)
    }
    const style = structuredClone(source.style)
    style.id = id
    if (style.shape?.cover !== undefined) delete style.shape.cover
    __registerStructuralTheme({
      version: 2,
      id,
      label: "folio test",
      style,
      brand: { ...structuredClone(source.brand), suppressFooterRule: true, suppressFooterMeta: true },
      identity: source.identity,
      menu: {
        cover: withDecor(source.menu.cover),
        chapter: withDecor(source.menu.chapter),
        content,
        ending: withDecor(source.menu.ending),
      },
    } satisfies ThemeFile)
    return id
  }

  function renderPage(slide: Slide) {
    const themeId = registerFolioTheme()
    const ir = irOf(slide, { theme: { id: themeId }, branding: "full" })
    return parseSvgRoot(renderSvgMarkup(<BoundSlideSvg ir={ir} slide={slide} index={0} />))
  }

  it("content: the folio is the only footer, lifted into the foreground", () => {
    const slide = {
      type: "content",
      kind: "points",
      heading: "Each driver is a planning problem",
      components: [{ type: "paragraph", text: "Routes are cut once a year." }],
    } as Slide
    const root = renderPage(slide)
    const footerRules = Array.from(root.querySelectorAll("line")).filter((l) => l.getAttribute("y1") === "664")
    expect(footerRules).toHaveLength(1)
    const folio = root.querySelector('[data-decor-piece="folio"]')!
    expect(folio.closest('[data-depth="fg"]')).not.toBeNull()
    const all = Array.from(root.querySelectorAll("text")).map((t) => t.textContent)
    expect(all.filter((t) => t === "Halden Partners")).toHaveLength(1)
    expect(all.filter((t) => t === "Confidential")).toHaveLength(1)
    expect(all.some((t) => /\d+\s*\/\s*\d+/.test(t ?? ""))).toBe(false)
  })

  it("cover: no folio piece", () => {
    const root = renderPage({ type: "cover", heading: "Cut last-mile cost 18%", components: [] } as Slide)
    expect(root.querySelector('[data-decor-piece="folio"]')).toBeNull()
  })
})
