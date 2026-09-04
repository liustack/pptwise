import { z } from "zod"
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
    columns: z.array(z.string()),
    rows: z.array(
      z
        .object({ label: z.string(), cells: z.array(z.string()) })
        .strict()
    ),
  })
  .strict()
  .superRefine((c, ctx) => {
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
  cutsContentWhenShort: true,
} as const satisfies ComponentTraits

export const story: DesignStory = {
  name: "Side by Side",
  story: "Named columns answering the same questions in turn, one row per attribute. The specification table a buying guide prints so nothing goes unanswered.",
  positioning: "Choose it when a few named options must answer the same set of questions in words. Use matrix when placement on two axes is the point, and a fixed frame like swot or pest when the frame is the argument.",
  audience: "Deciders weighing named options attribute by attribute.",
  notFor: "Numbers to be read exactly, which belong in data_table.",
}
