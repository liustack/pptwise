import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("staircase"),
    /** 判据句：3-6 个逐级抬升的等级，后一级比前一级高一层，每级带一个数字，
     * 想让「越往上越高」这件事被看见时用。等级之间是程度而不是先后：
     * 先后顺序用 steps，管线环节用 chevron_process，日期用 timeline。
     * 最高的一级自动填成 primary，不必也无法另外指定。 */
    items: z
      .array(
        z
          .object({
            title: z.string().min(1).describe("Name of this level."),
            value: z.string().min(1).describe("The one number this level carries, written as it should read."),
            unit: z.string().optional().describe("Unit printed after the number, in smaller type."),
            note: z.string().optional().describe("Optional single line under the number."),
          })
          .strict()
      )
      .min(
        3,
        "staircase.items needs at least 3 levels — two treads read as a comparison, not a climb"
      )
      .max(
        6,
        "staircase.items accepts at most 6 levels — past that each tread is too narrow to carry its own number on a 1280x720 slide"
      )
      .describe(
        "3-6 levels in ascending order, lowest first. The last one is drawn as the top step and carries the highlight."
      ),
  })
  .strict()
  .describe(
    "3-6 levels that climb, drawn as real stairs: every tread sits one riser above the one before it, and the " +
      "top step is filled so the destination reads first. Use staircase when the levels differ in degree — " +
      "maturity, tier, seniority — and the climb itself is the argument. Use `steps` when they follow one " +
      "another in time, `chevron_process` when they are the stages of a pipeline, and `timeline` when each one " +
      "has a date."
  )

export const aliases = {
  items: [{ itemsKey: "items", aliases: { label: "title", name: "title", text: "note", desc: "note" } }],
} satisfies ComponentAliasSpec

// Every tread paints its own box, so a bento outline shell underneath would
// be a second shell around an already-carded drawing — same posture as
// `steps` and `flowchart`.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: true,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Climb",
  story: "Levels drawn as real stairs, each tread a riser above the last, the top one filled. The height chart on a doorframe, one pencil mark per year.",
  positioning: "Choose it when the levels differ in degree and the climb is the argument. Use steps when they follow one another in time, and timeline when each carries a date.",
  audience: "Readers deciding how far up a ladder something has come.",
  notFor: "Stages that follow one another in time, which belong in steps.",
}
