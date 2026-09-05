import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const SideSchema = z
  .object({
    title: z.string().min(1).describe("What this side is called, in the deck's own language."),
    items: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("The point itself, in one short line."),
            note: z.string().optional().describe("Optional single line of evidence under the point."),
          })
          .strict()
      )
      .min(2, "each pros_cons side needs at least 2 points — one point against three is not a weighing")
      .max(5, "each pros_cons side accepts at most 5 points — a sixth row leaves the verdict no room on the page")
      .describe("2-5 points on this side."),
  })
  .strict()

export const schema = z
  .object({
    type: z.literal("pros_cons"),
    /** 判据句：同一个方案的支持与反对两面各两到五条，最后要落一句结论时用。
     * 比较的是两个不同对象而不是同一件事的两面用 comparison，只有结论没有
     * 两面用 verdict_banner。 */
    pros: SideSchema.describe("The case for."),
    cons: SideSchema.describe("The case against."),
    verdict: z
      .string()
      .min(1)
      .describe("The call the page makes after weighing both sides. Required: a weighing with no verdict is a shrug."),
  })
  .strict()
  .describe(
    "One proposal weighed in two columns and closed with a verdict. Use pros_cons when both sides are about " +
      "the same proposal and the page has to land somewhere. Use `comparison` when the two columns are two " +
      "different subjects, and `verdict_banner` when the conclusion is the whole page."
  )

export const aliases = {
  block: { for: "pros", against: "cons", conclusion: "verdict", decision: "verdict" },
  items: [],
} satisfies ComponentAliasSpec

// Two outlined columns and a filled verdict band: the component paints its
// own frames, so the bento shell paints nothing underneath it.
export const traits = {
  stretchable: false,
  selfVisual: true,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "For and Against",
  story: "Points about one proposal set in two columns, each marked with a tick or a cross, and a verdict band closing the page. The sheet someone rules down the middle before making a call.",
  positioning: "Choose it when both columns argue about the same proposal and the page has to land somewhere. Use comparison when the columns are two different subjects, and verdict_banner when the conclusion needs no argument beside it.",
  audience: "A room that has to decide, and wants the case against on the same page.",
  notFor: "Two different subjects set side by side, which belong in comparison.",
}
