import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const StageSchema = z
  .object({
    label: z.string().min(1).describe("Name of this stage of the journey."),
    touchpoints: z
      .array(z.string().min(1))
      .max(3, "journey_map touchpoints hold at most 3 per stage — a fourth pill leaves the row taller than the curve under it")
      .optional()
      .describe("Up to 3 places the person meets you at this stage, each a short noun phrase."),
    action: z.string().optional().describe("What the person actually does here, in one line."),
    emotion: z
      .number()
      .int()
      .min(1, "journey_map emotion runs 1 to 5 — 1 is the worst this journey feels")
      .max(5, "journey_map emotion runs 1 to 5 — 5 is the best this journey feels")
      .describe("How this stage feels, 1 (worst) to 5 (best). The curve is drawn from these."),
    opportunity: z.string().optional().describe("What could be fixed here, in one line."),
  })
  .strict()

export const schema = z
  .object({
    type: z.literal("journey_map"),
    /** 判据句：3-6 个阶段，每个阶段都能给出一个 1-5 的情绪分，想让「哪一段
     * 最难受」和「那一段有没有人管」对上时用。只是流程环节用
     * chevron_process，只关心谁做用 swimlane，只有阶段名和时间用 timeline。
     * 情绪最低的那一段自动加重，它的机会格整块反色填满。 */
    stages: z
      .array(StageSchema)
      .min(3, "journey_map.stages needs at least 3 stages — a curve through two points is a line, not a journey")
      .max(6, "journey_map.stages accepts at most 6 stages — past that a stage column is narrower than one touchpoint pill")
      .describe("3-6 stages in the order the person passes through them."),
    /** 行名（触点 / 行为 / 情绪 / 机会）。省略则不画行名，各行靠内容自证。 */
    row_labels: z
      .object({
        touchpoints: z.string().optional(),
        action: z.string().optional(),
        emotion: z.string().optional(),
        opportunity: z.string().optional(),
      })
      .strict()
      .optional()
      .describe(
        "Names for the four rows, in the deck's own language. Omit a name and that row goes unlabelled; omit the object and none are labelled."
      ),
  })
  .strict()
  .describe(
    "3-6 stages of one person's journey, with what they meet, what they do, how it feels on a 1-5 curve, and " +
      "what could be fixed. Use journey_map when the low point of the curve is the argument and the fix " +
      "belongs beside it. Use `chevron_process` for the stages of a pipeline with no feeling attached, " +
      "`swimlane` when the question is who does each step, and `timeline` when the stages carry dates."
  )

export const aliases = {
  items: [
    {
      itemsKey: "stages",
      aliases: { title: "label", name: "label", channels: "touchpoints", behaviour: "action", behavior: "action" },
    },
  ],
} satisfies ComponentAliasSpec

// Four banded rows with their own rules, pills and cards — a bento outline
// shell behind them would be a second frame around an already-ruled table.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Journey",
  story: "Stages across the top, and under them what the person meets, does, and feels, the curve dipping where it hurts. The service blueprint taped along a wall.",
  positioning: "Choose it when the low point of the curve is the argument and the fix belongs directly beneath it. Use chevron_process when no feeling is attached to the stages.",
  audience: "Teams deciding which part of an experience to repair first.",
  notFor: "Stages with dates rather than feelings, which belong in timeline.",
}
