/**
 * The v5 IR schema root: theme/meta/assets/brand/branding/background/slide/narrative
 * and the top-level `PptxIRSchema` a deck document parses against
 * (`parsePptxIR`). Versions 1 through 4 are rejected at this boundary.
 *
 * **The `ComponentSchema` union below is a pure aggregator (src domain reorg
 * wave 2, spec §4.3), same discipline as `src/layouts/registry.ts`'s T1d
 * precedent.** Every one of the component schemas used to live here as a
 * literal `z.object({...})` entry directly inside the `discriminatedUnion`
 * array. Each now lives in its own `src/ir/components/<name>.ts` domain file
 * instead (schema + field aliases + render-trait declaration together, spec
 * §4.1) — imported below and referenced by name, in the exact union position
 * its literal used to occupy, so "take one component away whole" is a
 * single-file operation instead of an edit split across this file,
 * `field-aliases.ts`, and `component-traits.ts`. This file's own job for
 * components is now purely computational: import every component schema, construct
 * `ComponentSchema` via `z.discriminatedUnion`, and derive `COMPONENT_TYPES`
 * from the result — never a hand-copied literal, never a re-export relay. A
 * handful of schema fragments genuinely shared by ≥2 components (only the
 * icon-name enum, as of this wave) live in `src/ir/components/shared.ts`
 * instead of any one domain file; every other named sub-schema that reads as
 * "shared" at a glance (e.g. `GanttItemSchema`, `PestQuadrantSchema`,
 * `SankeyNodeSchema`/`SankeyLinkSchema`) turned out to be single-consumer and
 * moved into its own component's domain file with it.
 *
 * The rest of this module — everything outside the `// ── Components` section
 * — is unrelated to the component-domain split and was never in its scope:
 * background/theme/meta/assets/brand/branding/slide/narrative and the top-level
 * `PptxIRSchema` are genuinely this file's own content, not aggregated from
 * elsewhere.
 */
import { z } from "zod"
import { HexTokenSchema } from "../themes/hex"
import { KIND_VALUES } from "./narrative-values"
import { componentTypeError } from "./schema-error-hints"
import { schema as bulletsSchema } from "./components/bullets"
import { schema as paragraphSchema } from "./components/paragraph"
import { schema as blockquoteSchema } from "./components/blockquote"
import { schema as calloutSchema } from "./components/callout"
import { schema as codeSchema } from "./components/code"
import { schema as kpiCardsSchema } from "./components/kpi-cards"
import { schema as chartSchema } from "./components/chart"
import { schema as flowchartSchema } from "./components/flowchart"
import { schema as architectureSchema } from "./components/architecture"
import { schema as timelineSchema } from "./components/timeline"
import { schema as comparisonSchema } from "./components/comparison"
import { schema as iconCardsSchema } from "./components/icon-cards"
import { schema as rowCardsSchema } from "./components/row-cards"
import { schema as stepsSchema } from "./components/steps"
import { schema as ringsSchema } from "./components/rings"
import { schema as numberedCardsSchema } from "./components/numbered-cards"
import { schema as roadmapSchema } from "./components/roadmap"
import { schema as matrixSchema } from "./components/matrix"
import { schema as insightPanelSchema } from "./components/insight-panel"
import { schema as verdictBannerSchema } from "./components/verdict-banner"
import { schema as citationSchema } from "./components/citation"
import { schema as imageSchema } from "./components/image"
import { schema as imageGridSchema } from "./components/image-grid"
import { schema as imageCompareSchema } from "./components/image-compare"
import { schema as swotSchema } from "./components/swot"
import { schema as bmcSchema } from "./components/bmc"
import { schema as waterfallSchema } from "./components/waterfall"
import { schema as ganttSchema } from "./components/gantt"
import { schema as pestSchema } from "./components/pest"
import { schema as fiveForcesSchema } from "./components/five-forces"
import { schema as heatmapSchema } from "./components/heatmap"
import { schema as sankeySchema } from "./components/sankey"
import { schema as dataTableSchema } from "./components/data-table"
import { schema as deviceMockupSchema } from "./components/device-mockup"
import { schema as cycleSchema } from "./components/cycle"
import { schema as peopleCardsSchema } from "./components/people-cards"
import { schema as tagRowSchema } from "./components/tag-row"
import { schema as hubSpokeSchema } from "./components/hub-spoke"
import { schema as progressDonutsSchema } from "./components/progress-donuts"

