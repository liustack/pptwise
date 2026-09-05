import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

/** The four sizes a word can be set in. Weight 4 is the largest. */
export const WORD_CLOUD_TIERS = [1, 2, 3, 4] as const

export const schema = z
  .object({
    type: z.literal("word_cloud"),
    /** 判据句：8-20 个词按 1-4 四档字号排布，读者要一眼看出哪些说法反复出现时用。
     * 每个词一个 `text` 加一个 `weight`（4 最大），词不重复。
     * 需要读出准确次数用 chart 的条形，需要成句的观点用 bullets，
     * 只是一排等重的短标签用 tag_row。排布是确定的：先按权重从大到小，同档按词本身
     * 排序，所以同一批词无论作者写成什么顺序都落在同样的位置。 */
    words: z
      .array(
        z
          .object({
            text: z.string().min(1).describe("One word or short phrase, as it should be set."),
            weight: z
              .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)], {
                error:
                  "word_cloud weights are 1, 2, 3 or 4 — four sizes are what a reader can tell apart. A finer grade would need a legend, and a cloud that needs a legend should have been a bar chart.",
              })
              .describe("Which of the four sizes this word is set in: 4 largest, 1 smallest."),
          })
          .strict()
      )
      .min(8, "word_cloud needs at least 8 words — fewer read as a list, and tag_row sets a list better")
      .max(20, "word_cloud accepts at most 20 words — beyond that the small tier lands below the readable floor")
      .describe(
        "8-20 words, each with its own weight. Where a word lands is decided by its weight and then by the word itself, so authoring order changes nothing."
      ),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Map<string, number>()
    for (const [i, word] of value.words.entries()) {
      const key = word.text.trim()
      const first = seen.get(key)
      if (first !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["words", i, "text"],
          message: `word_cloud repeats "${key}" — a word appears once, at the weight its whole count earns`,
        })
        continue
      }
      seen.set(key, i)
    }
  })
  .describe(
    "8-20 words set in four sizes, packed from the middle outward by weight and then alphabetically, no word " +
      "turned on its side. Use word_cloud " +
      "when the point is which words keep coming back. Use chart when the counts must be read, bullets when " +
      "the findings are sentences, and tag_row for a line of labels that carry no weight against each other."
  )

export const aliases = {
  block: { items: "words" },
  items: [{ itemsKey: "words", aliases: { label: "text", count: "weight" } }],
} satisfies ComponentAliasSpec

// The packing fills whatever rect it is handed and the words are its own
// frame, so a shell around it would be a second frame — same posture as
// `heatmap`.
export const traits = {
  stretchable: false,
  selfVisual: false,
  scalable: false,
  passthroughShell: false,
  fullBody: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Chorus",
  story: "The words a room kept saying, set in four sizes and packed from the middle outward, none of them turned on its side. What a wall of sticky notes looks like once someone has counted them.",
  positioning: "Choose it when the finding is which words keep coming back, not how often each one did. Use a bar chart when the counts themselves have to be read.",
  audience: "Readers who want the shape of what was said before the numbers.",
  notFor: "Counts that must be compared exactly, which belong in a chart.",
}
