import { z } from "zod"
import type { ItemFieldAliasSpec } from "../field-aliases"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const LaneSchema = z
  .object({
    label: z.string().min(1).describe("Who owns this lane — a team, a role, a system."),
    role: z.string().optional().describe("Optional second line under the lane name."),
  })
  .strict()

const StepSchema = z
  .object({
    lane: z.string().min(1).describe("The label of the lane this step happens in. Must match one of `lanes`."),
    title: z.string().min(1).describe("What happens at this step."),
    detail: z.string().optional().describe("Optional single line inside the box — a duration, a count, an owner."),
  })
  .strict()

export const schema = z
  .object({
    type: z.literal("swimlane"),
    /** 判据句：一条流程横跨 2-4 个角色，每一步只属于一个角色，想让「在哪一步
     * 换了人」被看见时用。全流程一个人做完用 steps，有决策分支用
     * flowchart，只是环节咬合用 chevron_process。跨泳道的那根箭头会画粗、
     * 用 primary，最后一步整块反色填满。 */
    lanes: z
      .array(LaneSchema)
      .min(2, "swimlane.lanes needs at least 2 lanes — one lane is a `steps` sequence with a band drawn round it")
      .max(4, "swimlane.lanes accepts at most 4 lanes — a fifth band leaves each one too short to hold a step box")
      .describe("2-4 lanes, top to bottom, in the order they should be read."),
    steps: z
      .array(StepSchema)
      .min(3, "swimlane.steps needs at least 3 steps — two steps show one handover, which is `comparison`")
      .max(7, "swimlane.steps accepts at most 7 steps — past that each box is narrower than the words in it")
      .describe("3-7 steps in the order work moves through them. Each step sits in exactly one lane."),
    /** 关键交接的一句话说明，画在第一次跨泳道的那根箭头旁边。 */
    handoff_note: z
      .string()
      .optional()
      .describe("One line about the handover, printed beside the first arrow that crosses lanes."),
  })
  .strict()
  .superRefine((value, ctx) => {
    const known = new Set(value.lanes.map((lane) => lane.label))
    value.steps.forEach((step, i) => {
      if (!known.has(step.lane)) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", i, "lane"],
          message: `swimlane.steps[${i}].lane is "${step.lane}", which is not one of the declared lanes (${[...known].join(", ")}) — a step belongs to exactly one lane, and a lane it names has to exist`,
        })
      }
    })
  })
  .describe(
    "One process running left to right across 2-4 lanes, one lane per role, so the moment work changes hands " +
      "is visible. Use swimlane when who does each step is part of the argument. Use `steps` when one team " +
      "does all of it, `flowchart` when the path branches on a decision, and `chevron_process` when the " +
      "stages matter but their owners do not."
  )

// Annotated on its own, same reason sankey's two-array list is (see its own
// comment): a bare array literal of two differently-keyed alias maps widens
// to a union, and the union is not assignable to `readonly
// ItemFieldAliasSpec[]`.
const swimlaneItemAliases: readonly ItemFieldAliasSpec[] = [
  { itemsKey: "lanes", aliases: { name: "label", title: "label", owner: "role" } },
  { itemsKey: "steps", aliases: { label: "title", name: "title", text: "detail", desc: "detail" } },
]

export const aliases = {
  items: swimlaneItemAliases,
} satisfies ComponentAliasSpec

// The lanes and every step box are painted here, so a bento outline shell
// underneath would be a second frame around an already-framed diagram.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Lanes",
  story: "One process crossing bands of ownership, the arrow thickening where work changes hands. The relay chart pinned up in an operations room.",
  positioning: "Choose it when who does each step is part of the argument and the handover is where the time goes. Use steps when one team does all of it.",
  audience: "People arguing about where a process stalls, and whose desk it stalls on.",
  notFor: "A sequence with a single owner, which belongs in steps.",
}
