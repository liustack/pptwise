import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("pyramid"),
    /** 判据句：3-6 层自上而下逐层加宽的金字塔，每层一个标题、可选一句说明，
     * 说明写在右侧图例里。层与层是「上层由下层支撑」的关系（结论压在论据上、
     * 高一级压在低一级上）。同心包含用 rings，每层装的是系统构件用
     * architecture，顺序执行用 steps，纯并列用 row_cards。 */
    layers: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("What this level is called."),
            note: z
              .string()
              .optional()
              .describe("One line explaining the level, printed in the legend beside the drawing."),
          })
          .strict()
      )
      .min(3, "pyramid.layers needs at least 3 levels — two stacked bands are a comparison, not a pyramid")
      .max(6, "pyramid.layers accepts at most 6 levels — past that the top band is thinner than the label inside it")
      .describe("The levels from the top down. The first entry is the apex."),
  })
  .strict()
  .describe(
    "3-6 levels stacked into a pyramid, apex first, each level optionally explained in a legend beside the " +
      "drawing. Use pyramid when each level rests on the one below it — a claim over its evidence, a rank " +
      "over the ranks that hold it. Use `rings` when the levels nest one inside another, `architecture` " +
      "when each level holds the parts of a system, `steps` when they are performed in order, and " +
      "`row_cards` when they are peers."
  )

export const aliases = {
  items: [
    { itemsKey: "layers", aliases: { title: "label", name: "label", text: "note", desc: "note" } },
  ],
} satisfies ComponentAliasSpec

// The bands are the drawing; the legend cards paint their own outline. A
// bento shell around either would be a frame on a frame.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Claim Pyramid",
  story: "Levels stacked widest at the bottom, the claim at the apex and the evidence holding it up, with a legend that says what each one is. The shape an argument takes when someone asks what it stands on.",
  positioning: "Choose it when each level rests on the one below and the reader should feel the weight of the base. Use steps when the levels run in order and rings when they nest.",
  audience: "Readers who want to know what a conclusion is built on.",
  notFor: "Levels performed one after another in time, which belong in steps.",
}
