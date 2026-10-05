import { z } from "zod"
import { PPTX_ICON_NAMES } from "@/icons/catalog"
import { iconEnumError } from "../schema-error-hints"

/**
 * Genuinely cross-component zod primitives (src domain reorg wave 2, spec
 * §4.1: "共享子 schema…放 `src/ir/components/shared.ts`——真跨域共享资产，
 * 保持少量"). This is the CLAUDE.md shared-assets rule's exception clause in
 * practice: a fragment lands here only when *two or more* of the
 * per-component domain files (`./sankey.ts`, `./kpi-cards.ts`, … — added in
 * W2b/W2c, this file is scaffolded ahead of them in W2a) would otherwise
 * define the exact same zod value independently. Everything a single
 * component owns alone — `GanttItemSchema`'s `.refine`, `PestQuadrantSchema`,
 * `SankeyNodeSchema`/`SankeyLinkSchema`, every named row/item shape unique to
 * one component — stays in that component's own domain file, even when its
 * *shape* superficially resembles another component's (e.g. `roadmap`'s
 * `{label, value}` row vs. `insight_panel`'s `{label, text}` row: similar
 * silhouette, different fields, not the same reusable value).
 *
 * Audited against the pre-migration `src/ir/index.ts` (~3000 lines, all 32
 * component schemas) for this task: the icon-name enum below was the *only*
 * zod fragment literally repeated (not just similarly-shaped) across
 * component schemas — it appears 5 times verbatim
 * (`callout.icon`, `kpi_cards.items[].icon`, `icon_cards.items[].icon`,
 * `row_cards.items[].icon`, `verdict_banner.icon`), matching
 * `schema-error-hints.ts`'s own doc comment ("the IR schema's two large
 * closed vocabularies … the icon enum, used 5 times"). No shared
 * "data-point shape" (e.g. chart's `{x, y}` series point) turned out to
 * exist — `chart`'s data point is the only user of that particular shape in
 * the current schema — so none is extracted here; a future component that
 * needs the same shape can move it here as a second entry, no different from
 * adding a new export to any other module.
 *
 * Deliberately minimal (a scaffold, not a landing zone): W2b/W2c may grow
 * this file as real per-component sharing is discovered during the actual
 * migration — this task migrates zero components and adds only what today's
 * codebase already, verifiably, shares.
 */

/**
 * One PPTX icon name — every `icon` field across the IR shares this exact
 * enum + error-hint pair (see this module's own doc comment for the 5 use
 * sites). Bare (not `.optional()`): `icon_cards.items[].icon` is required,
 * the other 4 use sites apply `.optional()` at their own call site — same
 * "the shared fragment is the narrowest common piece, optionality is each
 * field's own business" split `field-aliases.ts`'s per-component tables
 * already use for alias maps.
 */
export const IconNameSchema = z.enum(PPTX_ICON_NAMES, { error: iconEnumError })

/**
 * How an item reads, in the colour every theme keeps for it: `danger` for
 * something that broke or went wrong, `warning` for something to watch or
 * still being handled, `success` for something that recovered or went
 * right. Shared by `timeline` milestones, `kpi_cards` items, `row_cards`
 * items and tags, which mark an incident's turns, a figure's stakes, a log
 * line's outcome and a row's verdict the same way.
 *
 * It says what kind of news the item is, never which item the page is
 * about: that is `emphasis` or `highlight`. A theme paints it in its own
 * danger, warning and success inks, on a dot, an icon or the item's label.
 */
export const ToneSchema = z
  .enum(["danger", "warning", "success"])
  .describe(
    'What kind of news the item is, painted in the theme\'s own colour for it: "danger" for something that broke, "warning" for something to watch or still being handled, "success" for something that recovered or went right.',
  )

/**
 * What kind of source a figure rests on, so a reader can weigh it: a trial
 * or a study published in a peer-reviewed journal, a product's approved
 * label, a company's own figures, a press report, a draft out for comment,
 * an official document, a trial registry, a working paper or a preprint
 * that no journal has reviewed yet. A tag that names its source (`TagSchema.evidence`) is
 * outlined in the ink every theme keeps for that kind, the same kind in the
 * same ink across a deck, so the page tells a journal's figure from a
 * company's at a glance.
 */