// Re-exported so IR, spec, theme menus, and public tooling share one exact
// semantic vocabulary instead of maintaining independent string unions.
export { KIND_VALUES }

// Built-in theme ids — a registered, renderable subset, not a closed universe:
// v0.4's theme registry can install more without a schema change (theme.id
// below is an open z.string(), the installed-theme check lives in
// api.ts validateIr).
export const BUILTIN_THEME_IDS = [
  "brief",
  "bulletin",
  "thesis",
  "ledger",
  "rally",
  "homeroom",
  "ink",
  "terminal",
  "runway",
  "journal",
  "luxe",
  "heritage",
  "clinic",
  "almanac",
  "ember",
  "vermilion",
  "crayon",
  "arena",
  "museum",
  "stage",
  "lecture",
  "swiss",
  "memo",
  "playbill",
] as const

// ── Background（slide 级受限覆写）──

const BackgroundSpecSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("color"), value: HexTokenSchema }).strict(),
  z
    .object({
      kind: z.literal("gradient"),
      from: HexTokenSchema,
      to: HexTokenSchema,
      direction: z.enum(["tb", "lr", "diagonal"]).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("asset"),
      asset_id: z.string(),
      overlay: z
        .object({ color: HexTokenSchema, opacity: z.number().min(0).max(1) })
        .strict()
        .optional(),
      fit: z.enum(["cover", "contain"]).optional(),
    })
    .strict(),
])

// ── Theme / Meta / Assets / Brand ──

/**
 * Brand (logical slide-master) config: branding behavior owned by a theme.
 * W1 scope was exactly the two flags migrated from the old theme-manifest footer flags;
 * the ink v3 redesign (2026-08-18) added a third, orthogonal one.
 * Single source of truth — the TS type is inferred, never hand-written.
 *
 * All three are independent switches, not a ladder: a theme may set any
 * combination, and each names exactly one piece of brand footer. They are
 * deliberately not collapsed into one "footer style" enum — a theme that
 * draws its own divider is a different situation from one whose motif
 * already carries the org/date, and merging them would force one to imply
 * the other.
 */
export const BrandConfigSchema = z
  .object({
    /** Suppress the footer entirely on content slides with a card background (bulletin legacy semantics). */
    suppressFooterOnCardContent: z.boolean().optional(),
    /** Skip the footer divider line — for themes that draw their own frame (ink). */
    suppressFooterRule: z.boolean().optional(),
    /**
     * Skip the footer's org/confidentiality/version/date text row on content
     * slides — for themes whose motif already carries that information
     * somewhere else on the page, where leaving the footer row on would print
     * the same organization and date twice (ink v3's right-edge colophon
     * rail, `src/motifs/motif-ink-motif.tsx`).
     *
     * Scoped to the ordinary footer row only. The image-bottom overlay footer
     * (a light-on-dark scrim over a full-bleed photo) is untouched: a motif
     * is painted *under* the layout, so a full-bleed image covers the rail
     * completely and the overlay row is the only place that information
     * survives on such a page.
     */
    suppressFooterMeta: z.boolean().optional(),
  })
  .strict()

export type BrandConfig = z.infer<typeof BrandConfigSchema>

/** Theme file ids, IR `theme.id`, spec `theme`, and CLI lookup names share this slug. */
export const THEME_ID_PATTERN = /^[a-z0-9-]+$/

export const THEME_ID_CONSTRAINT =
  "theme id must match ^[a-z0-9-]+$ (lowercase letters, digits, and hyphens)"

