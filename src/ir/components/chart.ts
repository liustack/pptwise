import { z } from "zod"
import { isPercentUnit } from "../../lib/quantity-format"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

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
    /** A value nobody has reported yet. See `POINT_STATUS_TYPES`. */
    status: z
      .enum(["forecast", "target"])
      .optional()
      .describe(
        'A value that is not a reported figure. "forecast" is an estimate of what will happen: its bar is hatched, and a lone bar\'s label says it is a forecast. ' +
          '"target" is a level a plan calls for: its bar is drawn as a dashed outline. Bar and stacked charts only.',
      ),
  })
  .strict()

/**
 * Chart types whose points may carry a `status`: the ones that draw each
 * point as a bar of its own, where a hatched or outlined bar can say the
 * value is not a reported one. A line, an area or a slice has no such mark.
 */
export const POINT_STATUS_TYPES = ["bar", "stacked"] as const

/**
 * Chart types that can draw `changes`: a bracket between two upright bars
 * or columns, or a figure at the end of a horizontal bar.
 */
export const CHANGE_TYPES = ["bar", "stacked"] as const

/** The most `changes` one chart draws. Past three, the brackets crowd the bars they read. */
export const MAX_CHART_CHANGES = 3

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
export const CATEGORY_FOLDING_TYPES = ["bar", "line", "area", "stacked", "percent_stacked", "combo"] as const

/**
 * Chart types that pile each category's series into one column: `stacked`
 * keeps the amounts, `percent_stacked` scales every column to 100%.
 *
 * Both need two series at least. One series piled on nothing is a plain bar
 * with a different name, and for `percent_stacked` it is a column that reads
 * 100% everywhere, which says nothing at all.
 */
export const STACKED_TYPES = ["stacked", "percent_stacked"] as const

/**
 * The largest magnitude a value on a chart's value axis, or a stacked column
 * total, may reach.
 *
 * A value axis pads its range and rounds it out to nice ticks, so its top tick
 * lands at up to a few times the largest value it holds, and past a point no
 * finite tick can reach it: a plain bar of 1.7e308 walked its ticks toward an
 * end that had overflowed to `Infinity` and threw a `RangeError`, and a
 * scatter or a dumbbell drew its points at `NaN`. A stacked total is a sum, so
 * it can leave the doubles on its own (`1e308 + 1e308` is `Infinity`), and
 * the column, the axis and the printed total then all come out as `Infinity`
 * or `NaN`. The ceiling leaves eight orders of magnitude for the axis to grow
 * into, and no figure a slide reports comes near it.
 *
 * It applies to every value on a value axis: every `y` of `bar` (either
 * direction), `line`, `area`, `scatter`, `dumbbell` and `combo`, a scatter's
 * `x`, and a stacked column's total. `percent_stacked` needs none, since it
 * scales each column before summing it and its axis is always 0% to 100%.
 * A `waterfall` reads its bars against a value axis of its own, so every
 * item's value and every running total a bar ends at is held to it too
 * (`waterfall.ts`).
 */
export const CHART_AXIS_LIMIT = 1e300

/**
 * Chart types that read every value against one value axis the renderer
 * builds from the values themselves. `combo` has two axes and its own message
 * below, and `stacked` is held to the ceiling by its column totals.
 */
const ONE_AXIS_TYPES = ["bar", "line", "area", "scatter", "dumbbell"] as const

/** Chart types whose columns stand upright only. `direction` belongs to bar. */
const UPRIGHT_ONLY_TYPES = ["stacked", "percent_stacked", "combo"] as const

/**
 * Chart types whose series each take their own palette color on one plot box,
 * so one of them can be singled out by keeping its color and turning the
 * rest grey.
 *
 * A pie, a donut, a funnel and a gauge draw one series. A dumbbell's two
 * series are a from and a to painted in fixed colors, so there is no third
 * color to spend on one of them.
 */
export const SERIES_EMPHASIS_TYPES = ["bar", "line", "area", "scatter", "stacked", "percent_stacked", "combo"] as const

type ChartInput = {
  chart_type: string
  direction?: "horizontal" | "vertical"
  axes?: { y_unit?: string }
  changes?: { from: string; to: string; at?: string }[]
  series: { name: string; data: { x: string | number; y: number }[] }[]
}

