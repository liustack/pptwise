// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { boundSlideToSvgMarkup, boundSlideToRender } from "./__fixtures__/bound-slide"
import { measureTextUnits } from "../lib/svg-text-layout"
import { CANVAS_W_PX } from "../constants"
import { isBold } from "./fonts"
import { parseSvgRoot } from "./serialize"
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
  return parseSvgRoot(boundSlideToSvgMarkup(makeIr(themeId, slide), slide, 0))
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
    for (const theme of ["brief", "journal"] as const) {
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
    for (const theme of ["brief", "journal"] as const) {
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

describe("image-top title band", () => {
  // The band around the title kept the flat 42px / 12px of the 30px title it
  // was drawn for. stage sets that title at 45px and playbill at 39px: the
  // comma of "续航十四小时，从早会撑到夜航" came to rest on the rule, and the
  // glyph tops ran to within 3px of the picture's bottom edge.
  const HEADING = "续航十四小时，从早会撑到夜航"
  const DESCENT = 0.25
  const CJK_ASCENT = 0.88

  it.each(["journal", "playbill", "stage"] as const)("%s keeps the title clear of the picture and the rule", (theme) => {
    for (const slide of [
      makeSlide(HEADING),
      { ...makeSlide(HEADING), components: [makeSlide(HEADING).components[0]!] } as Slide,
    ]) {
      const root = renderRoot(theme, "image-top", slide)
      const titles = titleNodes(root, HEADING)
      const first = titles[0]!
      const last = titles.at(-1)!
      const size = Number(first.getAttribute("font-size"))
      const top = Number(first.getAttribute("y")) - size * CJK_ASCENT
      const floor = Number(last.getAttribute("y")) + size * DESCENT
      const imageBottom = Number(root.querySelector("image")!.getAttribute("height"))
      const hairline = Array.from(root.querySelectorAll("rect")).find(
        (r) => r.getAttribute("height") === "1" && Number(r.getAttribute("width")) > 1000,
      )!
      expect(top - imageBottom, theme).toBeGreaterThanOrEqual(12)
      expect(Number(hairline.getAttribute("y")) - floor, theme).toBeGreaterThanOrEqual(4)
    }
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
      const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
        content: { photo: face },
      })
      const doc = makeIr(themeId, slide)

      expect(boundSlideToRender(doc, slide, 0).dropped).toBeGreaterThan(0)
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
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: "image-top" },
    })
    const doc = makeIr(themeId, slide)

    expect(boundSlideToRender(doc, slide, 0).dropped).toBe(1)
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
      const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
        content: { photo: face },
      })
      const doc = makeIr(themeId, slide)
      const root = parseSvgRoot(boundSlideToSvgMarkup(doc, slide, 0))

      expect(root.querySelectorAll("image")).toHaveLength(2)
      expect(root.textContent).toContain("Before")
      expect(root.textContent).toContain("After")
      expect(boundSlideToRender(doc, slide, 0).dropped).toBe(0)
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
      const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
        content: { photo: face },
      })
      const doc = makeIr(themeId, slide)
      const root = parseSvgRoot(boundSlideToSvgMarkup(doc, slide, 0))

      for (const caption of ["First frame", "Second frame", "Third frame"]) {
        expect(root.textContent).toContain(caption)
      }
      expect(boundSlideToRender(doc, slide, 0).dropped).toBe(0)
    },
  )

  it("image-top keeps a single picture and paints the caption the author gave it", () => {
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "One selected image",
      components: [{ type: "image", asset_id: "hero", fit: "cover", caption: "Field station, winter" }],
    }
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: "image-top" },
    })
    const root = parseSvgRoot(boundSlideToSvgMarkup(makeIr(themeId, slide), slide, 0))

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
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: "image-annotate" },
    })
    const doc = makeIr(themeId, slide)

    expect(boundSlideToRender(doc, slide, 0).dropped).toBe(0)
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
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: "image-annotate" },
    })
    const doc = makeIr(themeId, slide)

    // Two losses, two units. They used to be added together and declared as
    // two content blocks, which was true of neither: one annotation past the
    // fourth is a bullet item, and the paragraph is the only block that went.
    const render = boundSlideToRender(doc, slide, 0)
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
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: "image-annotate" },
    })
    const render = boundSlideToRender(makeIr(themeId, slide), slide, 0)
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
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: "image-annotate" },
    })
    const doc = makeIr(themeId, slide)
    // Four items or fewer, so nothing is dropped. The one item the face
    // accepted is set into one or two lines and the tail is gone, which the
    // page has to say on the line that carries the cut.
    expect(boundSlideToRender(doc, slide, 0).dropped).toBe(0)
    expect(boundSlideToSvgMarkup(doc, slide, 0)).toContain('data-truncated="1"')
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
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: "image-bottom" },
    })
    const doc = makeIr(themeId, slide)

    expect(boundSlideToRender(doc, slide, 0).dropped).toBeGreaterThan(0)
  })
})

