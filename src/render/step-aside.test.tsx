// @vitest-environment jsdom
//
// The step-aside sheet's own promise about its text: every line fits where
// the fit said it would, because the fit measured what the paint draws.
import { describe, expect, it } from "vitest"
import type { Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "./full-slide-svg"
import { renderSvgMarkup } from "./serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { stepAsideGeometry } from "./step-aside"

function ctxFor(themeId: string) {
  const tokens = resolveStyle(themeId)
  return buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface))
}

describe("the sheet's fit is a geometry twin of its paint", () => {
  // 49 capital Ws is legal IR and the widest line the Latin metrics know how
  // to make. Fitted against the wrong font it came back as one unshrunk 34px
  // line reporting `truncated: false`, and painted in Georgia bold it ran to
  // x=1965 — 685px past the canvas. A fit that disagrees with its paint is
  // not a smaller kind of correct: this is the one failure it exists to stop.
  const heading = "W".repeat(49)

  for (const themeId of ["brief", "runway", "crayon", "terminal"]) {
    it(`keeps a 49-character heading on the page on ${themeId}`, () => {
      const ctx = ctxFor(themeId)
      const slide = { type: "content", kind: "data", heading, components: [] } as unknown as Slide
      const { title, titleY } = stepAsideGeometry(slide, ctx)
      const markup = renderSvgMarkup(
        <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
          {title.lines.map((line, i) => (
            <text
              key={i}
              x={88}
              y={titleY + i * title.lineHeight}
              fontSize={title.fontSize}
              fontWeight="600"
              fontFamily={ctx.fonts.heading}
              dominantBaseline="alphabetic"
            >
              {line}
            </text>
          ))}
        </svg>,
      )
      // The audit measures the painted line with the painted font, which is
      // the measurement the fit claimed to have made.
      expect(auditSvgMarkup(markup)).toEqual([])
      expect(title.lines.length).toBeLessThanOrEqual(2)
    })
  }

  it("strips emphasis from the footnote instead of printing the asterisks", () => {
    const ctx = ctxFor("brief")
    const slide = {
      type: "content",
      kind: "data",
      heading: "Renewal",
      footnote: "Source **critical** internal review",
      components: [],
    } as unknown as Slide
    const { footnote } = stepAsideGeometry(slide, ctx)
    expect(footnote).not.toBeNull()
    const text = footnote!.segments.map((s) => s.text).join("")
    expect(text).toBe("Source critical internal review")
    expect(text).not.toContain("*")
    // And the emphasised run is still marked as one, so the paint can treat it
    // as the author asked rather than as flat prose.
    expect(footnote!.segments.some((s) => s.emphasized)).toBe(true)
  })
})
