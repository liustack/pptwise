import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

// Porter's Five Forces hub-and-spoke (structure-components wave 2 task 1,
// second component of this task): `rivalry` is the center panel
// (competitive rivalry — the model's own namesake force), the other four
// are the surrounding forces. All five named slots share one shape —
// `intensity` is meaningful for `rivalry` too, a market's own competitive
// intensity is exactly what the center panel measures, so it isn't
// special-cased out of the shared schema the way a "hub has no intensity"
// design would have done.
const FiveForcesPanelSchema = z
  .object({
    label: z.string().optional(),
    intensity: z.enum(["low", "medium", "high"]).optional(),
    items: z.array(z.string()).min(1).max(5),
  })
  .strict()

export const schema = z
  .object({
    type: z.literal("five_forces"),
    /** 波特五力——中心「竞争强度」+ 四向力量（新进入者/供应商议价力/买方
     * 议价力/替代品威胁）。五槽同构，`intensity` 对中心槽同样有意义（见
     * {@link FiveForcesPanelSchema}）。 */
    rivalry: FiveForcesPanelSchema,
    new_entrants: FiveForcesPanelSchema,
    supplier_power: FiveForcesPanelSchema,
    buyer_power: FiveForcesPanelSchema,
    substitutes: FiveForcesPanelSchema,
  })
  .strict()

export const aliases = {
  block: {
    entrants: "new_entrants",
    suppliers: "supplier_power",
    buyers: "buyer_power",
  },
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Five Forces",
  story: "Competitive rivalry in the centre, four pressures around it, each rated for intensity. Porter's arrangement, drawn as it has been taught for decades.",
  positioning: "Choose it to size the structural pressure on a market from five named directions. Use swot when the assessment weighs one organisation's own strengths, and pest for the wider outside conditions.",
  audience: "Strategists judging whether a market is worth entering.",
  notFor: "An open centre-and-satellites picture, which belongs in hub_spoke.",
  lineage: "Porter's five forces, taught in every strategy course since 1979.",
}