// ── device_mockup keeps its frame on every face ────────────────────────────
//
// The frame is the component: a browser window bar or a phone bezel is what
// makes a screenshot read as software that is running. A takeover that took a
// `device_mockup` through `findImageSelection` painted the screen contents
// alone, and the component silently degenerated into an `image`. Every face
// that can be routed a photo kind now has exactly one of two postures, and
// both of them put the frame on the page.
describe("device_mockup keeps its frame", () => {
  const TAKEOVERS = ["image-split", "image-top", "image-bottom", "image-annotate", "show-spotlight"] as const

  function mockupSlide(device: "browser" | "phone"): Slide {
    return {
      type: "content",
      kind: "photo",
      heading: "The console customers actually open",
      components: [
        {
          type: "device_mockup",
          device,
          asset_id: "hero",
          ...(device === "browser" ? { url: "portal.example.com/workspaces" } : {}),
          caption: "Live health board",
        },
      ],
    } as Slide
  }

  it.each(TAKEOVERS)("%s draws the device frame for a browser mockup", (face) => {
    const slide = mockupSlide("browser")
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: face },
    })
    const doc = makeIr(themeId, slide)
    const root = parseSvgRoot(boundSlideToSvgMarkup(doc, slide, 0))

    expect(root.querySelector("[data-device-mockup='browser']")).not.toBeNull()
    expect(boundSlideToRender(doc, slide, 0).dropped).toBe(0)
  })

  it.each(TAKEOVERS)("%s draws the device frame for a phone mockup", (face) => {
    const slide = mockupSlide("phone")
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: face },
    })
    const doc = makeIr(themeId, slide)
    const root = parseSvgRoot(boundSlideToSvgMarkup(doc, slide, 0))

    expect(root.querySelector("[data-device-mockup='phone']")).not.toBeNull()
    expect(boundSlideToRender(doc, slide, 0).dropped).toBe(0)
  })

  // A device that is not the bleed source is ordinary body content. The guard
  // used to scan every component, so this legal page — a plain photo first, a
  // mockup after it — declined the whole face even though the bleed slot had
  // taken the photo and had no quarrel with anything, and the fallback's
  // single stack then dropped the mockup outright.
  it.each(["image-split", "image-top", "image-bottom"] as const)(
    "%s keeps the face when the bleed picture is a plain image and a mockup rides along",
    (face) => {
      const slide: Slide = {
        type: "content",
        kind: "photo",
        heading: "The floor and the console behind it",
        components: [
          { type: "image", asset_id: "hero", fit: "cover", caption: "Delivery floor" },
          {
            type: "device_mockup",
            device: "browser",
            asset_id: "hero",
            url: "portal.example.com/workspaces",
            caption: "The console behind it",
          },
        ],
      } as Slide
      const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
        content: { photo: face },
      })
      const doc = makeIr(themeId, slide)
      const root = parseSvgRoot(boundSlideToSvgMarkup(doc, slide, 0))

      expect(root.querySelector("[data-takeover-mode='fallback']")).toBeNull()
      expect(root.querySelector("[data-device-mockup='browser']")).not.toBeNull()
      expect(root.textContent).toContain("Delivery floor")
      expect(root.textContent).toContain("The console behind it")
      expect(boundSlideToRender(doc, slide, 0).dropped).toBe(0)
    },
  )

  // The bleed faces decline rather than host: their picture runs off two or
  // three page edges, and a device without edges is not a device.
  it.each(["image-split", "image-top", "image-bottom"] as const)("%s declines and falls back", (face) => {
    const slide = mockupSlide("browser")
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: face },
    })
    const root = parseSvgRoot(boundSlideToSvgMarkup(makeIr(themeId, slide), slide, 0))
    expect(root.querySelector("[data-takeover-mode='fallback']")).not.toBeNull()
  })

  // image-annotate hosts it: its picture area is a bounded card inside the
  // page, so the device's own renderer fills the slot the card reserved and
  // the white photo mount steps out of the way.
  it("image-annotate hosts the framed component instead of declining", () => {
    const slide = mockupSlide("browser")
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: "image-annotate" },
    })
    const root = parseSvgRoot(boundSlideToSvgMarkup(makeIr(themeId, slide), slide, 0))
    expect(root.querySelector("[data-takeover-mode='fallback']")).toBeNull()
    expect(root.querySelector("[data-device-mockup='browser']")).not.toBeNull()
    // The caption belongs to the screen, and it is printed once.
    expect(root.textContent?.match(/Live health board/g)).toHaveLength(1)
  })
})

