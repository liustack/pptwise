import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

// 图片排版 P2（2026-07-08）：多图网格与双图对比。
export const schema = z
  .object({
    type: z.literal("image_grid"),
    items: z
      .array(
        z
          .object({
            asset_id: z.string(),
            caption: z.string().optional(),
          })
          .strict()
      )
      .min(2)
      .max(6),
    emphasis: z.enum(["none", "first"]).optional(),
  })
  .strict()
  .describe(
    "A 2-6 photo/screenshot grid with cover-crop cells.",
  )

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
  name: "Contact Sheet",
  story: "Two to six pictures cropped into a grid, working as one set. The contact sheet a photographer lays out to show a whole shoot at once.",
  positioning: "Choose it when a set of images works together and no single one carries the page. Use image for one picture and image_compare for a pair set against each other.",
  audience: "Viewers taking in a body of work rather than a single frame.",
  notFor: "One picture that deserves the page, which belongs in image.",
  lineage: "The photographer's contact sheet, frames laid out in rows.",
}
