import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const TermSchema = z
  .object({
    label: z.string().min(1).describe("What this term is — the name the reader reads it by."),
    value: z.string().optional().describe("Optional figure for the term, printed large."),
    note: z.string().optional().describe("Optional single line under the term."),
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
  })
  .strict()
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
