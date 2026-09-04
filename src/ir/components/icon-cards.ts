import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("icon_cards"),
    /** 2-4 项单行并列，5-6 项自动 2 行 3 列宫格（2026-07-11 用户借鉴）。 */
    items: z
      .array(
        z
          .object({
            icon: IconNameSchema,
            title: z.string(),
            text: z.string(),
          })
          .strict()
      )
      .min(2)
      .max(6),
  })
  .strict()

export const aliases = {} satisfies ComponentAliasSpec

export const traits = {
  stretchable: true,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Icon Grid",
  story: "Two to six cards, each with a symbol, a title, and a line of text. The feature row a product page has run at the top since product pages existed.",
  positioning: "Choose it for a handful of parallel items that each earn a symbol and one line. Use row_cards when items carry more text than that, and bullets when a plain line each is enough.",
  audience: "Readers scanning for the capability that concerns them.",
  notFor: "Items with several levels of text, which belong in row_cards.",
}
