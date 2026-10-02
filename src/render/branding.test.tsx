// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Branding } from "./branding"
import { getThemeDefinition } from "../themes/definitions"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { resolveEffectiveFace } from "./layout-selection"
import { resolvePageRenderContext } from "./page-context"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#051C2C",
    accent: "#FFC72C",
    text: "#1A2421",
    muted: "#5D6B65",
    border: "#D5D5CB",
    chartPalette: ["#051C2C", "#FFC72C"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24, // balanced default — this suite doesn't exercise body-text sizing
}

function ir(themeId: PptxIR["theme"]["id"], slides: Slide[], branding?: PptxIR["branding"]): PptxIR {
  return {
    version: "5",
    filename: "deck.pptx",
    theme: { id: themeId },
    meta: { organization: "ACME", confidentiality: "internal", version: "v1", date: "2026" },
    assets: {
      images: { bg: { src: "data:image/png;base64,iVBOR", alt: "背景" } },
    },
    slides,
    ...(branding !== undefined ? { branding } : {}),
  }
}

/** The fragment as FullSlideSvg mounts it: the page decision comes from the same resolver. */
function drawBranding(doc: PptxIR, slide: Slide, index = doc.slides.indexOf(slide)) {
  const theme = getThemeDefinition(doc.theme.id)
  const page = resolvePageRenderContext(doc, slide, resolveEffectiveFace(doc, slide, theme), theme)
  return render(
    <svg>
      <Branding ir={doc} slide={slide} index={Math.max(0, index)} ctx={ctx} page={page} theme={theme} />
    </svg>,
  )
}

const cardBgContentSlide: Slide = {
  type: "content",
  kind: "points",
  heading: "带背景卡片",
  components: [{ type: "paragraph", text: "卡内文字。" }],
  background: { kind: "asset", asset_id: "bg", fit: "cover" },
}

const plainContentSlide: Slide = {
  type: "content",
  kind: "points",
  heading: "Plain content",
  components: [{ type: "paragraph", text: "Body." }],
}

describe("Branding footer suppression (W1: theme brand.suppressFooterOnCardContent)", () => {
  it("bulletin: a content page over a card background drops the footer whole", () => {
    const doc = ir("bulletin", [cardBgContentSlide], "full")
    const { container } = drawBranding(doc, cardBgContentSlide)
    expect(container.querySelector("line")).toBeNull()
    expect(container.textContent).not.toContain("ACME")
  })

  it.each(["swiss", "ledger", "thesis", "terminal", "journal"] as const)(
    "%s: the same page keeps its footer (the theme does not set the flag)",
    (themeId) => {
      const doc = ir(themeId, [cardBgContentSlide], "full")
      const { container } = drawBranding(doc, cardBgContentSlide)
      expect(container.querySelector("line")).not.toBeNull()
      expect(container.textContent).toContain("ACME")
    },
  )
})

describe('the older footer of branding: "full"', () => {
  it("reads as the organization left and the confidentiality mark right, on the shared row", () => {
    const doc = ir("thesis", [plainContentSlide], "full")
    const { container } = drawBranding(doc, plainContentSlide)
    const texts = Array.from(container.querySelectorAll("text"))
    const left = texts.find((el) => el.getAttribute("x") === "96")
    const right = texts.find((el) => el.getAttribute("x") === "1184")
    expect(left?.textContent).toBe("ACME")
    expect(right?.textContent).toBe("Internal")
    // Version and date stay on the cover and ending meta rows, not on every page.
    expect(container.textContent).not.toContain("v1")
    expect(container.textContent).not.toContain("2026")
    expect(container.querySelector("line")).not.toBeNull()
  })

  it("ink: the colophon rail carries the organization, so the row leaves it out", () => {
    const doc = ir("ink", [plainContentSlide], "full")
    const { container } = drawBranding(doc, plainContentSlide)
    expect(container.textContent).not.toContain("ACME")
    expect(container.textContent).toContain("Internal")
    // ink draws its own frame and keeps the shared rule off.
    expect(container.querySelector("line")).toBeNull()
  })

  it("brief: folio-motif draws the whole row, so the shared fragment draws none", () => {
    const doc = ir("brief", [plainContentSlide], "full")
    const { container } = drawBranding(doc, plainContentSlide)
    expect(container.textContent).toBe("")
    expect(container.querySelector("line")).toBeNull()
  })
})