export const THEME_REQUIRED_MESSAGE =
  'theme is required. Create one with `pptwise theme new --from <preset> --id <id>`, then bind it. Bare IR uses `"theme": { "id": "<id>" }`. Deck spec uses `"theme": "<id>"`.'

export const ThemeIdSchema = z.string().regex(THEME_ID_PATTERN, THEME_ID_CONSTRAINT)

export const ThemeSchema = z
  .object({
    // Open string, not an enum — installed-theme check happens in validateIr
    // so a v0.4 registry can add themes without a schema change (spec §4).
    id: ThemeIdSchema,
  })
  .strict()

// Exported (not just used internally) so W5's plan schema can pass its own
// `meta` field straight through to this exact schema instead of redefining
// an equivalent shape that could drift from it (`src/spec/index.ts`).
export const MetaSchema = z
  .object({
    organization: z.string().optional(),
    authors: z
      .array(
        z
          .object({
            name: z.string(),
            role: z.string().optional(),
            org: z.string().optional(),
          })
          .strict()
      )
      .optional(),
    date: z.string().optional(),
    version: z.string().optional(),
    confidentiality: z
      .enum(["public", "internal", "confidential", "restricted"])
      .optional(),
    contact: z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
      })
      .strict()
      .optional(),
    copyright: z.string().optional(),
    // Deck-level animation switch (波次 C). Omitted entirely = default
    // behavior: page-transition fade on, per-component entrance animations off.
    // `transition: "none"` opts a deck out of the default fade transition.
    // `elements: "auto"` opts into per-component entrance animations (S3, wired —
    // see `pptx-generate.ts`'s `applyElementAnimations` call, gated on this
    // exact flag).
    animation: z
      .object({
        transition: z.enum(["fade", "push", "wipe", "none"]).optional(),
        elements: z.enum(["none", "auto"]).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

const AssetSchema = z
  .object({
    src: z.string(),
    alt: z.string().optional(),
    error: z.string().optional(),
  })
  .strict()

export const AssetsSchema = z
  .object({ images: z.record(z.string(), AssetSchema).default({}) })
  .strict()

// Exported (not just used internally) so W5's plan schema can pass its own
// `brand` field straight through to this exact schema instead of redefining
// an equivalent shape that could drift from it (`src/spec/index.ts`).
export const BrandSchema = z
  .object({
    logo_asset_id: z.string().optional(),
    position: z.enum(["tl", "tr", "bl", "br"]).optional(),
  })
  .strict()

/**
 * Deck-level branding posture. Omitted equals `"cover-only"` (cover and
 * chapter keep the brand logo, content and ending drop the footer rule,
 * meta, and logo). The schema never bakes a default: writing `"cover-only"`
 * back into a parsed IR would rewrite every existing deck.
 *
 * `"full"` is the explicit declaration that draws the content-page footer
 * rule, meta, and logo, and that paints confidentiality and date on cover
 * and ending meta rows. Other postures leave those two fields off the
 * canvas even when meta carries them. `"minimal"` drops the content-page
 * footer rule and meta but keeps the logo. Layout-declared `branding: "none"`
 * still wins. Theme motifs are not this field.
 *
 * Shared with `DeckSpecSchema` (`src/spec/index.ts`) so the spec and IR
 * cannot drift on the enum.
 */
export const DECK_BRANDING_VALUES = ["full", "cover-only", "minimal"] as const
export type DeckBranding = (typeof DECK_BRANDING_VALUES)[number]
export const DeckBrandingSchema = z.enum(DECK_BRANDING_VALUES).describe(
  'Where the brand footer and logo appear. Omitted equals "cover-only": cover and chapter pages keep the brand logo, content and ending pages drop the footer rule, meta, and logo. "full" is the explicit declaration that draws the content-page footer and logo, and that paints confidentiality and date on cover and ending meta rows. Other postures leave those two fields off the canvas even when meta carries them. "minimal" drops the content-page footer rule and meta but keeps the logo. Layout branding:"none" still wins. Theme motifs are unaffected. Write "full" only when every content page needs the brand footer.',
)

// ── Components（39 种）──

const ComponentSchema = z.discriminatedUnion("type", [
  bulletsSchema,
  paragraphSchema,
  blockquoteSchema,
  calloutSchema,
  codeSchema,
  kpiCardsSchema,
  chartSchema,
  flowchartSchema,
  architectureSchema,
  timelineSchema,
  comparisonSchema,
  iconCardsSchema,
  rowCardsSchema,
  stepsSchema,
  ringsSchema,
  numberedCardsSchema,
  roadmapSchema,
  matrixSchema,
  insightPanelSchema,
  verdictBannerSchema,
  citationSchema,
  imageSchema,
  imageGridSchema,
  imageCompareSchema,
  swotSchema,
  bmcSchema,
  waterfallSchema,
  ganttSchema,
  pestSchema,
  fiveForcesSchema,
  heatmapSchema,
  sankeySchema,
  dataTableSchema,
  deviceMockupSchema,
  cycleSchema,
  peopleCardsSchema,
  tagRowSchema,
  hubSpokeSchema,
  progressDonutsSchema,
], { error: componentTypeError })

/**
 * All component `type` discriminant values, derived from `ComponentSchema`
 * itself (never hand-copied) so this list can't drift from the union above.
 * Typed as plain `readonly string[]` rather than `Component["type"][]` —
 * every consumer of this list (W5's plan `focus` vocabulary gate,
 * `src/spec/index.ts`) tests membership of an arbitrary author-supplied
 * string, and TS's `Array.includes` is invariant in its element type, so a
 * narrower literal-union type would reject that call at the caller.
 */
export const COMPONENT_TYPES: readonly string[] = ComponentSchema.options.map((option) => option.shape.type.value)

// ── Slide ──

const CommonSlideFields = {
  // 稳定页标识（W5 spec/assemble 注入，裸 IR 可省）。schema 层不做跨 slide
  // 校验——同 deck 内重复 id 是 validateIr 的硬错误。
  id: z.string().optional(),
  // assemble 对未填充页生成的占位标记（W5）。
  placeholder: z.literal(true).optional(),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  components: z.array(ComponentSchema).default([]),
  background: BackgroundSpecSchema.optional(),
  // 图片排版 P4：受控装饰原语——模型只有选择权，绘制由渲染层完成。
  decor: z
    .object({
      kind: z.enum(["big_number", "corner_tag", "rule_line", "quote_marks", "geo_dots"]),
      intensity: z.enum(["subtle", "normal"]).optional(),
      text: z.string().max(12).optional(),
    })
    .strict()
    .optional(),
  // 仅图像脸使用：图列在左还是右。
  image_side: z.enum(["left", "right"]).optional(),
  footnote: z.string().optional(),
  /** Speaker notes are exported as native PowerPoint notes and never painted on the slide canvas. */
  notes: z.string().optional(),
}

const ExplicitSlideSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cover"), ...CommonSlideFields }).strict(),
  z.object({ type: z.literal("chapter"), ...CommonSlideFields }).strict(),
  z
    .object({
      type: z.literal("content"),
      /** The required semantic posture selected from the theme's content menu. */
      kind: z.enum(KIND_VALUES),
      ...CommonSlideFields,
    })
    .strict(),
  z.object({ type: z.literal("ending"), ...CommonSlideFields }).strict(),
])

