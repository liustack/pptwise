import { z } from "zod"
import { IconNameSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("row_cards"),
    /** 全宽横向长卡列表（编号圆圈 + 可选图标 + 三级文字），3-6 项纵向
     * 堆叠，highlight 项 accent 描边强调。适合成果一览/贡献清单/议题列表
     * 这类每项信息量较大的枚举。 */
    items: z
      .array(
        z
          .object({
            icon: IconNameSchema.optional(),
            title: z.string(),
            text: z.string().optional(),
            sub: z.string().optional(),
            highlight: z.boolean().optional(),
          })
          .strict()
      )
      .min(3)
      .max(6),
  })
  .strict()

export const aliases = {
  items: [{ itemsKey: "items", aliases: { description: "text", desc: "text" } }],
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: true,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Full-Width Rows",
  story: "Full-width bands stacked down the page, each numbered, optionally marked with a symbol, and carrying up to three levels of text. The itemised list in an annual report.",
  positioning: "Choose it when each item carries more than a line and deserves a band of its own. Use icon_cards for short parallel items, and bullets when one line each is enough.",
  audience: "Readers who will read each entry rather than scan the set.",
  notFor: "Short parallel items, which belong in icon_cards.",
}
