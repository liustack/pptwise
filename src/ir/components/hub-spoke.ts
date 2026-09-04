import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("hub_spoke"),
    /** 判据句：一个中心概念与 3-6 个并列关联要素，要素间无顺序也不闭环时用。
     * 有顺序用 steps，闭环用 cycle，分层用 rings。中心概念写进 `center`，
     * 每个要素一个短标签（`label`）加一句话（`description`）。 */
    center: z
      .string()
      .min(1)
      .describe("The one concept every element relates to. Drawn inside the central node."),
    items: z
      .array(
        z
          .object({
            label: z.string().describe("Short name of one related element."),
            description: z
              .string()
              .optional()
              .describe("Optional one-line explanation shown beside the label."),
          })
          .strict()
      )
      .min(
        3,
        "hub_spoke.items needs at least 3 elements — with fewer, a center and its spokes read as a list, not a structure"
      )
      .max(
        6,
        "hub_spoke.items accepts at most 6 elements — more crowd the ring past a legible size on a 1280x720 slide"
      )
      .describe(
        "3-6 peer elements arranged around the center. Order carries no meaning here — author them in whatever order reads best."
      ),
  })
  .strict()
  .describe(
    "One central concept with 3-6 peer elements attached to it, drawn as a hub with labelled spokes. " +
      "Use hub_spoke when the elements are unordered and do not close a loop: they all relate to the " +
      "center, not to each other. Use `steps` when the elements run in sequence, `cycle` when the last " +
      "one leads back to the first, and `rings` when they nest inside one another."
  )

export const aliases = {
  block: { title: "center", hub: "center" },
  items: [{ itemsKey: "items", aliases: { title: "label", name: "label", text: "description", desc: "description" } }],
} satisfies ComponentAliasSpec

// Same posture as `cycle` and `flowchart`: every spoke paints its own capsule
// and the hub its own circle, so a bento outline shell underneath would be a
// second shell around an already-carded diagram.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Hub",
  story: "One concept in the middle, three to six peers attached around it on labelled spokes. The mind map's centre, drawn with a steady hand.",
  positioning: "Choose it when the elements relate to the centre and not to each other, with no order between them. Use steps when they run in sequence, cycle when the last leads back to the first, and rings when they nest.",
  audience: "People who need to see what everything hangs off.",
  notFor: "Elements that follow one another, which belong in steps.",
}
