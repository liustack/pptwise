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
import { resolveDeckFooter } from "../render/footer-marks"
import type { PageRenderContext } from "../render/page-context"
import { NO_FOOTER_MARKS } from "../render/footer-marks"
import { BoundSlideSvg } from "../render/__fixtures__/bound-slide"
import { DARK_RULE_MIX, DARK_TEXT_MIX, FolioMotif, folioInks } from "./motif-folio-motif"
import { countDecorPieces } from "./decor-budget"

type PageType = Slide["type"]

const slideOf = (type: PageType): Slide =>
  (type === "content"
    ? { type, kind: "points", heading: "Each driver is a planning problem", components: [] }
    : { type, heading: type, components: [] }) as Slide

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

/** The page decision FullSlideSvg hands brief's motif on a content page: the motif draws the row. */
function pageFor(ir: PptxIR, over: Partial<PageRenderContext> = {}): PageRenderContext {
  return {
    motifOn: true,
    motifId: "folio-motif",
    brandOn: false,
    branding: "none",
    metadataOn: true,
    documentMetaOn: ir.branding === "full",
    footer: resolveDeckFooter(ir),
    footerRow: "motif",
    footerOmitsOrganization: false,
    geometry: { imageBottomCaptionBottomY: 680 },
    ...over,
  }
}

