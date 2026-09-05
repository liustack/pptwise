import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("chevron_process"),
    /** 判据句：3-6 个首尾咬合的环节，工作必须依次穿过每一个，想强调「这是
     * 一条通道」时用。并列的几件事用 icon_cards，路径有分支用 flowchart，
     * 末环回到首环用 cycle，逐级抬升用 staircase。最后一环是终点，自动填成
     * primary。 */
    items: z
      .array(
        z
          .object({
            title: z.string().min(1).describe("Name of this stage, two to six words."),
            text: z
              .string()
              .optional()
              .describe("Optional single line printed under the chevron, not inside it."),
          })
          .strict()
      )
      .min(
        3,
        "chevron_process.items needs at least 3 stages — two chevrons read as a before/after, which is `comparison`"
      )
      .max(
        6,
        "chevron_process.items accepts at most 6 stages — past that a chevron is narrower than its own notch on a 1280x720 slide"
      )
      .describe("3-6 stages in the order work passes through them. The last one is the destination and carries the fill."),
  })
  .strict()
  .describe(
    "3-6 stages of one pipeline, drawn as interlocking chevrons that point at the next stage. Use " +
      "chevron_process when work has to pass through every stage in order and the handover between them is " +
      "the point. Use `steps` when each stage needs a paragraph of its own, `flowchart` when the path " +
      "branches on a decision, `cycle` when the last stage feeds the first, and `staircase` when the stages " +
      "climb rather than follow."
  )

export const aliases = {
  items: [{ itemsKey: "items", aliases: { label: "title", name: "title", description: "text", desc: "text" } }],
} satisfies ComponentAliasSpec

// Each chevron is its own painted arrow, so a bento outline shell behind the
// band would be a second frame around an already-framed drawing.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Pipeline",
  story: "Stages cut as chevrons, each biting into the next, the last one filled. The arrow band painted on a factory floor, pointing the way through.",
  positioning: "Choose it when work passes through every stage in order and the handover is the point. Use steps when each stage needs its own paragraph, and flowchart when the path branches.",
  audience: "People who need to see the route end to end before they join it.",
  notFor: "A path that branches on a decision, which belongs in flowchart.",
}
