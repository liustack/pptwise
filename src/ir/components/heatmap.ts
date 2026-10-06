import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

// 值驱动数值网格家族（structure-components wave 2 task 2）：另一支满幅
// 组件——形状由 x_labels/y_labels 两个具名数组直接推导（无独立 cols/rows
// 字段，杜绝两套数字互相打架），values 矩形性用三条 `.refine` 校验
// （行数=y_labels 长度、每行列数=x_labels 长度、可选 domain.max>=min）。
// zod v4 下 `.refine()` 直接挂在 discriminatedUnion 成员对象上仍保留
// `.shape`（经本任务实测确认，不同于 v3 的 ZodEffects 包装丢 `.shape`
// 的旧顾虑——`GanttItemSchema` 当年绕开的那个坑在 v4 已不成立），因此这里
// 不必像 gantt 的 refine 那样退一层塞进嵌套数组项，直接写在组件对象本身。
export const schema = z
  .object({
    type: z.literal("heatmap"),
    /** 列头（沿横轴，每列一个），1-24 项——1 项即单列热力图（病态但合法，
     * 见 heatmap.tsx 头注）。上限 24 是一天的小时数（一年的月份数 12 在其内）。 */
    x_labels: z.array(z.string()).min(1).max(24),
    /** 行头（沿纵轴，每行一个），1-10 项——1 项即单行热力图。 */
    y_labels: z.array(z.string()).min(1).max(10),
    /** 值矩阵，行优先：`values[row][col]`。行数必须等于 y_labels 长度、
     * 每行列数必须等于 x_labels 长度（下方 `.refine`）——不接受锯齿数组。
     * 无正负号约束（负值合法业务数据，如同比降幅）。 */
    values: z.array(z.array(z.number())).min(1),
    /** 显式色阶值域覆写，缺省取 values 的真实 min/max。`min===max`
     * （退化域）合法——渲染层落回统一中间色调，不是 schema 层拒收的
     * 病态（见 heatmap.tsx 的 `valueT`）。`min>max`（真正的顺序错误）
     * 才是 schema 层拒收的对象（下方 `.refine`）。 */
    domain: z.object({ min: z.number(), max: z.number() }).strict().optional(),
    /** 每格叠加显示数值（原样 `String(value)`，不做千分位/小数位格式化——
     * 格式化留给未来任务，v1 范围内如实展示原始数字）。缺省不显示。 */
    show_values: z.boolean().optional(),
    /** 横轴/纵轴整体说明（如「季度」/「地区」），复用 chart.tsx 的
     * axes.x_title/y_title 拟合机制——与 x_labels/y_labels（每列/每行的
     * 具体刻度）是两个不同语义层，同时可选、互不依赖。 */
    x_title: z.string().optional(),
    y_title: z.string().optional(),
    /** Print every Nth column label. See the describe below. */
    label_every: z
      .number()
      .int()
      .min(2)
      .max(12)
      .optional()
      .describe("Print every Nth column label from the first, such as 6 for a day's hours."),
    /** Named steps the values fall into. See the describe below. */
    steps: z
      .array(
        z
          .object({
            max: z
              .number()
              .optional()
              .describe("The step's highest value. The last step has none."),
            label: z
              .string()
              .refine((v) => v.trim() !== "", { message: "heatmap steps[].label must not be blank" })
              .describe('Its name in the key, such as "低谷" or "Off-peak".'),
            short: z
              .string()
              .refine((v) => v.trim() !== "", { message: "heatmap steps[].short must not be blank" })
              .optional()
              .describe('A shorter name the cells print, such as "谷" or "Off".'),
          })
          .strict(),
      )
      .min(2)
      .max(5)
      .optional()
      .describe(
        'Two to five named steps, lowest first, each cell coloured by the step its value falls in: [{ "max": 0.5, "label": "低谷", "short": "谷" }, { "label": "高峰" }]. Not with domain.',
      ),
    /** Runs of columns marked across every row. See the describe below. */
    bands: z
      .array(
        z
          .object({
            from: z.string().min(1).describe('The first column the run covers, written as its x_label, such as "6 月" or "Jun".'),
            to: z.string().min(1).describe('The last column it covers, written as its x_label, such as "9 月" or "Sep". The same as from for one column.'),
            label: z.string().min(1).describe('What the run is, printed under it, such as "2027 演唱会季 · 6 至 9 月" or "2027 season, Jun to Sep".'),
            icon: IconNameSchema.optional().describe("A symbol before the run's name, such as sun."),
          })
          .strict(),
      )
      .min(1)
      .max(2)
      .optional()
      .describe(
        'Up to two runs of columns marked across every row, each framed and named under the grid, such as the season a plan is built around: [{ "from": "6 月", "to": "9 月", "label": "2027 演唱会季 · 6 至 9 月" }]. from and to name two x_labels, from first, and two runs do not share a column.',
      ),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.steps) {
      const last = c.steps.length - 1
      c.steps.forEach((step, i) => {
        if (i < last && step.max === undefined) {
          ctx.addIssue({ code: "custom", path: ["steps", i, "max"], message: `heatmap steps[${i}] has no max. Every step but the last names the highest value it takes.` })
        }
        if (i === last && step.max !== undefined) {
          ctx.addIssue({ code: "custom", path: ["steps", i, "max"], message: `heatmap steps[${i}] is the last step and takes every value above the one before, so it has no max. Remove it, or add a step above.` })
        }
        const prev = i > 0 ? c.steps![i - 1]!.max : undefined
        if (i < last && step.max !== undefined && prev !== undefined && step.max <= prev) {
          ctx.addIssue({ code: "custom", path: ["steps", i, "max"], message: `heatmap steps[${i}].max is ${step.max}, not above the step before (${prev}). Write the steps lowest first.` })
        }
      })
      if (c.domain) {
        ctx.addIssue({ code: "custom", path: ["domain"], message: "heatmap has steps and a domain. The steps colour each cell by the step its value falls in, and a domain sets a continuous scale. Keep one of them." })
      }
    }
    if (c.label_every !== undefined && c.label_every >= c.x_labels.length) {
      ctx.addIssue({ code: "custom", path: ["label_every"], message: `heatmap label_every is ${c.label_every} and the grid has ${c.x_labels.length} column(s), so only the first label would print. Use a smaller step, or remove label_every.` })
    }
    if (!c.bands) return
    const at = (label: string) => c.x_labels.findIndex((x) => x.trim() === label.trim())
    const taken = new Set<number>()
    c.bands.forEach((band, k) => {
      const from = at(band.from)
      const to = at(band.to)
      for (const [key, i, label] of [["from", from, band.from], ["to", to, band.to]] as const) {
        if (i < 0) {
          ctx.addIssue({ code: "custom", path: ["bands", k, key], message: `heatmap bands[${k}].${key} is "${label}", and no x_label reads that. Name a column as x_labels writes it: ${c.x_labels.map((x) => `"${x}"`).join(", ")}.` })
        }
      }
      if (from < 0 || to < 0) return
      if (to < from) {
        ctx.addIssue({ code: "custom", path: ["bands", k], message: `heatmap bands[${k}] runs from "${band.from}" back to "${band.to}". Write the earlier column in from.` })
        return
      }
      for (let i = from; i <= to; i++) {
        if (taken.has(i)) {
          ctx.addIssue({ code: "custom", path: ["bands", k], message: `heatmap bands[${k}] covers "${c.x_labels[i]}", which another band already covers. Keep the runs apart.` })
          return
        }
      }
      for (let i = from; i <= to; i++) taken.add(i)
    })
  })
  .refine((c) => c.values.length === c.y_labels.length, {
    message: "heatmap values row count must equal y_labels length (one row per y_label)",
    path: ["values"],
  })
  .refine((c) => c.values.every((row) => row.length === c.x_labels.length), {
    message: "heatmap every values row's length must equal x_labels length (one column per x_label)",
    path: ["values"],
  })
  .refine((c) => !c.domain || c.domain.max >= c.domain.min, {
    message: "heatmap domain.max must be greater than or equal to domain.min",
    path: ["domain"],
  })

export const aliases = {
  block: {
    rows: "y_labels",
    columns: "x_labels",
    data: "values",
    range: "domain",
  },
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
  name: "Heat Grid",
  story: "A labelled grid where each cell's colour carries its value, read by shade before it is read by number. The density map a weather page prints.",
  positioning: "Choose it when the pattern across two labelled dimensions is the message. Use data_table when each figure has to be read exactly, and chart when one series carries the story.",
  audience: "Readers looking for where a value clusters or falls away.",
  notFor: "Figures that must be read precisely, which belong in data_table.",
}
