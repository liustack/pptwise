import { z } from "zod"
import { BasisSchema, IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

// gantt's own item schema is pulled out to a named const (structure-
// components wave task 2, decision 6) rather than inlined in the union
// array in this file, purely so its `.refine` — the one item shape in this whole
// union that needs cross-field validation — reads as a standalone unit
// instead of being buried in the middle of a 400-line array literal.
// `ComponentSchema.options.map((option) => option.shape.type.value)`
// (`COMPONENT_TYPES` in ir/index.ts) requires every *top-level* union member to stay
// a plain `ZodObject` (`.shape` doesn't exist on the `ZodEffects` a `.refine`
// wrapper produces) — this only matters for `gantt`'s own top-level object,
// which stays untouched; the refine lives one level down, on the item
// schema nested inside `z.array(...)`, where that constraint doesn't apply.
const GanttItemSchema = z
  .object({
    label: z.string(),
    start: z.number(),
    end: z.number(),
    /** One short line under the label. See the describe below. */
    text: z
      .string()
      .optional()
      .describe("One short line under the bar's label: what happens in that stretch, or why it matters."),
    /** The one bar the page is about. See the describe below. */
    emphasis: z
      .boolean()
      .optional()
      .describe("Marks the one bar the page is about. It keeps the lead colour and the other bars recede. At most one item."),
    /** A symbol for the row. See the describe below. */
    icon: IconNameSchema.optional().describe("A symbol for the row, drawn before its label, such as coins or shield-check. Run `pptwise icons` for the names."),
    /** How the bar's stretch reads. See the describe below. */
    period: z
      .string()
      .min(1)
      .optional()
      .describe('How the bar\'s stretch reads in words, such as "第 16 至 18 个月" or "Months 16 to 18", printed with the row.'),
    /** What the stretch rests on. See the describe below. */
    basis: BasisSchema.optional().describe(
      'What the stretch rests on, such as "pending" for work that happens only if a condition is met, or one of two paths still to be chosen. A stretch that is not settled is drawn as a dashed outline.',
    ),
  })
  .strict()
  .refine((item) => item.end > item.start, {
    message: "gantt item's end must be greater than its start (no zero/negative-duration bars)",
    path: ["end"],
  })

export const schema = z
  .object({
    type: z.literal("gantt"),
    /** 共享数值轴时间条：`start`/`end` 是同一条数轴上的数值（周序/月序/
     * 任意模型自定的单位），不解析日期字符串——轴界=所有条目 start 的最小
     * 值与 end 的最大值。2-8 条，每条 `end` 必须大于 `start`
     * （{@link GanttItemSchema} 的 `.refine`）。 */
    items: z.array(GanttItemSchema).min(2).max(8),
    /** 可选刻度标签，沿轴均匀分布展示（不必与 items 的 start/end 值对齐
     * ——纯展示刻度，如 ["W1","W2","W3","W4"]）。 */
    axis_labels: z.array(z.string()).optional(),
    /** The stretch the axis runs over. See the describe below. */
    range: z
      .object({
        from: z.number().describe("Where the axis starts, such as 0 for the start of a plan."),
        to: z.number().describe("Where it ends, such as 18 for the end of an 18-month plan."),
      })
      .strict()
      .optional()
      .describe(
        'The stretch the axis runs over when it is longer than the bars, such as a whole 18-month plan whose bars cover parts of it: { "from": 0, "to": 18 }. Without it the axis runs from the first bar\'s start to the last bar\'s end. Every bar must lie inside it.',
      ),
    /** Single moments marked across the bars. See the describe below. */
    milestones: z
      .array(
        z
          .object({
            at: z.number().describe("Where the moment stands, on the same axis as the bars' start and end, such as 8.5 for the middle of the ninth month."),
            label: z.string().min(1).describe('What happens then, printed by its mark under the bars, such as "数据闸门 · 2027 年 6 月" or "Data gate, June 2027".'),
          })
          .strict(),
      )
      .min(1)
      .max(2)
      .optional()
      .describe(
        'Up to two moments marked across the bars, each a line down the rows with a diamond and its label under them, such as a check the plan turns on: [{ "at": 8.5, "label": "Data gate, June 2027" }]. Each lies inside the axis.',
      ),
    /** Spans of the axis marked behind the bars. See the describe below. */
    bands: z
      .array(
        z
          .object({
            from: z.number().describe("Where the span starts, on the same axis as the bars' start and end."),
            to: z.number().describe("Where it ends."),
            label: z.string().min(1).describe('What the span is, printed under the axis, such as "演唱会季 6 至 9 月" or "Concert season, Jun to Sep".'),
          })
          .strict(),
      )
      .min(1)
      .max(2)
      .optional()
      .describe(
        'Up to two spans of the axis marked behind the bars, each tinted and named under the axis, such as the season a plan is built around: [{ "from": 8, "to": 12, "label": "演唱会季 6 至 9 月" }]. Each lies inside the axis (range, or the bars\' own stretch), ends after it starts, and keeps clear of the other.',
      ),
  })
  .strict()
  .superRefine((c, ctx) => {
    // The axis is the plan's whole stretch, so every bar lies on it.
    if (c.range) {
      if (!(c.range.to > c.range.from)) {
        ctx.addIssue({ code: "custom", path: ["range", "to"], message: `gantt range runs from ${c.range.from} to ${c.range.to}. Its end must be after its start.` })
      } else {
        c.items.forEach((item, i) => {
          if (item.start < c.range!.from || item.end > c.range!.to) {
            ctx.addIssue({
              code: "custom",
              path: ["items", i],
              message: `gantt items[${i}] runs from ${item.start} to ${item.end}, outside the range ${c.range!.from} to ${c.range!.to}. Widen range, or bring the bar inside it.`,
            })
          }
        })
      }
    }
    // A bar keeps the lead colour so it stands out from the rest, so two
    // marked bars stand out from nothing.
    if (c.bands) {
      const lo = c.range ? c.range.from : Math.min(...c.items.map((item) => item.start))
      const hi = c.range ? c.range.to : Math.max(...c.items.map((item) => item.end))
      c.bands.forEach((band, k) => {
        if (!(band.to > band.from)) {
          ctx.addIssue({ code: "custom", path: ["bands", k, "to"], message: `gantt bands[${k}] runs from ${band.from} to ${band.to}. Its end must be after its start.` })
        } else if (band.from < lo || band.to > hi) {
          ctx.addIssue({
            code: "custom",
            path: ["bands", k],
            message: `gantt bands[${k}] runs from ${band.from} to ${band.to}, outside the axis from ${lo} to ${hi}. Bring it inside${c.range ? " the range" : " the bars' stretch, or give the gantt a range"}.`,
          })
        } else if (c.bands!.some((other, j) => j < k && band.from < other.to && other.from < band.to)) {
          ctx.addIssue({ code: "custom", path: ["bands", k], message: `gantt bands[${k}] overlaps another band. Keep the spans apart.` })
        }
      })
    }
    if (c.milestones) {
      const lo = c.range ? c.range.from : Math.min(...c.items.map((item) => item.start))
      const hi = c.range ? c.range.to : Math.max(...c.items.map((item) => item.end))
      c.milestones.forEach((m, k) => {
        if (m.at < lo || m.at > hi) {
          ctx.addIssue({ code: "custom", path: ["milestones", k, "at"], message: `gantt milestones[${k}] stands at ${m.at}, outside the axis from ${lo} to ${hi}. Bring it inside${c.range ? " the range" : " the bars' stretch, or give the gantt a range"}.` })
        }
      })
    }
    const marked = c.items.flatMap((item, i) => (item.emphasis === true ? [i] : []))
    if (marked.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["items", marked[1]!, "emphasis"],
        message: `gantt marks ${marked.length} bars with emphasis, and a marked bar stands out from the rest. Keep emphasis on the one bar the page is about.`,
      })
    }
  })

export const aliases = {
  items: [{ itemsKey: "items", aliases: { from: "start", to: "end" } }],
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Schedule",
  story: "Bars on one shared axis, each beginning and ending where its work does, with tick labels along the bottom when the axis is labelled. The schedule pinned above the desk.",
  positioning: "Choose it when work items share one measured axis and their overlaps are the point. Use roadmap for phases with no common axis, and timeline when dated moments matter more than durations.",
  audience: "Teams checking what runs at the same time as what.",
  notFor: "Phases without a shared axis, which belong in roadmap.",
}
