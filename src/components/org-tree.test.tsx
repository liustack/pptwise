// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { assertSubset } from "../render/subset-validate"
import { orgTree } from "./org-tree"
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

const three = {
  type: "org_tree" as const,
  root: { name: "陈稚", role: "客户成功中心负责人" },
  children: [
    { name: "林望", role: "开通交付组组长", children: [{ name: "韩叙", role: "实施顾问" }, { name: "姚可" }] },
    { name: "苏禾", role: "续约经营组组长", children: [{ name: "温岚", role: "续约经理" }] },
  ],
}

const flat = {
  type: "org_tree" as const,
  root: { name: "Ada" },
  children: [{ name: "Bo" }, { name: "Cy" }, { name: "Di" }],
}

const BOX = { x: 88, y: 200, w: 1104 }

describe("org_tree component", () => {
  it("draws one box per node and stays inside the exportable subset", () => {
    const { container } = svg(orgTree.render(three, BOX, themed("brief")))
    expect(container.querySelectorAll("rect").length).toBe(6)
    assertSubset(container.querySelector("svg")!)
  })

  it("prints every name and every role an author wrote", () => {
    const { container } = svg(orgTree.render(three, BOX, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent).join("|")
    for (const name of ["陈稚", "林望", "苏禾", "韩叙", "姚可", "温岚"]) expect(text).toContain(name)
    for (const role of ["客户成功中心负责人", "开通交付组组长", "实施顾问"]) expect(text).toContain(role)
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("fills only the root, so the highlight is a block and never a bar", () => {
    const ctx = themed("brief")
    const { container } = svg(orgTree.render(three, BOX, ctx))
    const filled = Array.from(container.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("fill") === ctx.colors.primary,
    )
    expect(filled).toHaveLength(1)
    expect(filled[0]!.getAttribute("y")).toBe("0")
  })

  it("puts the root over the middle of its branches and each branch over its own children", () => {
    const { container } = svg(orgTree.render(three, BOX, themed("brief")))
    const rects = Array.from(container.querySelectorAll("rect"))
    const centre = (r: Element) => Number(r.getAttribute("x")) + Number(r.getAttribute("width")) / 2
    const byRow = (y: number) => rects.filter((r) => Number(r.getAttribute("y")) === y).map(centre).sort((a, b) => a - b)
    const rows = [...new Set(rects.map((r) => Number(r.getAttribute("y"))))].sort((a, b) => a - b)
    const [rootRow, branchRow, leafRow] = rows as [number, number, number]
    const branches = byRow(branchRow)
    const leaves = byRow(leafRow)
    expect(byRow(rootRow)[0]).toBeCloseTo((branches[0]! + branches[1]!) / 2, 5)
    expect(branches[0]).toBeCloseTo((leaves[0]! + leaves[1]!) / 2, 5)
    expect(branches[1]).toBeCloseTo(leaves[2]!, 5)
  })

  it("drops the bottom row when no branch has children, and measures shorter for it", () => {
    const { container } = svg(orgTree.render(flat, BOX, themed("brief")))
    expect(container.querySelectorAll("rect").length).toBe(4)
    expect(orgTree.measure(flat, BOX.w, themed("brief"))).toBeLessThan(
      orgTree.measure(three, BOX.w, themed("brief")),
    )
  })

  it("never prints below the readable floor", () => {
    const { container } = svg(orgTree.render(three, BOX, themed("brief")))
    for (const t of Array.from(container.querySelectorAll("text"))) {
      expect(Number(t.getAttribute("font-size")), `${t.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("declares a decline rather than draw boxes narrower than the names in them", () => {
    const { container } = svg(orgTree.render(three, { ...BOX, w: 300 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(Number(marker!.getAttribute("data-dropped"))).toBe(6)
    expect(marker!.getAttribute("data-dropped-kind")).toBe("item")
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declares a decline when the rows cannot be held apart", () => {
    const { container } = svg(orgTree.render(three, { ...BOX, h: 120 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })

  it("declines rather than cut a name or a role down to a fragment", () => {
    const long = {
      ...three,
      children: [
        { ...three.children[0], role: "开通交付组组长兼数据接入与实施顾问梯队负责人，同时对接三个区域" },
        three.children[1],
      ],
    }
    const { container } = svg(orgTree.render(long, BOX, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelector("[data-dropped]")!.getAttribute("data-dropped-kind")).toBe("item")
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("prints no data-truncated anywhere, because a cut line is a decline instead", () => {
    const { container } = svg(orgTree.render(three, BOX, themed("brief")))
    expect(container.querySelector("[data-truncated]")).toBeNull()
  })

  it("draws the same geometry on a second render", () => {
    const first = svg(orgTree.render(three, BOX, themed("brief"))).container.innerHTML
    const second = svg(orgTree.render(three, BOX, themed("brief"))).container.innerHTML
    expect(second).toBe(first)
  })
})
