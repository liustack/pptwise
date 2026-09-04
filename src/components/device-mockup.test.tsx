// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { deviceMockup } from "./device-mockup"
import { contrastRatio } from "../render/ink"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    border: "#D5D5CB",
    chartPalette: ["#006A4E", "#00A878"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
  images: {
    dash: { src: "data:image/png;base64,AAAA" },
    "dash-alt": { src: "data:image/png;base64,AAAA", alt: "Route optimization dashboard" },
  },
}

/** The notch's natural width, mirrored from the component's own constant. */
const PHONE_NOTCH_NATURAL_W = 90

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

describe("device_mockup component — browser", () => {
  it("keeps its 16:10 proportion instead of stretching to a wide slot", () => {
    // The height cap used to take depth off the frame and leave the width at
    // the slot's, so a wide content rect produced a 3.2:1 window and the
    // screenshot inside it was slice-cropped to its middle band.
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    const outline = Array.from(container.querySelectorAll("rect")).at(-1)
    const w = Number(outline?.getAttribute("width"))
    const h = Number(outline?.getAttribute("height"))
    expect(h).toBe(339)
    expect(w / h).toBeCloseTo(1.6, 1)
  })

  it("fills a slot narrower than its capped width", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 400 }, ctx))
    const g = container.querySelector("g")
    expect(g?.getAttribute("transform")).toBe("translate(0,0)")
    const outline = Array.from(container.querySelectorAll("rect")).at(-1)
    expect(Number(outline?.getAttribute("width"))).toBe(399)
  })

  it("marks the drawn frame so a face cannot silently reduce it to a picture", () => {
    const browser = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const phone = { type: "device_mockup" as const, device: "phone" as const, asset_id: "dash" }
    expect(
      svg(deviceMockup.render(browser, { x: 0, y: 0, w: 600 }, ctx)).container.querySelector(
        "[data-device-mockup='browser']",
      ),
    ).not.toBeNull()
    expect(
      svg(deviceMockup.render(phone, { x: 0, y: 0, w: 600 }, ctx)).container.querySelector(
        "[data-device-mockup='phone']",
      ),
    ).not.toBeNull()
  })

  it("renders <image> cover-cropped below the frame bar", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 80, y: 100, w: 1120 }, ctx))
    // Centered, not left-aligned: a 1120px slot is far wider than the frame's
    // own 16:10 at the 340px height cap, so the window keeps its proportion
    // and sits in the middle of the slot. (1120 - 544) / 2 = 288.
    const g = container.querySelector("g")
    expect(g?.getAttribute("transform")).toBe("translate(368,100)")

    const img = container.querySelector("image")
    expect(img).not.toBeNull()
    expect(img?.getAttribute("href")).toBe("data:image/png;base64,AAAA")
    expect(img?.getAttribute("preserveAspectRatio")).toContain("slice")
  })

  it("emits aria-label from the asset's alt text when present (A11Y-01 alt chain, new emission site)", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash-alt" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    const img = container.querySelector("image")
    expect(img?.getAttribute("aria-label")).toBe("Route optimization dashboard")
  })

  it("emits no aria-label at all when the asset has no alt text (zero-byte-change guarantee)", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    const img = container.querySelector("image")
    expect(img?.hasAttribute("aria-label")).toBe(false)
  })

  it("renders three traffic-light dots and a url pill when url is set", () => {
    const component = {
      type: "device_mockup" as const,
      device: "browser" as const,
      asset_id: "dash",
      url: "app.routeoptimize.com/dispatch",
    }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    expect(container.querySelectorAll("circle").length).toBe(3)
    const text = Array.from(container.querySelectorAll("text")).find((t) =>
      t.textContent?.includes("app.routeoptimize.com"),
    )
    expect(text).not.toBeUndefined()
    expect(text?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("renders no url pill/text when url is unset", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    // three dots still render; no text at all besides them (no caption either)
    expect(container.querySelectorAll("text").length).toBe(0)
  })

  it("never renders a screen <image> when the asset is missing — placeholder only, no fake content", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "nonexistent" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 800 }, ctx))
    expect(container.querySelector("image")).toBeNull()
    const placeholderRect = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("fill") === ctx.colors.surface,
    )
    expect(placeholderRect).not.toBeUndefined()
  })

  it("still paints the device frame (outer border + top bar) when the asset is missing", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "nonexistent" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 800 }, ctx))
    expect(container.querySelector("path")).not.toBeNull() // rounded-top window bar
    const outer = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("stroke") === ctx.colors.border,
    )
    expect(outer).not.toBeUndefined()
  })

  it("renders caption inside the screen's own bottom strip", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash", caption: "调度仪表盘" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    const captionEl = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "调度仪表盘")
    expect(captionEl).not.toBeUndefined()
    expect(captionEl?.getAttribute("fill")).toBe(ctx.colors.surface)
  })

  it("caps a full-width browser frame's measured height so it fits every theme's content rect", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const w = 1088
    expect(deviceMockup.measure(component, w, ctx)).toBeLessThanOrEqual(380)
  })

  it("truncates/shrinks a very long url instead of overflowing the pill", () => {
    const component = {
      type: "device_mockup" as const,
      device: "browser" as const,
      asset_id: "dash",
      url: `https://example.com/${"a".repeat(120)}`,
    }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 400 }, ctx))
    const text = Array.from(container.querySelectorAll("text")).find((t) => t.textContent?.startsWith("https://"))
    expect(text).not.toBeUndefined()
    const fontSize = Number(text!.getAttribute("font-size"))
    const truncated = text!.getAttribute("data-truncated") === "1"
    expect(text!.textContent).not.toContain("…")
    expect(fontSize < 12 || truncated).toBe(true)
  })
})

