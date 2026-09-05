// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { assertSubset } from "../render/subset-validate"
import { valueChain } from "./value-chain"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { FORM_BODY_FLOOR } from "./legibility"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const chain = {
  type: "value_chain" as const,
  primary: [
    { label: "线索获取", value: "6", unit: "%" },
    { label: "方案验证", value: "6", unit: "%" },
    { label: "开通实施", value: "8", unit: "%" },
    { label: "客户成功", value: "26", unit: "%" },
    { label: "续约扩容", value: "54", unit: "%", emphasis: true as const },
  ],
  support: [
    { label: "企业管理与合规", note: "合同审核 · 客户数据合规" },
    { label: "人力与顾问梯队", note: "实施顾问认证 · 行业方案库" },
    { label: "技术平台与数据", note: "多租户平台 · 自助报表" },
  ],
  margin: { label: "利润空间", value: "38%" },
}

const BOX = { x: 88, y: 200, w: 1104, h: 412 }

describe("value_chain component", () => {
  it("draws one chevron per link, one band per supporting function and one closing wedge", () => {
    const { container } = svg(valueChain.render(chain, BOX, themed("brief")))
    expect(container.querySelectorAll("polygon")).toHaveLength(6)
    expect(container.querySelectorAll("rect")).toHaveLength(3)
    assertSubset(container.querySelector("svg")!)
  })

  it("notches every link but the first, so the chain interlocks", () => {
    const { container } = svg(valueChain.render(chain, BOX, themed("brief")))
    const chevrons = Array.from(container.querySelectorAll("polygon")).slice(0, 5)
    expect(chevrons[0]!.getAttribute("points")!.split(" ")).toHaveLength(5)
    for (const c of chevrons.slice(1)) expect(c.getAttribute("points")!.split(" ")).toHaveLength(6)
  })

  it("prints every label, figure, unit, ordinal, supporting note and the wedge", () => {
    const { container } = svg(valueChain.render(chain, BOX, themed("brief")))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    const joined = texts.join("|")
    for (const link of chain.primary) expect(joined).toContain(link.label)
    for (const band of chain.support) {
      expect(joined).toContain(band.label)
      expect(joined).toContain(band.note.slice(0, 6))
    }
    expect(texts).toEqual(expect.arrayContaining(["01", "02", "03", "04", "05"]))
    expect(joined).toContain("利润空间")
    expect(joined).toContain("38%")
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("fills the marked link and the wedge, and outlines every other link", () => {
    const ctx = themed("brief")
    const { container } = svg(valueChain.render(chain, BOX, ctx))
    const filled = Array.from(container.querySelectorAll("polygon")).filter(
      (p) => p.getAttribute("fill") === ctx.colors.primary,
    )
    expect(filled).toHaveLength(2)
  })

  it("leaves the whole chain outlined when the author marks no link", () => {
    const ctx = themed("brief")
    const plain = {
      ...chain,
      primary: chain.primary.map(({ emphasis: _e, ...rest }) => rest),
      margin: undefined,
    }
    const { container } = svg(valueChain.render(plain, BOX, ctx))
    expect(
      Array.from(container.querySelectorAll("polygon")).filter((p) => p.getAttribute("fill") === ctx.colors.primary),
    ).toHaveLength(0)
  })

  it("gives the chain the whole width when no wedge closes it", () => {
    const { container } = svg(valueChain.render({ ...chain, margin: undefined }, BOX, themed("brief")))
    const bands = Array.from(container.querySelectorAll("rect"))
    expect(Number(bands[0]!.getAttribute("width"))).toBe(BOX.w)
  })

  it("never prints below the readable floor", () => {
    const { container } = svg(valueChain.render(chain, BOX, themed("brief")))
    for (const t of Array.from(container.querySelectorAll("text"))) {
      expect(Number(t.getAttribute("font-size")), `${t.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("declares a decline when a link would be narrower than its own label", () => {
    const { container } = svg(valueChain.render(chain, { ...BOX, w: 520 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(Number(marker!.getAttribute("data-dropped"))).toBe(9)
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("prints the unit whenever a link has one, because the schema refuses a unit without a figure", () => {
    const { container } = svg(valueChain.render(chain, BOX, themed("brief")))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts.filter((t) => t === "%")).toHaveLength(chain.primary.length)
  })

  it("declines rather than cut a link label or a supporting note", () => {
    const long = {
      ...chain,
      support: chain.support.map((b, i) =>
        i === 0
          ? { ...b, note: "合同与信息安全审核 · 客户数据合规 · 分级授权制度 · 供应商准入 · 年度渗透测试与整改闭环 · 数据出境评估" }
          : b,
      ),
    }
    const { container } = svg(valueChain.render(long, BOX, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("prints no data-truncated anywhere, because a cut line is a decline instead", () => {
    const { container } = svg(valueChain.render(chain, BOX, themed("brief")))
    expect(container.querySelector("[data-truncated]")).toBeNull()
  })

  it("keeps each link's figure and unit inside its own chevron", () => {
    const { container } = svg(valueChain.render(chain, BOX, themed("brief")))
    const step = (BOX.w - 200 - 8 - 26) / chain.primary.length
    const units = Array.from(container.querySelectorAll("text")).filter((t) => t.textContent === "%")
    expect(units).toHaveLength(chain.primary.length)
    units.forEach((t, i) => {
      expect(Number(t.getAttribute("x"))).toBeLessThan(i * step + step + 26)
    })
  })

  it("draws the same geometry on a second render", () => {
    const first = svg(valueChain.render(chain, BOX, themed("brief"))).container.innerHTML
    expect(svg(valueChain.render(chain, BOX, themed("brief"))).container.innerHTML).toBe(first)
  })
})
