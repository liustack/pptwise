import { z } from "zod"
import { IconNameSchema, TagSchema } from "./shared"
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
              "One short line that puts the figure in context: the base it is measured from, the period, or the counts behind it. Where the figure came from belongs in source.",
            ),
          tag: TagSchema.optional().describe(
            "What the figure is, in a few words printed as a small tag with it, such as 约束性指标 or Binding. A tag on the figure the page marks fills in the emphasis colour.",
          ),
          delta: z.enum(["up", "down", "flat"]).optional(),
          icon: IconNameSchema.optional(),
          /** 数据来源小字（财经信任语言，2026-07-12 借鉴），如
           * 「来源: Crunchbase」。 */
          source: z.string().optional(),
        })
        .strict()
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
