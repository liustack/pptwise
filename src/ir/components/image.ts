import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("image"),
    asset_id: z.string(),
    caption: z.string().optional(),
    // 默认 cover（2026-07-09 用户反馈：模型常选 contain letterbox 不铺满
    // ——照片一律等比铺满裁切；contain 留给图表截图等不可裁切的图）
    fit: z.enum(["contain", "cover"]).default("cover"),
  })
  .strict()

export const aliases = {} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: true,
  passthroughShell: false,
  fullBody: false,
  evidence: true,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Plate",
  story: "One photograph or screenshot filling its frame, with a caption if it needs one. The plate a printed book gives a whole page to.",
  positioning: "Choose it when a single picture is the content. Use image_grid when a set works together, image_compare for a pair set against each other, and device_mockup for a screen that should look like running software.",
  audience: "Anyone who came to see rather than to read.",
  notFor: "A user interface screenshot, which belongs in device_mockup.",
}
