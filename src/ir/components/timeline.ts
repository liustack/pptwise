import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("timeline"),
    /** 版式：缺省 horizontal（存量语义）。vertical=左 date/中轴圆点/右
     * 标题描述的编辑部竖排时间线，适合 4-8 个叙事型节点。 */
    layout: z.enum(["horizontal", "vertical"]).optional(),
    /** The lanes' names, the one above the axis first. See the describe below. */
    lanes: z
      .array(z.string())
      .length(2)
      .optional()
      .describe(
        'The two lanes the milestones run on, the one drawn above the axis first, such as ["Home", "Abroad"]. Optional: without it the lane named first runs above. Every milestone\'s lane must be one of them.',
      ),
    milestones: z.array(
      z
        .object({
          date: z.string(),
          title: z.string(),
          desc: z.string().optional(),
          /** 强调节点：accent 色 + 大圆点（时间线上的「转折点」语义）。 */
          highlight: z.boolean().optional(),
          /** Which of two tracks the milestone runs on. See the describe below. */
          lane: z
            .string()
            .optional()
            .describe(
              'The track this milestone belongs to, such as "Home" and "Abroad". A timeline with lanes keeps one time order across both, one lane above the axis and one below (the timeline\'s lanes field says which, otherwise the lane named first runs above). Every milestone names a lane, or none does. At most two lanes.',
            ),
        })
        .strict()
    ),
  })
  .strict()
  .superRefine((c, ctx) => {
    // Lanes split one time order into two tracks. A milestone with no lane
    // would belong to neither, and a third lane has no side of the axis left.
    const laned = c.milestones.filter((m) => m.lane !== undefined).length
    if (laned > 0 && laned < c.milestones.length) {
      const i = c.milestones.findIndex((m) => m.lane === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["milestones", i, "lane"],
        message: `milestones[${i}] names no lane, and ${laned} other milestone(s) do. A timeline with lanes places every milestone on one of them: give it a lane, or remove lane from all of them.`,
      })
    }
    if (c.lanes !== undefined) {
      if (c.lanes.some((lane) => lane.trim() === "") || c.lanes[0]!.trim() === c.lanes[1]!.trim()) {
        ctx.addIssue({ code: "custom", path: ["lanes"], message: `lanes names two different, non-blank lanes, the one above the axis first.` })
      }
      c.milestones.forEach((m, i) => {
        if (m.lane === undefined || c.lanes!.some((lane) => lane.trim() === m.lane!.trim())) return
        ctx.addIssue({
          code: "custom",
          path: ["milestones", i, "lane"],
          message: `milestones[${i}].lane is "${m.lane}", and lanes names ${c.lanes!.map((l) => `"${l}"`).join(" and ")}. Use one of them.`,
        })
      })
      if (laned === 0) {
        ctx.addIssue({ code: "custom", path: ["lanes"], message: `lanes names the timeline's two lanes, and no milestone sits on one. Give every milestone a lane, or remove lanes.` })
      }
    }
    const lanes = [...new Set(c.milestones.flatMap((m) => (m.lane === undefined ? [] : [m.lane.trim()])))]
    if (lanes.some((lane) => lane === "")) {
      const i = c.milestones.findIndex((m) => m.lane !== undefined && m.lane.trim() === "")
      ctx.addIssue({ code: "custom", path: ["milestones", i, "lane"], message: `milestones[${i}].lane is blank. Name the lane, or remove the field.` })
    }
    if (lanes.length > 2) {
      ctx.addIssue({
        code: "custom",
        path: ["milestones"],
        message: `the milestones name ${lanes.length} lanes (${lanes.map((l) => `"${l}"`).join(", ")}), and a timeline runs one lane above its axis and one below. Use two lanes at most, or split the timeline.`,
      })
    }
    if (lanes.length > 0 && c.layout === "vertical") {
      ctx.addIssue({
        code: "custom",
        path: ["layout"],
        message: `lanes run above and below a horizontal axis, and layout "vertical" has no sides. Remove layout, or remove lane from the milestones.`,
      })
    }
  })

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
