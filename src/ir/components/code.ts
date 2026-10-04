import { z } from "zod"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

export const schema = z
  .object({
    type: z.literal("code"),
    language: z.string(),
    code: z.string(),
    /** 窗口标题，如文件名「postmortems / quotes.txt」。 */
    title: z
      .string()
      .min(1)
      .optional()
      .describe('A name for the listing, printed in its title bar, such as a file name: "postmortems / quotes.txt" or "deploy.yaml".'),
    /** 要读者盯住的行，从 1 数。 */
    highlight_lines: z
      .array(z.number().int().positive())
      .min(1)
      .optional()
      .describe("The lines the page is about, counted from 1, such as [11, 12]. They are set bold in the theme's warning colour."),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.highlight_lines === undefined) return
    const lines = c.code.split("\n").length
    const seen = new Set<number>()
    c.highlight_lines.forEach((line, i) => {
      if (line > lines) {
        ctx.addIssue({
          code: "custom",
          path: ["highlight_lines", i],
          message: `code highlight_lines[${i}] is line ${line}, and the listing has ${lines} line(s). Lines count from 1.`,
        })
      }
      if (seen.has(line)) {
        ctx.addIssue({ code: "custom", path: ["highlight_lines", i], message: `code highlight_lines names line ${line} twice. Name each line once.` })
      }
      seen.add(line)
    })
  })

export const aliases = {
  block: { content: "code", source: "code", snippet: "code", text: "code" },
} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: true,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: false,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Listing",
  story: "A block of source in a monospaced setting with its language named. The code listing a technical book prints when the exact characters matter.",
  positioning: "Choose it when the literal text is the point and a paraphrase would lose it. Use paragraph when prose about the code would serve better than the code itself.",
  audience: "Readers who will read the syntax, not a description of it.",
  notFor: "An explanation of how something works, which belongs in prose.",
}
