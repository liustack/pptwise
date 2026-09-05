import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const OutcomeSchema = z
  .object({
    edge: z
      .string()
      .min(
        1,
        "decision_tree outcomes carry a condition on the line into them, the same as branches do — a share, a probability, or the case that leads here. A tree whose second level says nothing about why a reader lands on one ending rather than another is a list drawn with arrows."
      )
      .describe("Label on the line into this outcome — a share, a probability, a condition."),
    title: z.string().min(1).describe("The outcome itself, named in a few words."),
    detail: z.string().optional().describe("Optional single line on what this outcome costs or means."),
    value: z.string().optional().describe("The one number this outcome carries, written as it should read."),
    unit: z.string().optional().describe("Unit printed after the number, in smaller type."),
    recommended: z
      .boolean()
      .optional()
      .describe("Marks the one outcome the deck is arguing for. It is filled whole; at most one may be set."),
  })
  .strict()
  .refine((outcome) => outcome.unit === undefined || (outcome.value ?? "").trim() !== "", {
    error:
      "decision_tree outcome has a unit and no value — a unit is what a number is counted in, and there is no number here for it to belong to. Write the value, or drop the unit.",
    path: ["unit"],
  })

const BranchSchema = z
  .object({
    edge: z.string().min(1).describe("The condition that leads down this branch — this is what makes it a decision."),
    title: z.string().min(1).describe("Where this branch goes, named in a few words."),
    detail: z.string().optional().describe("Optional single line under the branch name."),
    outcomes: z
      .array(OutcomeSchema)
      .min(2, "decision_tree outcomes come in twos or threes — a branch with one outcome is not a decision")
      .max(3, "decision_tree accepts at most 3 outcomes per branch — a fourth leaves every row too short to read")
      .describe("2-3 outcomes this branch can end in."),
  })
  .strict()

export const schema = z
  .object({
    type: z.literal("decision_tree"),
    /** 判据句：一个问题分出 2-3 条路，每条路再分出 2-3 个结局，且每根连线上
     * 都有条件、概率或占比时用。只有一条主线用 steps 或 flowchart，
     * 结局之间只是并列不分层用 comparison。树只画两层：再深一层，
     * 边上的标签就没地方站了。被推荐的那个结局整块反色填满。 */
    question: z.string().min(1).describe("The decision itself, written as the question being answered."),
    branches: z
      .array(BranchSchema)
      .min(2, "decision_tree.branches needs at least 2 branches — one branch is a sequence, which is `steps`")
      .max(3, "decision_tree.branches accepts at most 3 branches — a fourth leaves no room for the outcome column")
      .describe("2-3 paths out of the question, each with its own condition on the line."),
  })
  .strict()
  .superRefine((value, ctx) => {
    const marked = value.branches.flatMap((branch, b) =>
      branch.outcomes.flatMap((outcome, o) => (outcome.recommended === true ? [[b, o] as const] : [])),
    )
    if (marked.length > 1) {
      const [b, o] = marked[1]!
      ctx.addIssue({
        code: "custom",
        path: ["branches", b, "outcomes", o, "recommended"],
        message: `decision_tree marks ${marked.length} outcomes as recommended — a page recommends one path, and two filled outcomes read as two answers to one question`,
      })
    }
  })
  .describe(
    "One question, 2-3 paths out of it, and 2-3 outcomes down each path, with the condition written on every " +
      "line. Use decision_tree when the reader has to see which condition sends them where, and what each " +
      "ending costs. Use `flowchart` when the path has one thread with decisions along it, `steps` when there " +
      "is no branching at all, and `comparison` when the endings sit side by side with no route into them."
  )

export const aliases = {
  block: { title: "question", decision: "question", options: "branches" },
  items: [{ itemsKey: "branches", aliases: { label: "title", name: "title", condition: "edge", desc: "detail" } }],
} satisfies ComponentAliasSpec

// Every node paints its own box and every edge its own line, so a bento
// outline shell underneath would be a second frame around a framed diagram.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Fork",
  story: "A question on the left, the conditions written on the lines out of it, and where each one ends on the right. The routing card taped inside a switchboard.",
  positioning: "Choose it when the reader has to see which condition sends them where and what each ending costs. Use flowchart for one thread with decisions along it.",
  audience: "People about to pick a path who want the cost of each one first.",
  notFor: "Endings with no route into them, which belong in comparison.",
}