/**
 * The rules a chart's `changes` keep: each names two bars the chart draws,
 * and a figure can be computed between them.
 *
 * Without `at`, from and to are categories, and the change runs between
 * their columns: a stacked column's total, or the one bar a category carries
 * on a bar chart. A category with two bars has no one value to read. With
 * `at`, from and to are series compared at one category, which a stacked
 * column cannot show apart and a horizontal bar chart needs, since its rows
 * have no room for a bracket between them.
 */
function checkChanges(c: ChartInput, ctx: z.RefinementCtx): void {
  if (!CHANGE_TYPES.includes(c.chart_type as (typeof CHANGE_TYPES)[number])) {
    ctx.addIssue({
      code: "custom",
      path: ["changes"],
      message:
        `changes are drawn between two bars, and a ${c.chart_type} chart has none. ` +
        `Use chart_type ${CHANGE_TYPES.map((t) => `"${t}"`).join(" or ")}, or state the change in the page's text.`,
    })
    return
  }
  const percent = isPercentUnit(c.axes?.y_unit)
  const horizontal = c.chart_type === "bar" && c.direction === "horizontal"
  const valueAt = (series: ChartInput["series"][number], x: string) =>
    series.data.find((d) => d.x === x)?.y
  c.changes!.forEach((change, k) => {
    const path = ["changes", k]
    if (change.from === change.to) {
      ctx.addIssue({ code: "custom", path, message: `changes[${k}] runs from "${change.from}" to itself. Name two different bars.` })
      return
    }
    let first: number | undefined
    if (change.at === undefined) {
      if (horizontal) {
        ctx.addIssue({
          code: "custom",
          path,
          message:
            `changes[${k}] compares two categories, and a horizontal bar chart has no room for a bracket between its rows. ` +
            `Write at with the category, and from and to with the two series whose bars it compares there.`,
        })
        return
      }
      for (const x of [change.from, change.to]) {
        const bars = c.series.filter((s) => valueAt(s, x) !== undefined).length
        if (bars === 0) {
          ctx.addIssue({
            code: "custom",
            path,
            message: `changes[${k}] names the category "${x}", and no series has a value there. Without at, from and to are categories (x values) of the chart.`,
          })
          return
        }
        if (bars > 1 && c.chart_type !== "stacked") {
          ctx.addIssue({
            code: "custom",
            path,
            message:
              `changes[${k}] runs to the category "${x}", which carries ${bars} bars, so there is no one value to compare. ` +
              `Write at with the category and name two series in from and to, or use chart_type "stacked" to compare column totals.`,
          })
          return
        }
      }
      first = c.series.reduce((sum, s) => sum + (valueAt(s, change.from) ?? 0), 0)
    } else {
      if (c.chart_type === "stacked") {
        ctx.addIssue({
          code: "custom",
          path: [...path, "at"],
          message: `changes[${k}] compares two series inside one stacked column, which piles them into one bar. Remove at and compare two categories' columns instead.`,
        })
        return
      }
      for (const name of [change.from, change.to]) {
        const series = c.series.find((s) => s.name === name)
        if (series === undefined) {
          ctx.addIssue({
            code: "custom",
            path,
            message: `changes[${k}] names the series "${name}", and the chart has none by that name. With at, from and to are series names: ${c.series.map((s) => `"${s.name}"`).join(", ")}.`,
          })
          return
        }
        if (valueAt(series, change.at) === undefined) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "at"],
            message: `changes[${k}] compares the series at "${change.at}", and series "${name}" has no value there.`,
          })
          return
        }
      }
      first = valueAt(c.series.find((s) => s.name === change.from)!, change.at)
    }
    if (!percent && !(first! > 0)) {
      ctx.addIssue({
        code: "custom",
        path,
        message:
          `changes[${k}] is stated as a relative change from ${first}, and a change relative to zero or less has no figure. ` +
          `Compare against a bar above zero, or put the values in percent (axes.y_unit "%") to state the change in points.`,
      })
    }
  })
}

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
      .enum([
        "bar",
        "line",
        "pie",
        "funnel",
        "dumbbell",
        "scatter",
        "area",
        "donut",
        "gauge",
        "stacked",
        "percent_stacked",
        "combo",
      ])
      .describe(
        "How to plot the series. bar/line: a category axis of trends or comparisons. " +
          "stacked: each category's series piled into one column, so the total and its parts show together (two or more series, negative values pile down from zero, and the column total is printed above it). " +
          "percent_stacked: the same piles scaled so every column reaches 100%, to compare make-up rather than size (two or more series, no negative values, every category must add up above zero). " +
          "combo: bars and lines on one category axis, for two measures that share a period, such as revenue as columns and margin as a line. Mark each line series with `plot: \"line\"` (the rest are bars). It needs at least one of each. Put a series on `axis: \"right\"` to give it its own scale on a right-hand axis, titled by axes.y2_title / axes.y2_unit. " +
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
     * `"scatter"`, `"area"`, `"stacked"` and `"percent_stacked"` (whose
     * `y_unit` may only be `%`, since its axis always reads 0% to 100%) —
     * a cartesian plot box with a real
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
        /** `chart_type: "combo"` only: title of the right-hand value axis,
         * which exists when a series sets `axis: "right"`. */
        y2_title: z.string().optional(),
        /** `chart_type: "combo"` only: unit suffix on the right-hand axis's
         * tick labels. */
        y2_unit: z.string().optional(),
        show_grid: z.boolean().optional(),
      })
      .strict()
      .optional(),
    /** Changes the chart states between two of its bars. See the describe below. */
    changes: z
      .array(
        z
          .object({
            from: z.string(),
            to: z.string(),
            at: z.string().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_CHART_CHANGES)
      .optional()
      .describe(
        "Up to three changes the chart states between two of its bars, each printed as a figure: a relative change (\"+11%\"), or a change in points when the value axis is in percent. " +
          "Without `at`, from and to name two categories (x values), and the change runs between their columns, set as a bracket over them: each category must carry one bar, or the chart must be stacked. " +
          "With `at`, from and to name two series and `at` the category where their bars are compared. The change is set beside the later bar. " +
          "A change that ends on the marked series is set in the lead colour. Bar and stacked charts only.",
      ),
    series: z.array(
      z
        .object({
          name: z.string(),
          data: z.array(ChartPointSchema),
          /** `chart_type: "combo"` only: draw this series as bars (the
           * default) or as a line. */
          plot: z
            .enum(["bar", "line"])
            .optional()
            .describe('combo only: "line" draws this series as a line over the bars, and omitted or "bar" draws it as bars.'),
          /** `chart_type: "combo"` only: which value axis this series is
           * read against. `"right"` gives it its own scale on a right-hand
           * axis, and omitted or `"left"` shares the left one. */
          axis: z
            .enum(["left", "right"])
            .optional()
            .describe('combo only: "right" reads this series against its own right-hand axis (for a second unit, such as a rate beside amounts), and omitted or "left" shares the left axis.'),
          /** Singles this series out: it keeps the first palette color and
           * every other series turns grey. In a combo, a marked line also
           * prints its value at each point when they all fit. */
          emphasis: z
            .boolean()
            .optional()
            .describe(
              "Marks the one series the page is about. It keeps the lead color and the others turn grey. At most one series, on bar, line, area, scatter, stacked, percent_stacked or combo charts with two or more series. A marked combo line also prints its values.",
            ),
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
        // nothing carrying a `data-dropped` count of zero, which the export
        // gate reads as no loss at all: validate passed, the preview was
        // blank and the file shipped.
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
    // A pile needs something to pile. One series in a `stacked` chart is a
    // bar chart by another name, and one in a `percent_stacked` chart is a
    // column that reads 100% in every category. Neither is what the author
    // meant, so name the chart that does what one series can.
    if (STACKED_TYPES.includes(c.chart_type as (typeof STACKED_TYPES)[number]) && c.series.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["series"],
        message:
          c.chart_type === "stacked"
            ? `a stacked chart piles several series into one column per category, so it needs at least two series, got ${c.series.length}. ` +
              `For one series use chart_type "bar".`
            : `a percent_stacked chart splits each category's column into the shares of its series, so it needs at least two series, got ${c.series.length}. ` +
              `One series fills every column to 100% and says nothing. For one whole split into parts use chart_type "pie".`,
      })
    }
    if (UPRIGHT_ONLY_TYPES.includes(c.chart_type as (typeof UPRIGHT_ONLY_TYPES)[number]) && c.direction === "horizontal") {
      ctx.addIssue({
        code: "custom",
        path: ["direction"],
        message:
          `a ${c.chart_type} chart draws upright columns only, and direction "horizontal" would be ignored. ` +
          `Remove direction, or use chart_type "bar" with direction "horizontal" for side-by-side horizontal bars.`,
      })
    }
    // A stacked column's height is a sum. Each side of the zero line has to
    // stay under the ceiling on its own, since the axis runs from the
    // deepest negative pile to the tallest positive one.
    if (c.chart_type === "stacked") {
      const piles = new Map<string, { x: string | number; up: number; down: number }>()
      for (const s of c.series) {
        for (const d of s.data) {
          const key = typeof d.x === "number" ? `n:${d.x}` : `s:${d.x}`
          const pile = piles.get(key) ?? { x: d.x, up: 0, down: 0 }
          if (d.y > 0) pile.up += d.y
          else pile.down += d.y
          piles.set(key, pile)
        }
      }
      // Every series in a stacked chart sits on the one axis, so the fix is
      // one factor for all of them. Dividing only the series that looks large
      // would change what each column is made of.
      const everySeries = c.series.map((s) => `"${s.name}"`).join(", ")
      for (const { x, up, down } of piles.values()) {
        for (const [side, sum] of [
          ["positive", up],
          ["negative", -down],
        ] as const) {
          if (sum <= CHART_AXIS_LIMIT) continue
          ctx.addIssue({
            code: "custom",
            path: ["series"],
            message:
              `the ${side} values in category "${x}" add up to ${side === "positive" ? "more than " : "less than -"}${CHART_AXIS_LIMIT}, beyond what a chart axis can draw. ` +
              `Divide every value in every series (${everySeries}) by the same power of ten, so the columns keep their proportions, ` +
              `and name the unit in axes.y_unit, for example 3.2 with y_unit "M" for 3200000.`,
          })
        }
      }
    }
    if (c.chart_type === "percent_stacked") {
      // A share of a total is never negative. A loss inside a column is what
      // `stacked` is for: it piles negative values down from zero.
      let negative = false
      c.series.forEach((s, si) =>
        s.data.forEach((d, di) => {
          if (d.y >= 0) return
          negative = true
          ctx.addIssue({
            code: "custom",
            path: ["series", si, "data", di, "y"],
            message:
              `a percent_stacked chart draws each value as a share of its category's total, and series[${si}] ("${s.name}") has ${d.y} for "${d.x}". ` +
              `A share cannot be negative. Use chart_type "stacked" to show gains and losses, which piles negative values below the zero line.`,
          })
        }),
      )
      // A category whose values add up to zero has no shares to draw. The
      // column would be empty with nothing on the page to say why, and an
      // empty column reads as missing data rather than as a real zero. It is
      // refused here, the same boundary a pie with a zero total stops at.
      if (!negative) {
        const totals = new Map<string, { x: string | number; total: number }>()
        for (const s of c.series) {
          for (const d of s.data) {
            const key = typeof d.x === "number" ? `n:${d.x}` : `s:${d.x}`
            const entry = totals.get(key) ?? { x: d.x, total: 0 }
            entry.total += d.y
            totals.set(key, entry)
          }
        }
        for (const { x, total } of totals.values()) {
          if (total > 0) continue
          ctx.addIssue({
            code: "custom",
            path: ["series"],
            message:
              `a percent_stacked chart scales each category to 100%, and category "${x}" adds up to 0 across every series, so it has no shares to draw. ` +
              `Remove the category, give it values, or use chart_type "stacked" to show absolute amounts.`,
          })
        }
      }
      const unit = c.axes?.y_unit
      if (unit !== undefined && unit !== "%" && unit !== "％") {
        ctx.addIssue({
          code: "custom",
          path: ["axes", "y_unit"],
          message:
            `a percent_stacked value axis always reads 0% to 100%, so y_unit "${unit}" cannot apply. ` +
            `Remove y_unit, and say what the shares are of in axes.y_title.`,
        })
      }
    }
    // `plot` and `axis` choose a mark and a scale inside a combo. On any other
    // chart type nothing reads them, and a line the author asked for would
    // silently come out as whatever that chart draws.
    if (c.chart_type !== "combo") {
      c.series.forEach((s, si) => {
        for (const key of ["plot", "axis"] as const) {
          if (s[key] === undefined) continue
          ctx.addIssue({
            code: "custom",
            path: ["series", si, key],
            message:
              `series[${si}].${key} only applies to chart_type "combo", which mixes bars and lines, and a ${c.chart_type} chart ignores it. ` +
              `Remove ${key}, or use chart_type "combo" to draw some series as bars and some as lines.`,
          })
        }
      })
    }
    // Emphasis takes one series out of the palette and greys the rest, which
    // only says something where several series share one plot box in their
    // own colors. Two marked series are two answers, and the grey is gone.
    const marked = c.series.flatMap((s, si) => (s.emphasis === true ? [si] : []))
    if (marked.length > 0) {
      const applies = SERIES_EMPHASIS_TYPES.includes(c.chart_type as (typeof SERIES_EMPHASIS_TYPES)[number])
      if (!applies || c.series.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["series", marked[0]!, "emphasis"],
          message: !applies
            ? `series emphasis keeps one series in color and turns the others grey, and a ${c.chart_type} chart does not color its series one by one. ` +
              `Remove emphasis, or use chart_type ${SERIES_EMPHASIS_TYPES.map((t) => `"${t}"`).join(", ")}.`
            : `series emphasis singles one series out from the others, and this chart has only one series. Remove emphasis, or add the series it stands out from.`,
        })
      } else if (marked.length > 1) {
        ctx.addIssue({
          code: "custom",
          path: ["series", marked[1]!, "emphasis"],
          message:
            `${marked.length} series are marked with emphasis, and a chart singles out one: two marked series read as two answers, and the grey that sets them apart is gone. ` +
            `Keep emphasis on the one series the page is about.`,
        })
      }
    }
    // A status says how a bar is drawn: hatched for a forecast, a dashed
    // outline for a target. A chart that draws no bar of its own for a
    // point has nowhere to say it, and the reader would take the estimate
    // for a reported figure.
    if (!POINT_STATUS_TYPES.includes(c.chart_type as (typeof POINT_STATUS_TYPES)[number])) {
      c.series.forEach((s, si) =>
        s.data.forEach((d, di) => {
          if (d.status === undefined) return
          ctx.addIssue({
            code: "custom",
            path: ["series", si, "data", di, "status"],
            message:
              `status marks a bar as a ${d.status} rather than a reported figure, and a ${c.chart_type} chart draws no bar of its own for "${d.x}". ` +
              `Use chart_type ${POINT_STATUS_TYPES.map((t) => `"${t}"`).join(" or ")}, or say which values are ${d.status}s in the series name.`,
          })
        }),
      )
    }
    if (c.changes !== undefined) checkChanges(c, ctx)
    const rightSeries = c.chart_type === "combo" ? c.series.filter((s) => s.axis === "right").length : 0
    for (const key of ["y2_title", "y2_unit"] as const) {
      if (c.axes?.[key] === undefined || rightSeries > 0) continue
      ctx.addIssue({
        code: "custom",
        path: ["axes", key],
        message:
          c.chart_type === "combo"
            ? `axes.${key} labels the right-hand axis, and no series here is on it. Set axis: "right" on the series that needs its own scale, or remove ${key}.`
            : `axes.${key} labels the right-hand axis of a combo chart, and a ${c.chart_type} chart has none. Remove ${key}, or use chart_type "combo" with a series on axis: "right".`,
      })
    }
    // Every value on a value axis stays under the ceiling, or no finite tick
    // can reach it. The fix is one factor for every series on the axis, since
    // they are read against one scale and one unit, and dividing only the
    // series that is too large changes how it compares with the others.
    if (ONE_AXIS_TYPES.includes(c.chart_type as (typeof ONE_AXIS_TYPES)[number])) {
      const everySeries = c.series.map((s) => `"${s.name}"`).join(", ")
      // Where the unit goes: the field that labels the value axis. A
      // horizontal bar's value axis runs along x. A dumbbell prints no axis,
      // and its two series' names are what its legend shows.
      const unitAt = (axis: "x" | "y") =>
        c.chart_type === "dumbbell"
          ? `and name the unit in both series' names, for example 3.2 with "(M)" in the name for 3200000.`
          : `and name the unit in axes.${axis}_unit, for example 3.2 with "M" for 3200000.`
      const valueAxis = c.chart_type === "bar" && c.direction === "horizontal" ? "x" : "y"
      c.series.forEach((s, si) =>
        s.data.forEach((d, di) => {
          if (Math.abs(d.y) > CHART_AXIS_LIMIT) {
            ctx.addIssue({
              code: "custom",
              path: ["series", si, "data", di, "y"],
              message:
                `series[${si}] ("${s.name}") has ${d.y} for "${d.x}", beyond plus or minus ${CHART_AXIS_LIMIT}, the largest value a chart axis can draw. ` +
                `Divide every series (${everySeries}) by the same power of ten, so they keep their proportions, ` +
                unitAt(valueAxis),
            })
          }
          // A scatter's x is a quantity on an axis of its own.
          if (c.chart_type === "scatter" && typeof d.x === "number" && Math.abs(d.x) > CHART_AXIS_LIMIT) {
            ctx.addIssue({
              code: "custom",
              path: ["series", si, "data", di, "x"],
              message:
                `series[${si}] ("${s.name}") has x ${d.x}, beyond plus or minus ${CHART_AXIS_LIMIT}, the largest value a chart axis can draw. ` +
                `Divide the x of every point in every series (${everySeries}) by the same power of ten, so they keep their proportions, ` +
                unitAt("x"),
            })
          }
        }),
      )
    }
    // A combo's values sit on one of two axes, and the right one is built to
    // share the left one's rows, which stretches its range further still.
    // Past the ceiling neither can be built: a right line of 1.7e308 drew a
    // point at cy="NaN".
    // The fix is one factor for everything on that value's axis: series on
    // one axis are read against one scale and one unit, so dividing only the
    // series that is too large changes how it compares with the others.
    if (c.chart_type === "combo") {
      const peers = (right: boolean) =>
        c.series
          .filter((s) => (s.axis === "right") === right)
          .map((s) => `"${s.name}"`)
          .join(", ")
      c.series.forEach((s, si) =>
        s.data.forEach((d, di) => {
          if (Math.abs(d.y) <= CHART_AXIS_LIMIT) return
          const right = s.axis === "right"
          ctx.addIssue({
            code: "custom",
            path: ["series", si, "data", di, "y"],
            message:
              `series[${si}] ("${s.name}") has ${d.y} for "${d.x}", beyond plus or minus ${CHART_AXIS_LIMIT}, the largest value a chart axis can draw. ` +
              `Divide every series on the ${right ? "right" : "left"} axis (${peers(right)}) by the same power of ten, so they keep their proportions, ` +
              `and name the unit in axes.${right ? "y2_unit" : "y_unit"}, for example 3.2 with "M" for 3200000.`,
          })
        }),
      )
    }
    if (c.chart_type === "combo") {
      const lines = c.series.filter((s) => s.plot === "line").length
      const bars = c.series.length - lines
      if (lines === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["series"],
          message:
            `a combo draws some series as bars and at least one as a line, and none of these ${c.series.length} series has plot: "line". ` +
            `Set plot: "line" on the series to draw as a line, or use chart_type "bar" if every series is a bar.`,
        })
      } else if (bars === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["series"],
          message:
            `a combo draws some series as bars and at least one as a line, and every series here has plot: "line", so nothing is drawn as bars. ` +
            `Remove plot (or set plot: "bar") on the series to draw as bars, or use chart_type "line" if every series is a line.`,
        })
      }
      if (c.series.length > 0 && rightSeries === c.series.length) {
        ctx.addIssue({
          code: "custom",
          path: ["series"],
          message:
            `every series in this combo is on axis: "right", so the left axis would have nothing to measure. ` +
            `Keep at least one series on the left: remove axis or set axis: "left" on it.`,
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

export const story: DesignStory = {
  name: "Plot",
  story: "Numbers drawn as a shape: bars, stacked or 100% columns, bars under a line, a line, an area, slices, a funnel, a from-and-to pair, a point cloud, or one arc against a target.",
  positioning: "Choose it when the audience should grasp the shape of the numbers at a glance. Use data_table when exact values must be read row by row, and comparison when the attributes are words rather than figures.",
  audience: "A room that reads a trend faster than a column of digits.",
  notFor: "Several independent headline figures, which belong in kpi_cards.",
}
