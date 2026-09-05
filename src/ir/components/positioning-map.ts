import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const AxisSchema = z
  .object({
    title: z.string().min(1).describe("What the axis measures — the dimension, never one of its values."),
    low: z.string().min(1).describe("Short name of the low end."),
    high: z.string().min(1).describe("Short name of the high end."),
  })
  .strict()

export const schema = z
  .object({
    type: z.literal("positioning_map"),
    /** 判据句：四到十个对象各自在两个连续维度上有位置，谁在哪一格、离谁远近
     * 才是结论时用。两个维度是分类而不是刻度用 matrix，只比属性用 comparison，
     * 数值的形状是要点用 chart 的 scatter。 */
    x_axis: AxisSchema.describe("The horizontal dimension and the words at each end."),
    y_axis: AxisSchema.describe("The vertical dimension and the words at each end."),
    quadrants: z
      .object({
        top_left: z.string().min(1),
        top_right: z.string().min(1),
        bottom_left: z.string().min(1),
        bottom_right: z.string().min(1),
      })
      .strict()
      .optional()
      .describe("Optional name for each of the four quadrants. All four or none."),
    points: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("Short name of one plotted subject."),
            x: z.number().min(0).max(100).describe("Position along the horizontal axis, 0 at the low end and 100 at the high end."),
            y: z.number().min(0).max(100).describe("Position along the vertical axis, 0 at the low end and 100 at the high end."),
            emphasis: z.literal(true).optional().describe("Marks the one subject the page is about."),
          })
          .strict()
      )
      .min(4, "positioning_map needs at least 4 points — with fewer, the position of one against another is a sentence, not a map")
      .max(10, "positioning_map accepts at most 10 points — beyond that the labels collide faster than they can be offset")
      .refine((points) => points.filter((p) => p.emphasis).length <= 1, {
        error: "positioning_map marks at most one point with emphasis — a map with two subjects has no subject",
      })
      .describe("4-10 plotted subjects, each with a position on both axes."),
  })
  .strict()
  .describe(
    "Subjects plotted on two continuous dimensions, with named ends and optional quadrant names. Use " +
      "positioning_map when where each subject sits — and how far it is from the others — is the argument. " +
      "Use `matrix` when the two dimensions are categories rather than scales, `comparison` when the " +
      "subjects are weighed attribute by attribute, and `chart` with chart_type scatter when the numbers " +
      "themselves are the subject."
  )

export const aliases = {
  block: { items: "points", entries: "points" },
  items: [{ itemsKey: "points", aliases: { title: "label", name: "label" } }],
} satisfies ComponentAliasSpec

// Two axis lines, quadrant names, and a dot per subject — a plot, not a card,
// so the bento shell paints nothing underneath it.
//
// Deliberately not evidence-ranked: the `assertion_evidence` arrangement puts
// an exhibit in a side panel beside a claim, and half a rect is where this
// drawing's labels start colliding. A map is the page, not the panel.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Position Map",
  story: "Two axes with their ends named, and every subject placed where it actually sits, one of them marked as the one you are. The chart a category analyst draws to show who owns which corner.",
  positioning: "Choose it when the position of each subject on two continuous dimensions, and the distance between them, is the argument. Use matrix when the dimensions are categories and comparison when the subjects are weighed attribute by attribute.",
  audience: "Readers deciding where a product stands and which corner is still open.",
  notFor: "Two dimensions that are categories rather than scales, which belong in matrix.",
}
