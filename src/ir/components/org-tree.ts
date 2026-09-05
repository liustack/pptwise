import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const LeafSchema = z
  .object({
    name: z.string().min(1).describe("The person or unit this node names."),
    role: z.string().optional().describe("One short line under the name."),
  })
  .strict()

const BranchSchema = z
  .object({
    name: z.string().min(1).describe("The person or unit this node names."),
    role: z.string().optional().describe("One short line under the name."),
    children: z
      .array(LeafSchema)
      .min(1)
      .max(6)
      .optional()
      .describe("The nodes reporting to this one. Omit it and the branch is itself a bottom node."),
  })
  .strict()

/** Bottom nodes: a branch with no children is one, otherwise its children are. */
export function orgTreeLeafCount(children: readonly { children?: readonly unknown[] }[]): number {
  return children.reduce((n, child) => n + (child.children?.length ?? 1), 0)
}

export const LEAF_CAP = 8

export const schema = z
  .object({
    type: z.literal("org_tree"),
    /** 判据句：一个根节点带 2-6 个直属分支，每个分支最多再带一层，全树三层封顶、
     * 底层节点合计不超过 8 个。画的是「谁向谁汇报」这种从属关系，拆解问题用
     * issue_tree，同心包含用 rings，层层支撑用 pyramid，只是并列的人物名单用
     * people_cards。 */
    root: z
      .object({
        name: z.string().min(1).describe("The person or unit at the top."),
        role: z.string().optional().describe("One short line under the name."),
      })
      .strict(),
    children: z
      .array(BranchSchema)
      .min(2, "org_tree.children needs at least 2 branches — one branch under a root is a two-item list, not a tree")
      .max(6, "org_tree.children accepts at most 6 branches — more and a branch box is narrower than the name inside it")
      .describe("The nodes directly under the root, left to right in the order they should read."),
  })
  .strict()
  .refine((c) => orgTreeLeafCount(c.children) <= LEAF_CAP, {
    error: `org_tree draws at most ${LEAF_CAP} bottom nodes across the whole tree — past that every box is narrower than the name it holds. Split the chart by branch, or drop the bottom row and let each branch stand for its own team.`,
    path: ["children"],
  })
  .describe(
    "A reporting structure three levels deep at most: one root, 2-6 branches under it, and an optional row " +
      "of nodes under each branch, capped at 8 bottom nodes in total. Use org_tree when the lines mean " +
      "'reports to'. Use `issue_tree` when they mean 'breaks down into', `rings` when the levels nest one " +
      "inside another, `pyramid` when each level supports the one above it, and `people_cards` when the " +
      "names are peers with no lines between them."
  )

export const aliases = {
  items: [
    { itemsKey: "children", aliases: { title: "name", label: "name", text: "role", desc: "role" } },
  ],
} satisfies ComponentAliasSpec

// The tree paints its own node boxes and its own connector lines, so a bento
// outline shell underneath would be a second frame around an already-drawn
// diagram — same posture as `hub_spoke` and `flowchart`.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Reporting Lines",
  story: "A root, the branches under it, and the row beneath them, joined by square connectors. The organisation chart pinned to the wall on someone's first morning.",
  positioning: "Choose it when the lines mean reports to and the shape of the team is the point. Use issue_tree when a line means breaks down into, rings when the levels nest, and people_cards when the names are peers.",
  audience: "Anyone who needs to know who answers to whom.",
  notFor: "A list of names with no reporting lines between them, which belongs in people_cards.",
}