/**
 * IR v5 slide contract. Content slides require `kind`. Cover, chapter, and
 * ending slides have no `kind` field because page type already determines
 * their menu entry. Omitting `type` still means `content`, but therefore also
 * requires an explicit `kind`.
 */
export const SlideSchema = z.preprocess((input) => {
  if (typeof input !== "object" || input === null || Array.isArray(input) || Object.hasOwn(input, "type")) {
    return input
  }
  return { ...input, type: "content" }
}, ExplicitSlideSchema)

// ── Narrative（spec §5, renamed from "Scenario" — spec §8.1）──

/**
 * Object half of the top-level `narrative` field's `string | object` union
 * (see {@link PptxIRSchema}) — deliberately as open as a record gets: any
 * string key, any value. Same open-schema/closed-semantic split as the
 * preset-name string branch (and this file's `theme.id`): the *actual*
 * constraint — only `strategy`/`pacing`/`audience` are legal keys, each with
 * its own closed enum — is enforced later, in `validateIr`, by
 * `resolveNarrative` (`src/narrative`), not here.
 *
 * This was originally a `.strict()` object with a `z.enum(...)` per axis,
 * closed right at the schema layer — wrong inside a `z.union([...])`: zod
 * reports a failing union branch as one opaque `invalid_union` issue, not
 * that branch's own specific issue, so an axis-value typo or an unknown key
 * never surfaced `resolveNarrative`'s available-values message — every
 * rejection collapsed to the same useless
 * `{ path: "narrative", message: "Invalid input" }` (W3 task-2 review
 * finding). Loosening this branch to a plain record makes the schema layer
 * responsible for exactly one thing — string vs. object vs. neither — so an
 * object input always parses far enough for `validateIr`'s existing
 * `resolveNarrative` try/catch to run and produce a specific, listable
 * message, the same way it already did for an unknown preset-name string.
 * `resolveNarrative` itself still reads `./narrative-values`'s
 * `STRATEGY_VALUES`/`PACING_VALUES`/`AUDIENCE_VALUES` tuples for its runtime
 * checks — this schema no longer needs to import them at all.
 *
 * Exported so W5's plan schema (`src/spec/index.ts`) can reuse this exact
 * object branch for its own top-level `scenario` field (plan's own field
 * name is unchanged this task — spec §8.1's `DeckPlan`→`DeckSpec` rename is
 * task 2's job, not this one) — same open-schema/closed-semantic split, same
 * `resolveNarrative` consumer, one definition instead of two that could
 * drift apart.
 *
 * Renamed from `ScenarioAxesInputSchema` in the vocabulary-v4 rename (task
 * 1) — not itself named in spec §8.1's table, but derived from
 * `ScenarioAxes`→`NarrativeProfile` the same way the rest of this module's
 * axis vocabulary was.
 */
