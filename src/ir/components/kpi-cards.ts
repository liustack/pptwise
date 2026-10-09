import { z } from "zod"
import { IconNameSchema, TagSchema, ToneSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("kpi_cards"),
    items: z.array(
      z
        .object({
          value: z.string(),
          unit: z.string().optional(),
          label: z.string(),
          note: z
            .string()
            .optional()
            .describe(
              "One short line of context: the base, the period, or the counts behind the figure. Where it came from belongs in source.",
            ),
          tag: TagSchema.optional().describe(
            "What the figure is, as a small tag, such as 约束性指标 or Binding. Filled in the emphasis colour on the marked figure.",
          ),
          delta: z.enum(["up", "down", "flat"]).optional(),
          delta_good: z.boolean().optional().describe("Whether the delta is good news. Unset: up is good, down bad."),
          icon: IconNameSchema.optional(),
          /** What kind of news the figure is. See `ToneSchema`. */
          tone: ToneSchema.optional(),
          /** 数据来源小字（财经信任语言，2026-07-12 借鉴），如
           * 「来源: Crunchbase」。 */
          source: z.string().optional(),
        })
        .strict()
        .superRefine((item, ctx) => {
          if (item.delta_good !== undefined && (item.delta === undefined || item.delta === "flat")) {
            ctx.addIssue({
              code: "custom",
              path: ["delta_good"],
              message: "delta_good says whether a move up or down is good news, and this figure has no such move. Set delta to \"up\" or \"down\", or remove delta_good.",
            })
          }
        })
    ),
  })
  .strict()

export const aliases = {
  items: [{ itemsKey: "items", aliases: { title: "label", name: "label" } }],
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: true,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: true,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Headline Numbers",
  story: "A row of cards, each with a figure and its label, plus the direction it moved and where it came from when those are given. The top strip of a report, read first.",
  positioning: "Choose it for independent headline figures set side by side. Use progress_donuts when every figure is a completion rate, and chart when the shape of a series is the point.",
  audience: "A room that will remember the numbers and nothing else.",
  notFor: "Completion rates, which belong in progress_donuts.",
}
