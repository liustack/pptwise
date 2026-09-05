import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const SubPointSchema = z
  .object({
    label: z.string().min(1).describe("One testable sub-point, short enough to read in a single line."),
  })
  .strict()

const BranchSchema = z
  .object({
    label: z.string().min(1).describe("One hypothesis the question splits into."),
    note: z.string().optional().describe("One line saying how much of the question this branch accounts for."),
    emphasis: z
      .literal(true)
      .optional()
      .describe("Mark the one branch the page argues for. It is filled solid instead of outlined."),
    children: z
      .array(SubPointSchema)
      .min(1)
      .max(4)
      .optional()
      .describe("The sub-points under this hypothesis. Omit it and the hypothesis is the end of its own line."),
  })
  .strict()

/** Bottom nodes: a branch with no sub-points is one, otherwise its sub-points are. */
export function issueTreeLeafCount(branches: readonly { children?: readonly unknown[] }[]): number {
  return branches.reduce((n, branch) => n + (branch.children?.length ?? 1), 0)
}

export const LEAF_CAP = 8

export const schema = z
  .object({
    type: z.literal("issue_tree"),
    /** 判据句：一个待答问题拆成 2-4 条互不重叠的假设，每条假设最多再拆一层，
     * 全树三层封顶、末端条目合计不超过 8 条。线的含义是「拆解成」，汇报从属用
     * org_tree，按条件分叉且每条边是一个判断用 flowchart。 */
    question: z.string().min(1).describe("The question the whole tree answers, written as a question."),
    branches: z
      .array(BranchSchema)
      .min(2, "issue_tree.branches needs at least 2 hypotheses — a question that splits one way has not been split")
      .max(4, "issue_tree.branches accepts at most 4 hypotheses — beyond that the sub-point column has no room left")
      .describe("The hypotheses the question splits into, in the order they should be read down the page."),
  })
  .strict()
  .refine((c) => issueTreeLeafCount(c.branches) <= LEAF_CAP, {
    error: `issue_tree draws at most ${LEAF_CAP} end points across the whole tree — past that each one is a line of text too short to say anything. Cut the weakest hypothesis, or give the deepest branch its own page.`,
    path: ["branches"],
  })
  .refine((c) => c.branches.filter((b) => b.emphasis).length <= 1, {
    error: "issue_tree marks at most one branch with emphasis — two filled branches say neither is the answer.",
    path: ["branches"],
  })
  .describe(
    "A question broken into 2-4 hypotheses and their sub-points, three levels deep at most and capped at 8 " +
      "end points, drawn left to right. Use issue_tree when a line means 'breaks down into' and the branches " +
      "are meant to be mutually exclusive. Use `org_tree` when a line means 'reports to', and `flowchart` " +
      "when each branch is a decision taken on a condition."
  )

export const aliases = {
  block: { title: "question", root: "question" },
  items: [
    { itemsKey: "branches", aliases: { title: "label", name: "label", text: "note", desc: "note" } },
  ],
} satisfies ComponentAliasSpec

// Every node paints its own box and the connectors are drawn by the diagram
// itself, so the bento shell would frame an already-framed drawing.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Question Split",
  story: "One question on the left, the hypotheses it splits into, and the checks under each, running rightwards. The whiteboard on the second day, when the problem finally has edges.",
  positioning: "Choose it when a line means breaks down into and the branches are meant not to overlap. Use org_tree when a line means reports to, and flowchart when a branch is a decision.",
  audience: "People who have to agree on how a problem is cut before they argue about the answer.",
  notFor: "A structure whose lines mean who answers to whom, which belongs in org_tree.",
}
