import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z.object({ type: z.literal("paragraph"), text: z.string() }).strict()

export const aliases = {
  block: { content: "text", body: "text" },
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
  name: "Prose",
  story: "A block of running text, set as written. The paragraph a printed page gives room to when the sentences have to stay sentences.",
  positioning: "Choose it when the argument lives in connected sentences and chopping it into fragments would lose it. Use bullets when the items are genuinely parallel lines.",
  audience: "Readers willing to follow a thought that needs more than a line.",
  notFor: "Parallel items, which belong in bullets.",
}
