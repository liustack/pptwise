import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("matrix"),
    /** 二维定位矩阵：带可选 XY 轴标签的色格网格，items 按行优先填格，
     * tone 决定象限底色。适合定位矩阵/象限分析/组合分类。 */
    title: z
      .string()
      .optional()
      .describe('A short name for the grid, printed over it, such as "已有证据覆盖了什么" or "What the evidence covers". A theme that numbers its tables prints the number before it.'),
    x_title: z.string().optional(),
    y_title: z.string().optional(),
    cols: z.number().int().min(2).max(3),
    /** The columns' names. See the describe below. */
    columns: z
      .array(z.string().min(1))
      .optional()
      .describe('The columns\' names, printed over them, one a column, such as ["就业效应", "去向", "机制"] or ["Employment", "Where they went", "Why"]. As many as cols.'),
    /** The rows' names. See the describe below. */
    rows: z
      .array(
        z
          .object({
            label: z.string().min(1).describe('The row\'s name, such as "国际改革评估" or "Reforms abroad".'),
            icon: IconNameSchema.optional().describe("A symbol for the row, drawn before its name, such as globe. Run `pptwise icons` for the names."),
          })
          .strict(),
      )
      .optional()
      .describe('The rows\' names, printed at their left, one a row, each with an optional symbol: [{ "label": "Reforms abroad", "icon": "globe" }]. As many as the grid has rows.'),
    items: z
      .array(
        z
          .object({
            title: z.string(),
            tag: z.string().optional(),
            tone: z.enum(["neutral", "accent", "info"]).optional(),
            /** A cell where nothing has been found. See the describe below. */
            empty: z
              .boolean()
              .optional()
              .describe('Marks a cell where nothing has been found, such as a gap in the evidence: it is drawn as a dashed outline with its words in the middle ("空白", "Nothing yet"), not on a tint. With tone "accent" the outline takes the accent, as the gap a page is about.'),
          })
          .strict()
      )
      .min(2)
      .max(9),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.columns !== undefined && m.columns.length !== m.cols) {
      ctx.addIssue({ code: "custom", path: ["columns"], message: `matrix names ${m.columns.length} column(s) and has ${m.cols}. Name every column once, in order.` })
    }
    const rowCount = Math.ceil(m.items.length / m.cols)
    if (m.rows !== undefined && m.rows.length !== rowCount) {
      ctx.addIssue({ code: "custom", path: ["rows"], message: `matrix names ${m.rows.length} row(s), and its ${m.items.length} cells in ${m.cols} columns make ${rowCount}. Name every row once, in order.` })
    }
  })

export const aliases = {} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Grid",
  story: "A labelled grid of two to nine cells, tinted and read by where each one sits rather than by order. Axis titles can name what the columns and rows mean.",
  positioning: "Choose it when an item's place in the grid is the meaning. Use comparison when options answer questions in words, and a named frame like swot or pest when the frame itself is the point.",
  audience: "Deciders sorting options into places rather than ranks.",
  notFor: "Attributes compared row by row, which belong in comparison.",
}
