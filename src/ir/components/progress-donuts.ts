import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"

/**
 * A complete number, and nothing else: optional sign, digits (grouped in
 * threes by commas or not grouped at all), optional decimal fraction.
 *
 * The whole string has to match. `Number.parseFloat` used to read this
 * field, and parseFloat stops at the first character it cannot use: it read
 * `"50 widgets"` as 50 and drew half a ring for a count of widgets, and
 * `"1.2.3"` as 1.2. A value that is not entirely a number is not a rate the
 * component can draw, so it is rejected instead of trimmed down to the part
 * that happens to parse.
 */
const NUMBER_TOKEN = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/

/**
 * Completion ratio in `[0, 1]`, or `null` when the value is not one.
 *
 * The value must be a complete number, optionally carrying a trailing `%`.
 * The unit may be `%` or absent — any other unit names an absolute quantity
 * (`"台"`, `"users"`), which is `kpi_cards`' subject, not this component's.
 *
 * Given a number, the reading is:
 *
 * 1. `%` in the value or as the unit → `n / 100`.
 * 2. `0 ≤ n ≤ 1` → `n` (an already-normalised ratio).
 * 3. otherwise → `n / 100` (`"86"` is 86%).
 *
 * Anything landing outside `[0, 1]` after that is not a completion rate —
 * `"1,234"` is a magnitude. The schema below rejects those rather than
 * letting the renderer guess.
 */
export function parseProgressRatio(value: string, unit?: string): number | null {
  const trimmed = value.trim()
  const hasPercentSuffix = trimmed.endsWith("%")
  const numeric = (hasPercentSuffix ? trimmed.slice(0, -1) : trimmed).trim()
  if (!NUMBER_TOKEN.test(numeric)) return null
  const n = Number(numeric.replace(/,/g, ""))
  if (!Number.isFinite(n)) return null
  const named = unit?.trim()
  if (named !== undefined && named !== "" && named !== "%") return null
  const percent = hasPercentSuffix || named === "%"
  const ratio = percent ? n / 100 : n >= 0 && n <= 1 ? n : n / 100
  return ratio >= 0 && ratio <= 1 ? ratio : null
}

export const schema = z
  .object({
    type: z.literal("progress_donuts"),
    /** 判据句：每个指标都是 0-100 的完成度、占比或达成率，想让「进度感」
     * 可视时用。指标是绝对量或增速时用 kpi_cards。写法上 `"86%"`、`"86"`、
     * `"0.86"` 都读作 86%，`"128 台"` 这类绝对量会被 schema 拒绝。 */
    items: z
      .array(
        z
          .object({
            value: z
              .string()
              .describe(
                'Completion rate: "86%", "86" and "0.86" all read as 86 percent. A number and an optional trailing "%", nothing else.',
              ),
            unit: z.string().optional(),
            label: z.string().describe("What the rate measures."),
            icon: IconNameSchema.optional(),
            /** 数据来源小字，如「来源: Crunchbase」。 */
            source: z.string().optional(),
          })
          .strict()
          .refine((item) => parseProgressRatio(item.value, item.unit) !== null, {
            error:
              'progress_donuts values are completion rates between 0 and 100, written as a whole number with an optional trailing "%" and no other unit — "86%", "86" and "0.86" all read as 86 percent. Text after the number ("50 widgets"), a second decimal point ("1.2.3") and a unit other than "%" are all refused. Use kpi_cards for an absolute quantity or a growth rate.',
            path: ["value"],
          })
      )
      .min(2, "progress_donuts needs at least 2 rates — one rate alone is a `chart` gauge")
      .max(6, "progress_donuts accepts at most 6 rates — beyond that each dial shrinks past a readable size"),
  })
  .strict()
  .describe(
    "2-6 completion rates, each drawn as a ring filled to its own percentage. Use progress_donuts when " +
      "every value is a share of a whole — a completion rate, a coverage percentage, an attainment against " +
      "target. Use `kpi_cards` when the values are absolute quantities or growth rates, and `chart` with " +
      "chart_type gauge when a single rate is the whole message."
  )

export const aliases = {
  items: [{ itemsKey: "items", aliases: { title: "label", name: "label", percent: "value" } }],
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: true,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: true,
} as const satisfies ComponentTraits
