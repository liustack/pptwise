import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("venn"),
    /** 判据句：两到三个集合互相重叠，重叠的那一块才是结论时用。
     * 每个集合只给一个短标签（`label`），重叠处给一个短标签（`center`）。
     * 只是并列几个方面用 comparison，包含关系用 rings。 */
    sets: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("Short name of one set. Drawn beside its own circle."),
          })
          .strict()
      )
      .min(2, "venn needs at least 2 sets — one circle has nothing to overlap")
      .max(3, "venn accepts at most 3 sets — a fourth circle cannot show every intersection and the drawing stops being readable")
      .describe("2-3 overlapping sets, one short label each. Set order runs clockwise from the top."),
    center: z
      .string()
      .min(1)
      .describe("Short name of the region every set shares — the point of the drawing, printed on the overlap."),
  })
  .strict()
  .describe(
    "Two or three overlapping circles whose shared region is the message. Use venn when the argument is " +
      "that something sits in more than one set at once. Use `comparison` when the sides are weighed against " +
      "each other rather than overlapping, `matrix` when two dimensions cross into quadrants, and `rings` " +
      "when each set contains the one inside it."
  )

export const aliases = {
  block: { intersection: "center", overlap: "center" },
  items: [{ itemsKey: "sets", aliases: { title: "label", name: "label" } }],
} satisfies ComponentAliasSpec

// A drawing of circles and two label sizes: nothing here is a card, so a
// bento shell around it would frame an already-composed figure.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Overlap",
  story: "Two or three translucent circles laid over one another, with the shared ground named where they meet. The diagram a strategist draws on a napkin to find the one place worth standing.",
  positioning: "Choose it when the argument is that something belongs to several sets at once and the shared region is the conclusion. Use comparison to weigh sides against each other and rings when each set contains the next.",
  audience: "Readers deciding where several qualities have to be true together.",
  notFor: "Sets that nest inside one another, which belong in rings.",
}
