// @vitest-environment jsdom
import { createElement } from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { iconCards } from "./icon-cards"
import { numberedCards } from "./numbered-cards"
import { kpi } from "./kpi"
import { cycle } from "./cycle"
import { resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import type { ComponentCtx } from "./types"
import { measureTextUnits } from "../lib/svg-text-layout"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import {
  boardTypeScale,
  capFormBody,
  fillCardType,
  formLegibleInk,
  formIconColumnCols,
  layoutAtSize,
  layoutFormBody,
  BOARD_CARD_W,
  FORM_BODY_FLOOR,
  FORM_BODY_TITLE_CAP,
  FORM_TITLE_FLOOR,
} from "./legibility"

describe("form text contrast", () => {
  it("replaces unreadable white on consulting yellow with a passing ink", () => {
    const fill = "#F5C518"
    const fontSize = 20
    const ink = formLegibleInk("#FFFFFF", fill, fontSize)
    expect(ink).not.toBe("#FFFFFF")
    expect(contrastRatio(ink, fill)).toBeGreaterThanOrEqual(requiredContrastRatio(fontSize))
  })
})

function themeCtx(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(createElement("svg", null, node))
}

function card(title: string, text: string, icon = "rocket") {
  return { icon, title, text }
}

/** Gallery-length CJK copy that currently squeezes 4-across badge cards to 6–7px. */
const GALLERY_FOUR = {
  type: "icon_cards" as const,
  items: [
    card("自建算力替换", "自建算力替换公有云推理，单台设备的月度成本下降三成一。"),
    card("行业场景复制", "华东区域的渗透率是华南的一半，销售覆盖密度是主要原因。"),
    card("现场服务自动化", "现场服务工程师的人均负荷已经接近上限，扩张速度受制于招聘。"),
    card("渠道伙伴培育", "两家竞品在中小客户市场以低于成本的价格投标，短期内难以正面应对。"),
  ],
}

const GALLERY_THREE = {
  type: "icon_cards" as const,
  items: GALLERY_FOUR.items.slice(0, 3),
}

function fontSizeOf(el: Element): number {
  return Number(el.getAttribute("font-size") ?? 0)
}

function stripped(s: string): string {
  return s.replace(/[….]/g, "")
}

function looksLikeTitle(rendered: string, title: string): boolean {
  const t = stripped(rendered)
  if (!t) return false
  return title === rendered || title.startsWith(t)
}

function looksLikeBody(rendered: string, body: string, title: string): boolean {
  if (looksLikeTitle(rendered, title)) return false
  const t = stripped(rendered)
  if (!t) return false
  return body.includes(t) || t.includes(body.slice(0, 6))
}

function titleNodes(container: ParentNode, title: string): Element[] {
  return Array.from(container.querySelectorAll("text")).filter((el) =>
    looksLikeTitle(el.textContent ?? "", title),
  )
}

function bodyNodes(container: ParentNode, body: string, title: string): Element[] {
  return Array.from(container.querySelectorAll("text")).filter((el) =>
    looksLikeBody(el.textContent ?? "", body, title),
  )
}

function assertBodyCompleteOrMarked(
  container: ParentNode,
  item: { title: string; text: string },
) {
  const hits = bodyNodes(container, item.text, item.title)
  const itemGroup = titleNodes(container, item.title)[0]?.parentElement
  if (hits.length === 0) {
    expect(
      itemGroup?.getAttribute("data-truncated"),
      `omitted body must mark its item group: "${item.text}"`,
    ).toBe("1")
    return
  }
  const rendered = hits.map((node) => node.textContent ?? "").join("")
  const marked = hits.some((node) => node.getAttribute("data-truncated") === "1")
  expect(
    rendered === item.text || marked,
    `body must render fully or carry data-truncated: "${rendered}"`,
  ).toBe(true)
}

function textsMatching(container: ParentNode, snippets: string[]): Element[] {
  return Array.from(container.querySelectorAll("text")).filter((t) => {
    const s = t.textContent ?? ""
    return snippets.some((snip) => s.includes(snip) || snip.includes(stripped(s)))
  })
}

describe("formIconColumnCols", () => {
  it("keeps 4-across on a 640-wide box when floors still fit", () => {
    expect(formIconColumnCols(4, 640)).toBe(4)
  })

  it("falls back to 2×2 when a 4-across column cannot hold the title floor", () => {
    expect(formIconColumnCols(4, 200)).toBe(2)
  })
})



describe("assigned icon-card form clipping markers", () => {
  const overflowTails = ["甲", "乙", "丙", "丁"]
  const component = {
    type: "icon_cards" as const,
    items: GALLERY_FOUR.items.map((item, index) => ({
      ...item,
      text: `${item.text}${overflowTails[index]!.repeat(48)}`,
    })),
  }
  const cases = [
    { theme: "terra", box: { x: 0, y: 0, w: 1088, h: 320 } },
    { theme: "academic", box: { x: 0, y: 0, w: 640, h: 320 } },
    { theme: "tech", box: { x: 0, y: 0, w: 640, h: 320 } },
  ]

  for (const { theme, box } of cases) {
    it(`${theme} renders every body completely or marks its clipped final line`, () => {
      const { container } = svg(iconCards.render(component, box, themeCtx(theme)))
      for (const item of component.items) assertBodyCompleteOrMarked(container, item)
    })
  }
})

describe("numbered_pills legibility", () => {
  it("pulse 4 items keep title ≥20 and body ≥15 (or omit body, never 13)", () => {
    const ctx = themeCtx("pulse")
    const component = {
      type: "numbered_cards" as const,
      items: GALLERY_FOUR.items.map(({ title, text }) => ({ title, text })),
    }
    const box = { x: 0, y: 0, w: 1088 }
    const { container } = svg(numberedCards.render(component, box, ctx))
    for (const item of component.items) {
      const titleHits = titleNodes(container, item.title)
      expect(titleHits.length).toBeGreaterThan(0)
      for (const t of titleHits) {
        expect(fontSizeOf(t), `title "${t.textContent}"`).toBeGreaterThanOrEqual(FORM_TITLE_FLOOR)
      }
      const bodyHits = bodyNodes(container, item.text, item.title)
      for (const t of bodyHits) {
        expect(fontSizeOf(t), `body "${t.textContent}"`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
      }
    }
  })
})



describe("donut_trio legibility", () => {
  it("luxe paints 10.2万台 without ellipsizing the unit, at ≥15", () => {
    const ctx = themeCtx("luxe")
    const component = {
      type: "kpi_cards" as const,
      items: [
        { value: "10.2", unit: "万台", label: "接入设备总量" },
        { value: "91", unit: "%", label: "客户续约率" },
        { value: "88", unit: "%", label: "故障预测准确率" },
        { value: "5", unit: "周", label: "平均交付周期" },
      ],
    }
    const box = { x: 0, y: 0, w: 640, h: 392 }
    const { container } = svg(kpi.render(component, box, ctx))
    const blob = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .join("")
    expect(blob).toContain("万")
    expect(blob).toContain("台")
    const valueHits = Array.from(container.querySelectorAll("text")).filter((t) => {
      const s = t.textContent ?? ""
      return /10\.2|万|台/.test(s) && !s.includes("接入")
    })
    expect(valueHits.length).toBeGreaterThan(0)
    for (const t of valueHits) {
      expect(fontSizeOf(t), `value "${t.textContent}"`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
    const labelHits = textsMatching(container, ["接入设备总量"])
    for (const t of labelHits) {
      expect(fontSizeOf(t), `label "${t.textContent}"`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })
})

describe("cycle node legibility", () => {
  // In-circle node labels sit against FORM_BODY_FLOOR, not FORM_TITLE_FLOOR:
  // a label inside a ring node has a chord's worth of width, and the ring
  // scale already shrank the whole drawing to fit its slot.
  it("tech 4-char CJK node labels wrap at ≥16 instead of 现场…", () => {
    const ctx = themeCtx("tech")
    const component = {
      type: "cycle" as const,
      title: "能力面",
      items: [
        { label: "需求确认", description: "阶段说明一" },
        { label: "现场勘测", description: "阶段说明二" },
        { label: "设备接入", description: "阶段说明三" },
        { label: "模型调优", description: "阶段说明四" },
        { label: "试运行", description: "阶段说明五" },
      ],
    }
    const box = { x: 0, y: 0, w: 640, h: 392 }
    const { container } = svg(cycle.render(component, box, ctx))
    const blob = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .join("")
    expect(blob).toContain("现")
    expect(blob).toContain("场")
    expect(blob).toContain("勘")
    expect(blob).toContain("测")
    expect(blob).not.toMatch(/现场…/)
    const hits = Array.from(container.querySelectorAll("text")).filter((t) =>
      /现|场|勘|测/.test(t.textContent ?? ""),
    )
    expect(hits.length).toBeGreaterThan(0)
    for (const t of hits) {
      expect(fontSizeOf(t), `"${t.textContent}"`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })
})

describe("form body title cap", () => {
  it("exports a 0.6 body-to-title ceiling", () => {
    expect(FORM_BODY_TITLE_CAP).toBeCloseTo(0.6)
  })

  it("boardTypeScale caps body at 0.6 of title on a wide card", () => {
    const wide = boardTypeScale(600)
    expect(wide.title).toBeGreaterThan(FORM_TITLE_FLOOR)
    expect(wide.body).toBeLessThanOrEqual(wide.title * FORM_BODY_TITLE_CAP + 1e-6)
    expect(wide.body).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
  })

  it("boardTypeScale at board width keeps the body floor when 0.6×title is below it", () => {
    const board = boardTypeScale(BOARD_CARD_W)
    expect(board.title).toBeCloseTo(23)
    expect(board.body).toBe(FORM_BODY_FLOOR)
    expect(board.body).toBeGreaterThan(board.title * FORM_BODY_TITLE_CAP)
  })

  it("layoutFormBody honors titleSize via the 0.6 cap", () => {
    const laid = layoutFormBody("副文本在卡片里应该明显小于标题", {
      maxWidth: 400,
      fontSize: 40,
      titleSize: 40,
    })
    expect(laid.fontSize).toBeLessThanOrEqual(40 * FORM_BODY_TITLE_CAP + 1e-6)
    expect(laid.fontSize).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
  })

  it("fillCardType upscale keeps body at or under 0.6 of title", () => {
    const filled = fillCardType({
      innerH: 400,
      contentW: 300,
      titleSize: 23,
      bodySize: 16.5,
      gap: 8,
      longestBody: "自建算力替换公有云推理，单台设备的月度成本下降三成一。",
      titles: ["自建算力替换"],
    })
    expect(filled.titleSize).toBeGreaterThan(FORM_TITLE_FLOOR)
    expect(filled.bodySize).toBeLessThanOrEqual(filled.titleSize * FORM_BODY_TITLE_CAP + 1e-6)
    expect(filled.bodySize).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
  })

  it("capFormBody never drops below the body floor", () => {
    expect(capFormBody(20, 18)).toBe(FORM_BODY_FLOOR)
    expect(capFormBody(40, 30)).toBeCloseTo(24)
  })

  it("academic outline_grid on a tall slot keeps body ≤ 0.6 title", () => {
    const ctx = themeCtx("academic")
    const box = { x: 0, y: 0, w: 1088, h: 520 }
    const { container } = svg(iconCards.render(GALLERY_THREE, box, ctx))
    const item = GALLERY_THREE.items[0]!
    const titles = titleNodes(container, item.title)
    const bodies = Array.from(container.querySelectorAll("text")).filter((el) => {
      const s = el.textContent ?? ""
      return s.includes("公有云") || s.includes("月度成本")
    })
    expect(titles.length).toBeGreaterThan(0)
    expect(bodies.length).toBeGreaterThan(0)
    const titleFs = Math.max(...titles.map(fontSizeOf))
    const cap = Math.max(FORM_BODY_FLOOR, titleFs * FORM_BODY_TITLE_CAP)
    expect(titleFs).toBeGreaterThan(FORM_TITLE_FLOOR)
    for (const t of bodies) {
      expect(fontSizeOf(t), `body "${t.textContent}" vs title ${titleFs}`).toBeLessThanOrEqual(cap + 0.05)
      expect(fontSizeOf(t)).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })
})

describe("layoutAtSize", () => {
  it("keeps the first maxLines and drops the rest instead of joining leftover onto the last line", () => {
    const source = "一二三四五六七八九十".repeat(6)
    const r = layoutAtSize(source, { maxWidth: 80, fontSize: 16, maxLines: 2 })
    expect(r.fontSize).toBe(16)
    expect(r.lines.length).toBeLessThanOrEqual(2)
    expect(r.truncated).toBe(true)
    expect(r.lines.join("")).not.toContain("…")
    const joined = r.lines.join("")
    expect(source.startsWith(joined)).toBe(true)
    expect(joined.length).toBeLessThan(source.length)
    for (const line of r.lines) {
      expect(measureTextUnits(line) * r.fontSize).toBeLessThanOrEqual(80 + 1e-6)
    }
  })

  it("stamps truncated when a kept line is clipped, and paints no overflow mark", () => {
    const source = "一二三四五六七八九十一二三四五六七八九十"
    const r = layoutAtSize(source, { maxWidth: 48, fontSize: 16, maxLines: 1 })
    expect(r.truncated).toBe(true)
    expect(r.lines).toHaveLength(1)
    expect(r.lines[0]).not.toContain("…")
    expect(source.startsWith(r.lines[0]!)).toBe(true)
  })
})