const LOGO_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] }
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] }
const endingSlide: Slide = { type: "ending", heading: "收束", components: [] }
/** A theme whose cover, chapter and content faces all leave room for the brand frame, so the posture gate is what decides. */
function branded(slides: Slide[], branding?: PptxIR["branding"]): PptxIR {
  const base = ir("terminal", slides)
  return {
    ...base,
    brand: { logo_asset_id: "logo", position: "br" },
    assets: {
      images: {
        ...base.assets.images,
        logo: { src: LOGO_SRC, alt: "logo" },
      },
    },
    ...(branding !== undefined ? { branding } : {}),
  }
}

describe("deck branding posture (Branding gate)", () => {
  it("omitted branding drops footer rule, meta, and logo on a content page", () => {
    const doc = branded([plainContentSlide])
    const { container } = drawBranding(doc, plainContentSlide)
    expect(container.querySelector("line")).toBeNull()
    expect(container.textContent).not.toContain("ACME")
    expect(container.querySelector("image")).toBeNull()
  })

  it("explicit branding cover-only matches the omitted path on a content page", () => {
    const a = drawBranding(branded([plainContentSlide]), plainContentSlide).container.innerHTML
    const b = drawBranding(branded([plainContentSlide], "cover-only"), plainContentSlide).container.innerHTML
    expect(a).toBe(b)
  })

  it("explicit branding full draws the content footer rule, meta, and logo", () => {
    const doc = branded([plainContentSlide], "full")
    const { container } = drawBranding(doc, plainContentSlide)
    expect(container.querySelector("line")).not.toBeNull()
    expect(container.textContent).toContain("ACME")
    expect(container.querySelector("image")).not.toBeNull()
  })

  it.each([undefined, "cover-only"] as const)("%s keeps the logo on cover and chapter pages", (branding) => {
    const doc = branded([coverSlide, chapterSlide], branding)
    for (const slide of [coverSlide, chapterSlide]) {
      const { container } = drawBranding(doc, slide)
      expect(container.querySelector("image"), slide.type).not.toBeNull()
      expect(container.querySelector("line"), slide.type).toBeNull()
    }
  })

  it.each([undefined, "cover-only"] as const)("%s drops the logo on an ending page", (branding) => {
    const doc = branded([endingSlide], branding)
    const { container } = drawBranding(doc, endingSlide)
    expect(container.querySelector("image")).toBeNull()
    expect(container.querySelector("line")).toBeNull()
    expect(container.textContent).not.toContain("ACME")
  })

  it("minimal keeps the logo and draws no footer of its own", () => {
    const doc = branded([plainContentSlide], "minimal")
    const { container } = drawBranding(doc, plainContentSlide)
    expect(container.querySelector("line")).toBeNull()
    expect(container.textContent).not.toContain("ACME")
    expect(container.querySelector("image")).not.toBeNull()
  })

  it("minimal with a footer: the logo and the footer row together", () => {
    const doc: PptxIR = { ...branded([plainContentSlide], "minimal"), footer: { page_number: true, organization: true } }
    const { container } = drawBranding(doc, plainContentSlide)
    expect(container.querySelector("image")).not.toBeNull()
    expect(container.textContent).toContain("ACME")
    expect(container.querySelector('[data-field="slidenum"]')?.textContent).toBe("1")
  })

  it('a footer object replaces the older reading of "full"', () => {
    const doc: PptxIR = { ...branded([plainContentSlide], "full"), footer: { page_number: true } }
    const { container } = drawBranding(doc, plainContentSlide)
    expect(container.textContent).toBe("1")
    expect(container.querySelector("image")).not.toBeNull()
    // A lone page number has no rule over it.
    expect(container.querySelector("line")).toBeNull()
  })

  it('"full" with an empty footer object prints no footer row, only the logo', () => {
    const doc: PptxIR = { ...branded([plainContentSlide], "full"), footer: {} }
    const { container } = drawBranding(doc, plainContentSlide)
    expect(container.querySelector("text")).toBeNull()
    expect(container.querySelector("line")).toBeNull()
    expect(container.querySelector("image")).not.toBeNull()
  })
})
