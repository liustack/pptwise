import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

const StateSchema = z
  .object({
    kicker: z.string().optional().describe("Tiny line above the state name, in the deck's own language."),
    title: z.string().min(1).describe("What this state is — a period, a version, a way of working."),
  })
  .strict()

const RowSchema = z
  .object({
    label: z.string().min(1).describe("What this row measures."),
    from: z.string().min(1).describe("The value in the starting state, written as it should read."),
    to: z.string().min(1).describe("The value in the ending state, written as it should read."),
    unit: z.string().optional().describe("Unit printed after both values, in smaller type."),
    change: z.string().optional().describe("The move itself, in the words the deck uses for it."),
  })
  .strict()

export const schema = z
  .object({
    type: z.literal("from_to"),
    /** 判据句：两个状态（前后、现状与目标、旧法与新法）在同一批指标上逐行
     * 对齐，每行都能给出两个值时用。两侧比的是不同的东西用 comparison，
     * 一列数字自己成立用 kpi_cards，中间过程重要用 steps。到达的一侧整块
     * 反色填满。 */
    from: StateSchema.describe("Where things start."),
    to: StateSchema.describe("Where things end up. This is the side that carries the fill."),
    rows: z
      .array(RowSchema)
      .min(3, "from_to.rows needs at least 3 rows — one or two measures are a `kpi_cards` pair, not a shift")
      .max(6, "from_to.rows accepts at most 6 rows — a seventh leaves each row too short for its own number")
      .describe("3-6 measures, the same ones on both sides, in the order they should be read."),
    /** 两侧之间的跨度，如「12 个月」，画在箭头下方。 */
    span: z.string().optional().describe("What separates the two states — a duration, a release, a decision. Printed under the arrow."),
  })
  .strict()
  .describe(
    "Two states of the same thing, measured on the same rows, with an arrow between them. Use from_to when " +
      "every row has a value on both sides and the move between them is the argument. Use `comparison` when " +
      "the two sides are different things rather than the same thing twice, `kpi_cards` when one column of " +
      "numbers stands on its own, and `steps` when what happens in between matters more than the endpoints."
  )

export const aliases = {
  block: { before: "from", after: "to", items: "rows" },
  items: [{ itemsKey: "rows", aliases: { title: "label", name: "label", before: "from", after: "to", delta: "change" } }],
} satisfies ComponentAliasSpec

// Two painted panels with their own rules and header bands — a bento outline
// shell behind them would be a second frame around a framed drawing.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Before and After",
  story: "Two panels of the same measures, an arrow between them, and the move printed on every row. The two photographs pinned side by side with a date under each.",
  positioning: "Choose it when both states carry a value on every row and the size of the move is the point. Use comparison when the two sides are different things rather than one thing twice.",
  audience: "Readers who need to see how far something moved, row by row.",
  notFor: "Two different subjects set against each other, which belong in comparison.",
}
