import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("steps"),
    items: z
      .array(
        z
          .object({
            title: z.string(),
            text: z.string(),
          })
          .strict()
      )
      .min(2)
      .max(5),
  })
  .strict()

export const aliases = {
  items: [{ itemsKey: "items", aliases: { description: "text", desc: "text" } }],
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Sequence",
  story: "Two to five titled steps in order, each with its line of explanation. The instructions printed on the back of the packet.",
  positioning: "Choose it for a straight sequence with a beginning and an end. Use flowchart when the path branches on a decision, and cycle when the last step returns to the first.",
  audience: "People who need to know what comes next.",
  notFor: "A process that loops back to its start, which belongs in cycle.",
}
