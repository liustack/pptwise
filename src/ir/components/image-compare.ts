import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("image_compare"),
    left: z.object({ asset_id: z.string(), label: z.string() }).strict(),
    right: z.object({ asset_id: z.string(), label: z.string() }).strict(),
    style: z.enum(["vs", "before_after"]).optional(),
  })
  .strict()

export const aliases = {} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Before and After",
  story: "Two pictures with their labels, set against each other as a versus or as a before and after. The pair a renovation brochure prints on facing pages.",
  positioning: "Choose it when the difference between exactly two images is the argument. Use image_grid when the pictures are a set rather than a pair.",
  audience: "Viewers who will judge the change with their own eyes.",
  notFor: "A set of pictures with no pairing, which belongs in image_grid.",
}
