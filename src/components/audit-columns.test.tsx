// @vitest-environment jsdom
// Which components hold their items' words apart with the crowded-column
// check (`findCrowdedColumns`): those that set items side by side with no
// card ground between them. Icon cards never draw a ground. People, product
// and quote cards and matrix cells draw one, except on a ruled theme, where
// the words stand on the paper under a hairline.
import { beforeAll, describe, expect, it } from "vitest"
import { findCrowdedColumns } from "../audit/deck-audit"
import { installNodePlatform } from "../platform/node"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup } from "../render/serialize"
import { iconCards } from "./icon-cards"
import { matrix } from "./matrix"
import { peopleCards } from "./people-cards"
import { productCards } from "./product-cards"
import { quoteWall } from "./quote-wall"
import { isRuled } from "./surfaces"

beforeAll(async () => {
  await installNodePlatform()
})

const BOX = { x: 64, y: 260, w: 1152, h: 320 }

function markup(node: React.ReactElement): string {
  return renderSvgMarkup(<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">{node}</svg>)
}

const services = {
  type: "icon_cards" as const,
  items: [
    { icon: "target", title: "全程网办", text: "群众满意率九十八点六，有效投诉量同比下降四成。" },
    { icon: "gauge", title: "帮办代办服务", text: "帮办代办队伍一百零六人，覆盖全部十二个街道。" },
    { icon: "shield", title: "午间延时服务", text: "午间延时服务累计接待两万一千人次，主要集中在社保与不动产。" },
    { icon: "rocket", title: "材料清单精简", text: "高频事项申请材料平均精简三成五，重复提交材料基本消除。" },
  ],
}

const cards = {
  people_cards: (ctx: ReturnType<typeof boundThemeCtx>) =>
    peopleCards.render(
      {
        type: "people_cards",
        people: [
          { name: "宋海", role: "客户成功总监", org: "云觅科技" },
          { name: "李蔚", role: "运营负责人", org: "星岚数据" },
          { name: "赵琴", role: "信息化经理", org: "汇通供应链" },
        ],
      },
      BOX,
      ctx,
    ),
  product_cards: (ctx: ReturnType<typeof boundThemeCtx>) =>
    productCards.render(
      {
        type: "product_cards",
        items: [
          { asset_id: "shot-1", name: "客户成功工作台", note: "续约看板与行动清单合在一屏", price: "¥68", price_unit: "席位 / 月" },
          { asset_id: "shot-2", name: "集成中枢", note: "预置四十六个业务系统连接器", price: "¥12万", price_unit: "起 / 年" },
          { asset_id: "shot-3", name: "数据洞察包", note: "按周推送经营简报", price: "¥8万", price_unit: "起 / 年" },
        ],
      },
      { ...BOX, y: 180, h: 460 },
      ctx,
    ),
  quote_wall: (ctx: ReturnType<typeof boundThemeCtx>) =>
    quoteWall.render(
      {
        type: "quote_wall",
        quotes: [
          { text: "开通从九周压到五周，最直接的变化是销售敢在合同里写上线日期了。", name: "宋海", role: "云觅科技 · 客户成功总监" },
          { text: "续约看板把要流失的客户提前六周推到我面前。", name: "李蔚", role: "星岚数据 · 运营负责人" },
          { text: "以前每周三个人手工拼报表，现在系统自己发。", name: "赵琴", role: "汇通供应链 · 信息化经理" },
        ],
      },
      BOX,
      ctx,
    ),
  matrix: (ctx: ReturnType<typeof boundThemeCtx>) =>
    matrix.render(
      {
        type: "matrix",
        cols: 2,
        items: [
          { title: "县乡节点", tag: "低确定性" },
          { title: "社区统建统服", tag: "高确定性" },
          { title: "目的地充电", tag: "低确定性" },
          { title: "物流专用站", tag: "高确定性" },
        ],
      },
      BOX,
      ctx,
    ),
}

describe("components that declare their items as columns", () => {
  it("finds icon cards set the way they shipped, each line their column less 16px", () => {
    // Four columns 288px wide on a vermilion page, a bold 43px title centred
    // in each and set in 272px: the six-character titles stood 29px apart,
    // under a character, and read as one line.
    const titles = ["全程网办", "帮办代办服务", "午间延时服务", "材料清单精简"]
    const columns = titles
      .map((line, i) => `<g data-audit-column=""><text x="${64 + 144 + i * 288}" y="400" text-anchor="middle" font-weight="700" font-family="PingFang SC, sans-serif" font-size="43.2">${line}</text></g>`)
      .join("")
    const issues = findCrowdedColumns(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">${columns}</svg>`)
    expect(issues.map((i) => [i.a, i.b])).toEqual([
      ["帮办代办服务", "午间延时服务"],
      ["午间延时服务", "材料清单精简"],
    ])
    for (const issue of issues) expect(issue.gap).toBeLessThan(issue.size)
  })

  it("holds Chinese to a character and a quarter, and a line with letters to two", () => {
    // Two 20px lines 30px apart: a gutter between Chinese words, and too
    // close once one of them carries a Latin name the estimate can miss.
    const page = (left: string, right: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <g data-audit-column=""><text x="100" y="100" font-size="20">${left}</text></g>
      <g data-audit-column=""><text x="${100 + left.length * 20 + 30}" y="100" font-size="20">${right}</text></g>
    </svg>`
    expect(findCrowdedColumns(page("渗透率是华南", "竞品在中小"))).toEqual([])
    expect(findCrowdedColumns(page("渗透率是华南", "竞品在 SMB"))).toHaveLength(1)
  })

  for (const theme of ["vermilion", "memo", "crayon", "bulletin"]) {
    it(`marks every icon card a column and finds them clear on ${theme}`, () => {
      const page = markup(iconCards.render(services, BOX, boundThemeCtx(theme, {})))
      expect(page.match(/data-audit-column/g)).toHaveLength(services.items.length)
      expect(findCrowdedColumns(page)).toEqual([])
    })
  }

  for (const [name, draw] of Object.entries(cards)) {
    it(`marks ${name} as columns only where the theme draws no ground, and finds them clear`, () => {
      for (const theme of ["memo", "thesis", "bulletin", "vermilion"]) {
        const ctx = boundThemeCtx(theme, {})
        const page = markup(draw(ctx))
        const marked = (page.match(/data-audit-column/g) ?? []).length
        if (isRuled(ctx)) expect(marked, theme).toBeGreaterThan(1)
        else expect(marked, theme).toBe(0)
        expect(findCrowdedColumns(page), theme).toEqual([])
      }
    })
  }
})