function draw(type: PageType, opts: { ir?: Partial<PptxIR>; page?: Partial<PageRenderContext> | null } = {}) {
  const tokens = resolveStyle("brief")
  const slide = slideOf(type)
  const ir = irOf(slide, opts.ir)
  const ground = resolveBackgroundHex(tokens.defaultBackgrounds[type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, ground)
  const page = opts.page === null ? undefined : pageFor(ir, opts.page ?? {})
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <FolioMotif ir={ir} slide={slide} ctx={ctx} page={page} index={0} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens, ground, ctx }
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text"))
const lineCoords = (line: Element) => ["x1", "y1", "x2", "y2"].map((n) => Number(line.getAttribute(n)))

describe("FolioMotif", () => {
  it.each(["cover", "chapter", "ending"] as const)("%s: no footer, even when the deck asks for every mark", (type) => {
    const ir = { footer: { page_number: true, organization: true, confidentiality: "footer" as const } }
    const { root } = draw(type, { ir, page: { footerRow: null } })
    expect(root.children).toHaveLength(0)
    expect(draw(type, { ir, page: null }).root.children).toHaveLength(0)
  })

  it("content: one structural piece, a 1px rule at y664 from x96 to x1184", () => {
    const { root } = draw("content", { ir: { branding: "full" } })
    expect(countDecorPieces(root)).toBe(1)
    const piece = root.querySelector('[data-decor-piece="folio"]')!
    expect(piece.getAttribute("data-decor-role")).toBe("structure")
    const lines = piece.querySelectorAll("line")
    expect(lines).toHaveLength(1)
    expect(lineCoords(lines[0]!)).toEqual([96, 664, 1184, 664])
    expect(lines[0]!.getAttribute("stroke-width")).toBe("1")
    expect(root.querySelectorAll("rect, path, circle, polygon, polyline")).toHaveLength(0)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it('branding "full" without a footer: the organization left and the confidentiality mark right, 16px on one baseline', () => {
    const { root } = draw("content", { ir: { branding: "full" } })
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

  it("prints the confidentiality mark in the deck's language", () => {
    const slide: Slide = { type: "content", kind: "points", heading: "门店网络调整的三个理由", components: [] }
    const tokens = resolveStyle("brief")
    const ir = irOf(slide, { branding: "full", meta: { ...META, confidentiality: "restricted" } })
    const ctx = buildCtx(tokens, {}, undefined, tokens.colors.bg)
    const root = parseSvgRoot(
      renderSvgMarkup(
        <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
          <FolioMotif ir={ir} slide={slide} ctx={ctx} page={pageFor(ir)} index={0} />
        </svg>,
      ),
    )
    expect(texts(root).map((t) => t.textContent)).toEqual(["Halden Partners", "限定范围阅读，请勿转发"])
  })

  it("prints no footer when the deck asks for none", () => {
    for (const branding of [undefined, "cover-only", "minimal"] as const) {
      const ir = branding ? { branding } : {}
      expect(draw("content", { ir, page: { footerRow: null, footer: NO_FOOTER_MARKS } }).root.children).toHaveLength(0)
      expect(draw("content", { ir, page: null }).root.children, `${branding} on its own`).toHaveLength(0)
    }
  })

  it("follows the deck's marks when rendered on its own", () => {
    const declared = draw("content", { ir: { branding: "full" }, page: null })
    expect(texts(declared.root).map((t) => t.textContent)).toEqual(["Halden Partners", "Confidential"])
    expect(declared.root.querySelectorAll("line")).toHaveLength(1)
  })

  it("a page number alone: the number in the corner, no rule over it", () => {
    const { root } = draw("content", { ir: { footer: { page_number: true } } })
    expect(root.querySelectorAll("line")).toHaveLength(0)
    const [number] = texts(root)
    expect(number!.textContent).toBe("1")
    expect(number!.getAttribute("data-field")).toBe("slidenum")
    expect(number!.getAttribute("x")).toBe("1184")
    expect(number!.getAttribute("text-anchor")).toBe("end")
  })

  it("draws nothing on a page whose menu entry silences the brand", () => {
    const { root } = draw("content", {
      ir: { branding: "full" },
      page: { metadataOn: false, documentMetaOn: false, footer: NO_FOOTER_MARKS, footerRow: null },
    })
    expect(root.children).toHaveLength(0)
  })

  it("marks a truncated organization instead of dropping it silently", () => {
    const long = "Halden Partners Strategy and Operations Advisory Group ".repeat(3).trim()
    const { root } = draw("content", { ir: { branding: "full", meta: { ...META, organization: long } } })
    const org = texts(root)[0]!
    expect(org.getAttribute("data-truncated")).toBe("1")
    expect(long.startsWith(org.textContent!)).toBe(true)
  })

  it("light pages: border rule, muted meta ink", () => {
    const { root, tokens, ground } = draw("content", { ir: { branding: "full" } })
    expect(root.querySelector("line")!.getAttribute("stroke")).toBe(tokens.colors.border)
    for (const t of texts(root)) {
      expect(t.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, ground))
      expect(contrastRatio(t.getAttribute("fill")!, ground)).toBeGreaterThanOrEqual(3)
    }
  })

  it("dark grounds: rule and text are the ground mixed toward white", () => {
    const tokens = resolveStyle("brief")
    const ground = resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
    expect(ground).toBe(tokens.colors.primary)
    const { rule, text } = folioInks(buildCtx(tokens, {}, undefined, ground))
    expect(rule).toBe(blendOver("#FFFFFF", ground, DARK_RULE_MIX))
    // Visible: never fainter than the same theme's light-page hairline.
    const lightRatio = contrastRatio(tokens.colors.border!, tokens.colors.bg)
    expect(contrastRatio(rule, ground)).toBeGreaterThanOrEqual(lightRatio)
    // Still a hairline, not a white stroke.
    expect(contrastRatio(rule, ground)).toBeLessThan(3)
    expect(text).toBe(metaInk(blendOver("#FFFFFF", ground, DARK_TEXT_MIX), ground))
    expect(contrastRatio(text, ground)).toBeGreaterThanOrEqual(3)
  })

  it("stands down when the face reserves the footer band", () => {
    const { root } = draw("content", { ir: { branding: "full" }, page: { decorKeepOut: [{ x: 0, y: 650, w: 1280, h: 70 }] } })
    expect(root.querySelector("[data-decor-piece]")).toBeNull()
  })

  it("never paints the accent and renders deterministically", () => {
    const ir = { footer: { page_number: true, organization: true, label: "Q3 review | 2026.10", confidentiality: "footer" as const } }
    const a = draw("content", { ir })
    const b = draw("content", { ir })
    expect(a.markup).toBe(b.markup)
    expect(a.markup).not.toContain(a.tokens.colors.accent)
  })
})

describe("FolioMotif on a full page", () => {
  afterEach(() => __resetRegisteredThemes())

  /** brief's tokens and menu with folio-motif on every entry. */
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
      brand: structuredClone(source.brand),
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

  function renderPage(slide: Slide, extra: Partial<PptxIR> = { branding: "full" }) {
    const themeId = registerFolioTheme()
    const ir = irOf(slide, { theme: { id: themeId }, ...extra })
    return parseSvgRoot(renderSvgMarkup(<BoundSlideSvg ir={ir} slide={slide} index={0} />))
  }

  const contentSlide = {
    type: "content",
    kind: "points",
    heading: "Each driver is a planning problem",
    components: [{ type: "paragraph", text: "Routes are cut once a year." }],
  } as Slide

  it("content: the folio is the only footer, lifted into the foreground", () => {
    const root = renderPage(contentSlide, { footer: { page_number: true, organization: true, confidentiality: "footer" } })
    const footerRules = Array.from(root.querySelectorAll("line")).filter((l) => l.getAttribute("y1") === "664")
    expect(footerRules).toHaveLength(1)
    const folio = root.querySelector('[data-decor-piece="folio"]')!
    expect(folio.closest('[data-depth="fg"]')).not.toBeNull()
    const all = Array.from(root.querySelectorAll("text")).map((t) => t.textContent)
    expect(all.filter((t) => t === "Halden Partners")).toHaveLength(1)
    expect(all.filter((t) => t === "Confidential")).toHaveLength(1)
    expect(root.querySelectorAll('[data-field="slidenum"]')).toHaveLength(1)
  })

  it("cover: no folio piece", () => {
    const root = renderPage({ type: "cover", heading: "Cut last-mile cost 18%", components: [] } as Slide)
    expect(root.querySelector('[data-decor-piece="folio"]')).toBeNull()
  })
})
