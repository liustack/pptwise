// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { assertSubset } from "../render/subset-validate"
import { issueTree } from "./issue-tree"
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

const tree = {
  type: "issue_tree" as const,
  question: "中小客群续约率为何停在七成八",
  branches: [
    { label: "开通体验没接住", note: "解释缺口的六成一", emphasis: true as const, children: [{ label: "开通周期仍是九周" }, { label: "上线后四周无人跟进" }] },
    { label: "使用深度不够", note: "解释缺口的两成七", children: [{ label: "席位激活只到六成" }] },
    { label: "商务条款不利", note: "解释缺口的一成二", children: [{ label: "年付客户不足三成" }] },
  ],
}

const BOX = { x: 88, y: 200, w: 1104, h: 412 }

describe("issue_tree component", () => {
  it("draws the question, every hypothesis and every sub-point, and stays in the subset", () => {
    const { container } = svg(issueTree.render(tree, BOX, themed("brief")))
    expect(container.querySelectorAll("rect").length).toBe(1 + 3 + 4)
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent).join("|")
    for (const s of ["开通体验没接住", "使用深度不够", "商务条款不利", "开通周期仍是九周", "年付客户不足三成", "解释缺口的六成一"]) {
      expect(text).toContain(s)
    }
    expect(text).toContain("中小客群续约率")
    expect(container.querySelector("[data-dropped]")).toBeNull()
    assertSubset(container.querySelector("svg")!)
  })

  it("fills the question and the one marked hypothesis, and nothing else", () => {
    const ctx = themed("brief")
    const { container } = svg(issueTree.render(tree, BOX, ctx))
    const filled = Array.from(container.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("fill") === ctx.colors.primary,
    )
    expect(filled).toHaveLength(2)
  })

  it("leaves every hypothesis outlined when the author marks none", () => {
    const ctx = themed("brief")
    const plain = { ...tree, branches: tree.branches.map(({ emphasis: _e, ...rest }) => rest) }
    const { container } = svg(issueTree.render(plain, BOX, ctx))
    expect(
      Array.from(container.querySelectorAll("rect")).filter((r) => r.getAttribute("fill") === ctx.colors.primary),
    ).toHaveLength(1)
  })

  it("centres each hypothesis on the run of sub-points it feeds", () => {
    const { container } = svg(issueTree.render(tree, BOX, themed("brief")))
    const rects = Array.from(container.querySelectorAll("rect"))
    const mid = (r: Element) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")) / 2
    const col = (x: number) => rects.filter((r) => Number(r.getAttribute("x")) === x).map(mid).sort((a, b) => a - b)
    const xs = [...new Set(rects.map((r) => Number(r.getAttribute("x"))))].sort((a, b) => a - b)
    const branches = col(xs[1]!)
    const leaves = col(xs[2]!)
    expect(branches[0]).toBeCloseTo((leaves[0]! + leaves[1]!) / 2, 5)
    expect(branches[1]).toBeCloseTo(leaves[2]!, 5)
  })

  it("measures tall enough that the thinnest branch still has a band to sit in", () => {
    const h = issueTree.measure(tree, 1104, themed("brief"))
    const { container } = svg(issueTree.render(tree, { x: 0, y: 0, w: 1104, h }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("never prints below the readable floor", () => {
    const { container } = svg(issueTree.render(tree, BOX, themed("brief")))
    for (const t of Array.from(container.querySelectorAll("text"))) {
      expect(Number(t.getAttribute("font-size")), `${t.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("declares a decline in a column too narrow for three readable columns", () => {
    const { container } = svg(issueTree.render(tree, { ...BOX, w: 400 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(Number(marker!.getAttribute("data-dropped"))).toBe(8)
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declines when the end-point boxes would be shorter than the line inside them", () => {
    // Two branches of four end points each: the pitch a 250px box gives is
    // shorter than a 17px line needs, which the width checks never see.
    const eight = {
      type: "issue_tree" as const,
      question: "为什么",
      branches: [
        { label: "假设甲", children: [{ label: "甲一" }, { label: "甲二" }, { label: "甲三" }, { label: "甲四" }] },
        { label: "假设乙", children: [{ label: "乙一" }, { label: "乙二" }, { label: "乙三" }, { label: "乙四" }] },
      ],
    }
    const { container } = svg(issueTree.render(eight, { ...BOX, h: 250 }, themed("terminal")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("keeps every end-point line inside its own box at the height it measured for", () => {
    const eight = {
      type: "issue_tree" as const,
      question: "为什么",
      branches: [
        { label: "假设甲", children: [{ label: "甲一" }, { label: "甲二" }, { label: "甲三" }, { label: "甲四" }] },
        { label: "假设乙", children: [{ label: "乙一" }, { label: "乙二" }, { label: "乙三" }, { label: "乙四" }] },
      ],
    }
    const h = issueTree.measure(eight, BOX.w, themed("brief"))
    const { container } = svg(issueTree.render(eight, { ...BOX, h }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).toBeNull()
    const rects = Array.from(container.querySelectorAll("rect"))
    const leafBoxes = rects.filter((r) => Number(r.getAttribute("height")) <= 56)
    expect(leafBoxes.length).toBe(8)
    for (const r of leafBoxes) expect(Number(r.getAttribute("height"))).toBeGreaterThanOrEqual(40)
  })

  it("declines rather than cut a hypothesis or an end point down to a fragment", () => {
    const long = {
      ...tree,
      branches: tree.branches.map((b, i) =>
        i === 0 ? { ...b, label: "开通体验没接住而且续约经营组与客户体验组的口径长期各算各的" } : b,
      ),
    }
    const { container } = svg(issueTree.render(long, BOX, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("prints no data-truncated anywhere, because a cut line is a decline instead", () => {
    const { container } = svg(issueTree.render(tree, BOX, themed("brief")))
    expect(container.querySelector("[data-truncated]")).toBeNull()
  })

  it("draws the same geometry on a second render", () => {
    const first = svg(issueTree.render(tree, BOX, themed("brief"))).container.innerHTML
    expect(svg(issueTree.render(tree, BOX, themed("brief"))).container.innerHTML).toBe(first)
  })
})
