import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("citation"),
    sources: z.array(
      z
        .object({
          label: z.string(),
          url: z.string().optional(),
          ref: z.string().optional(),
        })
        .strict()
    ),
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
  cutsContentWhenShort: true,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Sources",
  story: "The source line that closes a page: labels, references, and links, listed the way a bibliography closes a chapter.",
  positioning: "Choose it when a claim rests on outside material the audience must be able to check. Use blockquote when the quoted words themselves are the content.",
  audience: "Readers who will want to look it up before they believe it.",
  notFor: "A quoted sentence, which belongs in blockquote.",
}
