import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

/** How a row stands against its target. Drives the tone, never the wording. */
export const SCORECARD_STATUSES = ["on_track", "watch", "off_track"] as const

export const schema = z
  .object({
    type: z.literal("scorecard"),
    /** 判据句：3-8 个目标各带目标值、实际值、差距与达成状态，读者要一次看完
     * 「哪些达标、差多少」时用。只报数字不判达成用 data_table，单个数字撑满一页用
     * kpi_cards，一组完成率画环用 progress_donuts。表头与状态词由组件自带，中英两套
     * 按这张卡自己的内容里有没有汉字来选，另有措辞时用 `labels` 与每行的
     * `status_label` 逐词覆写，颜色由 `status` 决定。 */
    labels: z
      .object({
        metric: z.string().optional(),
        target: z.string().optional(),
        actual: z.string().optional(),
        gap: z.string().optional(),
        status: z.string().optional(),
      })
      .strict()
      .optional()
      .describe(
        "Column header override. A missing key falls back to the card's own word, which is Chinese when the goals and figures are written in Chinese and English otherwise."
      ),
    rows: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("The goal being scored."),
            target: z.string().min(1).describe("What was promised, written the way it should print."),
            actual: z.string().min(1).describe("What was reached, written the way it should print."),
            gap: z.string().min(1).describe("The distance between the two, sign included."),
            status: z
              .enum(SCORECARD_STATUSES)
              .describe("Verdict for the row: on_track, watch, or off_track. Chooses the tone, not the wording."),
            status_label: z
              .string()
              .min(1)
              .optional()
              .describe(
                "The verdict in the author's own words. Left out, the card's own word for this status prints beside the dot, in the script the card is written in."
              ),
          })
          .strict()
      )
      .min(3, "scorecard needs at least 3 rows — one or two goals are headline numbers, and kpi_cards prints those larger")
      .max(8, "scorecard accepts at most 8 rows — a ninth row pushes the type below the readable floor on a 1280x720 slide")
      .describe("3-8 goals, one row each, in the order they should be read."),
    note: z
      .string()
      .optional()
      .describe("Optional line under the grid: how the gap is measured, or where the numbers came from."),
  })
  .strict()
  .describe(
    "3-8 goals, each with its target, what was reached, the gap between them, and a verdict. Use scorecard " +
      "when the page's question is which promises were kept and by how much. Use data_table when the numbers " +
      "are reported without a verdict, kpi_cards when one figure owns the page, and progress_donuts when every " +
      "value is a completion rate."
  )

export const aliases = {
  block: { items: "rows", footnote: "note" },
  items: [
    {
      itemsKey: "rows",
      aliases: { metric: "label", value: "actual", delta: "gap", state: "status" },
    },
  ],
} satisfies ComponentAliasSpec

// One grid, ruled the way a table is ruled, owning the whole content area —
// the same posture `heatmap` takes.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Standings",
  story: "Every promise on its own line, next to what was reached, the distance between them, and a verdict in three tones. The page a team opens the quarter review with.",
  positioning: "Choose it when the reader has to see which commitments held and by how much they moved. Use a table when the numbers are reported without a verdict.",
  audience: "People who set the targets and now have to answer for them.",
  notFor: "A single headline figure, which belongs in headline numbers.",
}
