import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("flowchart"),
    nodes: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string(),
            kind: z.enum(["rect", "diamond", "round"]).optional(),
          })
          .strict()
      )
      .max(20),
    edges: z.array(
      z
        .object({
          from: z.string(),
          to: z.string(),
          label: z.string().optional(),
        })
        .strict()
    ),
    direction: z.enum(["TB", "TD", "BT", "LR", "RL"]).optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    // An edge is a line between two nodes, so an endpoint naming no node is
    // a line with nowhere to go. The layout used to drop such an edge before
    // it counted anything, so the arrow and its label left the page with no
    // validate error and no `data-dropped`: a typo in one id silently
    // removed a step from the diagram. Name the edge and the id, so the fix
    // is mechanical.
    const ids = new Set(c.nodes.map((n) => n.id))
    c.edges.forEach((edge, i) => {
      for (const end of ["from", "to"] as const) {
        if (ids.has(edge[end])) continue
        ctx.addIssue({
          code: "custom",
          path: ["edges", i, end],
          message:
            `edges[${i}].${end} is "${edge[end]}", which is not the id of any node on this flowchart. ` +
            `Known ids: ${c.nodes.map((n) => `"${n.id}"`).join(", ") || "(none)"}. ` +
            "An edge draws a line between two nodes, so both ends have to name one.",
        })
      }
    })
  })

export const aliases = {} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: true,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Flow",
  story: "Labelled boxes joined by arrows, with a diamond wherever the path splits. The process map drawn on a whiteboard and then drawn properly.",
  positioning: "Choose it when the path branches on a decision and reaches a real end. Use steps for a straight sequence, cycle when the end returns to the start, and sankey when the branches carry quantities.",
  audience: "People who must know which way the work turns and when.",
  notFor: "A loop with no endpoint, which belongs in cycle.",
}
