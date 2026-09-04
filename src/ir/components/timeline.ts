import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("timeline"),
    /** 版式：缺省 horizontal（存量语义）。vertical=左 date/中轴圆点/右
     * 标题描述的编辑部竖排时间线，适合 4-8 个叙事型节点。 */
    layout: z.enum(["horizontal", "vertical"]).optional(),
    milestones: z.array(
      z
        .object({
          date: z.string(),
          title: z.string(),
          desc: z.string().optional(),
          /** 强调节点：accent 色 + 大圆点（时间线上的「转折点」语义）。 */
          highlight: z.boolean().optional(),
        })
        .strict()
    ),
  })
  .strict()

export const aliases = {
  items: [{ itemsKey: "milestones", aliases: { year: "date", text: "desc", description: "desc" } }],
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Chronology",
  story: "Dated milestones along an axis, laid out across the page or down it, with the turning points marked. The chronology an exhibition mounts along a wall.",
  positioning: "Choose it when dated moments and their order are the message. Use roadmap for phases of work without dates, and gantt for durations that share one measured axis.",
  audience: "An audience placing events in the order they happened.",
  notFor: "Durations that overlap, which belong in gantt.",
}
