import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

/** The two ways a sketch shows an effect told apart from everything else. */
export const SKETCH_KINDS = ["discontinuity", "difference_in_differences"] as const

export const schema = z
  .object({
    type: z.literal("sketch"),
    /** 判据句：用一张不带数字的示意图说明效应是怎么认出来的。
     * discontinuity：结果在某个门槛处跳一下（断点回归）。
     * difference_in_differences：某件事之后，处理组的走势离开对照组（双重差分）。
     * 有真实数据时用 chart。 */
    kind: z
      .enum(SKETCH_KINDS)
      .describe(
        '"discontinuity": an outcome that jumps where a running variable crosses a cutoff, two fitted lines over scattered points with the jump between them marked, as a regression discontinuity design reads. ' +
          '"difference_in_differences": two groups\' trends running side by side until an event, then the treated one leaving the path it would have kept, drawn dashed, as a difference-in-differences design reads.',
      ),
    at: z
      .string()
      .min(1)
      .describe('What stands at the dashed line: the cutoff, such as "法定年龄" or "Statutory age", or the event, such as "新政施行" or "Reform starts".'),
    x_title: z.string().min(1).describe('What runs along the bottom, such as "年龄", "时间", "Age" or "Time". An arrow is set after it.'),
    y_title: z.string().min(1).optional().describe('What the outcome is, set at the top of the upright axis, such as "在业" or "In work".'),
    effect: z
      .string()
      .min(1)
      .optional()
      .describe('discontinuity only: what the jump is read as, printed beside its arrow, such as "跳跃 = 效应" or "Jump = effect".'),
    groups: z
      .array(z.string().min(1))
      .length(2)
      .optional()
      .describe('difference_in_differences only, and required there: the treated group and then its control, each named at the end of its line, such as ["新规队列", "相邻旧规队列"] or ["New-rule cohorts", "Neighbouring cohorts"].'),
    direction: z
      .enum(["up", "down"])
      .optional()
      .describe('Which way the outcome moves: at the cutoff, or the treated line after the event against the path it would have kept. Omitted, "up".'),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.kind === "difference_in_differences" && s.groups === undefined) {
      ctx.addIssue({ code: "custom", path: ["groups"], message: 'a difference_in_differences sketch names its treated group and its control: write groups, such as ["New-rule cohorts", "Neighbouring cohorts"].' })
    }
    if (s.kind === "discontinuity" && s.groups !== undefined) {
      ctx.addIssue({ code: "custom", path: ["groups"], message: "a discontinuity sketch draws one outcome on both sides of its cutoff and names no groups. Remove groups, or use kind difference_in_differences." })
    }
    if (s.kind === "difference_in_differences" && s.effect !== undefined) {
      ctx.addIssue({ code: "custom", path: ["effect"], message: "a difference_in_differences sketch marks no jump for effect to name: the gap between the treated line and its dashed path is the effect. Remove effect, or use kind discontinuity." })
    }
  })
  .describe(
    "A schematic, with no figures, of how an effect is told apart from everything else: an outcome that jumps at a cutoff (a regression discontinuity), or a treated group's trend leaving its control's after an event (a difference-in-differences). " +
      "Use sketch to show the shape of an argument a study rests on. Use `chart` when there are real figures to plot.",
  )

export const aliases = {} satisfies ComponentAliasSpec

// A drawing with its own axes and labels: a bento shell around it would frame
// an already-composed figure, the way it would a venn.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Sketch",
  story: "A schematic with no numbers on it: the dashed line where a rule cuts in and the outcome jumping across it, or one group's trend leaving another's, its lost path dashed. The drawing made on the board before any data.",
  positioning: "Choose it when the audience has to see how an effect will be told apart before they see a result: a cutoff, an event and a comparison group. Use chart when there are figures to plot.",
  audience: "A committee or a room weighing whether a design can identify what it claims to.",
  notFor: "Real data, which belongs in a chart, and steps of a method, which belong in steps.",
}
