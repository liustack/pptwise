import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

/** The five fills a Harvey ball draws, in ascending order. */
export const HARVEY_BALL_VALUES = [0, 25, 50, 75, 100] as const

const HarveyValueSchema = z
  .union([z.literal(0), z.literal(25), z.literal(50), z.literal(75), z.literal(100)], {
    error:
      "harvey_balls scores are one of 0, 25, 50, 75 or 100 — the five fills a circle can show apart at this size. Use heatmap when the exact number carries the argument, and data_table when it must be read digit by digit.",
  })
  .describe("How far this option meets this criterion: 0 empty, 25 a quarter, 50 half, 75 three quarters, 100 full.")

export const schema = z
  .object({
    type: z.literal("harvey_balls"),
    /** 判据句：3-6 个候选方案在同一组 3-5 条标准上逐项打分，每个分数只取
     * 空、四分之一、一半、四分之三、满这五档，读者要一眼看出哪一行没有短板时用。
     * 打分是定性的五档判断，不是连续数值：连续数值在两个维度上的分布、
     * 强弱与聚集用 heatmap，任何要逐位读出准确数字的场合用 data_table，
     * 没有共同刻度的定性属性对照用 comparison。每个方案一行（`options[].label`），
     * 每条标准一列（`criteria`），可选的合计写进 `options[].total`。表头与图例的词
     * 由组件自带，中英两套按这张图自己的内容里有没有汉字来选，另有措辞时用
     * `labels` 逐词覆写。 */
    criteria: z
      .array(z.string().min(1))
      .min(3, "harvey_balls needs at least 3 criteria — with fewer, a row of circles says less than a sentence")
      .max(5, "harvey_balls accepts at most 5 criteria — a sixth column shrinks every circle past the size that shows a quarter apart from a half")
      .describe("3-5 criteria, one column each, in the order they should be read."),
    options: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("The option this row scores."),
            scores: z
              .array(HarveyValueSchema)
              .describe("One score per criterion, in the same order as `criteria`."),
            total: z
              .union([z.string(), z.number()])
              .optional()
              .describe("Optional summary figure for the row, printed at its end."),
            highlight: z
              .boolean()
              .optional()
              .describe("Marks the one option the page argues for. The row is filled solid."),
          })
          .strict()
      )
      .min(3, "harvey_balls needs at least 3 options — two options are a comparison, not a scan")
      .max(6, "harvey_balls accepts at most 6 options — beyond that the rows crowd past a legible height on a 1280x720 slide")
      .describe("3-6 options, one row each."),
    legend: z
      .boolean()
      .optional()
      .describe("Print a key under the grid naming the empty, half and full circle. Off by default."),
    labels: z
      .object({
        option: z.string().optional(),
        total: z.string().optional(),
        none: z.string().optional(),
        partial: z.string().optional(),
        full: z.string().optional(),
      })
      .strict()
      .optional()
      .describe(
        "Header and key wording override. A missing key falls back to the grid's own word, which is Chinese when the criteria and option names are written in Chinese and English otherwise."
      ),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const [i, option] of value.options.entries()) {
      if (option.scores.length !== value.criteria.length) {
        ctx.addIssue({
          code: "custom",
          path: ["options", i, "scores"],
          message: `harvey_balls option "${option.label}" carries ${option.scores.length} scores for ${value.criteria.length} criteria — every option is scored on every criterion, and a blank cell would read as a zero`,
        })
      }
    }
    const highlighted = value.options.filter((option) => option.highlight === true)
    if (highlighted.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `harvey_balls highlights ${highlighted.length} options — a grid argues for one, and two solid rows argue for neither`,
      })
    }
    const withTotal = value.options.filter((option) => option.total !== undefined)
    if (withTotal.length > 0 && withTotal.length !== value.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `harvey_balls totals ${withTotal.length} of ${value.options.length} options — a column with holes in it invites the reader to compare a number against a blank`,
      })
    }
  })
  .describe(
    "3-6 options scored against 3-5 shared criteria, each score drawn as a circle filled none, a quarter, " +
      "half, three quarters or full. Use harvey_balls when the scores are a judgement in five steps and the " +
      "reader's question is which option has no weak column. Use heatmap when the values are continuous " +
      "numbers whose spread across two dimensions is the message, data_table when any figure has to be read " +
      "exactly, and comparison for qualitative attributes with no shared scale."
  )

export const aliases = {
  block: { columns: "criteria", rows: "options" },
  items: [
    {
      itemsKey: "options",
      aliases: { title: "label", values: "scores" },
    },
  ],
} satisfies ComponentAliasSpec

// The grid rules its own columns and owns the page, the same posture
// `heatmap` takes: a bento shell around it would be a second frame around a
// drawing that already draws its own.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Moon Grid",
  story: "Options down the side, criteria across the top, and a circle in every cell filled from empty to full. The shortlist a buying committee scans for the row with no gaps.",
  positioning: "Choose it when several options are judged on the same few criteria in five steps and the weak column should show at a glance. Use heat grid when the values are continuous numbers whose spread is the message.",
  audience: "People about to choose between options someone else has scored.",
  notFor: "Figures that must be read exactly, which belong in a table.",
  lineage: "The five moon phases consultants have drawn in evaluation grids since carbon paper.",
}
