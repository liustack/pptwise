import { z } from "zod"
import { IconNameSchema } from "./shared"
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
  story: "A row of cards, each with a figure, its label, the direction it moved, and where it came from. The top strip of a report, read before anything else.",
  positioning: "Choose it for several independent headline figures side by side. Use progress_donuts when every figure is a completion rate, and chart when the shape of a series is the point.",
  audience: "A room that will remember the numbers and nothing else.",
  notFor: "Completion rates, which belong in progress_donuts.",
}