export const NarrativeProfileInputSchema = z.record(z.string(), z.unknown())

// ── 顶层 IR（v5）──

export const OLD_IR_VERSION_ERROR =
  `Current IR format is version "5". Content slides require kind (${KIND_VALUES.join(", ")}). ` +
  'Cover, chapter, and ending slides do not use kind. Slide fields "beat", "layout", and "arrangement", and deck field "seed", were removed. ' +
  'The quotation component type is "blockquote". No migration tool is provided. Rewrite the input to the current schema.'

export const PptxIRSchema = z
  .object({
    /** IR v5 is the only accepted format. An omitted version is authored as v5. */
    version: z.literal("5", { error: OLD_IR_VERSION_ERROR }).default("5"),
    filename: z.string().default("presentation"),
    // Preset id string or a partial per-axis override object — both
    // branches are open at the schema layer now (validity checked in
    // validateIr, same open-schema/closed-semantic pattern as this object's
    // own theme.id field; see NarrativeProfileInputSchema above for why the
    // object branch reads this way too). Omitted entirely = the `general`
    // preset (briefing × balanced × public, spec §5). Deliberately has no
    // `.default(...)`: the resolved NarrativeProfile is never written back
    // into the IR — validateIr and (W4) the render path each call
    // `resolveNarrative` themselves (pure, cheap) rather than this schema
    // baking a materialized default in, which would drift the parsed-output
    // shape the moment NARRATIVE_PRESETS.general's axes changed.
    //
    // Type note: this infers as `string | Record<string, unknown> |
    // undefined` on PptxIR — wider than the "strategy/pacing/audience" shape
    // one might expect. `resolveNarrative` (src/narrative) is the semantic
    // authority for that narrower shape; treat this field's static type as
    // shape-only and go there for what's actually valid.
    //
    // Renamed from `scenario` (spec §8.1/§9.1). A v4-track document that
    // still writes the pre-rename field name (`scenario`) is rejected here —
    // this object is `.strict()`, so `scenario` surfaces as an unrecognized
    // key (spec §16). The pre-rename axis field names `mode`/`delivery`
    // inside `narrative` slip past this schema (it stays an open record —
    // see `NarrativeProfileInputSchema` above) but are caught one level down
    // by `resolveNarrative`'s own runtime axis-key check (`src/narrative`).
    narrative: z.union([z.string(), NarrativeProfileInputSchema]).optional(),
    theme: ThemeSchema,
    meta: MetaSchema.default({}),
    assets: AssetsSchema.default({ images: {} }),
    brand: BrandSchema.optional(),
    /**
     * Where the brand footer and logo appear. Optional, no default: omitted
     * stays `undefined` and the renderer treats that as `"cover-only"`, so a
     * deck that never mentions the field gets a clean content page. Write
     * `"full"` to draw the footer rule, meta, and logo on content pages,
     * and to paint confidentiality and date on cover and ending meta rows.
     * See {@link DeckBrandingSchema}.
     */
    branding: DeckBrandingSchema.optional(),
    slides: z.array(SlideSchema),
  })
  .strict()

