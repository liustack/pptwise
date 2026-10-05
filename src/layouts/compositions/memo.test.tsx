import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { recordsComposition } from "./records"
import { rowsComposition } from "./rows"
import { exhibitAngle, exhibitCaption, exhibitCaptionLayout, paintExhibit } from "./exhibit"
import { fitStamp, paintStamp, STAMP } from "./stamp"
import { paintMargin } from "./margin"
import { memoInks, memoNumeral, memoQuietInks } from "./memo"
import { attrs, byText, renderComposition, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"
import type { ComponentCtx } from "../../components/types"

/** memo's body band: x240 to x1216, y186 down to y640. */
const MEMO_BAND = { x: 240, y: 186, w: 976, h: 454 }
/** The band's left column beside an exhibit. */
const MEMO_NARROW = { x: 240, y: 186, w: 560, h: 454 }
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false } })

const CLAUSES = {
  type: "numbered_cards",
  items: [
    { title: "工时与薪酬", text: "全体全职员工每周 32 小时，工资、奖金基数、年假和福利都不变" },
    { title: "时间", text: "11 月至 12 月准备，2027 年 1 月 4 日至 6 月 30 日试行" },
    { title: "模式", text: "各部门在三种模式里选一种，客服和连续在岗的岗位必须错峰" },
    { title: "去留", text: "7 月按事先定好的指标公布去留，触发停止条件的部门随时恢复五天", emphasis: true },
  ],
}

describe("the memo setting's inks and numerals", () => {
  it("numbers clauses in the deck's numerals, with or without the enumeration comma", () => {
    expect(memoNumeral(0, true)).toBe("一、")
    expect(memoNumeral(3, true, true)).toBe("四")
    expect(memoNumeral(1, false)).toBe("2.")
  })

  it("orders the quiet inks from the palette's quiet end, the lead last, the mark never", () => {
    const { ctx } = testCtx("memo")
    const quiet = memoQuietInks(ctx)
    expect(quiet[quiet.length - 1]).toBe(ctx.colors.chartPalette[0])
    expect(quiet).not.toContain(memoInks(ctx).mark)
  })
})

describe("rows in the memo setting", () => {
  it("sets the decision's clauses across the body: a large numeral, the title, the text, the marked clause on the mark's tint", () => {
    const { root, ctx } = renderComposition(rowsComposition, [CLAUSES], { theme: "memo", rect: MEMO_BAND, setting: "memo", ctx: chinese })
    expect(root!.querySelector("[data-memo-rows='wide']")).not.toBeNull()
    expect(attrs(byText(root!, "一、")!, ["x", "font-size", "font-weight"])).toEqual(["260", "36", "700"])
    expect(attrs(byText(root!, "工时与薪酬")!, ["x", "font-size"])).toEqual(["360", "22"])
    expect(byText(root!, "全体全职员工每周 32 小时，工资、奖金基数、年假和福利都不变")!.getAttribute("x")).toBe("600")
    const tint = root!.querySelector("[data-memo-row='marked'] rect")!
    expect(attrs(tint, ["x", "y", "width", "height", "fill"])).toEqual(["240", "514", "976", "100", memoInks(ctx).tint])
    expect(byText(root!, "去留")!.getAttribute("fill")).toBe(memoInks(ctx).mark)
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets them under one another in a narrow band, the numeral bare and the text muted under the title", () => {
    const { root } = renderComposition(rowsComposition, [CLAUSES], { theme: "memo", rect: MEMO_NARROW, setting: "memo", ctx: chinese })
    expect(root!.querySelector("[data-memo-rows='narrow']")).not.toBeNull()
    expect(byText(root!, "四")).toBeDefined()
    expect(byText(root!, "工时与薪酬")!.getAttribute("x")).toBe("312")
  })

  it("draws on a theme that shares nothing with memo, and declines rows taller than the band", () => {
    expect(renderComposition(rowsComposition, [CLAUSES], { theme: "terminal", rect: MEMO_BAND, setting: "memo" }).element).not.toBeNull()
    const five = { ...CLAUSES, items: [...CLAUSES.items, { title: "第五条", text: "多一条" }] }
    expect(renderComposition(rowsComposition, [five], { theme: "memo", rect: MEMO_BAND, setting: "memo" }).element).toBeNull()
  })
})

const RETENTION = {
  type: "data_table",
  columns: [
    { key: "pilot", label: "试点" },
    { key: "when", label: "时点" },
    { key: "kept", label: "仍在实行" },
    { key: "n", label: "样本" },
    { key: "type", label: "来源性质" },
  ],
  rows: [
    { cells: { pilot: "英国", when: "试点结束时", kept: "92%", n: "61 家", type: "学者撰写，倡导组织参与" }, tag: { text: "倡导" } },
    { cells: { pilot: "德国", when: "约两年后", kept: "70%", n: "40 家", type: "大学跟踪报告" }, tag: { text: "独立" } },
    { cells: { pilot: "巴西", when: "约一年后", kept: "10%（2 家）", n: "20 家", type: "媒体报道" }, tag: { text: "媒体" }, emphasis: "highlight" },
  ],
}