describe("takeover source lines", () => {
  const SOURCE = "Source: store counts compiled from operator filings, July 2025 against July 2026, all twenty tracked cities"
  const FACES = ["image-split", "image-top", "image-bottom", "image-annotate"] as const

  function sourcedSlide(components: Slide["components"]): Slide {
    return { type: "content", kind: "photo", heading: "One city lost two thousand shops in a year", components, footnote: SOURCE } as Slide
  }

  function renderFace(theme: CanonicalThemeId, face: (typeof FACES)[number], slide: Slide): Element {
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, theme, { content: { photo: face } })
    return parseSvgRoot(boundSlideToSvgMarkup(makeIr(themeId, slide), slide, 0))
  }

  const body = [
    { type: "image", asset_id: "hero", fit: "cover", caption: "Onboarding cabinet" },
    { type: "bullets", items: ["Guangzhou: 14,355 down to 12,029", "Shenzhen: 9,113 down to 7,814", "All twenty cities shrank"] },
  ] as Slide["components"]

  describe.each(FACES)("%s", (face) => {
    it.each(["brief", "ember", "crayon"] as const)("sets the source in muted ink on %s, under everything else on the page", (theme) => {
      const root = renderFace(theme, face, sourcedSlide(body))
      const group = root.querySelector("[data-takeover-source]")
      expect(group, face).not.toBeNull()
      const lines = Array.from(group!.querySelectorAll("text"))
      expect(lines.map((t) => t.textContent).join(" ").replace(/\s+/g, " ")).toBe(SOURCE)
      for (const line of lines) expect(line.getAttribute("font-size")).toBe("16")
      const top = Number(lines[0]!.getAttribute("y")) - 15
      const others = Array.from(root.querySelectorAll("text")).filter((t) => !group!.contains(t) && !t.closest("[data-decor]"))
      for (const other of others) {
        const y = Number(other.getAttribute("y"))
        if (!Number.isFinite(y)) continue
        // The caption over the picture sits on the picture, which the source never shares a column with.
        if ((other.textContent ?? "").includes("Onboarding cabinet")) continue
        expect(y, `${face} on ${theme}: "${other.textContent}"`).toBeLessThan(top)
      }
    })
  })

  it("draws the source on the plain page a takeover hands an image grid to", () => {
    const grid = [
      { type: "image_grid", items: [{ asset_id: "hero", caption: "One" }, { asset_id: "hero", caption: "Two" }] },
    ] as Slide["components"]
    for (const face of FACES) {
      const root = renderFace("brief", face, sourcedSlide(grid))
      const group = root.querySelector("[data-takeover-source]")
      expect(group, face).not.toBeNull()
    }
  })
})

