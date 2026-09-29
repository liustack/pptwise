import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"
import { CHART_AXIS_LIMIT } from "./chart"

// 数值轴家族（structure-components wave task 2）：另一支满幅组件——不是
// named-slot（swot/bmc 的具名槽治的是「弱模型排错序」），而是「运行合计/
// 比例映射必须逐字节确定性可推导」，见 waterfall.tsx/gantt.tsx 头注。
export const schema = z
  .object({
    type: z.literal("waterfall"),
    /** 瀑布桥图条目：`value` 是带符号增量（相对上一条运行合计的涨跌），
     * `kind` 缺省即普通涨跌делта；显式 "total" 表示该条不是增量而是绝对
     * 合计检查点（渲染层从 0 画到 `value` 本身，不参与增量累加）。3-8
     * 条——末条非 "total" 时渲染层自动补一根合计柱（见 waterfall.tsx）。 */
    items: z
      .array(
        z
          .object({
            label: z.string(),
            value: z.number(),
            kind: z.enum(["delta", "total"]).optional(),
          })
          .strict()
      )
      .min(3)
      .max(8),
    /** 数值单位后缀（如「万」「%」），附加在每条数值标签之后，纯展示。 */
    unit: z.string().optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    // Every bar is read against one value axis that runs from the lowest
    // running total to the highest. Past `CHART_AXIS_LIMIT` that axis cannot
    // be drawn: two bars of 1.7e308 overflow the running total to Infinity,
    // and one bar from -1.7e308 to 1.7e308 spans more than a double holds,
    // so every bar and label came out at NaN. The fix is one factor for
    // every bar, since they are read against one scale and one unit.
    const everyItem = c.items.map((item) => `"${item.label}"`).join(", ")
    const advice =
      `Divide every item (${everyItem}) by the same power of ten, so the bars keep their proportions, ` +
      `and name the unit in the unit field, for example 3.2 with unit "M" for 3200000.`
    let valuePast = false
    c.items.forEach((item, i) => {
      if (Math.abs(item.value) <= CHART_AXIS_LIMIT) return
      valuePast = true
      ctx.addIssue({
        code: "custom",
        path: ["items", i, "value"],
        message: `items[${i}] ("${item.label}") has ${item.value}, beyond plus or minus ${CHART_AXIS_LIMIT}, the largest value a chart axis can draw. ${advice}`,
      })
    })
    if (valuePast) return
    // Each value can sit under the ceiling while the running total climbs
    // past it. The closing total the renderer adds is that same running
    // total, so this covers it too. Named once, where it first crosses.
    let running = 0
    for (const [i, item] of c.items.entries()) {
      running = item.kind === "total" ? item.value : running + item.value
      if (Math.abs(running) <= CHART_AXIS_LIMIT) continue
      ctx.addIssue({
        code: "custom",
        path: ["items", i, "value"],
        message: `the running total reaches ${running} at items[${i}] ("${item.label}"), beyond plus or minus ${CHART_AXIS_LIMIT}, the largest value a chart axis can draw. ${advice}`,
      })
      return
    }
  })

export const aliases = {
  items: [{ itemsKey: "items", aliases: { amount: "value" } }],
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
  name: "Bridge",
  story: "Bars stepping up and down from a running total, each labelled with what added or removed it, closing on the balance. The bridge chart in a results pack.",
  positioning: "Choose it when the audience must see how a figure got from one total to another. Use chart for levels and trends rather than the movements between them.",
  audience: "Readers asking where the difference came from.",
  notFor: "Levels over time, which belong in a chart.",
}
