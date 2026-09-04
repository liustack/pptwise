import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("code"),
    language: z.string(),
    code: z.string(),
  })
  .strict()

export const aliases = {
  block: { content: "code", source: "code", snippet: "code", text: "code" },
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
  name: "Listing",
  story: "A block of source in a monospaced setting with its language named. The code listing a technical book prints when the exact characters matter.",
  positioning: "Choose it when the literal text is the point and a paraphrase would lose it. Use paragraph when prose about the code would serve better than the code itself.",
  audience: "Readers who will read the syntax, not a description of it.",
  notFor: "An explanation of how something works, which belongs in prose.",
}
