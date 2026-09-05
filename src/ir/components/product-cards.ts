import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

/**
 * 商品/方案卡（component build wave A）。
 *
 * 判据句：2-4 个可购买的东西并排比较，每个都有自己的一张图、一个名字，
 * 通常还有一个价格时用它。图片是必填的：没有图的商品卡就是 row_cards，
 * 而这里绝不画占位插画来假装有图——版式忠实性规矩下，编不出来的东西不画。
 *
 * 上限 4：第五张卡的图片宽度会掉到看不清商品的程度，那时该分页或换
 * data_table 做参数对照。
 */
export const schema = z
  .object({
    type: z.literal("product_cards"),
    items: z
      .array(
        z
          .object({
            asset_id: z
              .string()
              .min(1, "a product_cards item needs an asset_id — the picture is the card")
              .describe(
                "Required asset id for this item's picture, resolved through the same image pipeline as image/image_grid. A card without a picture is a row_cards row.",
              ),
            name: z.string().min(1, "a product_cards item needs a name").describe("What the item is called."),
            note: z
              .string()
              .optional()
              .describe("Optional one line saying what it does or who it is for. One line, not a paragraph."),
            price: z
              .string()
              .optional()
              .describe('Optional price as written, currency symbol included — "¥68", "$1,200", "12万".'),
            price_unit: z
              .string()
              .optional()
              .describe('Optional small print beside the price — "per seat / month", "起 / 年".'),
            featured: z
              .literal(true)
              .optional()
              .describe(
                "Optional. Marks the one item the page is steering toward: its card is filled solid and its text set to read against that fill. At most one item in the set may set it.",
              ),
          })
          .strict(),
      )
      .min(2, "product_cards needs at least 2 items — one item on its own is an `image` with a `callout`")
      .max(
        4,
        "product_cards accepts at most 4 items — past 4 each picture narrows below the width the thing itself stays readable at; split the range across pages or compare specifications in a `data_table`",
      )
      .describe(
        "2-4 items side by side, each a picture with a name and usually a price, in the order they should be read left to right.",
      ),
  })
  .strict()
  .refine((component) => component.items.filter((item) => item.featured).length <= 1, {
    error:
      "only one product_cards item may be featured — filling every card singles out none of them. Feature the one the page is steering toward, or feature none",
    path: ["items"],
  })
  .describe(
    "Puts 2-4 purchasable things side by side, each with its own picture, name, and usually a price, so the " +
      "page reads as a range to choose from. A picture is required on every item. Use product_cards for a " +
      "catalogue page: plans, packages, models, editions. The test: could someone buy exactly one of these? " +
      "Use `comparison` when the same attributes are weighed across options without pictures, `data_table` " +
      "when the specifications must be read row by row, and `row_cards` when the items are not things you buy.",
  )

export const aliases = {
  items: [{ itemsKey: "items", aliases: { title: "name", label: "name", image_id: "asset_id", text: "note", description: "note" } }],
} satisfies ComponentAliasSpec

/**
 * 除通栏外全 false，与 `image_grid`/`device_mockup` 一样：图片的宽高比是固定的，
 * 卡片纵向拉伸只会拉出一条空腔（stretchable）；卡片坐在 bento 壳里正常
 * （selfVisual/passthroughShell）；图文混排不是一张可整体缩放的图
 * （scalable）；不是整页画布（fullBody）；商品卡是要约不是可复核的证据
 * （evidence）。
 */
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  // 通栏：一排卡片挤进两栏版式的一栏，图片宽度就掉到看不清东西的地步。
  columnSpanning: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Catalogue",
  story: "Two to four things side by side, each a picture with its name, one line, and a price underneath, and one of them may wear a small mark. The spread out of a printed catalogue.",
  positioning: "Choose it when the page offers a range and the reader is picking one. Use comparison when options are weighed on shared attributes without pictures, and data_table when the specifications have to be read row by row.",
  audience: "A reader about to choose between things they could buy.",
  notFor: "Items with no picture, which belong in row_cards.",
  lineage: "The mail-order catalogue page, where the photograph sold the thing and the price closed it.",
}
