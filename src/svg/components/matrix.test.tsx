// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { auditSvgMarkup } from "../audit/svg-audit"
import { matrix } from "./matrix"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#F7F7F2",
    surface: "#FFFFFF",
    primary: "#051C2C",
    accent: "#FFC72C",
    text: "#051C2C",
    muted: "#6C6C6C",
    chartPalette: ["#051C2C", "#FFC72C"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24, // balanced default — this suite doesn't exercise body-text sizing
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const sixCells = {
  type: "matrix" as const,
  x_title: "需求确定性",
  y_title: "资产投入",
  cols: 2 as const,
  items: [
    { title: "县乡节点", tag: "低确定性", tone: "neutral" as const },
    { title: "社区统建统服", tag: "高确定性", tone: "accent" as const },
    { title: "目的地充电", tag: "低确定性", tone: "neutral" as const },
    { title: "物流专用站", tag: "高确定性", tone: "info" as const },
    { title: "高速走廊", tag: "需求波动", tone: "info" as const },
    { title: "城市旗舰超充", tag: "高刚需", tone: "accent" as const },
  ],
}

describe("matrix component", () => {
  it("lays out items in a cols-wide grid (2 cols × 3 rows = 6 cards)", () => {
    const { container } = svg(matrix.render(sixCells, { x: 60, y: 200, w: 800 }, ctx))
    const cards = Array.from(container.querySelectorAll("rect"))
    expect(cards).toHaveLength(6)
    const xs = new Set(cards.map((r) => Math.round(Number(r.getAttribute("x")))))
    expect(xs.size).toBe(2) // two distinct column x-positions
  })

  it("tone maps to distinct card fills (accent vs info vs neutral)", () => {
    const { container } = svg(matrix.render(sixCells, { x: 0, y: 0, w: 800 }, ctx))
    const fills = Array.from(container.querySelectorAll("rect")).map((r) => r.getAttribute("fill"))
    // neutral(idx0), accent(idx1), info(idx3) must all differ from each other.
    expect(new Set([fills[0], fills[1], fills[3]]).size).toBe(3)
    // and none equals plain surface (they are tinted)
    expect(fills[1]).not.toBe(ctx.colors.surface)
  })

  it("renders x/y axis labels when provided", () => {
    const { container } = svg(matrix.render(sixCells, { x: 0, y: 0, w: 800 }, ctx))
    const xTitle = container.querySelector('[data-axis-title="x"]')
    const yTitle = container.querySelector('[data-axis-title="y"]')
    expect(xTitle?.textContent).toBe("需求确定性  →")
    expect(yTitle?.textContent).toBe("资产投入  ↑")
    expect(yTitle?.getAttribute("y")).toBe(xTitle?.getAttribute("y"))
    expect(Number(yTitle?.getAttribute("x"))).toBeLessThan(Number(xTitle?.getAttribute("x")))
    expect(Array.from(container.querySelectorAll("text")).filter((t) => t.textContent === "资")).toHaveLength(0)
  })

  it("measure() grows with more rows", () => {
    const twoRows = matrix.measure(sixCells, 800, ctx)
    const oneRow = matrix.measure({ ...sixCells, items: sixCells.items.slice(0, 2) }, 800, ctx)
    expect(twoRows).toBeGreaterThan(oneRow)
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{matrix.render(sixCells, { x: 0, y: 0, w: 800 }, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })

  // I3 review's Important, wave-2 sweep T3: mirrors row-cards.tsx:96's
  // per-card `data-audit-box` — every cell now registers its own box, not
  // just the whole grid's. Before this, only a title reaching all the way to
  // the *grid's* own right edge (e.g. the last column of the row) could ever
  // cross an audited box; a narrower col0/col1 cell overflowing its own,
  // smaller card was structurally invisible to svg-audit.
  describe("per-cell data-audit-box (I3 review Important)", () => {
    it("each cell's <g> carries data-audit-box at that cell's own x/y/width, matching its rect", () => {
      const { container } = svg(matrix.render(sixCells, { x: 60, y: 200, w: 800 }, ctx))
      const rects = Array.from(container.querySelectorAll("rect"))
      const cellGroups = rects.map((r) => r.parentElement!)
      expect(cellGroups).toHaveLength(sixCells.items.length)
      cellGroups.forEach((g, i) => {
        const rect = rects[i]!
        expect(g.getAttribute("data-audit-box")).toBe(
          `${rect.getAttribute("x")},${rect.getAttribute("y")},${rect.getAttribute("width")}`,
        )
      })
    })

    // Differential: real `cellLayout()`/`fitSvgLine()` never let a title
    // actually overflow its own card (it shrinks to a font floor, then
    // truncates — see this file's "egregious x_title" precedent below for
    // the same guarantee on x_title), so this test constructs the violation
    // directly rather than through matrix.render(), the same way
    // svg-audit.test.tsx's own hand-built h-overflow fixtures do — proving
    // the audit *mechanism* the per-cell box adds, as a defense-in-depth net
    // against a future regression in that fit/truncate contract.
    it("a per-cell box catches a col0 title overflowing its own card even though it stays inside the outer grid box (pre/post-fix differential)", () => {
      const outerBox = { x: 60, y: 200, w: 800 } // matches this file's own convention above
      const cardW = 392 // 2-col grid at w=800, CARD_GAP=16: (800 - 16) / 2
      const cellX = outerBox.x
      const cellY = outerBox.y
      const fontSize = 19 // TITLE_SIZE
      const textLeft = cellX + 18 // PAD_X
      const overflowingTitle = "溢出".repeat(14)
      const textWidth = measureTextUnits(overflowingTitle, { bold: true }) * fontSize
      // Sanity-check the constructed geometry actually straddles the
      // boundary this test means to probe, instead of silently measuring
      // the wrong thing if the text-metrics table ever changes.
      expect(textLeft + textWidth).toBeGreaterThan(cellX + cardW + 6) // overflows the per-cell box
      expect(textLeft + textWidth).toBeLessThan(outerBox.x + outerBox.w - 6) // stays inside the outer grid box

      const cellMarkup = `<text x="${textLeft}" y="${cellY + 35}" font-size="${fontSize}" font-weight="700">${overflowingTitle}</text>`
      const outerBoxAttr = `${outerBox.x},${outerBox.y},${outerBox.w}`

      // Pre-fix shape: only the outer grid's own box (set by whatever
      // upstream caller wraps the whole component, same as production).
      const preFixMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><g data-audit-box="${outerBoxAttr}">${cellMarkup}</g></svg>`
      expect(auditSvgMarkup(preFixMarkup).filter((i) => i.kind === "h-overflow")).toEqual([])

      // Post-fix shape: the per-cell box this task adds, nested inside the
      // same outer box — matches matrix.tsx's actual `<g data-audit-box=...>`
      // wrapper around each cell.
      const postFixMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><g data-audit-box="${outerBoxAttr}"><g data-audit-box="${cellX},${cellY},${cardW}">${cellMarkup}</g></g></svg>`
      const postIssues = auditSvgMarkup(postFixMarkup).filter((i) => i.kind === "h-overflow")
      expect(postIssues).toHaveLength(1)
    })
  })

  // Borrow-wave Task 4 (docs/contrast-system.md's "Overlap detection
  // boundary") found matrix.tsx's x_title is the one confirmed, shipping
  // free-text field that renders inside a live data-audit-box with zero
  // width fit — the audit's own widened box detects the collision this can
  // cause, but the component itself let the text genuinely overflow. This
  // pins the render-layer fix using the audit's own h-overflow detector
  // (auditSvgMarkup, same oracle svg-content.tsx's real data-audit-box wrapper
  // feeds) as the objective measure, not just an eyeballed string length.
  it("fits an egregiously long x_title within its declared box instead of overflowing it (real-render h-overflow oracle)", () => {
    // 72 CJK chars — far past anything a 560px box minus the y_title gutter
    // (526px available) can hold even after shrinking to the component's own
    // font-size floor, so this also exercises the truncation branch below.
    const egregious = { ...sixCells, x_title: "超长坐标轴标题".repeat(12) }
    const box = { x: 60, y: 200, w: 560 }
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <g data-audit-box={`${box.x},${box.y},${box.w}`}>{matrix.render(egregious, box, ctx)}</g>
      </svg>,
    )
    const hOverflow = auditSvgMarkup(markup).filter((i) => i.kind === "h-overflow")
    expect(hOverflow).toEqual([])

    const root = parseSvgRoot(markup)
    const xTitleText = Array.from(root.querySelectorAll("text")).find((t) =>
      t.textContent?.includes("超长坐标轴标题"),
    )
    expect(xTitleText).toBeTruthy()
    // Shrink alone can't rescue 72 CJK chars in a 526px gutter at the fitted
    // floor — truncateToUnits must engage, and the marker convention every
    // sibling fitted field (item.title/item.tag, same file) already uses
    // must carry over to x_title too.
    expect(xTitleText?.getAttribute("data-truncated")).toBe("1")
  })

  it("leaves a normal-length x_title byte-identical to the unfitted baseline (fit path only engages on real overflow)", () => {
    // sixCells' x_title ("需求确定性") comfortably fits any realistic box —
    // this pins that the fit call introduced for the egregious case above is
    // a genuine no-op here: same font size, same text, no truncation marker.
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{matrix.render(sixCells, { x: 0, y: 0, w: 800 }, ctx)}</svg>,
    )
    const root = parseSvgRoot(markup)
    const xTitleText = Array.from(root.querySelectorAll("text")).find((t) => t.textContent?.includes("需求确定性"))
    expect(xTitleText?.textContent).toBe("需求确定性  →")
    expect(xTitleText?.getAttribute("font-size")).toBe("13")
    expect(xTitleText?.hasAttribute("data-truncated")).toBe(false)
  })

  describe("y_title is a horizontal pair, never a stacked column", () => {
    // 24 CJK chars, matching the case that first surfaced this defect.
    const longYTitle = "这是一个远远超出网格实际高度的超长纵轴标题文本超"
    // 1 row, no tag, no x_title — the shortest possible grid (55px), so the
    // stack's own height dominates and the overrun is unmistakable rather
    // than incidental.
    const shortGridLongYTitle = {
      type: "matrix" as const,
      y_title: longYTitle,
      cols: 2 as const,
      items: [
        { title: "a", tone: "neutral" as const },
        { title: "b", tone: "accent" as const },
      ],
    }

    it("paints a long CJK y_title as one horizontal line even when box.h is left undefined", () => {
      // Reviewer's exact repro: tech theme, content-bento-panel layout
      // (which never sets a child's box.h — `renderCell` calls
      // `renderComponent(component, { x, y, w }, ctx)` with no `h` field),
      // x_title="客户需求水平", y_title="资产投入水平强度评估" (16 chars),
      // 2x2 grid, no tags. The fit-round-1 fallback
      // (`measuredFallbackH = Math.max(gridH, yTitleH)`) already mirrors
      // measure()'s own X_TITLE_H-exclusive second term, but the render()
      // that shipped alongside it subtracted X_TITLE_H from that fallback
      // a second time whenever box.h was undefined — which is every real
      // production path for matrix (it isn't in `STRETCHABLE_TYPES`, and
      // bento-panel never sets box.h either) — silently shrinking the
      // y_title budget by X_TITLE_H (30px) and truncating the last
      // characters off even though measure() had already allocated enough
      // room for the whole title.
      //
      // The repro's titles were originally the reviewer's own English pair
      // ("Customer Demand"/"Investment Level"). They are Chinese here for
      // one reason: a Latin y_title no longer stacks at all (2026-08-20
      // review — see the "Latin y_title" block below), so an English fixture
      // can no longer exercise the stacked path this regression guards. Same
      // character count (16), same geometry, same defect.
      const bentoLikeComponent = {
        type: "matrix" as const,
        x_title: "客户需求水平",
        y_title: "资产投入水平强度评估资产投入水平",
        cols: 2 as const,
        items: [
          { title: "Rural nodes", tone: "neutral" as const },
          { title: "Community hubs", tone: "accent" as const },
          { title: "Fleet charging", tone: "info" as const },
          { title: "Flagship urban", tone: "accent" as const },
        ],
      }
      const box = { x: 0, y: 0, w: 800 } // box.h intentionally undefined, matching bento-panel
      const measured = matrix.measure(bentoLikeComponent, box.w, ctx)

      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg">{matrix.render(bentoLikeComponent, box, ctx)}</svg>,
      )
      const root = parseSvgRoot(markup)
      const yTitle = root.querySelector('[data-axis-title="y"]')!
      expect(yTitle.textContent).toBe(`${bentoLikeComponent.y_title}  ↑`)
      expect(yTitle.hasAttribute("data-truncated")).toBe(false)
      const baselineY = Number(yTitle.getAttribute("y"))
      expect(baselineY + 13 * 0.25).toBeLessThanOrEqual(box.y + measured)
    })

    it("keeps a long y_title as one line inside a short box, truncation-marked if needed", () => {
      const box = { x: 96, y: 176, w: 600, h: 150 }
      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg">
          {matrix.render(shortGridLongYTitle, box, ctx)}
        </svg>,
      )
      const root = parseSvgRoot(markup)
      const yTitle = root.querySelector('[data-axis-title="y"]')!
      expect(yTitle.textContent).toContain("↑")
      const baselineY = Number(yTitle.getAttribute("y"))
      expect(baselineY + Number(yTitle.getAttribute("font-size")) * 0.25).toBeLessThanOrEqual(
        box.y + box.h,
      )
    })

    it("grows measure() by a fixed band for a y_title, not by the stacked-character height", () => {
      const measured = matrix.measure(shortGridLongYTitle, 600, ctx)
      const gridOnly = matrix.measure({ ...shortGridLongYTitle, y_title: undefined }, 600, ctx)
      expect(measured - gridOnly).toBe(24)
    })

    it("grows measure() by one band for a short CJK y_title too", () => {
      const measured = matrix.measure(sixCells, 800, ctx)
      const gridOnly = matrix.measure({ ...sixCells, x_title: undefined, y_title: undefined }, 800, ctx)
      expect(measured - gridOnly).toBe(24)

      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg">{matrix.render(sixCells, { x: 0, y: 0, w: 800 }, ctx)}</svg>,
      )
      const root = parseSvgRoot(markup)
      const yTitle = root.querySelector('[data-axis-title="y"]')!
      expect(yTitle.textContent).toBe(`${sixCells.y_title}  ↑`)
      expect(yTitle.hasAttribute("data-truncated")).toBe(false)
    })
  })

  // 2026-08-20 review, `component--matrix--en`: the English corpus page's
  // y_title is "Customers", and it rendered as C/u/s/t/o/m/e/r/s down the
  // left band. Axis titles are now a horizontal pair for every script.
  describe("Latin y_title renders horizontally, never as a letter column", () => {
    /** The character column's own selector — `textAnchor="middle"` is what
     * only the stacked y_title renders with in this component (item
     * title/tag, x_title and the horizontal y_title are all left-aligned). */
    function stackedYTitleChars(root: Element) {
      return Array.from(root.querySelectorAll("text")).filter(
        (t) => t.getAttribute("text-anchor") === "middle",
      )
    }

    const reported = {
      type: "matrix" as const,
      x_title: "Performance",
      y_title: "Customers",
      cols: 3 as const,
      items: [
        { title: "Line expansion in existing accounts", tag: "Q1", tone: "accent" as const },
        { title: "Standardized onboarding templates", tag: "Q2", tone: "neutral" as const },
        { title: "In-house inference compute", tag: "Q3", tone: "info" as const },
      ],
    }

    it("renders the whole word on one <text>, with no character split anywhere", () => {
      const { container } = svg(matrix.render(reported, { x: 0, y: 0, w: 900 }, ctx))
      const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
      expect(texts.some((t) => t?.includes("Customers"))).toBe(true)
      // `yTitleTexts` is the character column's own selector (the only
      // centered text this component renders) — it must now be empty.
      expect(stackedYTitleChars(container)).toHaveLength(0)
    })

    it("gives the grid the left band back — cards start at box.x", () => {
      const cardX = (component: Parameters<typeof matrix.render>[0]) =>
        svg(matrix.render(component, { x: 60, y: 0, w: 900 }, ctx))
          .container.querySelector("rect")!
          .getAttribute("x")
      // Horizontal placement costs height, not width: the grid lands exactly
      // where it would with no y_title at all.
      expect(cardX(reported)).toBe(cardX({ ...reported, y_title: undefined }))
      expect(Number(cardX({ ...reported, y_title: "客户洞察" }))).toBe(
        Number(cardX(reported)),
      )
    })

    it("measure() reports the horizontal band it renders, at a fixed height regardless of title length", () => {
      const measured = matrix.measure(reported, 900, ctx)
      const noYTitle = matrix.measure({ ...reported, y_title: undefined }, 900, ctx)
      const none = matrix.measure({ ...reported, x_title: undefined, y_title: undefined }, 900, ctx)
      expect(measured).toBe(noYTitle)
      expect(measured - none).toBe(24)
      expect(
        matrix.measure({ ...reported, y_title: "A far longer vertical axis name" }, 900, ctx),
      ).toBe(measured)
    })

    it("keeps the two captions on one line below the grid, y first then x", () => {
      const box = { x: 0, y: 0, w: 900 }
      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg">{matrix.render(reported, box, ctx)}</svg>,
      )
      const root = parseSvgRoot(markup)
      const texts = Array.from(root.querySelectorAll("text"))
      const yTitle = texts.find((t) => t.textContent?.includes("Customers"))!
      const xTitle = texts.find((t) => t.textContent?.includes("Performance"))!
      expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
      expect(Number(yTitle.getAttribute("x"))).toBeLessThan(Number(xTitle.getAttribute("x")))
      expect(yTitle.textContent).toContain("↑")
      expect(xTitle.textContent).toContain("→")
      const lastCardBottom = Math.max(
        ...Array.from(root.querySelectorAll("rect")).map(
          (r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")),
        ),
      )
      expect(Number(xTitle.getAttribute("y"))).toBeGreaterThan(lastCardBottom)
    })

    it("fits an egregiously long Latin y_title inside its declared box, truncation-marked", () => {
      const egregious = { ...reported, y_title: "Rolling twelve-month cohort ".repeat(8) }
      const box = { x: 60, y: 200, w: 560 }
      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
          <g data-audit-box={`${box.x},${box.y},${box.w}`}>{matrix.render(egregious, box, ctx)}</g>
        </svg>,
      )
      expect(auditSvgMarkup(markup).filter((i) => i.kind === "h-overflow")).toEqual([])
      const root = parseSvgRoot(markup)
      const yTitleText = Array.from(root.querySelectorAll("text")).find((t) =>
        t.textContent?.includes("Rolling twelve-month"),
      )
      expect(yTitleText?.getAttribute("data-truncated")).toBe("1")
    })

    it("sends a mixed-script y_title horizontal too — no majority vote", () => {
      const mixed = { ...reported, y_title: "K8s 托管" }
      const { container } = svg(matrix.render(mixed, { x: 0, y: 0, w: 900 }, ctx))
      const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
      expect(texts.some((t) => t?.includes("K8s 托管"))).toBe(true)
      expect(stackedYTitleChars(container)).toHaveLength(0)
    })
  })
})