describe("image-split report column", () => {
  const slide = {
    type: "content",
    kind: "photo",
    heading: "广州一年少了 2,326 家茶饮店",
    components: [
      { type: "image", asset_id: "hero", fit: "cover" },
      { type: "bullets", items: ["广州：14,355 → 12,029 家", "深圳：9,113 → 7,814 家", "20 个城市：全部净减少", "关店数：普遍是新开数的 1.5 到 2 倍"] },
    ],
    footnote: "来源：窄门餐眼，咖门整理（2026 年 8 月）。城市数据为 2025 年 7 月与 2026 年 7 月对比。图为示意图。",
  } as Slide

  function renderColumn(column: "standard" | "report"): Element {
    const themeId = registerTestTheme(`image-pages-${themeSerial++}`, "brief", {
      content: { photo: { face: "image-split", params: { column } } as never },
    })
    return parseSvgRoot(boundSlideToSvgMarkup(makeIr(themeId, slide), slide, 0))
  }

  const attr = (el: Element | null | undefined, names: string[]) => names.map((name) => el?.getAttribute(name) ?? null)
  const byText = (root: Element, text: string) => Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === text)

  it("sets the tea board's photo page: a 600px photograph, a 40px regular title, a 48 by 6 bar", () => {
    const root = renderColumn("report")
    expect(attr(root.querySelector("image"), ["x", "width", "height"])).toEqual(["0", "600", "720"])
    const title = byText(root, "广州一年少了")!
    expect(attr(title, ["x", "y", "font-size", "font-weight"])).toEqual(["672", "190", "40", "400"])
    expect(attr(byText(root, "2,326 家茶饮店")!, ["y"])).toEqual(["242"])
    const bar = Array.from(root.querySelectorAll("rect")).find((rect) => rect.getAttribute("height") === "6")!
    expect(attr(bar, ["x", "y", "width"])).toEqual(["672", "286", "48"])
  })

  it("sets the facts as ruled pairs and the source at the column's foot", () => {
    const root = renderColumn("report")
    expect(root.querySelector('[data-gauge-module="pairs"]')).not.toBeNull()
    expect(attr(byText(root, "广州")!, ["x", "y", "font-size"])).toEqual(["672", "363", "17"])
    const source = Array.from(root.querySelector("[data-takeover-source]")!.querySelectorAll("text"))
    expect(source.map((line) => line.getAttribute("y"))).toEqual(["618", "642"])
    expect(source.every((line) => line.getAttribute("x") === "672")).toBe(true)
  })

  it("keeps the standard column as it was when the menu asks for nothing", () => {
    const root = renderColumn("standard")
    expect(attr(root.querySelector("image"), ["width"])).toEqual(["540"])
    expect(root.querySelector('[data-gauge-module="pairs"]')).toBeNull()
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.getAttribute("font-weight") === "600")).toBe(true)
  })
})

describe("image-split notice column", () => {
  // bulletin's 2026-10 export page (p05): a 560px photograph, the notice head
  // and its pairs in the column beside it.
  const slide = {
    type: "content",
    kind: "photo",
    heading: "出口在涨：7–8 月新能源出口是去年同期的 2.5 倍",
    components: [
      { type: "image", asset_id: "hero", fit: "cover" },
      { type: "bullets", items: ["7–8 月新能源出口：**105.8 万辆**，去年同期 41.7 万辆", "厂家批发（含出口）：−1.6%", "国内零售：−21.4%"] },
    ],
    footnote: "来源：乘联分会",
  } as Slide
  const root = () => parseSvgRoot(boundSlideToSvgMarkup(makeIr("bulletin", slide), slide, 0))
  const attr = (el: Element | null | undefined, names: string[]) => names.map((name) => el?.getAttribute(name) ?? null)
  const byText = (root: Element, text: string) => Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === text)

  it("sets a 560px photograph and the notice head in the column beside it", () => {
    const page = root()
    expect(page.querySelector('[data-split-column="notice"]')).not.toBeNull()
    expect(attr(page.querySelector("image"), ["x", "width", "height"])).toEqual(["0", "560", "720"])
    const lines = Array.from(page.querySelector("[data-notice-head]")!.querySelectorAll("text"))
    expect(lines.map((line) => attr(line, ["x", "y", "font-size"]))).toEqual([
      ["624", "88", "34"],
      ["624", "134", "34"],
    ])
    const bar = Array.from(page.querySelectorAll("[data-notice-head] rect")).find((rect) => rect.getAttribute("height") === "3")!
    expect(attr(bar, ["x", "y", "width"])).toEqual(["624", "162", "96"])
  })

  it("sets the facts as notice pairs, the marked one large, and the source at the column's foot", () => {
    const page = root()
    expect(page.querySelector('[data-gauge-module="pairs"]')).not.toBeNull()
    expect(attr(byText(page, "105.8 万辆"), ["x", "font-size"])).toEqual(["850", "40"])
    expect(attr(byText(page, "来源：乘联分会"), ["x", "y", "font-size"])).toEqual(["624", "656", "14"])
  })
})

