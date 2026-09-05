import { z } from "zod"
import type { ItemFieldAliasSpec } from "../field-aliases"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("value_chain"),
    /** 判据句：3-6 个首尾相扣的基本环节排成一行，2-4 条支持活动横跨在上方，
     * 可选一块利润楔形收尾。每个环节可带一个数字，说的是「价值在哪一环产生」。
     * 只讲先后顺序不讲分摊用 steps，讲流量的分合用 sankey。 */
    primary: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("What happens at this link of the chain."),
            value: z
              .string()
              .min(1, "value_chain link value cannot be blank — omit the field instead of writing an empty figure")
              .optional()
              .describe("The share or figure this link carries."),
            unit: z.string().optional().describe("Unit printed small beside the figure."),
            emphasis: z
              .literal(true)
              .optional()
              .describe("Mark the one link the page is about. It is filled solid instead of outlined."),
          })
          .strict()
          // A unit with no number is a word the drawing has nowhere to put:
          // the renderer prints the unit beside the figure, so without one it
          // silently vanished — content accepted at the boundary and then
          // erased by a drawing condition. Refused here instead.
          .refine((link) => link.unit === undefined || (link.value?.trim() ?? "") !== "", {
            error:
              "value_chain link has a unit but no value — a unit annotates a figure, so write the figure or drop the unit.",
            path: ["unit"],
          })
      )
      .min(3, "value_chain.primary needs at least 3 links — two chevrons are a before and an after, not a chain")
      .max(6, "value_chain.primary accepts at most 6 links — past that a chevron is narrower than its own label")
      .describe("The primary activities in the order value passes through them."),
    support: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("What this supporting function is called."),
            note: z.string().optional().describe("One line naming what it actually provides."),
          })
          .strict()
      )
      .min(2, "value_chain.support needs at least 2 supporting bands — one band spanning the chain reads as a title")
      .max(4, "value_chain.support accepts at most 4 supporting bands — past that the chain has no height left")
      .describe("The functions that span every link rather than sitting at one of them."),
    margin: z
      .object({
        label: z.string().min(1).describe("What the closing wedge is called."),
        value: z
          .string()
          .min(1, "value_chain margin value cannot be blank — omit the field instead of writing an empty figure")
          .optional()
          .describe("The figure the wedge carries."),
      })
      .strict()
      .optional()
      .describe("The wedge closing the right end of the chain."),
  })
  .strict()
  .refine((c) => c.primary.filter((p) => p.emphasis).length <= 1, {
    error: "value_chain marks at most one link with emphasis — two filled chevrons say neither is the point.",
    path: ["primary"],
  })
  .describe(
    "3-6 interlocking primary links in a row, 2-4 supporting bands spanning above them, and an optional " +
      "closing wedge. Use value_chain when the question is where along the chain value is made. Use `steps` " +
      "when only the order matters, and `sankey` when a quantity splits and merges between stages."
  )

// Annotated on its own, the same shape `sankey.ts` documents: two item
// specs whose alias key sets differ widen to a union with `?: undefined`
// members when inferred inline, which then fails `FieldAliasMap`'s index
// signature.
const valueChainItemAliases: readonly ItemFieldAliasSpec[] = [
  { itemsKey: "primary", aliases: { title: "label", name: "label", number: "value" } },
  { itemsKey: "support", aliases: { title: "label", name: "label", text: "note", desc: "note" } },
]

export const aliases = {
  block: { activities: "primary", links: "primary" },
  items: valueChainItemAliases,
} satisfies ComponentAliasSpec

// Chevrons, bands and wedge all paint their own edges.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Value Chain",
  story: "Interlocking links along the bottom, the functions that span all of them banded above, a wedge closing the right end. The classic strategy diagram, drawn with the numbers actually filled in.",
  positioning: "Choose it when the question is which link makes the value and which merely qualifies you to play. Use steps when only the order matters and sankey when a quantity splits between stages.",
  audience: "People deciding where along a chain to spend the next year.",
  notFor: "A plain sequence with nothing attributed to each stage, which belongs in steps.",
}
