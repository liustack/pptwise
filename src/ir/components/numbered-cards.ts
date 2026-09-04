import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("numbered_cards"),
    /** 编号网格列表（编辑部大数字目录）：自动编号 01..N，无卡壳左竖线
     * 分栏，适合并列名录/作品集/要点集。≤4 项单行，5-8 项两行网格。 */
    items: z
      .array(
        z
          .object({
            title: z.string(),
            text: z.string().optional(),
            sub: z.string().optional(),
          })
          .strict()
      )
      .min(3)
      .max(8),
  })
  .strict()

export const aliases = {
  items: [{ itemsKey: "items", aliases: { description: "text", desc: "text" } }],
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Numbered Index",
  story: "Items numbered from 01 upward, divided by hairline rules into a grid. The contents page of a magazine, where the numbers are how you refer to things.",
  positioning: "Choose it when each item is a titled card with body text that will be quoted by its number. Use bullets when short lines are enough, and steps when the order is a procedure to follow.",
  audience: "Readers who will point at item three later.",
  notFor: "A procedure to be carried out in order, which belongs in steps.",
}