describe("image-top grid band", () => {
  // swiss's 2026-10 storage page (p10): the photograph across the top, the
  // claim on a black rule under it, the figures in columns.
  const slide = (heading = "储能一年新增 1.12 亿千瓦，一半以上装在中国") =>
    ({
      type: "content",
      kind: "photo",
      heading,
      components: [
        { type: "image", asset_id: "hero", fit: "cover" },
        {
          type: "kpi_cards",
          items: [
            { value: "**1.12 亿千瓦**", label: "全球新型储能新增", note: "同比 +48%" },
            { value: "54%", label: "装在中国", note: "美国 16%" },
            { value: "70 美元/千瓦时", label: "储能电池包均价", note: "同比 −45%" },
          ],
        },
      ],
      footnote: "来源：BNEF（2025 年 12 月、2026 年 5 月）",
    }) as Slide
  const root = (s: Slide) => {
    const themeId = registerTestTheme(`image-top-grid-${themeSerial++}`, "swiss", { content: { photo: { face: "image-top", params: { band: "grid" } } } })
    return parseSvgRoot(boundSlideToSvgMarkup(makeIr(themeId, s), s, 0))
  }
  const attr = (el: Element | null | undefined, names: string[]) => names.map((name) => el?.getAttribute(name) ?? null)
  const byText = (root: Element, text: string) => Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === text)

  it("runs the photograph edge to edge down to y330, the claim under it on a 2px rule at y418", () => {
    const page = root(slide())
    expect(page.querySelector('[data-image-top-band="grid"]')).not.toBeNull()
    expect(attr(page.querySelector("image"), ["x", "y", "width", "height"])).toEqual(["0", "0", "1280", "330"])
    expect(attr(byText(page, "储能一年新增 1.12 亿千瓦，一半以上装在中国"), ["x", "y", "font-size", "font-weight"])).toEqual(["80", "392", "34", "700"])
    const rule = Array.from(page.querySelectorAll('[data-image-top-band="grid"] > rect')).find((r) => r.getAttribute("height") === "2")!
    expect(attr(rule, ["x", "y", "width"])).toEqual(["80", "418", "1120"])
  })

  it("sets the figures in columns under the rule and the source at the foot", () => {
    const page = root(slide())
    expect(page.querySelector('[data-gauge-module="figures"]')).not.toBeNull()
    expect(attr(byText(page, "全球新型储能新增"), ["x", "y"])).toEqual(["80", "463"])
    expect(attr(byText(page, "来源：BNEF（2025 年 12 月、2026 年 5 月）"), ["x", "y", "font-size"])).toEqual(["80", "666", "14"])
  })

  it("takes a second line of the claim out of the photograph", () => {
    const page = root(slide("储能一年新增 1.12 亿千瓦，一半以上装在中国，美国占 16%，电池包均价一年降了 45%，第一次成为最便宜的用途"))
    expect(attr(page.querySelector("image"), ["height"])).toEqual(["284"])
    expect(page.querySelector('[data-gauge-module="figures"]')).not.toBeNull()
  })
})
