import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"

/** One plotted datum. `x` is a category label (string) or a numeric
 * coordinate (number); `y` is always numeric. `size` is scatter-only (see
 * the chart_type `.describe()` below): an optional per-point magnitude that
 * turns a scatter dot into a bubble whose radius scales with it. Every other
 * chart_type ignores `size`. */
const ChartPointSchema = z
  .object({
    x: z.union([z.string(), z.number()]),
    y: z.number(),
    size: z.number().nonnegative().optional(),
  })
  .strict()

/**
 * Chart types that draw exactly one series and name its parts on the marks
 * themselves: a pie, a donut, a funnel and a gauge are each one whole divided
 * into named parts (slice labels, band labels, the gauge's own number).
 *
 * The renderers have always read `series[0]` and nothing else, and the legend
 * rule (`components/chart.tsx`'s `legendApplicable`) excludes these types
 * because a legend would either repeat the marks or name a series the chart
 * never drew. Neither statement was an invariant until this list moved here:
 * a two-series pie was schema-legal, and the renderer painted the first
 * series and dropped the second's name, point names and values with no
 * validate error and no `data-dropped` on the page. The exclusion is stated
 * where the contract is stated, so validate can hold authors to it.
 */
export const SINGLE_SERIES_TYPES = ["pie", "donut", "funnel", "gauge"] as const

/**
 * Chart types whose renderer sums the series into a whole and reads each
 * point as a share of it. A total of zero has no shares to draw: every
 * renderer here used to return an empty fragment, so the series name, every
 * point name and every value left the page with no error and no mark.
 * Nothing downstream can repair that, so it is refused here.
 */
const WHOLE_SHARE_TYPES = ["pie", "donut", "funnel"] as const

/**
 * Chart types that fold their points onto a shared category axis, keeping the
 * first value seen for each category and discarding every later one
 * (`components/chart-model.ts`'s `buildChartModel`).
 *
 * Exactly the types where a repeated x costs the author a number: a line with
 * `A:10, A:99, B:20` drew two ticks, printed `10` and `20`, and left `99`
 * nowhere on the page with no `data-dropped` and no `data-truncated` to find
 * it by.
 *
 * Deliberately not every chart type. A `scatter` is a point cloud whose whole
 * job is several y's at one x, and a pie, donut, funnel or dumbbell reads its
 * points in order without folding them, so two same-named slices are two
 * slices and nothing is lost. Those keep `ir-quality`'s advisory
 * `chart_duplicate_category` warning, which is what a repeated label means
 * there: possibly a typo, never a dropped value.
 */
const CATEGORY_FOLDING_TYPES = ["bar", "line", "area"] as const