describe("device_mockup component — phone", () => {
  it("renders <image> cover-cropped inside the bezel, centered within a wider column", () => {
    const component = { type: "device_mockup" as const, device: "phone" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    const img = container.querySelector("image")
    expect(img).not.toBeNull()
    expect(img?.getAttribute("preserveAspectRatio")).toContain("slice")
  })

  it("emits aria-label from the asset's alt text (A11Y-01 alt chain)", () => {
    const component = { type: "device_mockup" as const, device: "phone" as const, asset_id: "dash-alt" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    const img = container.querySelector("image")
    expect(img?.getAttribute("aria-label")).toBe("Route optimization dashboard")
  })

  it("keeps the phone frame narrow and centered rather than stretching to the column width (裁定 3)", () => {
    const component = { type: "device_mockup" as const, device: "phone" as const, asset_id: "dash" }
    const box = { x: 0, y: 0, w: 1120 }
    const { container } = svg(deviceMockup.render(component, box, ctx))
    const outerRect = container.querySelector("rect")!
    const frameW = Number(outerRect.getAttribute("width"))
    expect(frameW).toBeLessThan(box.w)
    // measured height must equal the actual rendered frame height
    const measuredH = deviceMockup.measure(component, box.w, ctx)
    expect(Number(outerRect.getAttribute("height"))).toBe(measuredH)
  })

  it("degrades a too-narrow column to a smaller (still-proportioned) phone rather than overflowing (MAX_IMAGE_H precedent)", () => {
    const component = { type: "device_mockup" as const, device: "phone" as const, asset_id: "dash" }
    // The phone's own natural (MAX_DEVICE_H-budget) width is well under 160px
    // (19:9 portrait at a 340px height cap) — a column narrower than that
    // must clamp the phone's width (and, proportionally, its height) down
    // instead of overflowing the column.
    const narrowH = deviceMockup.measure(component, 100, ctx)
    const wideH = deviceMockup.measure(component, 1120, ctx)
    expect(narrowH).toBeLessThan(wideH)
  })

  it("never renders a screen <image> when the asset is missing — placeholder only", () => {
    const component = { type: "device_mockup" as const, device: "phone" as const, asset_id: "nonexistent" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 800 }, ctx))
    expect(container.querySelector("image")).toBeNull()
    const placeholderRect = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("fill") === ctx.colors.surface,
    )
    expect(placeholderRect).not.toBeUndefined()
  })

  it("renders caption inside the screen's own bottom strip", () => {
    const component = { type: "device_mockup" as const, device: "phone" as const, asset_id: "dash", caption: "调度" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, ctx))
    const captionEl = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "调度")
    expect(captionEl).not.toBeUndefined()
  })
})

