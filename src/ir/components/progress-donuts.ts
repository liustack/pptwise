import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"

/** Strip grouping commas, then parseFloat. `%` is left in place so parseFloat still reads the leading number (`"86%" → 86`). */
function parseNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim()
  if (cleaned === "") return null
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Completion ratio in `[0, 1]`, or `null` when the value is not one.
 *
 * 1. `%` in the value or as the unit → `n / 100`.
 * 2. `0 ≤ n ≤ 1` → `n` (an already-normalised ratio).
 * 3. otherwise → `n / 100` (`"86"` is 86%).
 *
 * Anything landing outside `[0, 1]` after that is not a completion rate —
 * `"128 台"` is a count and `"1,234"` a magnitude. The schema below rejects
 * those rather than letting the renderer guess.
 */
export function parseProgressRatio(value: string, unit?: string): number | null {
  const n = parseNumber(value)
  if (n === null) return null
  const percent = value.includes("%") || unit?.trim() === "%"
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
              .describe('Completion rate: "86%", "86" and "0.86" all read as 86 percent.'),
            unit: z.string().optional(),
            label: z.string().describe("What the rate measures."),
            icon: IconNameSchema.optional(),
            /** 数据来源小字，如「来源: Crunchbase」。 */
            source: z.string().optional(),
          })
          .strict()
          .refine((item) => parseProgressRatio(item.value, item.unit) !== null, {
            error:
              'progress_donuts values are completion rates between 0 and 100 — "86%", "86" and "0.86" all read as 86 percent. Use kpi_cards for an absolute quantity or a growth rate.',
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
