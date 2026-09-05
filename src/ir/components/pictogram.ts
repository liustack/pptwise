import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

/** Every row counts out of ten figures. The denominator is the whole point. */
export const PICTOGRAM_DENOMINATOR = 10

export const schema = z
  .object({
    type: z.literal("pictogram"),
    /** 判据句：1-3 条比例各还原成「十个人形里有几个」，读者要把百分数换算成
     * 身边可数的人时用。分母固定是十，`filled` 写 0 到 10 的整数。
     * 比例本身是重点、不需要还原成人头时用 progress_donuts，
     * 一个数字撑满一页用 kpi_cards，多期趋势用 chart。 */
    rows: z
      .array(
        z
          .object({
            filled: z
              .number()
              .int("pictogram counts whole figures — a rate is rounded to a whole person before it is drawn")
              .min(0, "pictogram fills between 0 and 10 figures")
              .max(
                PICTOGRAM_DENOMINATOR,
                "pictogram fills between 0 and 10 figures — the row always counts out of ten"
              )
              .describe("How many of the ten figures are filled: 0 to 10."),
            label: z.string().min(1).describe("What the filled figures did, in one line."),
            caption: z
              .string()
              .optional()
              .describe("Optional line above the label naming the ten: who or what the row counts."),
            highlight: z
              .boolean()
              .optional()
              .describe("Marks the one row the page argues from. Its label is set in the strong ink."),
          })
          .strict()
      )
      .min(1, "pictogram needs at least 1 row")
      .max(3, "pictogram accepts at most 3 rows — a fourth row of ten figures shrinks each one past recognition")
      .describe("1-3 rows, each counting out of ten."),
  })
  .strict()
  .superRefine((value, ctx) => {
    const highlighted = value.rows.filter((row) => row.highlight === true)
    if (highlighted.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["rows"],
        message: `pictogram highlights ${highlighted.length} rows — the mark exists to point at one, and two of them point at neither`,
      })
    }
  })
  .describe(
    "1-3 proportions, each drawn as ten figures with some of them filled. Use pictogram when a rate should " +
      "land as a countable number of people rather than a percentage. Use progress_donuts when the rate " +
      "itself is the subject, kpi_cards when one figure owns the page, and chart for a series over time."
  )

export const aliases = {
  block: { items: "rows" },
  items: [
    {
      itemsKey: "rows",
      aliases: { value: "filled", title: "label", kicker: "caption" },
    },
  ],
} satisfies ComponentAliasSpec

// Rows of figures with their own rules between them, sized to the rect it is
// handed — the drawing owns the page the way `heatmap` does.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Ten Figures",
  story: "A rate redrawn as ten people standing in a row, with the ones it happened to filled in. The newspaper graphic that turns a percentage into a number you can count.",
  positioning: "Choose it when the reader should feel a proportion as people rather than read it as a percentage. Use progress rings when the rate itself is the subject.",
  audience: "Readers who take a proportion better as a crowd than as a decimal.",
  notFor: "A rate that stands on its own, which belongs in progress rings.",
  lineage: "Isotype, the picture statistics Vienna drew for people who did not read tables.",
}
