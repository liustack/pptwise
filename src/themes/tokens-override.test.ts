import { describe, it, expect } from "vitest"
import { resolveStyle } from "./index"
import { renderSlideSvg, validateIr } from "../api"

describe("theme.style override merging", () => {
  it("merges palette/fonts/shape over the base theme", () => {
    const t = resolveStyle("consulting", {
      colors: { primary: "#0B5FFF", chartPalette: ["#111111"] },
      fonts: { heading: ["Inter"] },
      shape: { radius: 10 },
    })
    expect(t.colors.primary).toBe("#0B5FFF")
    expect(t.colors.chartPalette).toEqual(["#111111"])
    expect(t.fonts.heading).toEqual(["Inter"])
    expect(t.shape?.radius).toBe(10)
    expect(t.shape?.typeScale).toBeUndefined()
    expect(t.colors.bg).toBe(resolveStyle("consulting").colors.bg)
  })

  it("merges typeScale over the base theme shape", () => {
    const t = resolveStyle("consulting", { shape: { typeScale: 1.5 } })
    expect(t.shape?.typeScale).toBe(1.5)
    expect(t.shape?.radius).toBe(resolveStyle("consulting").shape?.radius)
  })

  it("no style keeps the identical base reference (zero-cost default)", () => {
    expect(resolveStyle("consulting", undefined)).toBe(resolveStyle("consulting"))
  })

  it("theme.style reaches the rendered SVG", () => {
    const v = validateIr({
      version: "5",
      filename: "t.pptx",
      theme: { id: "consulting", style: { colors: { primary: "#0B5FFF" } } },
      // No layout pin: v5 removed the field, and the theme's cover face is
      // whatever its menu locks. consulting's `gauge-verdict` paints the
      // heading rule in `colors.primary`, so the override still shows up.
      slides: [{ type: "cover", heading: "Hello Tokens" }],
    })
    expect(v.ok).toBe(true)
    expect(renderSlideSvg(v.ir!, 0)).toContain("#0B5FFF")
  })
})
