import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("verdict_banner"),
    text: z.string(),
    tone: z.enum(["positive", "warning", "neutral"]),
    icon: IconNameSchema.optional(),
  })
  .strict()

export const aliases = {
  block: { variant: "tone" },
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: true,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  columnSpanning: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Verdict",
  story: "One sentence across a full-width band, tinted as good news, a warning, or neither. The conclusion stamped on the page so nobody has to hunt for it.",
  positioning: "Choose it when the page's own conclusion should be read before anything around it. Use callout for a side remark, and blockquote when the words belong to someone else.",
  audience: "A room that needs the answer before the reasoning.",
  notFor: "Borrowed words, which belong in blockquote.",
}