export const EVIDENCE_KINDS = ["trial", "label", "company", "press", "draft", "official", "registry", "preprint"] as const

export const EvidenceKindSchema = z
  .enum(EVIDENCE_KINDS)
  .describe(
    'What kind of source the tag names, outlined in the ink the theme keeps for it: "trial" for a trial or a study published in a peer-reviewed journal, "label" for a product\'s approved label, "company" for a company\'s own figures, "press" for a press report, "draft" for a draft out for comment, "official" for a government or regulator\'s document, "registry" for a trial registry, "preprint" for a working paper or a preprint no journal has reviewed yet.',
  )

/**
 * What a figure or a rule rests on, so a reader knows how firm it is: a
 * provision of law in force, a figure the author worked out under a stated
 * assumption, a figure or item still to be confirmed or filled in, a rule
 * that is only proposed. A tag with a basis (`TagSchema.basis`) is outlined
 * in the ink every theme keeps for it, solid for the law and dashed for the
 * three that are not settled yet, so a page tells the law from a scenario
 * at a glance.
 */
export const BASIS_KINDS = ["law", "estimate", "pending", "proposal"] as const

export const BasisSchema = z
  .enum(BASIS_KINDS)
  .describe(
    'What it rests on, so a reader knows how firm it is: "law" for a provision in force, which the tag cites; "estimate" for a figure worked out under a stated assumption, not published and not a forecast; "pending" for a figure or item still to be confirmed or filled in; "proposal" for a rule proposed or still negotiated, not yet law.',
  )

/**
 * A short label that says what happened to a row or a figure, printed in a
 * small rounded tag beside it: 「改为区间」, 「新增」, 「不变」, "Binding".
 * Shared by `comparison` and `from_to` rows and `kpi_cards` items, which all
 * say what changed in the same words.
 *
 * Its colour is not the author's to pick. A tag on the row or figure the
 * page marks (`emphasis`) fills in the theme's emphasis colour, a `quiet`
 * tag (one that says nothing changed) steps back in a grey outline, and any
 * other tag is outlined in the theme's accent.
 */
export const TagSchema = z
  .object({
    text: z
      .string()
      .min(1)
      .describe('A few words for the tag, such as "改为区间", "新增" or "Unchanged". Keep it short: it is printed whole on one line.'),
    quiet: z
      .boolean()
      .optional()
      .describe("Marks a tag that says nothing changed, such as 不变 or Unchanged: it steps back in a grey outline."),
    /** What kind of source the tag names. See `EvidenceKindSchema`. */
    evidence: EvidenceKindSchema.optional(),
    /** A verdict that is final rather than open. See the describe below. */
    settled: z
      .boolean()
      .optional()
      .describe(
        "Marks a tag whose verdict is final, such as 纳入, 不纳入 or Approved, against one still open or conditional, such as 暂缓 or Case by case: it is filled instead of outlined, in the emphasis colour, or in grey on a quiet tag.",
      ),
    /** What kind of news the tag is. See `ToneSchema`. */
    tone: ToneSchema.optional().describe(
      'What kind of news the tag says, outlined in the theme\'s own colour for it: "danger" for a breach or a risk, such as 超说明书 or Off-label, "warning" for something to watch, "success" for something that went right.',
    ),
    /** What the figure or rule rests on. See `BasisSchema`. */
    basis: BasisSchema.optional(),
  })
  .strict()
  .superRefine((tag, ctx) => {
    // A basis says how firm the thing is: a settled verdict contradicts the
    // three that are not settled and repeats the law, and a kind of source
    // answers the same question a second time.
    if (tag.basis === undefined) return
    if (tag.settled) {
      ctx.addIssue({ code: "custom", path: ["settled"], message: `a tag with basis "${tag.basis}" already says how firm it is, and settled says it a second time. Keep one of them.` })
    }
    if (tag.evidence !== undefined) {
      ctx.addIssue({ code: "custom", path: ["evidence"], message: `a tag with basis "${tag.basis}" already says what it rests on, and evidence "${tag.evidence}" says it a second time. Keep one of them.` })
    }
  })
