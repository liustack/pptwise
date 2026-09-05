import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("iceberg"),
    /** 判据句：水面之上 1-2 条「说得出口的」，水面之下 3-6 条「没人摊开的」，
     * 条目都印在冰山轮廓里。用它是为了说「你看见的只是一小部分」，两组东西
     * 平级对照用 comparison，层层支撑用 pyramid。 */
    above: z
      .array(z.string().min(1))
      .min(1, "iceberg.above needs at least 1 visible item — a berg with nothing above water is not an iceberg")
      .max(2, "iceberg.above accepts at most 2 visible items — the tip is small on purpose, and that is the argument")
      .describe("What everyone already says, printed in the tip above the waterline."),
    below: z
      .array(z.string().min(1))
      .min(3, "iceberg.below needs at least 3 hidden items — fewer than three below two above is not a hidden mass")
      .max(6, "iceberg.below accepts at most 6 hidden items — past that the lines crowd the submerged silhouette")
      .describe("What nobody raises, printed in the submerged mass under the waterline."),
    waterline: z.string().optional().describe("Name for the line itself, printed at its left end."),
    above_label: z.string().optional().describe("What the visible band is, printed to the right of the tip."),
    below_label: z.string().optional().describe("What the hidden band is, printed to the right of the mass."),
  })
  .strict()
  .describe(
    "A berg with 1-2 stated items above the waterline and 3-6 unstated ones below it, both printed inside " +
      "the silhouette. Use iceberg when the argument is that the visible part is the small part. Use " +
      "`comparison` when the two sets are peers being weighed, and `pyramid` when the levels support one another."
  )

export const aliases = {
  block: { visible: "above", hidden: "below", surface: "above", deep: "below" },
} satisfies ComponentAliasSpec

// One silhouette and one tinted band, painted edge to edge: a card outline
// around it would cut the water off before the berg ends. Not `selfVisual`,
// though — that names a component that paints its own *card*, and this one
// paints a picture, not a frame.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Waterline",
  story: "A tip everybody names, a waterline, and the mass under it nobody raises, with every line printed inside the silhouette. The drawing that ends the meeting where the symptom was mistaken for the cause.",
  positioning: "Choose it when the point is that the visible part is the small part and the rest goes unsaid. Use comparison when the two sets are peers, and pyramid when levels support one another.",
  audience: "Rooms that keep solving the complaint instead of what causes it.",
  notFor: "Two sets being weighed against each other as equals, which belongs in comparison.",
}
