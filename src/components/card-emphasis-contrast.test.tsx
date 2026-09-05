// @vitest-environment jsdom
//
// Every word on an emphasised card, on every theme.
//
// `product_cards` and `quote_wall` both single one card out by filling it in
// a theme colour and resetting its inks to read against that fill. The name
// and the price take the full ink, and the small text — the note, the price
// unit, the speaker's role — is mixed one step back toward the fill so it
// sits behind them.
//
// That mix was taken on trust. On homeroom the note measured 4.11:1 and on
// crayon the role measured 3.81:1, both under the 4.5:1 a 16px line owes its
// background, so the emphasised card — the one meant to be read first — held
// the least readable text on the page. This sweep measures what is actually
// drawn, on every installed theme, against the fill each card actually
// painted, so a future dilution cannot pass on the same trust.
//
// The decorative quote mark is deliberately out of scope: it carries no
// information and is not text a reader is asked to read.
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { listThemes } from "@/api"
import { resolveStyle } from "@/themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { productCards } from "./product-cards"
import { quoteWall } from "./quote-wall"
import type { ComponentCtx } from "./types"

function ctxFor(themeId: string): ComponentCtx {
  const tokens = resolveStyle(themeId)
  return {
    colors: tokens.colors,
    shape: tokens.shape,
    fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
    bodyFontPx: 24,
    defaultBg: tokens.colors.bg,
    themeId,
    images: { "shot-1": { src: "data:image/png;base64,AAAA" }, "shot-2": { src: "data:image/png;base64,BBBB" } },
  }
}

const box = { x: 0, y: 0, w: 1104 }

const products = {
  type: "product_cards" as const,
  items: [
    { asset_id: "shot-1", name: "协作工作区", note: "文档与任务合在一处", price: "¥68", price_unit: "席位 / 月" },
    {
      asset_id: "shot-2",
      name: "集成中枢",
      note: "预置四十六个业务系统连接器",
      price: "¥12万",
      price_unit: "起 / 年",
      featured: true as const,
    },
  ],
}

const quotes = {
  type: "quote_wall" as const,
  quotes: [
    { text: "开通从九周压到五周。", name: "宋海", role: "客户成功总监" },
    { text: "续约看板把要流失的客户提前六周推到我面前。", name: "李蔚", role: "运营负责人", featured: true as const },
  ],
}

/**
 * Every readable line on a card, paired with the colour actually painted
 * behind it.
 *
 * For most lines that is the card's own shell. An initials disc is its own
 * ground, though — the same geometry the deck audit resolves by attributing
 * text to the shape underneath it — so a line whose anchor falls inside the
 * disc is measured against the disc. Measuring it against the card instead
 * reports a failure on white initials that are perfectly readable on their
 * own dark circle.
 */
function inkFindings(container: Element): { text: string; fill: string; size: number; bg: string }[] {
  const findings: { text: string; fill: string; size: number; bg: string }[] = []
  for (const card of Array.from(container.querySelectorAll("g[data-audit-box]"))) {
    const shell = card.querySelector("rect")!.getAttribute("fill")!
    const discs = Array.from(card.querySelectorAll("circle")).map((circle) => ({
      cx: Number(circle.getAttribute("cx")),
      cy: Number(circle.getAttribute("cy")),
      r: Number(circle.getAttribute("r")),
      fill: circle.getAttribute("fill")!,
    }))
    for (const text of Array.from(card.querySelectorAll("text"))) {
      // The open-quote glyph is decoration, marked as such on the element.
      if (text.getAttribute("aria-hidden") === "true") continue
      const x = Number(text.getAttribute("x"))
      const y = Number(text.getAttribute("y"))
      const disc = discs.find((d) => Math.hypot(x - d.cx, y - d.cy) <= d.r)
      findings.push({
        text: text.textContent ?? "",
        fill: text.getAttribute("fill")!,
        size: Number(text.getAttribute("font-size")),
        bg: disc?.fill ?? shell,
      })
    }
  }
  return findings
}

describe("emphasised cards keep every line readable on every theme", () => {
  const themeIds = listThemes().map((theme) => theme.id)

  it("covers every installed theme", () => {
    expect(themeIds.length).toBeGreaterThanOrEqual(24)
  })

  for (const themeId of themeIds) {
    it(`${themeId}: product_cards and quote_wall clear their own size floor`, () => {
      const ctx = ctxFor(themeId)
      const offenders: string[] = []
      for (const [label, node] of [
        ["product_cards", productCards.render(products, box, ctx)],
        ["quote_wall", quoteWall.render(quotes, box, ctx)],
      ] as const) {
        const { container } = render(<svg>{node}</svg>)
        for (const found of inkFindings(container)) {
          const ratio = contrastRatio(found.fill, found.bg)
          const floor = requiredContrastRatio(found.size)
          if (ratio + 0.005 < floor) {
            offenders.push(`${label} "${found.text}" ${found.fill} on ${found.bg}: ${ratio.toFixed(4)} < ${floor}`)
          }
        }
      }
      expect(offenders, offenders.join("\n")).toEqual([])
    })
  }
})

describe("the accent never carries text on either card family", () => {
  for (const themeId of listThemes().map((theme) => theme.id)) {
    it(`${themeId}: no drawn text resolves to the theme accent`, () => {
      const ctx = ctxFor(themeId)
      const accent = ctx.colors.accent.toUpperCase()
      const offenders: string[] = []
      for (const [label, node] of [
        ["product_cards", productCards.render(products, box, ctx)],
        ["quote_wall", quoteWall.render(quotes, box, ctx)],
      ] as const) {
        const { container } = render(<svg>{node}</svg>)
        for (const found of inkFindings(container)) {
          if (found.fill.toUpperCase() === accent) offenders.push(`${label} "${found.text}"`)
        }
      }
      expect(offenders, offenders.join("\n")).toEqual([])
    })
  }
})
