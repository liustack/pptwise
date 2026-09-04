import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("matrix"),
    /** 二维定位矩阵：带可选 XY 轴标签的色格网格，items 按行优先填格，
     * tone 决定象限底色。适合定位矩阵/象限分析/组合分类。 */
    x_title: z.string().optional(),
    y_title: z.string().optional(),
    cols: z.number().int().min(2).max(3),
    items: z
      .array(
        z
          .object({
            title: z.string(),
            tag: z.string().optional(),
            tone: z.enum(["neutral", "accent", "info"]).optional(),
          })
          .strict()
      )
      .min(2)
      .max(9),
  })
  .strict()

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
