// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { contrastRatio } from "../../render/ink"
import {
  fitColumnLabel,
  fitVertical,
  horizontalForm,
  horizontalText,
  joinColumnLabels,
  nameAndCount,
  paintVertical,
  scrollInks,
  scrollRamp,
  scrollValue,
  uprightText,
  verticalForm,
  verticalLength,
  wholeLit,
} from "./scroll"
import { fitScrollClaim } from "../scroll-shared"
import { renderNode, testCtx, texts } from "./__fixtures__/kit"

describe("scrollInks", () => {
  it("reads ink's board colours from its tokens", () => {
    const { ctx } = testCtx("ink")
    const inks = scrollInks(ctx)
    expect(inks).toMatchObject({ ground: "#F7F2E7", card: "#FCF9F2", ink: "#262421", muted: "#686056", line: "#DCD2BD", lead: "#1F1C18", cinnabar: "#C3272B", taupe: "#8A8071", gold: "#B5A36F" })
    // The board's #3A3530, #E9E2D3 and #C8BFAE: the ink a step toward the paper, the hairline half over it, the taupe a little over the hairline.
    expect(inks.ink2.toUpperCase()).toBe("#393631")
    expect(inks.wash.toUpperCase()).toBe("#EAE2D2")
    expect(inks.faint.toUpperCase()).toBe("#C9BFAC")
  })

  it("takes another theme's tokens whole, a dark one included", () => {
    for (const theme of ["brief", "rally"]) {
      const { ctx } = testCtx(theme)
      const inks = scrollInks(ctx)
      expect(inks.ground).toBe(ctx.colors.bg)
      expect(inks.cinnabar).toBe(ctx.colors.accent)
      expect(contrastRatio(inks.ink, inks.ground)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("steps a ramp from the ink toward the paper, four tiers on the board's four inks", () => {
    const { ctx } = testCtx("ink")
    const inks = scrollInks(ctx)
    expect(scrollRamp(inks, 4)).toEqual([inks.lead, inks.ink2, inks.taupe, inks.faint])
    expect(scrollRamp(inks, 5, { palest: true })).toEqual([inks.lead, inks.ink2, inks.taupe, inks.faint, inks.wash])
    expect(scrollRamp(inks, 3)).toHaveLength(3)
  })
})

describe("standing upright", () => {
  const spec = { size: 34, tracking: 4, capacity: 14, pitch: 84, maxColumns: 7 }

  it("knows Chinese can stand upright and Latin cannot", () => {
    expect(uprightText("文化讲堂　二〇二六年十月")).toBe(true)
    expect(uprightText("《非物质文化遗产法》第二条")).toBe(true)
    expect(uprightText("October 2026")).toBe(false)
    expect(uprightText("2011 年")).toBe(false)
  })

  it("breaks a passage into columns of a fixed length, a line the author wrote a column of its own", () => {
    const columns = fitVertical("本法所称非物质文化遗产，\n是指各族人民世代相传并视为", spec)!
    expect(columns.map((c) => c.map((g) => g.ch).join(""))).toEqual(["本法所称非物质文化遗产，", "是指各族人民世代相传并视为"])
    const greedy = fitVertical("本法所称非物质文化遗产是指各族人民世代相传并视为其文化遗产组成部分", spec)!
    expect(greedy.every((c) => c.length <= 14)).toBe(true)
    expect(greedy.flat().map((g) => g.ch).join("")).toBe("本法所称非物质文化遗产是指各族人民世代相传并视为其文化遗产组成部分")
  })

  it("never starts a column on a comma or ends one on an opening bracket", () => {
    // Thirteen characters, then a comma where the fourteenth cell ends the column: the character before moves down with it.
    const columns = fitVertical("一二三四五六七八九十一二三四，五六", spec)!
    for (const column of columns) {
      expect("，。、；：！？）」』》".includes(column[0]!.ch)).toBe(false)
      expect("（「『《".includes(column[column.length - 1]!.ch)).toBe(false)
    }
    const open = fitVertical("一二三四五六七八九十一二三「四五」", spec)!
    expect(open[0]![open[0]!.length - 1]!.ch).not.toBe("「")
  })

  it("refuses more columns than it has, and Latin", () => {
    expect(fitVertical("一".repeat(14 * 7 + 1), spec)).toBeNull()
    expect(fitVertical("Intangible heritage", spec)).toBeNull()
  })

  it("keeps a marked run lit", () => {
    const [column] = fitVertical("记下**家里**的年俗", spec)!
    expect(column!.filter((g) => g.lit).map((g) => g.ch).join("")).toBe("家里")
  })

  it("sets punctuation the way vertical type does, and reads it back as written", () => {
    expect(verticalForm("，")).toMatchObject({ ch: "，", turn: false })
    expect(verticalForm("，").dx).toBeGreaterThan(0)
    expect(verticalForm("，").dy).toBeLessThan(0)
    expect(verticalForm("《").ch).toBe("︽")
    expect(verticalForm("」").ch).toBe("﹂")
    expect(verticalForm("—").ch).toBe("︱")
    expect(verticalForm("…").turn).toBe(true)
    expect(verticalForm("文")).toMatchObject({ ch: "文", dx: 0, dy: 0, turn: false })
    for (const ch of Array.from("《》「」『』（）")) expect(horizontalForm(verticalForm(ch).ch)).toBe(ch)
    // A form two marks share reads back as the first one listed.
    expect(horizontalForm("﹃")).toBe("『")
    expect(horizontalForm("﹁")).toBe("「")
    expect(horizontalForm("文")).toBe("文")
    expect(horizontalText("﹁非遗﹂︱︽法︾")).toBe("「非遗」—《法》")
  })

  it("paints a column a character a cell, read from the right", () => {
    const { ctx } = testCtx("ink")
    const columns = fitVertical("文化\n讲堂", spec)!
    const { root } = renderNode(paintVertical(columns, { ctx, x: 852, top: 84, spec, fill: "#000000" }))
    const glyphs = texts(root)
    expect(glyphs.map((t) => t.textContent)).toEqual(["文", "化", "讲", "堂"])
    expect(Number(glyphs[2]!.getAttribute("x"))).toBe(852 - 84)
    expect(Number(glyphs[1]!.getAttribute("y")) - Number(glyphs[0]!.getAttribute("y"))).toBe(38)
    expect(verticalLength(14, spec)).toBe(13 * 38 + 34)
  })
})

describe("a label down a column", () => {
  const spec = { size: 13, tracking: 6, length: 600, lineHeight: 30, maxColumns: 1, latinTracking: 1 }

  it("stands upright in Chinese and turns a quarter in Latin", () => {
    const { ctx } = testCtx("ink")
    expect(fitColumnLabel("文化讲堂　二〇二六年十月", spec, ctx)!.kind).toBe("upright")
    expect(fitColumnLabel("Culture Lecture Hall · October 2026", spec, ctx)!.kind).toBe("turned")
    expect(fitColumnLabel("一".repeat(40), spec, ctx)).toBeNull()
  })

  it("joins the hall and the date the way each language does", () => {
    expect(joinColumnLabels(["文化讲堂", "二〇二六年十月"])).toBe("文化讲堂　二〇二六年十月")
    expect(joinColumnLabels(["Culture Lecture Hall", "October 2026"])).toBe("Culture Lecture Hall · October 2026")
    expect(joinColumnLabels(["文化讲堂", null])).toBe("文化讲堂")
  })
})

describe("the author's figures and words", () => {
  it("groups a value the deck's way", () => {
    const { ctx } = testCtx("ink")
    expect(scrollValue(1082, { ...ctx, figures: { chinese: true, groupFour: false } })).toBe("1082")
    expect(scrollValue(1082, { ...ctx, figures: { chinese: false, groupFour: true } })).toBe("1,082")
    expect(scrollValue(7.9, ctx)).toBe("7.9")
  })

  it("joins a name and its count without running two figures together", () => {
    expect(nameAndCount("40 岁以下", "7 人")).toBe("40 岁以下 7 人")
    expect(nameAndCount("Under 40", "7")).toBe("Under 40: 7")
  })

  it("knows a wholly marked name", () => {
    expect(wholeLit("**冒牌「非遗」**")).toBe(true)
    expect(wholeLit("冒牌**「非遗」**")).toBe(false)
  })
})

describe("the claim", () => {
  it("stays on one line across the measure when it fits and breaks at a comma when it does not", () => {
    const { ctx } = testCtx("ink")
    expect(fitScrollClaim("名录已经很长，非遗能不能活下去，要看还有没有人在做", ctx).lines).toHaveLength(1)
    const two = fitScrollClaim("国家级传承人六批相加 4010 人，「总数」却有好几种口径，不能连成一条线", ctx)
    // The first line as full as it can be, ending on the last comma that lets both lines fit.
    expect(two.lines).toEqual(["国家级传承人六批相加 4010 人，「总数」却有好几种口径，", "不能连成一条线"])
    expect(two.fontSize).toBe(34)
  })

  it("keeps the author's own break", () => {
    const { ctx } = testCtx("ink")
    expect(fitScrollClaim("春节入遗后，\n按天算出游多了 5.7%", ctx, 590, 40).lines).toEqual(["春节入遗后，", "按天算出游多了 5.7%"])
  })
})
