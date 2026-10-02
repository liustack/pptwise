import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("numbered_cards"),
    /** 编号卡片列表（编辑部大数字目录）：3-8 项自上而下排成一列，每项一张
     * 卡片，卡内左端是自动编号徽章 01..N，右边是标题和可选正文，`sub` 限定语
     * 右对齐贴在卡片右端。列表左侧一枚大圆标出条目总数。适合并列名录、作品集、
     * 要点集。 */
    items: z
      .array(
        z
          .object({
            title: z.string(),
            text: z.string().optional(),
            sub: z.string().optional(),
            /** The one item the page lands on. See the describe below. */
            emphasis: z
              .boolean()
              .optional()
              .describe(
                "Marks the one item the page lands on, such as the answer the other items lead to. Its card is filled in the primary colour. At most one item.",
              ),
          })
          .strict()
      )
      .min(3)
      .max(8),
  })
  .strict()
  .superRefine((c, ctx) => {
    // A filled card singles one item out, so two filled cards single out
    // nothing.
    const marked = c.items.flatMap((item, i) => (item.emphasis === true ? [i] : []))
    if (marked.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["items", marked[1]!, "emphasis"],
        message: `numbered_cards marks ${marked.length} items with emphasis, and a filled card singles out one. Keep emphasis on the item the page lands on.`,
      })
    }
  })

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
  story: "Items numbered from 01 upward, each on its own card in one column, beside a disc that counts them. The contents page of a magazine, where the numbers are how you refer to things.",
  positioning: "Choose it when each item carries its own title and a stable number it will be referred to by. Use bullets when short lines with no titles are enough, and steps when the order is a procedure to follow.",
  audience: "Readers who will point at item three later.",
  notFor: "A procedure to be carried out in order, which belongs in steps.",
}
