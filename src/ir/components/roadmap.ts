import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("roadmap"),
    /** 阶段路线图卡：2-4 个阶段横排，自动编号 01..N，每阶段含标题、
     * 可选时段（如「0-6 个月」）与若干 label:value 指标行。适合分阶段
     * 推进/路线图/里程碑规划。 */
    items: z
      .array(
        z
          .object({
            title: z.string(),
            period: z.string().optional(),
            rows: z
              .array(z.object({ label: z.string(), value: z.string() }).strict())
              .max(4)
              .optional(),
          })
          .strict()
      )
      .min(2)
      .max(4),
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
  name: "Phases",
  story: "Two to four numbered phase cards across the page, each with its period and measures when they are given. The plan as it is pinned up before the work starts.",
  positioning: "Choose it for phases that have no shared measured axis. Use gantt when the items are bars on one common axis, and timeline when dated moments are the point.",
  audience: "Teams agreeing what happens in which stretch of the year.",
  notFor: "Overlapping durations on one axis, which belong in gantt.",
}
