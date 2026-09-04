// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { measureTextUnits } from "../lib/svg-text-layout"
import { CANVAS_W_PX } from "../constants"
import { isBold } from "./fonts"
import { parseSvgRoot } from "./serialize"
import { slideToRender, slideToSvgMarkup } from "./render-slide"
import type { PptxIR, Slide } from "@/ir"
import type { CanonicalThemeId } from "../themes"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"

// Gallery review r1 leftover item 11: image-split / image-top English
// headings sized with Regular metrics then painted at font-weight 600.
const GALLERY_EN_HEADING = "Competitors are pricing below cost in the mid-market"
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

const SPLIT_TEXT_W = CANVAS_W_PX - 620 - 96
const BAND_PAD_X = 96
const TOP_TITLE_W = CANVAS_W_PX - BAND_PAD_X * 2 - 120
const LATIN_DESCENT = 0.22

function makeSlide(heading: string): Slide {
  return {
    type: "content",
    kind: "photo",
    heading,
    components: [
      { type: "image", asset_id: "hero", fit: "cover", caption: "Onboarding cabinet" },
      {
        type: "paragraph",
        text: "Connected equipment passed one hundred thousand units this quarter, up sixty-seven percent year over year.",
      },
    ],
  } as Slide
}

function makeIr(theme: string, slide: Slide): PptxIR {
  return {
    version: "5",
    filename: "deck.pptx",
    theme: { id: theme },
    meta: { organization: "Strategy & Operations" },
    assets: { images: { hero: { src: PIXEL } } },
    slides: [slide],
  } as PptxIR
}

let themeSerial = 0

afterEach(() => {
  __resetRegisteredThemes()
})

function renderRoot(theme: CanonicalThemeId, face: "image-split" | "image-top", slide: Slide): Element {
  const themeId = registerTestTheme(`image-pages-${themeSerial++}`, theme, { content: { photo: face } })
  return parseSvgRoot(slideToSvgMarkup(makeIr(themeId, slide), slide, 0))
}

function titleNodes(root: Element, heading: string): Element[] {
  const plain = heading.replace(/…/g, "")
  return Array.from(root.querySelectorAll("text")).filter((t) => {
    const content = (t.textContent ?? "").replace(/…/g, "").trim()
    if (!content) return false
    if (!isBold(t.getAttribute("font-weight"))) return false
    return plain.includes(content) || content.includes(plain.slice(0, 12))
  })
}

function lineWidth(el: Element): number {
  const text = el.textContent ?? ""
  const fontSize = Number(el.getAttribute("font-size"))
  const fontFamily = el.getAttribute("font-family") ?? undefined
  return measureTextUnits(text, { bold: isBold(el.getAttribute("font-weight")), fontFamily }) * fontSize
}