export const schema = z
  .object({
    type: z.literal("chart"),
    /** dumbbell（2026-07-12 借鉴）：哑铃变化图——series[0]=起点值、
     * series[1]=终点值（等长同 x 标签），每行「起点●———●终点」显变化。
     * bar 可加 direction:"horizontal" 横条排名（长标签友好）。
     * pie 可加 style:"donut" 环形+中心总值。
     * scatter：数值 x/y 点集，点可选 size（即 bubble）。
     * area：line 的基线闭合填充变体。donut：pie 的环形子型（可选中心总值）。
     * gauge：单值对目标的完成度半环。 */
    chart_type: z
      .enum(["bar", "line", "pie", "funnel", "dumbbell", "scatter", "area", "donut", "gauge"])
      .describe(
        "How to plot the series. bar/line: a category axis of trends or comparisons. " +
          "scatter: a numeric x-y point cloud — use when BOTH axes are quantities (add an optional per-point `size` to make it a bubble chart); if x is a category label, use line/bar instead. " +
          "area: a line with the region under it filled to the baseline, for volume/cumulative emphasis. " +
          "pie: part-to-whole share. donut: the ring form of pie (set `center_total: true` to print the summed total big in the middle). " +
          "funnel: one value narrowing across ordered stages. dumbbell: a from→to change per row. " +
          "gauge: ONE value's progress toward a target, drawn as a filled half-ring with the number centered — reach for it for a single completion metric (e.g. 62% of goal). For several independent headline metrics side by side use `kpi_cards`, never a row of gauges.",
      ),
    direction: z.enum(["horizontal", "vertical"]).optional(),
    style: z.enum(["donut"]).optional(),
    /** `chart_type: "donut"` only: print the summed total as a big number in
     * the ring's hollow center (default: empty center). The legacy
     * `chart_type: "pie"` + `style: "donut"` form always shows that center
     * total; this flag is the opt-in switch for the dedicated `donut`
     * chart_type. Ignored by every other chart_type. */
    center_total: z.boolean().optional(),
    /** `chart_type: "gauge"` only: the numeric range the filled arc spans.
     * `min` defaults to 0 and `max` to 100, so a bare gauge reads its single
     * value as a percentage of 100. Provide both to score against a custom
     * target (e.g. `{ min: 0, max: 200 }` with a value of 150 fills 75%).
     * Ignored by every other chart_type. */
    gauge: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .strict()
      .optional(),
    /** Renders only for `chart_type: "bar"` (either direction), `"line"`,
     * `"scatter"`, and `"area"` — a cartesian plot box with a real
     * category/value axis pair to title and grid against. Ignored
     * (schema-legal, silently dropped at render, warn-severity
     * `chart_axes_ignored` validate finding) on `pie`/`donut`/`funnel`/
     * `dumbbell`/`gauge`, which have no such plot box. */
    axes: z
      .object({
        x_title: z.string().optional(),
        y_title: z.string().optional(),
        /** Unit suffix on x-axis tick labels (`周`, `%`, `weeks`). */
        x_unit: z.string().optional(),
        /** Unit suffix on y-axis tick labels (`%`, `千`). */
        y_unit: z.string().optional(),
        show_grid: z.boolean().optional(),
      })
      .strict()
      .optional(),
    series: z.array(
      z
        .object({
          name: z.string(),
          data: z.array(ChartPointSchema),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((c, ctx) => {
    // A line or an area series carries its identity at the end of its own
    // line — `name value` in the label gutter, which is the only place those
    // two types name a series now that neither draws a legend. A series with
    // no points has no end to be named at, so the author's `name` reaches
    // the page nowhere and nothing on the page or in the audit says so. The
    // renderer cannot rescue it and the fidelity scan is right to call it a
    // loss, so the boundary belongs here: an empty series is not a chart
    // with a gap, it is a series nobody wrote.
    if (c.chart_type === "line" || c.chart_type === "area") {
      c.series.forEach((s, i) => {
        if (s.data.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["series", i, "data"],
            message: `series "${s.name}" has no data points — ${c.chart_type} charts name each series at the end of its own line, so a series with nothing to draw reaches the page nowhere`,
          })
        }
      })
    }
    // scatter needs genuine numeric coordinates on both axes — a string `x`
    // is the model reaching for `line`/`bar` (category axis) by the wrong
    // name. Point the message at the exact offending point so the fix is
    // mechanical, same "name the row and key" discipline data-table's own
    // superRefine uses.
    if (c.chart_type === "scatter") {
      c.series.forEach((s, si) =>
        s.data.forEach((d, di) => {
          if (typeof d.x !== "number") {
            ctx.addIssue({
              code: "custom",
              path: ["series", si, "data", di, "x"],
              message:
                `scatter charts plot numeric x-y pairs, but series[${si}].data[${di}].x is the string "${d.x}". ` +
                "Give each point a numeric x (add an optional `size` for a bubble). " +
                'For a category x-axis use chart_type "line" or "bar" instead.',
            })
          }
        }),
      )
    }
    // gauge is a single value's completion, not a series — exactly one series
    // with exactly one point. The redirect to kpi_cards is the same
    // gauge-vs-kpi boundary the chart_type `.describe()` draws.
    if (c.chart_type === "gauge") {
      const points = c.series.reduce((n, s) => n + s.data.length, 0)
      if (c.series.length !== 1 || points !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["series"],
          message:
            `gauge shows one value's progress toward a target: provide exactly one series with exactly one data point ` +
            `({ x: <label>, y: <value> }), got ${c.series.length} series / ${points} point(s). ` +
            "For several independent metrics side by side use kpi_cards, not a gauge each.",
        })
      }
      const min = c.gauge?.min ?? 0
      const max = c.gauge?.max ?? 100
      if (max <= min) {
        ctx.addIssue({
          code: "custom",
          path: ["gauge", "max"],
          message: `gauge max (${max}) must be greater than min (${min}).`,
        })
      }
    }
    // One whole, one series. `gauge` says this in its own words above (one
    // series, one point), so it is left to that message rather than given a
    // second, vaguer one.
    if (SINGLE_SERIES_TYPES.includes(c.chart_type as (typeof SINGLE_SERIES_TYPES)[number])) {
      if (c.chart_type !== "gauge" && c.series.length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["series"],
          message:
            `a ${c.chart_type} divides one whole into named parts and draws exactly one series, got ${c.series.length}. ` +
            `It names those parts on the marks themselves and has no legend, so a second series would reach the page nowhere. ` +
            `Keep one series, or use chart_type "bar" or "line" to compare several.`,
        })
      }
    }
    if (WHOLE_SHARE_TYPES.includes(c.chart_type as (typeof WHOLE_SHARE_TYPES)[number])) {
      c.series.forEach((s, si) => {
        // Same boundary the empty line/area series is refused at, for the
        // same reason. A pie, donut or funnel is one whole divided into named
        // parts, and it names those parts on the marks themselves — with no
        // parts there are no marks, so the series name and everything under
        // it reach the page nowhere. The renderer's answer was a page of
        // nothing carrying `data-dropped-silent="0"`, a count the export gate
        // reads as no loss at all: validate passed, the preview was blank and
        // the file shipped.
        if (s.data.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["series", si, "data"],
            message: `series "${s.name}" has no data points — ${c.chart_type} charts divide one whole into named parts drawn from the points themselves, so a series with nothing to draw reaches the page nowhere`,
          })
          return
        }
        const total = s.data.reduce((sum, d) => sum + d.y, 0)
        if (total > 0) return
        ctx.addIssue({
          code: "custom",
          path: ["series", si, "data"],
          message:
            `a ${c.chart_type} draws each point as a share of the total, and series[${si}] ("${s.name}") totals ${total}. ` +
            `Nothing can be drawn from a total of zero or less, so the whole component would leave the page. ` +
            `Give the points values that sum above zero, or use chart_type "bar" for figures that can be negative.`,
        })
      })
    }
    // A repeated category inside one series is a value the author wrote and
    // the page never shows. `buildChartModel` keeps the first y for each
    // category and drops the rest, and it drops them without a mark — the
    // chart draws a clean, complete-looking series with a number missing out
    // of the middle of it. Nothing downstream can repair that, so it is
    // refused here, the same rule that refuses a series whose name cannot
    // reach the page.
    //
    // The key mirrors `chart-model.ts`'s own `categoryKeyOf`: the type tag
    // keeps `x: "1"` and `x: 1` apart, since the schema admits both and the
    // model treats them as different categories.
    if (CATEGORY_FOLDING_TYPES.includes(c.chart_type as (typeof CATEGORY_FOLDING_TYPES)[number])) {
      c.series.forEach((s, si) => {
        const seen = new Set<string>()
        s.data.forEach((d, di) => {
          const key = typeof d.x === "number" ? `n:${d.x}` : `s:${d.x}`
          if (!seen.has(key)) {
            seen.add(key)
            return
          }
          ctx.addIssue({
            code: "custom",
            path: ["series", si, "data", di, "x"],
            message:
              `series[${si}] ("${s.name}") repeats the category "${d.x}", and a ${c.chart_type} keeps only the first value for each category — ` +
              `this point's y would leave the page with nothing on it or in the audit to say so. ` +
              `Give each point in a series its own category, or split the repeats into separate series.`,
          })
        })
      })
    }
    // A dumbbell is one row read left to right: series[0] is where each row
    // started and series[1] is where it ended. The renderer has always taken
    // that on trust, reading two series and `Math.min` of their lengths, so a
    // third series drew a legend entry with no marks under it and an uneven
    // pair silently lost the longer one's tail.
    if (c.chart_type === "dumbbell") {
      if (c.series.length !== 2) {
        ctx.addIssue({
          code: "custom",
          path: ["series"],
          message:
            `a dumbbell draws one from-to change per row, so it takes exactly two series (the from values and the to values), got ${c.series.length}. ` +
            `For more than two moments in a series use chart_type "line".`,
        })
      } else if (c.series[0]!.data.length !== c.series[1]!.data.length) {
        ctx.addIssue({
          code: "custom",
          path: ["series", 1, "data"],
          message:
            `a dumbbell pairs the two series row by row, so both need the same number of points and the same labels, ` +
            `got ${c.series[0]!.data.length} in series[0] ("${c.series[0]!.name}") and ${c.series[1]!.data.length} in series[1] ("${c.series[1]!.name}").`,
        })
      }
    }
  })

export const aliases = {} satisfies ComponentAliasSpec

export const traits = {
  stretchable: true,
  selfVisual: false,
  scalable: true,
  passthroughShell: false,
  fullBody: false,
  evidence: true,
} as const satisfies ComponentTraits