// Review fix round, Important-2: on a near-black theme (tech: bg #060A13 vs
// surface #0A101C) the window bar/dots/url pill barely separated
// from the page behind them or from each other — a plain `colors.surface`
// fill has almost no luminance headroom against a `colors.bg` that close.
// These two ctx fixtures reproduce the two real shapes that failure took
// (near-black *and* the flat-white enterprise/runway case where bg and
// surface are the exact same hex, zero headroom by construction) rather
// than re-deriving the fix's own formula and asserting it matches itself.
const darkCtx: ComponentCtx = {
  ...ctx,
  colors: { ...ctx.colors, bg: "#060A13", surface: "#0A101C", muted: "#8A94A6", border: "#2C3140" },
}
const flatLightCtx: ComponentCtx = {
  ...ctx,
  colors: { ...ctx.colors, bg: "#FFFFFF", surface: "#FFFFFF", muted: "#6B6B6B", border: "#D5D5CB" },
}

describe("device_mockup frame color derivation (review fix round, Important-2)", () => {
  it("derives a frame-bar fill with guaranteed separation from the ambient background on a near-black theme", () => {
    const component = {
      type: "device_mockup" as const,
      device: "browser" as const,
      asset_id: "dash",
      url: "app.example.com",
    }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, darkCtx))
    const frameBar = container.querySelector("path")!
    const barFill = frameBar.getAttribute("fill")!
    expect(barFill).not.toBe(darkCtx.colors.surface)
    expect(barFill).not.toBe(darkCtx.colors.bg)
    // The whole point: mixing surface toward the theme's own readable ink
    // must measurably separate the bar from the page background — a plain
    // `colors.surface` fill (bg #060A13 vs surface #0A101C) barely clears
    // 1.1:1 against bg, nowhere near enough to read as its own layer.
    expect(contrastRatio(barFill, darkCtx.colors.bg)).toBeGreaterThan(
      contrastRatio(darkCtx.colors.surface, darkCtx.colors.bg),
    )
  })

  it("derives a guaranteed-separation frame-bar fill even when surface and bg are the exact same hex (flat-white theme)", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, flatLightCtx))
    const barFill = container.querySelector("path")!.getAttribute("fill")!
    // surface === bg here, so the fill must differ from both by construction
    // — zero shift would mean zero separation, not "imperceptible".
    expect(barFill).not.toBe(flatLightCtx.colors.surface)
    expect(contrastRatio(barFill, flatLightCtx.colors.bg)).toBeGreaterThan(1)
  })

  it("renders the three dots in colors.muted, not colors.border (border isn't contrast-calibrated per-theme)", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, darkCtx))
    const dots = Array.from(container.querySelectorAll("circle"))
    expect(dots).toHaveLength(3)
    for (const dot of dots) {
      expect(dot.getAttribute("fill")).toBe(darkCtx.colors.muted)
      expect(dot.getAttribute("fill")).not.toBe(darkCtx.colors.border)
    }
  })

  it("derives a url-pill fill one step further than the frame bar, so the pill reads as its own nested layer", () => {
    const component = {
      type: "device_mockup" as const,
      device: "browser" as const,
      asset_id: "dash",
      url: "app.example.com/dispatch",
    }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 1120 }, darkCtx))
    const frameBarFill = container.querySelector("path")!.getAttribute("fill")!
    const urlPill = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("rx") && Number(r.getAttribute("rx")) > 5 && r.getAttribute("width") !== r.getAttribute("height"),
    )!
    const pillFill = urlPill.getAttribute("fill")!
    expect(pillFill).not.toBe(frameBarFill)
    expect(contrastRatio(pillFill, darkCtx.colors.bg)).toBeGreaterThan(contrastRatio(frameBarFill, darkCtx.colors.bg))
    // The url text itself must still clear the meta-tier 3:1 floor against
    // its own (now-derived) pill fill, not the ambient page background.
    const urlText = Array.from(container.querySelectorAll("text")).find((t) => t.textContent?.includes("app.example.com"))!
    expect(contrastRatio(urlText.getAttribute("fill")!, pillFill)).toBeGreaterThanOrEqual(3)
  })
})

