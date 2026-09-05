// @vitest-environment node
//
// The export half of the box contract for the three card families.
//
// `logo_wall`, `product_cards` and `quote_wall` all decline a box below their
// own measured minimum: they paint nothing and declare the loss, because none
// of them has anything to compress. A wall of equal tiles cannot squash one
// row without saying some names matter less; a card cannot narrow its picture
// past its aspect ratio; a remark cannot lose a line and stay a remark.
//
// `product_cards` declares a second loss the same way: a required picture the
// deck's asset map does not resolve. That one was written as
// `data-dropped="asset"` for a while, which `slideToRender` read through
// `Number(attribute) || 0` and counted as zero — a countable-looking marker
// nobody counted, and a deck with a hole where a product photograph belongs
// shipping in silence.
//
// So these tests do not assert an attribute. They assert the contract the
// attribute exists to serve: `generatePptx` refuses, and says what was lost.
import { beforeAll, describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { generatePptx } from "@/api"
import { installNodePlatform } from "../platform/node"

beforeAll(() => {
  installNodePlatform()
})

const ONE_PX_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

function deck(components: unknown[], images: Record<string, unknown> = {}): PptxIR {
  return {
    version: "5",
    filename: "card-decline-fixture",
    theme: { id: "brief" },
    meta: {},
    assets: { images },
    slides: [
      {
        type: "content",
        kind: "list",
        heading: "一张放不下的页面",
        subheading: "结论句占掉一条带，组件拿到的高度不够画完自己。",
        components,
        footnote: "来源：内部统计",
      },
    ],
  } as unknown as PptxIR
}

/**
 * A quote wall beside a bullet list. On its own the wall fits every face and
 * every full sheet — the shared text band caps its height at five lines a
 * card — so the only way to under-allocate one is to make it share the band,
 * which is exactly what a real page does. The page then loses content, and
 * the deck does not ship until a person decides.
 */
function crowdedDeck(): PptxIR {
  const long =
    "上线满一年之后回过头看，最直接的变化是销售敢在合同里写上线日期了，这一条改变了整个团队的节奏".repeat(2)
  return deck([
    {
      type: "quote_wall",
      quotes: Array.from({ length: 4 }, (_, i) => ({
        text: long.slice(0, 138 - i),
        name: `客户${i + 1}`,
        role: "客户成功总监 · 云觅科技",
      })),
    },
    {
      type: "bullets",
      items: [
        "开通周期从九周压到五周",
        "续约率回到九成一",
        "协作活跃率提升到八成八",
        "客户成功人力是当前最硬的瓶颈",
        "三条产品线需要重新排序",
      ],
    },
  ])
}

describe("an under-allocated card page blocks the export", () => {
  it("refuses a page that cannot hold everything it was given", async () => {
    await expect(generatePptx(crowdedDeck())).rejects.toThrow(/deck drops content/s)
  })

  it("still exports the same deck when the caller opts in", async () => {
    const out = await generatePptx(crowdedDeck(), { allowDroppedContent: true })
    expect(out.byteLength).toBeGreaterThan(0)
  })

  it("exports cleanly when the same wall has the band to itself", async () => {
    const [wall] = crowdedDeck().slides[0]!.components
    const out = await generatePptx(deck([wall]))
    expect(out.byteLength).toBeGreaterThan(0)
  })
})

describe("a product card whose picture never arrived blocks the export", () => {
  const missing = deck(
    [
      {
        type: "product_cards",
        items: [
          { asset_id: "shot-1", name: "协作工作区", note: "文档与任务合在一处", price: "¥68", price_unit: "席位 / 月" },
          { asset_id: "shot-2", name: "集成中枢", note: "预置连接器", price: "¥12万", price_unit: "起 / 年" },
        ],
      },
    ],
    { "shot-1": { src: ONE_PX_PNG } },
  )

  it("refuses the deck by default, and the message names the picture", async () => {
    await expect(generatePptx(missing)).rejects.toThrow(/deck drops content.*: 1 picture\./s)
  })

  it("exports once every picture resolves", async () => {
    const out = await generatePptx(
      deck(
        [
          {
            type: "product_cards",
            items: [
              { asset_id: "shot-1", name: "协作工作区", price: "¥68", price_unit: "席位 / 月" },
              { asset_id: "shot-2", name: "集成中枢", price: "¥12万", price_unit: "起 / 年" },
            ],
          },
        ],
        { "shot-1": { src: ONE_PX_PNG }, "shot-2": { src: ONE_PX_PNG } },
      ),
    )
    expect(out.byteLength).toBeGreaterThan(0)
  })
})
