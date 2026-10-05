import { z } from "zod"
import { IconNameSchema, ToneSchema } from "./shared"
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
            /** A symbol for the step. See the describe below. */
            icon: IconNameSchema.optional().describe(
              "A symbol for the step, drawn in its badge where its number would stand, such as ruler or ban. Run `pptwise icons` for the names.",
            ),
            /** What kind of step it is. See the describe below. */
            tone: ToneSchema.optional().describe(
              'What kind of step it is, painted in the theme\'s own colour for it: "danger" for a check that can stop the process there, "warning" for one to watch, "success" for one that confirms it can go on.',
            ),
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
