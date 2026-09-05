import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("segmented_wheel"),
    /** 判据句：一个整体被切成四到八块对等的部分、「合起来就是全部」是要点时用。
     * 可以点名其中一块。有先后顺序、末尾回到开头用 cycle，元素只挂在中心上用
     * hub_spoke，每块占比不等用 chart 的 pie。 */
    center: z.string().min(1).describe("What the whole is. Drawn in the hub."),
    segments: z
      .array(
        z
          .object({
            label: z.string().min(1).describe("Short name of one part."),
            value: z.string().optional().describe("Optional short figure printed under the name."),
            emphasis: z.literal(true).optional().describe("Marks the one part the page is about."),
          })
          .strict()
      )
      .min(4, "segmented_wheel needs at least 4 parts — three wedges read as a pie chart with no values")
      .max(8, "segmented_wheel accepts at most 8 parts — beyond that the labels around the rim run into each other")
      .refine((segments) => segments.filter((s) => s.emphasis).length <= 1, {
        error: "segmented_wheel marks at most one part with emphasis — two marked parts mark nothing",
      })
      .describe("4-8 equal parts of the whole, drawn clockwise from the top in the order written."),
  })
  .strict()
  .describe(
    "One whole cut into four to eight equal parts around a hub, with one part able to be marked. Use " +
      "segmented_wheel when the parts together are the whole and none of them leads to the next. Use `cycle` " +
      "when the last part returns to the first, `hub_spoke` when the elements hang off the centre rather " +
      "than divide it, and `chart` with chart_type pie when the parts are unequal shares."
  )

export const aliases = {
  block: { title: "center", hub: "center", whole: "center", items: "segments", parts: "segments" },
  items: [{ itemsKey: "segments", aliases: { title: "label", name: "label" } }],
} satisfies ComponentAliasSpec

// A hub, its wedges, and rim labels: one composed figure, so the bento shell
// paints nothing underneath it.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Segment Wheel",
  story: "A hub naming the whole, with four to eight equal wedges around it and their names set outside the rim. The dial on a control panel, every position doing an equal share of the work.",
  positioning: "Choose it when the parts together make up the whole and none of them leads to the next. Use cycle when the last part returns to the first, and pie when the parts are unequal shares.",
  audience: "Readers who need to see a job in its complete set of parts.",
  notFor: "Parts that follow one another around a loop, which belong in cycle.",
}
