import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("callout"),
    variant: z.enum(["info", "warn", "tip"]),
    text: z.string(),
    icon: IconNameSchema.optional(),
  })
  .strict()

export const aliases = {
  block: { tone: "variant" },
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: true,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Margin Note",
  story: "One remark lifted out of the flow into a tinted band with an icon: a note, a warning, or a tip. The boxed aside a manual prints in the margin.",
  positioning: "Choose it for a single short remark that qualifies the page around it. Use verdict_banner when the sentence is the page's own conclusion, and insight_panel when several judgements share a heading.",
  audience: "Readers who would otherwise miss a caveat or a shortcut.",
  notFor: "The conclusion of the page, which belongs in verdict_banner.",
}
