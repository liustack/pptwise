import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const TermSchema = z
  .object({
    label: z.string().min(1).describe("What this term is — the name the reader reads it by."),
    value: z.string().optional().describe("Optional figure for the term, printed large."),
    note: z.string().optional().describe("Optional single line under the term."),
    /** A symbol for the term. See the describe below. */
    icon: IconNameSchema.optional().describe(
      "A symbol for the term, drawn at the top of its panel, such as route or hospital. Run `pptwise icons` for the names.",
    ),
  })
  .strict()

export const schema = z
  .object({
    type: z.literal("concept_equation"),
    /** 判据句：两三个要素加起来得到一个结果，「加起来等于」这件事本身就是
     * 论证时用。只是并列几个要点用 icon_cards，有先后次序用 steps，前后对照
     * 用 comparison。 */
    operands: z
      .array(TermSchema)
      .min(2, "concept_equation needs at least 2 terms — one term and a result is a claim, not an equation")
      .max(3, "concept_equation accepts at most 3 terms — a fourth leaves each panel too narrow to hold its own figure")
      .describe("2-3 terms added together, in the order they should be read."),
    result: TermSchema.describe("What the terms add up to."),
    /** What the result leaves out on purpose. See the describe below. */
    excluded: TermSchema.optional().describe(
      'What the result leaves out on purpose, drawn under the equation in a dashed outline with its figure struck through, such as { "label": "先不做", "value": "核心城区的餐饮高峰单", "note": "它排在放行顺序最后" } or { "label": "Not yet", "value": "Lunch-hour food in the city core" }. Give it a value: the value is what is struck.',
    ),
  })
  .strict()
  .superRefine((c, ctx) => {
    // The struck figure is the thing left out, so an exclusion without one
    // would strike nothing.
    if (c.excluded && !c.excluded.value?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["excluded", "value"],
        message: "concept_equation excluded names what the result leaves out in its value, which is drawn struck through. Write the value, or remove excluded.",
      })
    }
  })
  .describe(
    "Two or three terms adding up to one result, drawn as panels joined by a plus and an equals sign. Use " +
      "concept_equation when the argument is that these things together produce that thing. Use `icon_cards` " +
      "when the items are peers that produce nothing between them, `steps` when one leads to the next, and " +
      "`kpi_cards` when the figures stand on their own."
  )

export const aliases = {
  block: { terms: "operands", factors: "operands", inputs: "operands", output: "result" },
  items: [{ itemsKey: "operands", aliases: { title: "label", name: "label", text: "note", desc: "note" } }],
} satisfies ComponentAliasSpec

// Every term paints its own panel, and the result paints a filled one, so a
// bento shell underneath would be a second frame around a framed row.
export const traits = {
  stretchable: false,
  selfVisual: true,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Equation",
  story: "Two or three panels joined by a plus and an equals sign, the result filled solid at the end of the line. The arithmetic a board member writes in the margin to check that the story adds up.",
  positioning: "Choose it when the argument is that these things together produce that thing, and the addition itself is the point. Use icon_cards when the items produce nothing between them and steps when one leads to the next.",
  audience: "Readers who want the causes and the outcome on one line.",
  notFor: "Items in sequence, where each one leads to the next, which belong in steps.",
}
