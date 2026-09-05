// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { scorecard } from "./scorecard"
import { validateIr } from "@/api"
import type { Component } from "@/ir"
import type { ComponentCtx } from "./types"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { contrastRatio, requiredContrastRatio, resolveSemanticColor } from "../render/ink"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { FORM_BODY_FLOOR } from "./legibility"

function themeCtx(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

function deck(component: Component): unknown {
  return {
    version: "5",
    theme: { id: "brief" },
    slides: [{ type: "content", kind: "data", heading: "goals", components: [component] }],
  }
}

const CARD = {
  type: "scorecard" as const,
  labels: { metric: "目标", target: "目标值", actual: "实际", gap: "差距", status: "状态" },
  rows: [
    { label: "客户续约率", target: "88%", actual: "91%", gap: "+3.0", status: "on_track" as const, status_label: "达标" },
    { label: "平均开通周期", target: "4.0", actual: "5.2", gap: "+1.2", status: "off_track" as const, status_label: "未达标" },
    { label: "渠道收入占比", target: "25%", actual: "23%", gap: "-2.0", status: "watch" as const, status_label: "观察中" },
  ],
  note: "差距为实际减目标。",
}

describe("scorecard schema", () => {
  it("accepts a card of three goals with a note", () => {
    expect(validateIr(deck(CARD)).ok).toBe(true)
  })

  it("refuses two goals and nine goals", () => {
    const short = validateIr(deck({ ...CARD, rows: CARD.rows.slice(0, 2) }))
    expect(short.ok).toBe(false)
    const long = validateIr(
      deck({
        ...CARD,
        rows: Array.from({ length: 9 }, (_, i) => ({ ...CARD.rows[0]!, label: `goal ${i}` })),
      }),
    )
    expect(long.ok).toBe(false)
  })

  it("refuses a status outside the three verdicts", () => {
    const result = validateIr(
      deck({ ...CARD, rows: [{ ...CARD.rows[0]!, status: "unknown" }, ...CARD.rows.slice(1)] } as unknown as Component),
    )
    expect(result.ok).toBe(false)
  })
})

describe("scorecard rendering", () => {
  it("prints the author's own headers and verdict words", () => {
    const { container } = svg(scorecard.render(CARD, { x: 0, y: 0, w: 1104, h: 412 }, themeCtx("brief")))
    for (const word of ["目标值", "实际", "差距", "状态", "达标", "未达标", "观察中", "差距为实际减目标。"]) {
      expect(container.textContent, word).toContain(word)
    }
  })

  it("supplies its own words in the script the card is written in", () => {
    // Nothing authored: a Chinese card gets Chinese headers and verdicts, and
    // the same card with Latin content gets the English set. A page written in
    // one language never prints its column heads in the other.
    const strip = (rows: typeof CARD.rows) =>
      rows.map((row) => ({
        label: row.label,
        target: row.target,
        actual: row.actual,
        gap: row.gap,
        status: row.status,
      }))
    const zh = { type: "scorecard" as const, rows: strip(CARD.rows) }
    const zhOut = svg(scorecard.render(zh, { x: 0, y: 0, w: 1104, h: 412 }, themeCtx("brief")))
    for (const w of ["目标", "目标值", "实际", "差距", "状态", "达标", "未达标", "观察"]) {
      expect(zhOut.container.textContent, w).toContain(w)
    }
    expect(zhOut.container.textContent).not.toContain("Goal")
    expect(zhOut.container.textContent).not.toContain("On track")

    const en = {
      type: "scorecard" as const,
      rows: [
        { label: "Renewal rate", target: "88%", actual: "91%", gap: "+3.0", status: "on_track" as const },
        { label: "Setup weeks", target: "4.0", actual: "5.2", gap: "+1.2", status: "off_track" as const },
        { label: "Partner share", target: "25%", actual: "23%", gap: "-2.0", status: "watch" as const },
      ],
    }
    const enOut = svg(scorecard.render(en, { x: 0, y: 0, w: 1104, h: 412 }, themeCtx("brief")))
    for (const w of ["Goal", "Target", "Actual", "Gap", "Status", "On track", "Off track", "Watch"]) {
      expect(enOut.container.textContent, w).toContain(w)
    }
    expect(enOut.container.textContent).not.toContain("目标")
  })

  it("lets the author override any header or verdict word", () => {
    const { container } = svg(scorecard.render(CARD, { x: 0, y: 0, w: 1104, h: 412 }, themeCtx("brief")))
    // CARD writes its own headers and verdicts; the component's own words for
    // watch ("观察") give way to the authored "观察中".
    expect(container.textContent).toContain("观察中")
  })

  it("gives each verdict its own tone, one dot per row, on every theme", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const ctx = themeCtx(id)
      const { container } = svg(scorecard.render(CARD, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
      expect(container.querySelectorAll("circle").length, id).toBe(CARD.rows.length)
      const tones = new Set(Array.from(container.querySelectorAll("circle")).map((c) => c.getAttribute("fill")))
      expect(tones.size, id).toBe(3)
    }
  })

  it("keeps every verdict word and gap figure over its contrast floor on every theme", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const ctx = themeCtx(id)
      const bg = ctx.defaultBg ?? ctx.colors.bg
      const { container } = svg(scorecard.render(CARD, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
      for (const text of container.querySelectorAll("text")) {
        const size = Number(text.getAttribute("font-size"))
        expect(size, `${id} ${text.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
        expect(
          contrastRatio(text.getAttribute("fill")!, bg),
          `${id} ${text.textContent}`,
        ).toBeGreaterThanOrEqual(requiredContrastRatio(size))
      }
      // The tone the theme declared is the tone the row is drawn in.
      expect(resolveSemanticColor("success", ctx.colors)).toBeTruthy()
    }
  })

  it("paints no fill behind a row and no edge bar", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(scorecard.render(CARD, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    expect(container.querySelectorAll("rect").length).toBe(0)
  })

  it("declares the rows a short box cost it, and says nothing on the page", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(scorecard.render(CARD, { x: 0, y: 0, w: 900, h: 100 }, ctx))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(marker!.getAttribute("data-dropped-kind")).toBe("row")
    expect(container.textContent).not.toContain("+2")
    expect(container.textContent).not.toContain("…")
  })

  it("declines rather than cutting a word out of any of its own text", () => {
    const ctx = themeCtx("brief")
    const long = {
      ...CARD,
      rows: [{ ...CARD.rows[0]!, label: "客户续约率与席位扩容合并口径下的年度承诺" }, ...CARD.rows.slice(1)],
    }
    const { container } = svg(scorecard.render(long, { x: 0, y: 0, w: 520, h: 412 }, ctx))
    expect(container.querySelector("text")).toBeNull()
    const marker = container.querySelector("[data-dropped]")
    expect(marker!.getAttribute("data-dropped-kind")).toBe("row")
    expect(container.querySelector("[data-truncated]")).toBeNull()
  })

  it("picks each ink against the size that is actually painted", () => {
    // The actual column shrinks to fit; picking its colour at the requested
    // 26px left a 3:1 primary standing on a 17px number.
    for (const id of CANONICAL_THEME_IDS) {
      const ctx = themeCtx(id)
      const bg = ctx.defaultBg ?? ctx.colors.bg
      const { container } = svg(scorecard.render(CARD, { x: 0, y: 0, w: 400, h: 520 }, ctx))
      for (const text of container.querySelectorAll("text")) {
        const size = Number(text.getAttribute("font-size"))
        expect(
          contrastRatio(text.getAttribute("fill")!, bg),
          `${id} ${text.textContent} @${size}`,
        ).toBeGreaterThanOrEqual(requiredContrastRatio(size))
      }
    }
  })

  it("measures the height it draws into and emits only the exportable subset", () => {
    const ctx = themeCtx("swiss")
    const h = scorecard.measure(CARD, 1104, ctx)
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{scorecard.render(CARD, { x: 0, y: 0, w: 1104, h }, ctx)}</svg>,
    )
    expect(markup).not.toContain("data-dropped")
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})
