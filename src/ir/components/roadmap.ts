import { z } from "zod"
import { BasisSchema, IconNameSchema } from "./shared"
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
            /** A symbol for the phase. See the describe below. */
            icon: IconNameSchema.optional().describe(
              "A symbol for the phase, drawn where its number would stand, such as shield-check or flag. Run `pptwise icons` for the names.",
            ),
            rows: z
              .array(
                z
                  .object({
                    label: z.string(),
                    value: z.string(),
                    /** What the row's value rests on. See the describe below. */
                    basis: BasisSchema.optional().describe(
                      'What the row\'s value rests on, such as "pending" for a budget line still to be set ("核算与核查费用：待定"). A value that is not settled is marked dashed.',
                    ),
                  })
                  .strict(),
              )
              .max(4)
              .optional(),
            /** How long the phase lasts. See the describe below. */
            duration: z
              .number()
              .positive()
              .optional()
              .describe(
                "How long the phase lasts, counted in the roadmap's duration_unit, such as 15. Give every phase one, and a face that lays phases to scale draws each as long as it lasts.",
              ),
            /** A check held as the phase ends. See the describe below. */
            checkpoint: z
              .string()
              .min(1)
              .optional()
              .describe('A check held as the phase ends, such as "小测一", "Quiz 1" or "Gate review", marked where the phase ends and named on its card.'),
            /** What the phase covers. See the describe below. */
            points: z
              .array(z.string().min(1))
              .min(1)
              .max(3)
              .optional()
              .describe('What the phase covers, one to three short lines, such as ["四项研究", "两种帮倒忙"] or ["Four studies", "Two traps"], printed as a short list on its card.'),
            /** Marks the one phase the page is about: its card alone keeps
             * the accent bar, and the others take the primary color. */
            emphasis: z
              .boolean()
              .optional()
              .describe("Marks the one phase the page is about. Its card keeps the accent bar and the others turn primary. At most one item."),
          })
          .strict()
      )
      .min(2)
      .max(4),
    /** The unit every phase's duration is counted in. See the describe below. */
    duration_unit: z
      .string()
      .min(1)
      .optional()
      .describe('The unit every phase\'s duration is counted in, such as "分钟", "min", "weeks" or "个月". Required once the phases carry a duration.'),
  })
  .strict()
  .superRefine((c, ctx) => {
    // Phases laid to scale are laid end to end: every phase needs a length,
    // and every length the same unit.
    const timed = c.items.filter((item) => item.duration !== undefined).length
    if (timed > 0 && timed < c.items.length) {
      const missing = c.items.findIndex((item) => item.duration === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["items", missing, "duration"],
        message: `${timed} of the roadmap's ${c.items.length} phases have a duration. Give every phase one, so they can be laid end to end, or none.`,
      })
    }
    if (timed > 0 && c.duration_unit === undefined) {
      ctx.addIssue({ code: "custom", path: ["duration_unit"], message: 'the phases carry a duration and the roadmap names no unit for it. Add duration_unit, such as "分钟" or "weeks".' })
    }
    if (timed === 0 && c.duration_unit !== undefined) {
      ctx.addIssue({ code: "custom", path: ["duration_unit"], message: "duration_unit names the unit of the phases' durations, and no phase has one. Give each phase a duration, or remove duration_unit." })
    }
    // The accent bar singles one phase out, so two marked phases single out
    // nothing.
    const marked = c.items.flatMap((item, i) => (item.emphasis === true ? [i] : []))
    if (marked.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["items", marked[1]!, "emphasis"],
        message: `roadmap marks ${marked.length} phases with emphasis, and the accent bar singles out one. Keep emphasis on the phase the page is about.`,
      })
    }
  })

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