export type PptxIR = z.infer<typeof PptxIRSchema>
export type Component = z.infer<typeof ComponentSchema>
export type BackgroundSpec = z.infer<typeof BackgroundSpecSchema>
export type Slide = z.infer<typeof SlideSchema>
export type PageKind = (typeof KIND_VALUES)[number]
export type Assets = z.infer<typeof AssetsSchema>
export type Meta = z.infer<typeof MetaSchema>
export type Brand = z.infer<typeof BrandSchema>

// Component sub-types (extracted from ComponentSchema union members)
export type KpiItem = {
  value: string
  unit?: string
  label: string
  delta?: "up" | "down" | "flat"
}
export type ChartSeries = {
  name: string
  /** `size` is scatter-only: an optional per-point magnitude that turns a
   * scatter dot into a bubble (chart-depth wave). Every other chart_type
   * ignores it. Mirrors `components/chart.ts`'s `ChartPointSchema`. */
  data: { x: string | number; y: number; size?: number }[]
}
export type FlowNode = {
  id: string
  label: string
  kind?: "rect" | "diamond" | "round"
}
export type FlowEdge = { from: string; to: string; label?: string }
export type ArchitectureLayer = { title: string; items: string[] }
export type TimelineMilestone = { date: string; title: string; desc?: string }
export type ComparisonRow = { label: string; cells: string[] }
export type CitationSource = { label: string; url?: string; ref?: string }

function isRetiredIrVersion(input: unknown): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false
  const version = (input as Record<string, unknown>).version
  return typeof version === "string" && ["1", "2", "3", "4"].includes(version)
}

export function themeIssueMessage(
  path: string,
  message: string,
  input: unknown,
  code?: string,
): string {
  // Zod reports some object-level issues (unrecognized keys) with
  // `input === undefined`. Those are not an omitted theme.
  if (code === "unrecognized_keys") return message
  if ((path === "theme" || path === "theme.id") && input === undefined) return THEME_REQUIRED_MESSAGE
  return message
}

export function parsePptxIR(
  json: unknown,
): { success: true; data: PptxIR } | { success: false; error: string } {
  if (isRetiredIrVersion(json)) return { success: false, error: `version: ${OLD_IR_VERSION_ERROR}` }
  const result = PptxIRSchema.safeParse(json)
  if (result.success) return { success: true, data: result.data }
  return {
    success: false,
    error: result.error.issues
      .map((i) => `${i.path.join(".")}: ${themeIssueMessage(i.path.join("."), i.message, i.input, i.code)}`)
      .join("\n"),
  }
}
