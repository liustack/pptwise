import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("blockquote"),
    text: z.string(),
    attribution: z.string().optional(),
  })
  .strict()

export const aliases = {
  block: { content: "text", author: "attribution", by: "attribution" },
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: true,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Pull Quote",
  story: "Someone else's sentence set large, with their name beneath it when there is one. The line a magazine lifts out of an interview and prints twice its size.",
  positioning: "Choose it when the words are borrowed and the name behind them is part of the argument. Use verdict_banner when the sentence is your own conclusion.",
  audience: "Listeners who will trust the source more than the speaker.",
  notFor: "A claim of your own, which belongs in verdict_banner.",
}
