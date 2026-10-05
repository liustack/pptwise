import { z } from "zod"
import { TagSchema } from "./shared"
import type { ComponentAliasSpec, ComponentTraits } from "./types"
import type { DesignStory } from "../../design-story"

// positional cells vs data_table's keyed cells (probe evidence-gate
// byproduct, 2026-07-26 — `.issues/notes/quality-evidence.md`
// venn section): `rows[].cells` is a *positional* array read by index
// against `columns` (`columnTexts()` in comparison.tsx reads
// `cells[colIdx - 1]`), unlike data_table's keyed `Record<key, value>`
// cells — so the two components' lenient/strict split can't be copy-pasted
// verbatim, but the underlying philosophy transfers directly:
//   - fewer cells than columns (a row omitting a trailing value) is
//     unchanged — the renderer already reads a missing index as `""` and
//     draws an empty cell, exactly data_table's "missing key → warn-level
//     gap, not a hard error" lenience for content that just isn't there
//     yet.
//   - *more* cells than columns is now a hard error (superRefine below): a
//     probe artifact (qwen3.6-27b/p07) declared 2 columns but gave rows 3
//     cells each, and `columnTexts()` — which only ever reads
//     `cells[0..columns.length)` — silently dropped the 3rd cell every
//     time, once losing the exact overlap fact the slide's argument
//     depended on. Unlike data_table's *extra key* (which is at least
//     visible as an unrecognized property name before strict() rejects
//     it), a positional array with too many entries is schema-legal shape
//     today and the loss is invisible until someone diffs the rendered
//     slide against the source content — silent data loss is never
//     acceptable per this repo's IR `.strict()` philosophy, so it must
//     become loud, not just visible-on-inspection. This is not a "new
//     restriction on previously-parseable input" in the sense the R1
//     global constraint protects (chart's array-shape leniency for
//     legitimately-ambiguous author intent) — input that silently loses
//     authored content was already broken, just quietly; making the
//     failure explicit is a correctness fix, not a compat break.
export const schema = z
  .object({
    type: z.literal("comparison"),
    title: z
      .string()
      .optional()
      .describe('A short name for the comparison, printed over it, such as "三个方案" or "Three options". A theme that sets it in a panel prints the title in the panel\'s title bar.'),
    columns: z.array(z.string()),
    /** The header over the rows' labels. See the describe below. */
    label_column: z
      .string()
      .min(1)
      .optional()
      .describe('The header over the rows\' labels, saying what they are, such as "药品" or "Option". Without it that header stays empty.'),
    rows: z.array(
      z
        .object({
          label: z.string(),
          cells: z.array(z.string()),
          tag: TagSchema.optional().describe(
            "What happened to this row, in a few words printed as a small tag after its cells, such as 改为区间, 不变 or 换指标. Set quiet on a tag that says nothing changed.",
          ),
          emphasis: z
            .boolean()
            .optional()
            .describe("Marks the one row the page is about: it sits on a pale tint of the emphasis colour and its tag fills in that colour. At most one row."),
        })
        .strict()
    ),
    tag_column: z
      .string()
      .optional()
      .describe('The header over the rows\' tags, such as "变化" or "Change". Only with tags.'),
    /** Index into `columns` of the option the page recommends. Its header
     * and cells are set in the primary color, bold. */
    recommended: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        "Index into columns (0 is the first) of the one option the page recommends. Its header and cells are set bold in the primary color.",
      ),
    /** Who the recommended option is for. See the describe below. */
    recommended_label: z
      .string()
      .optional()
      .describe(
        'A few words printed as a filled tag over the recommended option, saying who it is for or why, such as "客服用这个" or "For support teams". Only with recommended.',
      ),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.recommended_label !== undefined && (c.recommended === undefined || !c.recommended_label.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["recommended_label"],
        message:
          c.recommended === undefined
            ? "comparison has a recommended_label and no recommended option for it to stand over. Set recommended to the option's column index, or remove recommended_label."
            : "comparison recommended_label is blank. Write the few words it says, or remove it.",
      })
    }
    if (c.recommended !== undefined && c.recommended >= c.columns.length) {
      ctx.addIssue({
        code: "custom",
        path: ["recommended"],
        message: `comparison recommended is ${c.recommended}, and columns has ${c.columns.length} entr${c.columns.length === 1 ? "y" : "ies"}, so there is no column ${c.recommended} to mark. Columns count from 0: use 0 to ${Math.max(0, c.columns.length - 1)}.`,
      })
    }
    const marked = c.rows.flatMap((row, i) => (row.emphasis === true ? [i] : []))
    if (marked.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["rows", marked[1]!, "emphasis"],
        message: `comparison marks ${marked.length} rows with emphasis, and a marked row singles out one. Keep emphasis on the row the page is about.`,
      })
    }
    if (c.tag_column !== undefined && !c.rows.some((row) => row.tag)) {
      ctx.addIssue({
        code: "custom",
        path: ["tag_column"],
        message: "comparison has a tag_column and no row has a tag, so the header would stand over an empty column. Give the rows their tags, or remove tag_column.",
      })
    }
    c.rows.forEach((row, i) => {
      if (row.cells.length > c.columns.length) {
        ctx.addIssue({
          code: "custom",
          path: ["rows", i, "cells"],
          message: `comparison rows[${i}] has ${row.cells.length} cell(s) but only ${c.columns.length} column(s) declared in columns — the extra cell(s) beyond columns.length would be silently dropped at render; remove the extra cell(s) or add matching column(s)`,
        })
      }
    })
  })

export const aliases = {} satisfies ComponentAliasSpec

export const traits = {
  stretchable: false,
  selfVisual: true,
  scalable: false,
  passthroughShell: false,
  fullBody: false,
  evidence: true,
  // A table read across its options cannot be read at half a page: in two
  // columns it spans both, the blocks around it in columns above and under it.
  columnSpanning: true,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Side by Side",
  story: "Named columns answering the same questions in turn, one row per attribute. The specification table a buying guide prints so nothing goes unanswered.",
  positioning: "Choose it when a few named options must answer the same set of questions in words. Use matrix when placement on two axes is the point, and a fixed frame like swot or pest when the frame is the argument.",
  audience: "Deciders weighing named options attribute by attribute.",
  notFor: "Numbers to be read exactly, which belong in data_table.",
}
