import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

/**
 * 客户/伙伴标识墙（component build wave A）。`logo_wall` 曾在早期版本被并进
 * `image_grid`，这次以自己的判据回来：`image_grid` 画的是照片，按格子裁切、
 * 各自带图注；标识墙画的是一组「名字」，等大、等距、单色，谁也不比谁大，
 * 裁切一个标识就等于毁掉它。两者的排版规则相反，合并那次丢的正是这一条。
 *
 * 判据句：4-12 个组织，页面要说的是「这些名字站在一起」时用它。每格只放
 * 一个标识（有图用图，没图就用名字排成字标），不放说明文字、不放数字。
 * 要讲每家做了什么用 row_cards，要展示照片用 image_grid。
 *
 * `name` 是必填的，即使那一格最后画的是图片：它同时是图片的替代文本、
 * 是资产缺席时的字标兜底，也是导出后仍然可读的那份内容。`asset_id` 可选，
 * 走的是 `image`/`image_grid` 同一条资产管线（`ctx.images`）。
 */
export const schema = z
  .object({
    type: z.literal("logo_wall"),
    title: z.string().optional().describe("Optional one-line label above the grid, e.g. what the set of organizations has in common."),
    items: z
      .array(
        z
          .object({
            name: z
              .string()
              .min(1, "a logo_wall item needs a name")
              .max(
                40,
                "a logo_wall item's name is an organization's name (<= 40 chars), not a description — put what each one did in row_cards or icon_cards",
              )
              .describe(
                "The organization's name. Always required: it is the picture's alt text, the wordmark drawn when no picture is given, and the only part that survives without the asset.",
              ),
            asset_id: z
              .string()
              .optional()
              .describe(
                "Optional asset id for this organization's mark, resolved through the same image pipeline as image/image_grid. Omit it and the tile sets the name as a wordmark instead.",
              ),
          })
          .strict(),
      )
      .min(
        4,
        'logo_wall.items needs at least 4 organizations — three names are a sentence, not a wall; write them into the heading or a "paragraph"',
      )
      .max(
        12,
        "logo_wall.items accepts at most 12 organizations — past 12 each tile shrinks below the size a mark stays recognisable at; pick the twelve that carry the claim",
      )
      .describe(
        "4-12 organizations, one per tile, in the order the wall should read row by row. Each tile holds a picture or the name set as a wordmark, nothing else.",
      ),
  })
  .strict()
  .describe(
    "Sets 4-12 organization marks on one grid of equal tiles, every tile the same size and the same weight, " +
      "so the page says 'these names are together' and nothing more. Use logo_wall when the set of names IS " +
      "the claim — customers, partners, sponsors, funders, accreditations. The test: would each tile be " +
      "replaced by that organization's own logo file? If each name needs a line of its own explaining what it " +
      "did, use `row_cards` or `icon_cards`; if the pictures are photographs rather than marks, use `image_grid`.",
  )

export const aliases = {
  items: [{ itemsKey: "items", aliases: { label: "name", title: "name", org: "name", image_id: "asset_id" } }],
} satisfies ComponentAliasSpec

/**
 * 除通栏外全 false：等大方格是这个组件的全部意思，拉伸
 * 会让某一行的标识比另一行大（stretchable）；它坐在 bento 壳里没有自己的
 * 卡片（selfVisual/passthroughShell）；它是可回流的字标与图片混排，不是一
 * 张可整体缩放的图（scalable）；不是整页画布（fullBody）；一排名字也不是
 * chart/data_table 那种可复核的证据（evidence）。
 */
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  // 唯一为 true 的一条：一面墙要通栏。塞进两栏版式的一栏里，每格只剩一百
  // 出头的宽度，名字就只能被砍短——那正是版式忠实性规矩要根除的无痕丢失。
  columnSpanning: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Wordmark Wall",
  story: "Four to twelve marks set at one size on an even grid, each a picture or the name itself in type, all in one ink. The sponsor board that stands at the back of a stage.",
  positioning: "Choose it when the roll of names is itself the claim and no single name outranks the others. Use row_cards when each name needs a line explaining what it did, and image_grid when the pictures are photographs.",
  audience: "An audience weighing who else already said yes.",
  notFor: "Photographs, which crop to their tile and belong in image_grid.",
  lineage: "The printed sponsor board, and the endpapers where a publisher lists its imprints.",
}
