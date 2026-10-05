import { z } from "zod"
import { BasisSchema, IconNameSchema, TagSchema, ToneSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("timeline"),
    title: z
      .string()
      .optional()
      .describe('A short name for the timeline, printed over it, such as "2026 年外部融资" or "Funding in 2026". A theme that sets it in a panel prints the title in the panel\'s title bar.'),
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
    /** The spans the axis is divided into. See the describe below. */
    periods: z
      .array(
        z
          .object({
            from: z.string().min(1).describe("Where the span starts, written the way the milestones write their dates, such as 2026-01 or 2026."),
            to: z.string().min(1).describe("Where it ends, such as 2026-12 or 2034."),
            label: z
              .string()
              .min(1)
              .describe('What the span is, printed with it, such as "2026 年：进口计入排放，不必持有证书" or "Current law: free allocation ends in 2034".'),
            basis: BasisSchema.optional().describe(
              'What the span rests on, such as "proposal" for one that exists only if a proposal passes, or "law" for one the law sets. A span that is not settled is drawn dashed.',
            ),
          })
          .strict(),
      )
      .min(1)
      .max(3)
      .optional()
      .describe(
        'Up to three spans the axis is divided into, each named with its label, such as the year imports are only counted and the year certificates are bought: [{ "from": "2026-01", "to": "2026-12", "label": "2026: counted, nothing to buy" }]. Write from and to the way the milestones write their dates. A horizontal timeline only.',
      ),
    milestones: z.array(
      z
        .object({
          date: z.string(),
          title: z.string(),
          desc: z.string().optional(),
          /** 强调节点：accent 色 + 大圆点（时间线上的「转折点」语义）。 */
          highlight: z.boolean().optional(),
          /** A symbol for the milestone. See the describe below. */
          icon: IconNameSchema.optional().describe(
            "A symbol for the milestone, drawn in its node on the axis, such as server or flag. Run `pptwise icons` for the names.",
          ),
          /** What kind of turn it is. See `ToneSchema`. */
          tone: ToneSchema.optional(),
          /** Where the milestone stands. See the describe below. */
          tag: TagSchema.optional().describe(
            'A few words that say where the milestone stands, printed as a small tag with it, such as "已定", "谈判中" or "Proposal". Give it a basis to say how firm it is: "proposal" for a rule not yet law.',
          ),
          /** Where the date comes from. See the describe below. */
          source: z
            .string()
            .min(1)
            .optional()
            .describe('Where the date or the rule comes from, printed small under the milestone, such as the act that sets it: "实施条例 (EU) 2025/2621" or "COM(2025) 989".'),
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
    if (c.periods !== undefined && c.layout === "vertical") {
      ctx.addIssue({
        code: "custom",
        path: ["periods"],
        message: `periods divide a horizontal axis into spans, and layout "vertical" has none. Remove layout, or remove periods.`,
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