describe("records in the memo setting", () => {
  it("sets a table of figures: the first figure column large in the heading face, a tag per kind in its own ink, the marked row's in the mark", () => {
    const { root, ctx } = renderComposition(recordsComposition, [RETENTION], { theme: "memo", rect: MEMO_BAND, setting: "memo" })
    expect(root!.querySelector("[data-memo-records='figures']")).not.toBeNull()
    const figure = byText(root!, "92%")!
    expect(attrs(figure, ["font-size", "font-weight", "font-family"])).toEqual(["22", "700", ctx.fonts.heading])
    expect(byText(root!, "61 家")!.getAttribute("font-family")).toBe(ctx.fonts.mono)
    const outlines = Array.from(root!.querySelectorAll("[data-memo-tag] rect")).map((r) => r.getAttribute("stroke"))
    const quiet = memoQuietInks(ctx)
    expect(outlines).toEqual([quiet[0], quiet[1], memoInks(ctx).mark])
    expect(byText(root!, "10%（2 家）")!.getAttribute("fill")).toBe(memoInks(ctx).mark)
  })

  it("sets a table of duties: the party after its icon in the heading face, its duties in two lines", () => {
    const roles = {
      type: "data_table",
      columns: [
        { key: "who", label: "谁" },
        { key: "prep", label: "准备期" },
        { key: "trial", label: "试行期" },
      ],
      rows: [
        { icon: "users", cells: { who: "管理层", prep: "批准各部门方案，确认停止条件", trial: "每月看指标，触发即拍板" } },
        { icon: "user-check", cells: { who: "部门负责人", prep: "选模式、排班，11 月 30 日前交停做清单", trial: "每周看客户和产出指标" }, emphasis: "highlight" },
      ],
    }
    const { root, ctx } = renderComposition(recordsComposition, [roles], { theme: "memo", rect: MEMO_BAND, setting: "memo" })
    expect(root!.querySelector("[data-memo-records='duties']")).not.toBeNull()
    expect(root!.querySelectorAll("[data-console-icon]")).toHaveLength(2)
    expect(byText(root!, "部门负责人")!.getAttribute("fill")).toBe(memoInks(ctx).mark)
    expect(byText(root!, "谁")!.getAttribute("x")).toBe("248")
  })

  it("draws on terminal and declines a table taller than the band", () => {
    expect(renderComposition(recordsComposition, [RETENTION], { theme: "terminal", rect: MEMO_BAND, setting: "memo" }).element).not.toBeNull()
    const long = { ...RETENTION, rows: Array.from({ length: 9 }, () => RETENTION.rows[0]) }
    expect(renderComposition(recordsComposition, [long], { theme: "memo", rect: MEMO_BAND, setting: "memo" }).element).toBeNull()
  })
})

describe("the memo's paper pieces", () => {
  it("types an exhibit's caption with its number in the deck's language", () => {
    expect(exhibitCaption(3, "全员周五（示意）", true)).toBe("附图 3 · 全员周五（示意）")
    expect(exhibitCaption(3, "All off on Friday", false)).toBe("Exhibit 3 · All off on Friday")
    expect(exhibitCaption(1, undefined, true)).toBe("附图 1")
    expect([1, 2, 3, 8].map(exhibitAngle)).toEqual([2, -2, -1.5, 2])
  })

  it("pastes a picture in a white print, turned round its centre, its caption typed under it", () => {
    const { ctx } = testCtx("memo")
    const spec = { box: { x: 800, y: 150, w: 400, h: 330 }, number: 1, caption: "周五早晨的办公室（示意）", src: "data:image/png;base64,AAA" }
    const caption = exhibitCaptionLayout(spec, chinese(ctx))!
    const { root } = renderNode(paintExhibit(spec, caption, chinese(ctx)))
    const print = root.querySelector("[data-exhibit='1']")!
    expect(print.getAttribute("transform")).toBe("rotate(2 1000 315)")
    expect(attrs(root.querySelector("image")!, ["x", "y", "width", "height", "preserveAspectRatio"])).toEqual(["808", "158", "384", "292", "xMidYMid slice"])
    expect(textOf(texts(root)[0]!)).toBe("附图 1 · 周五早晨的办公室（示意）")
    expect(texts(root)[0]!.getAttribute("data-font-floor-exempt")).toBe("memo-spec")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("refuses a caption too long for its print", () => {
    const { ctx } = testCtx("memo")
    expect(exhibitCaptionLayout({ box: { x: 0, y: 0, w: 200, h: 150 }, number: 1, caption: "A caption far too long to be typed under so small a print" }, ctx)).toBeNull()
  })

  it("presses a stamp turned and faint, its words spaced, and grows it for longer words", () => {
    const { ctx } = testCtx("memo")
    const fitted = fitStamp({ text: "已决定", date: "2026 · 10" }, 300, ctx)!
    expect([fitted.w, fitted.h]).toEqual([STAMP.w, STAMP.h])
    const { root } = renderNode(paintStamp(fitted, 830, 520, -8, ctx))
    const stamp = root.querySelector("[data-stamp]")!
    expect(stamp.getAttribute("transform")).toBe("rotate(-8 905 557)")
    expect(stamp.getAttribute("opacity")).toBe(String(STAMP.opacity))
    expect(root.querySelectorAll("tspan[dx='6']")).toHaveLength(2)
    expect(fitStamp({ text: "Approved" }, 300, ctx)!.w).toBeGreaterThan(STAMP.w)
    expect(fitStamp({ text: "Approved for the whole pilot period" }, 300, ctx)).toBeNull()
  })

  it("sets a margin label over its bar, the bar following a second line", () => {
    const { ctx } = testCtx("memo")
    const one = renderNode(paintMargin("决定", 64, 84, 150, ctx)).root
    expect(attrs(one.querySelector("rect")!, ["x", "y", "width", "height"])).toEqual(["64", "118", "24", "2"])
    const two = renderNode(paintMargin("Arithmetic of the week", 64, 84, 150, ctx)).root
    expect(two.querySelector("rect")!.getAttribute("y")).toBe("148")
  })
})
