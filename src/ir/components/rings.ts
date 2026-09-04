import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("rings"),
    /** 分层同心圆环（洋葱模型）：items 从内核到外层排序（items[0]=内核
     * 实心圆）。每层引线标注到右侧（label 短词 ≤8 字，desc 一句话）。 */
    items: z
      .array(
        z
          .object({
            label: z.string(),
            desc: z.string().optional(),
          })
          .strict()
      )
      .min(2)
      .max(4),
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
  name: "Onion",
  story: "Concentric rings from a solid core outward, each layer labelled on a leader line. The onion model a textbook draws when things live inside things.",
  positioning: "Choose it when the layers nest, each one containing the one before. Use hub_spoke when the elements only attach to a centre, and cycle when they close a loop.",
  audience: "Readers who need to see what surrounds what.",
  notFor: "Peers arranged around a centre, which belong in hub_spoke.",
}
