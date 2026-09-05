import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("fishbone"),
    /** 判据句：一个已经发生的结果，加上导致它的四到六类原因，每类下面两三条
     * 具体原因时用。类目之间没有先后，也不是流程。有顺序用 steps，中心与并列
     * 要素用 hub_spoke，只是把条目分组陈列用 row_cards。 */
    effect: z
      .string()
      .min(1)
      .describe("The result being explained. Drawn in the head at the end of the spine."),
    ribs: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("Short name of one cause category."),
            causes: z
              .array(z.string().min(1))
              .min(2, "each fishbone rib needs at least 2 causes — a category with one cause under it is just the cause")
              .max(3, "each fishbone rib accepts at most 3 causes — a fourth crowds the rib past a readable line spacing")
              .describe("2-3 specific causes under this category, each a short line."),
          })
          .strict()
      )
      .min(4, "fishbone needs at least 4 categories — with fewer, the causes belong in a list rather than a diagram")
      .max(6, "fishbone accepts at most 6 categories — beyond that the ribs overlap on a 1280x720 slide")
      .describe("4-6 cause categories, drawn alternately above and below the spine in the order written."),
  })
  .strict()
  .describe(
    "One result and the four to six categories of cause behind it, drawn as a spine with slanted ribs. " +
      "Use fishbone for a diagnosis: the effect is known and the page sorts why it happened. Use `flowchart` " +
      "when the boxes are steps that lead somewhere, `hub_spoke` when the elements relate to a centre rather " +
      "than explain it, and `row_cards` when the categories carry prose instead of short causes."
  )

export const aliases = {
  block: { result: "effect", problem: "effect", categories: "ribs" },
  items: [{ itemsKey: "ribs", aliases: { title: "label", name: "label", items: "causes" } }],
} satisfies ComponentAliasSpec

// A spine, its ribs, and one head: a drawing that frames itself, so the
// bento shell paints nothing underneath it.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Fishbone",
  story: "A spine running into the result, with cause categories branching off it and each specific cause written along its own rib. The diagram a shift supervisor draws on the whiteboard after something breaks.",
  positioning: "Choose it when the outcome is already known and the page sorts the reasons behind it into categories. Use flowchart when the boxes lead somewhere and row_cards when each category carries prose.",
  audience: "Teams working out why a number moved before deciding what to do.",
  notFor: "Steps that follow one another, which belong in flowchart.",
}
