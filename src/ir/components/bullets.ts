import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("bullets"),
    items: z.array(z.string()),
    style: z.enum(["default", "checklist", "numbered", "plain", "divided"]).optional(),
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
  name: "Bullets",
  story: "Plain lines down the page, one idea each, marked as ticks, numbers, rules, or nothing at all. The typed list that has carried arguments since the memo.",
  positioning: "Choose it when each item is a short line, ordered or not. Use numbered_cards when each item is a titled card with body text, and tag_row when the items are bare labels.",
  audience: "Readers following an argument or scanning a set of points.",
  notFor: "Items with a title and a paragraph each, which belong in cards.",
}