// ── slot boundary table ────────────────────────────────────────────────────
//
// A device frame must never draw outside the box it was handed, and every
// rect it draws must have a real size. Three ways that used to break: a floor
// raised a short slot's frame back above the slot's own height (400x20 drew a
// 53x33 window), the notch and home indicator were fixed at 90px and hung off
// the sides of any narrower body (600x100 drew a 47px phone), and a slot
// narrower than two bezels produced a screen of negative width (15x100).
//
// Below a legal minimum the component declines with a drop mark instead of
// drawing a broken device, so each row here is one of exactly two outcomes.
describe("device_mockup slot boundaries", () => {
  const SLOTS: readonly { w: number; h?: number }[] = [
    { w: 1120 },
    { w: 1120, h: 200 },
    { w: 544, h: 340 },
    { w: 400, h: 20 },
    { w: 400, h: 64 },
    { w: 600, h: 100 },
    { w: 300, h: 300 },
    { w: 100, h: 400 },
    { w: 72, h: 64 },
    { w: 60, h: 400 },
    { w: 15, h: 100 },
    { w: 15, h: 15 },
    { w: 1, h: 1 },
  ]

  /** Every drawn box, in the slot's own coordinates. */
  function drawnBoxes(root: Element): { x: number; y: number; w: number; h: number }[] {
    const out: { x: number; y: number; w: number; h: number }[] = []
    const walk = (el: Element, dx: number, dy: number) => {
      const transform = el.getAttribute("transform") ?? ""
      const m = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/)
      const ox = dx + (m ? Number(m[1]) : 0)
      const oy = dy + (m ? Number(m[2]) : 0)
      if (el.tagName === "rect" || el.tagName === "image") {
        out.push({
          x: ox + Number(el.getAttribute("x") ?? 0),
          y: oy + Number(el.getAttribute("y") ?? 0),
          w: Number(el.getAttribute("width") ?? 0),
          h: Number(el.getAttribute("height") ?? 0),
        })
      }
      for (const child of Array.from(el.children)) walk(child, ox, oy)
    }
    walk(root, 0, 0)
    return out
  }

  it.each(["browser", "phone"] as const)("%s stays inside every slot or declines", (device) => {
    const offenders: string[] = []
    for (const slot of SLOTS) {
      const component = {
        type: "device_mockup" as const,
        device,
        asset_id: "dash",
        caption: "Live health board",
      }
      const { container } = svg(
        deviceMockup.render(component, { x: 0, y: 0, w: slot.w, ...(slot.h === undefined ? {} : { h: slot.h }) }, ctx),
      )
      const label = `${device} ${slot.w}x${slot.h ?? "auto"}`
      const framed = container.querySelector(`[data-device-mockup='${device}']`)
      if (!framed) {
        // The only legal alternative is an explicit drop.
        if (!container.querySelector("[data-dropped]")) offenders.push(`${label}: neither frame nor drop mark`)
        continue
      }
      // Height is unbounded only when the caller named no height.
      const limitH = slot.h ?? Number.POSITIVE_INFINITY
      for (const box of drawnBoxes(container)) {
        if (box.w < 0 || box.h < 0) offenders.push(`${label}: negative box ${box.w}x${box.h}`)
        if (box.x < -0.5 || box.y < -0.5) offenders.push(`${label}: box starts at ${box.x},${box.y}`)
        if (box.x + box.w > slot.w + 0.5) offenders.push(`${label}: box right edge ${box.x + box.w} > ${slot.w}`)
        if (box.y + box.h > limitH + 0.5) offenders.push(`${label}: box bottom edge ${box.y + box.h} > ${limitH}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("declines a slot too short for a window instead of overflowing it", () => {
    const component = { type: "device_mockup" as const, device: "browser" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 400, h: 20 }, ctx))
    expect(container.querySelector("[data-device-mockup]")).toBeNull()
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })

  it("keeps the notch and the home indicator inside a narrow body", () => {
    const component = { type: "device_mockup" as const, device: "phone" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 600, h: 100 }, ctx))
    const body = container.querySelector("rect")
    const bodyW = Number(body?.getAttribute("width"))
    expect(bodyW).toBeLessThan(PHONE_NOTCH_NATURAL_W)
    for (const rect of Array.from(container.querySelectorAll("rect"))) {
      expect(Number(rect.getAttribute("width"))).toBeLessThanOrEqual(bodyW)
    }
  })

  it("declines a body narrower than its own two bezels", () => {
    const component = { type: "device_mockup" as const, device: "phone" as const, asset_id: "dash" }
    const { container } = svg(deviceMockup.render(component, { x: 0, y: 0, w: 15, h: 100 }, ctx))
    expect(container.querySelector("[data-device-mockup]")).toBeNull()
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })

  it("reserves nothing in measure for a slot it would decline", () => {
    expect(deviceMockup.measure({ type: "device_mockup", device: "browser", asset_id: "dash" }, 40, ctx)).toBe(0)
    expect(deviceMockup.measure({ type: "device_mockup", device: "phone", asset_id: "dash" }, 10, ctx)).toBe(0)
  })
})
