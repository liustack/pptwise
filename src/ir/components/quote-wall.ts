import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

/**
 * 多人引语墙（component build wave A）。
 *
 * 判据句：2-4 个人各说一句，页面要说的是「他们说的是同一件事」时用它。
 * 一个人说一句用 blockquote：那是把一句话放大到整页的做法，而这里的重量
 * 在于「几个人」，任何一句都不该被放大到压过其他人。
 *
 * 上限 4：第五段引语会把每列压到三四个字一行。每人 `text` 上限 140 字，
 * 是「摘一句原话」而不是「贴一段访谈纪要」。
 *
 * `featured` 全集最多一个：被选中的那张整卡填 primary、文字转白（版式规矩
 * ——强调是整块填色或字重，绝不是卡边上的一道彩条）。
 */
export const schema = z
  .object({
    type: z.literal("quote_wall"),
    quotes: z
      .array(
        z
          .object({
            text: z
              .string()
              .min(1, "a quote_wall quote needs its text")
              .max(
                140,
                "a quote_wall quote is one remark (<= 140 chars), not a transcript — give one speaker's longer passage to `blockquote`, which sets it at full size",
              )
              .describe("What this person said, in their own words. One remark, not a passage."),
            name: z
              .string()
              .min(1, "a quote_wall quote needs the speaker's name")
              .describe(
                "Who said it. The initials beside the quote are derived from this exact string: a Latin name takes the first letter of each of its first two words, a single Latin word takes its own first two letters, and a CJK name takes only its surname character.",
              ),
            role: z
              .string()
              .optional()
              .describe("Optional one line placing the speaker — their title, their organization, or both."),
            featured: z
              .literal(true)
              .optional()
              .describe(
                "Optional. Marks the one quote the page turns on: it is filled solid and its text is set to read against that fill. At most one quote in the set may set it.",
              ),
          })
          .strict(),
      )
      .min(2, "quote_wall needs at least 2 quotes — one person's remark belongs in `blockquote`, set at full size")
      .max(
        4,
        "quote_wall accepts at most 4 quotes — past 4 each column narrows to a few characters a line; pick the ones that say different things",
      )
      .describe(
        "2-4 remarks side by side, each with its speaker, in the order they should be read left to right.",
      ),
  })
  .strict()
  .refine((component) => component.quotes.filter((quote) => quote.featured).length <= 1, {
    error:
      "only one quote_wall quote may be featured — filling every card singles out none of them. Feature the one the page turns on, or feature none",
    path: ["quotes"],
  })
  .describe(
    "Sets 2-4 short remarks side by side, each with the speaker's initials, name, and role, so the page's " +
      "claim is carried by several voices agreeing rather than one. Use quote_wall when the number of people " +
      "saying it is the argument — customer voices, panel reactions, press notices. The test: does the point " +
      "weaken if you keep only one of them? Use `blockquote` for a single remark set at full size, and " +
      "`people_cards` when the page is about who these people are rather than what they said.",
  )

export const aliases = {
  items: [{ itemsKey: "quotes", aliases: { quote: "text", author: "name", speaker: "name", title: "role" } }],
} satisfies ComponentAliasSpec

/**
 * `selfVisual: true`，与 `blockquote`/`callout` 同一姿态：每段引语自己已经
 * 画了卡片和引号，bento 再套一层外壳就是卡中卡。`columnSpanning: true`：几个
 * 人并排说话是这个组件的形状，挤进两栏的一栏就只剩两三个字一行。其余全
 * false：一堵引语墙纵向拉伸只会拉出空腔（stretchable），是可回流文字而非可
 * 整体缩放的图（scalable/passthroughShell），不是整页画布（fullBody），别人说
 * 的话也不是 chart/data_table 那种可复核的证据（evidence）。
 */
export const traits = {
  stretchable: false,
  selfVisual: true,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  columnSpanning: true,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Voices",
  story: "Two to four short remarks standing side by side, each under an open quote mark with the speaker's initials, name and role beneath it, and one may be filled solid. The praise printed across the back of a paperback.",
  positioning: "Choose it when several people saying the same thing is the argument, and no single one of them should be enlarged above the rest. Use blockquote for one remark set at full size, and people_cards when the page is about who the speakers are.",
  audience: "A reader deciding whether anyone else is convinced.",
  notFor: "One speaker's longer passage, which belongs in blockquote.",
  lineage: "The blurb wall on a jacket, and the notices pasted outside a theatre.",
}
