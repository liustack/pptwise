import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("pillar_model"),
    /** 判据句：一根横梁写目标，2-5 根等宽立柱各写一个名字加一个数字，一块基座
     * 写共同前提。三者缺一不可，说的是「这几件事同时立住，目标才成立」。只是并列
     * 的几项工作用 icon_cards，有先后顺序用 steps，逐层支撑用 pyramid。 */
    goal: z.string().min(1).describe("The one outcome the pillars hold up. Printed across the beam."),
    pillars: z
      .array(
        z
          .object({
            title: z.string().min(1).describe("What this pillar is called."),
            value: z.string().min(1).describe("The one figure this pillar is measured by."),
            unit: z.string().optional().describe("Unit printed small beside the figure."),
          })
          .strict()
      )
      .min(2, "pillar_model.pillars needs at least 2 pillars — one column under a beam is a heading over a number")
      .max(5, "pillar_model.pillars accepts at most 5 pillars — past that a column is narrower than its own title")
      .describe("The columns holding the beam up, left to right. One title and one figure each."),
    base: z.string().min(1).describe("The shared footing every pillar stands on. Printed across the base slab."),
  })
  .strict()
  .describe(
    "A beam carrying one goal, 2-5 pillars each with a title and a figure, and a base slab naming the shared " +
      "footing. Use pillar_model when the goal only holds if every pillar holds. Use `icon_cards` when the " +
      "items are simply parallel, `steps` when they run in order, and `pyramid` when each level rests on the next."
  )

export const aliases = {
  block: { title: "goal", target: "goal", foundation: "base", items: "pillars" },
  items: [{ itemsKey: "pillars", aliases: { label: "title", name: "title", number: "value" } }],
} satisfies ComponentAliasSpec

// Beam, columns and slab are all painted panels of the drawing itself.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Beam and Pillars",
  story: "One beam, the columns carrying it, one slab underneath them all. Borrowed from the portico, where nobody has to be told that removing a column brings the roof down.",
  positioning: "Choose it when the goal only stands if every pillar stands, and the shared footing is worth naming. Use icon_cards when the items are merely parallel and steps when they run in order.",
  audience: "Teams committing to a small number of things that have to land together.",
  notFor: "Parallel items with no shared goal above them, which belong in icon_cards.",
}