describe("image-split / image-top gallery English heading overflow", () => {
  it("image-split: every title line of the gallery English heading fits the 564px text column", () => {
    for (const theme of ["consulting", "journal"] as const) {
      const slide = makeSlide(GALLERY_EN_HEADING)
      const root = renderRoot(theme, "image-split", slide)
      const titles = titleNodes(root, GALLERY_EN_HEADING)
      expect(titles.length, theme).toBeGreaterThan(0)
      expect(
        titles.some((t) => (t.textContent ?? "").trim() === GALLERY_EN_HEADING),
        `${theme} must wrap rather than dump the raw line`,
      ).toBe(false)
      for (const t of titles) {
        expect(lineWidth(t), `${theme} "${t.textContent}"`).toBeLessThanOrEqual(SPLIT_TEXT_W + 1)
      }
      expect(titles.map((t) => t.textContent).join(" ")).toContain("Competitors")
      expect(titles.map((t) => t.textContent).join(" ")).toContain("mid-market")
    }
  })

  it("image-top: gallery English heading stays inside the band box and is not one overflowing line", () => {
    for (const theme of ["consulting", "journal"] as const) {
      const slide = makeSlide(GALLERY_EN_HEADING)
      const root = renderRoot(theme, "image-top", slide)
      const titles = titleNodes(root, GALLERY_EN_HEADING)
      expect(titles.length, theme).toBeGreaterThan(0)
      expect(titles.length, theme).toBeLessThanOrEqual(2)
      for (const t of titles) {
        expect(lineWidth(t), `${theme} "${t.textContent}"`).toBeLessThanOrEqual(TOP_TITLE_W + 1)
      }
      expect(titles.map((t) => t.textContent).join("")).toContain("Competitors")
      expect(titles.map((t) => t.textContent).join("")).toContain("mid-market")

      const hairline = Array.from(root.querySelectorAll("rect")).find(
        (r) => r.getAttribute("height") === "1" && Number(r.getAttribute("width")) > 1000,
      )
      expect(hairline, theme).toBeTruthy()
      const last = titles[titles.length - 1]!
      const lastInk = Number(last.getAttribute("y")) + Number(last.getAttribute("font-size")) * LATIN_DESCENT
      expect(Number(hairline!.getAttribute("y")), theme).toBeGreaterThan(lastInk)

      const col = Array.from(root.querySelectorAll("g[transform]")).find((g) =>
        /^translate\(\s*96[\s,]/.test(g.getAttribute("transform") ?? ""),
      )
      expect(col, theme).toBeTruthy()
      const colY = Number(/translate\(\s*96[\s,]+([\d.]+)/.exec(col!.getAttribute("transform") ?? "")?.[1])
      expect(colY, theme).toBeGreaterThan(Number(hairline!.getAttribute("y")))
    }
  })

  it("image-top wraps a longer English heading instead of shrinking one overflowing line, and the band grows", () => {
    const heading = `${GALLERY_EN_HEADING} across every region`
    const slide = makeSlide(heading)
    const root = renderRoot("journal", "image-top", slide)
    const titles = titleNodes(root, heading)
    expect(titles.length).toBeGreaterThanOrEqual(2)
    for (const t of titles) {
      expect(lineWidth(t), `"${t.textContent}"`).toBeLessThanOrEqual(TOP_TITLE_W + 1)
    }
    const ys = titles.map((t) => Number(t.getAttribute("y")))
    expect(ys[1]!).toBeGreaterThan(ys[0]!)

    const hairline = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("height") === "1" && Number(r.getAttribute("width")) > 1000,
    )!
    const last = titles[titles.length - 1]!
    const lastInk = Number(last.getAttribute("y")) + Number(last.getAttribute("font-size")) * LATIN_DESCENT
    expect(Number(hairline.getAttribute("y"))).toBeGreaterThan(lastInk)
    const col = Array.from(root.querySelectorAll("g[transform]")).find((g) =>
      /^translate\(\s*96[\s,]/.test(g.getAttribute("transform") ?? ""),
    )!
    const colY = Number(/translate\(\s*96[\s,]+([\d.]+)/.exec(col.getAttribute("transform") ?? "")?.[1])
    expect(colY).toBeGreaterThan(Number(hairline.getAttribute("y")))
    expect(colY).toBeGreaterThan(442)
  })
})

describe("image-top with nothing under the image", () => {
  /** photo 页只带一张图（image_grid / image_compare 被 takeover 收成单张主视觉
   * 也是这一档）：没有分栏可分的时候不预留分栏带，图长到标题带上沿，页底不留
   * 一百多像素的死区，标题也不再贴着图底缘。 */
  function captionOnlySlide(heading: string): Slide {
    return {
      type: "content",
      kind: "photo",
      heading,
      components: [{ type: "image", asset_id: "hero", fit: "cover", caption: "Onboarding cabinet" }],
    } as Slide
  }

  it("grows the image to the caption band and gives the title air on both sides", () => {
    const slide = captionOnlySlide("付费席位量首次突破十万席")
    const root = renderRoot("journal", "image-top", slide)

    const image = root.querySelector("image")!
    expect(Number(image.getAttribute("height"))).toBe(520)

    const titles = titleNodes(root, "付费席位量首次突破十万席")
    const title = titles[0]!
    const titleY = Number(title.getAttribute("y"))
    expect(titleY).toBe(582) // 520 + 62, not the general path's 42

    const hairline = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("height") === "1" && Number(r.getAttribute("width")) > 1000,
    )!
    const ruleY = Number(hairline.getAttribute("y"))
    expect(ruleY).toBe(594)
    // Nothing is left dangling under the rule: the band ends on the page's
    // own content floor (720 - 84), not 100px above it.
    expect(720 - 84 - ruleY).toBeLessThanOrEqual(42)
  })

  it("keeps the general (body-bearing) geometry when a text block does follow the image", () => {
    const slide = makeSlide("付费席位量首次突破十万席")
    const root = renderRoot("journal", "image-top", slide)
    const image = root.querySelector("image")!
    expect(Number(image.getAttribute("height"))).toBeLessThanOrEqual(480)
  })
})

describe("image takeover dropped-content propagation", () => {
  it.each(["image-split", "image-top", "image-bottom", "image-annotate"] as const)(
    "%s marks the page as dropped when its required image is absent",
    (face) => {
      const slide: Slide = {
        type: "content",
        kind: "photo",
        heading: "Missing required image",
        components: [{ type: "paragraph", text: "This content cannot be rendered by the takeover." }],
      }
      const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
        content: { photo: face },
      })
      const doc = makeIr(themeId, slide)

      expect(slideToRender(doc, slide, 0).dropped).toBeGreaterThan(0)
    },
  )

  it("image-top marks the fourth body component omitted by its three-column surface", () => {
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "Four supporting points",
      components: [
        { type: "image", asset_id: "hero", fit: "cover" },
        ...["One", "Two", "Three", "Four"].map((text) => ({ type: "paragraph" as const, text })),
      ],
    }
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
      content: { photo: "image-top" },
    })
    const doc = makeIr(themeId, slide)

    expect(slideToRender(doc, slide, 0).dropped).toBe(1)
  })

  // This used to assert the opposite — one `<image>`, neither label on the
  // page — which is the loss the face discipline forbids written down as a
  // contract: the takeover's single frame took the compare's left half and
  // the right half left with its label, unmarked. The takeover now steps
  // aside for any picture set it cannot hold.
  it.each(["image-split", "image-top", "image-bottom", "image-annotate"] as const)(
    "%s steps aside for an image_compare and paints both sides with their labels",
    (face) => {
      const slide: Slide = {
        type: "content",
        kind: "photo",
        heading: "One selected image",
        components: [
          {
            type: "image_compare",
            left: { asset_id: "hero", label: "Before" },
            right: { asset_id: "hero", label: "After" },
          },
        ],
      }
      const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
        content: { photo: face },
      })
      const doc = makeIr(themeId, slide)
      const root = parseSvgRoot(slideToSvgMarkup(doc, slide, 0))

      expect(root.querySelectorAll("image")).toHaveLength(2)
      expect(root.textContent).toContain("Before")
      expect(root.textContent).toContain("After")
      expect(slideToRender(doc, slide, 0).dropped).toBe(0)
    },
  )

  it.each(["image-split", "image-top", "image-bottom", "image-annotate"] as const)(
    "%s steps aside for a multi-item image_grid and paints every caption",
    (face) => {
      const slide: Slide = {
        type: "content",
        kind: "photo",
        heading: "Six scenes",
        components: [
          {
            type: "image_grid",
            items: [
              { asset_id: "hero", caption: "First frame" },
              { asset_id: "hero", caption: "Second frame" },
              { asset_id: "hero", caption: "Third frame" },
            ],
          },
        ],
      }
      const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
        content: { photo: face },
      })
      const doc = makeIr(themeId, slide)
      const root = parseSvgRoot(slideToSvgMarkup(doc, slide, 0))

      for (const caption of ["First frame", "Second frame", "Third frame"]) {
        expect(root.textContent).toContain(caption)
      }
      expect(slideToRender(doc, slide, 0).dropped).toBe(0)
    },
  )

  it("image-top keeps a single picture and paints the caption the author gave it", () => {
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "One selected image",
      components: [{ type: "image", asset_id: "hero", fit: "cover", caption: "Field station, winter" }],
    }
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
      content: { photo: "image-top" },
    })
    const root = parseSvgRoot(slideToSvgMarkup(makeIr(themeId, slide), slide, 0))

    expect(root.querySelector("g[data-takeover-mode]")).toBeNull()
    expect(root.querySelectorAll("image")).toHaveLength(1)
    expect(root.textContent).toContain("Field station, winter")
  })

  it("image-annotate does not mark its selected image_compare source as dropped", () => {
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "Selected comparison anchor",
      components: [
        {
          type: "image_compare",
          left: { asset_id: "hero", label: "Before" },
          right: { asset_id: "hero", label: "After" },
        },
      ],
    }
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
      content: { photo: "image-annotate" },
    })
    const doc = makeIr(themeId, slide)

    expect(slideToRender(doc, slide, 0).dropped).toBe(0)
  })

  it("image-annotate marks annotation overflow and unsupported sibling components", () => {
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "Annotated image",
      components: [
        { type: "image", asset_id: "hero", fit: "cover" },
        { type: "bullets", items: ["One", "Two", "Three", "Four", "Five"] },
        { type: "paragraph", text: "This component has no slot on the annotation surface." },
      ],
    }
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
      content: { photo: "image-annotate" },
    })
    const doc = makeIr(themeId, slide)

    // Two losses, two units. They used to be added together and declared as
    // two content blocks, which was true of neither: one annotation past the
    // fourth is a bullet item, and the paragraph is the only block that went.
    const render = slideToRender(doc, slide, 0)
    expect(render.dropped).toBe(2)
    expect(render.drops).toEqual(
      expect.arrayContaining([
        { kind: "item", count: 1 },
        { kind: "component", count: 1 },
      ]),
    )
    expect(render.drops).toHaveLength(2)
  })

  it("image-annotate declares a fifth annotation as an item, not a content block", () => {
    // The shape a real deck reaches this face with: an image and its
    // annotations, one past what the surface holds. Nothing about this page
    // lost a component, and the export error must not say it did.
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "Annotated image",
      components: [
        { type: "image", asset_id: "hero", fit: "cover" },
        { type: "bullets", items: ["One", "Two", "Three", "Four", "Five"] },
      ],
    }
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
      content: { photo: "image-annotate" },
    })
    const render = slideToRender(makeIr(themeId, slide), slide, 0)
    expect(render.drops).toEqual([{ kind: "item", count: 1 }])
  })

  it("image-annotate marks a kept annotation it had to cut", () => {
    const long =
      "\u5f00\u901a\u94fe\u8def\u4ecd\u5728\u6253\u78e8\uff1a\u7b2c\u4e09\u5b63\u5ea6\u7684\u5ba2\u7fa4\u6536\u5165\u9884\u6d4b\u5b58\u5728\u6b63\u8d1f\u4e24\u6210\u7684\u504f\u5dee\u7a7a\u95f4\uff0c\u800c\u6559\u80b2\u5ba2\u7fa4\u7684\u5f00\u901a\u5468\u671f\u53c8\u6bd4\u5546\u4e1a\u5ba2\u7fa4\u957f\u51fa\u56db\u5468\uff0c\u4e24\u4ef6\u4e8b\u53e0\u5728\u4e00\u8d77\u624d\u662f\u771f\u6b63\u7684\u98ce\u9669"
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "Annotated image",
      components: [
        { type: "image", asset_id: "hero", fit: "cover" },
        { type: "bullets", items: [long] },
      ],
    }
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
      content: { photo: "image-annotate" },
    })
    const doc = makeIr(themeId, slide)
    // Four items or fewer, so nothing is dropped. The one item the face
    // accepted is set into one or two lines and the tail is gone, which the
    // page has to say on the line that carries the cut.
    expect(slideToRender(doc, slide, 0).dropped).toBe(0)
    expect(slideToSvgMarkup(doc, slide, 0)).toContain('data-truncated="1"')
  })

  it("image-bottom propagates components rejected by layoutContentFit", () => {
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "Crowded image footer",
      components: [
        { type: "image", asset_id: "hero", fit: "cover" },
        ...Array.from({ length: 12 }, (_, index) => ({
          type: "paragraph" as const,
          text: `Supporting paragraph ${index + 1} with enough text to require its own vertical region.`,
        })),
      ],
    }
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "consulting", {
      content: { photo: "image-bottom" },
    })
    const doc = makeIr(themeId, slide)

    expect(slideToRender(doc, slide, 0).dropped).toBeGreaterThan(0)
  })
})
