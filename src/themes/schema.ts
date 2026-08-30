import { z } from "zod"
import {
  BrandConfigSchema,
  KIND_VALUES,
  THEME_ID_CONSTRAINT,
  THEME_ID_PATTERN,
  type BrandConfig,
  type BUILTIN_THEME_IDS,
} from "@/ir"
import type { MotifId } from "../motifs/types"
import { OCCASION_VOCAB, type Occasion } from "./occasions"
import type { StyleTokens } from "./tokens"

const HexTokenSchema = z.string().regex(/^#[0-9A-Fa-f]{3,8}$/, "expected a hex color like #RRGGBB")

const BackgroundSpecFileSchema = z.discriminatedUnion("kind", [
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
      asset_id: z.string().min(1),
      overlay: z.object({ color: HexTokenSchema, opacity: z.number().min(0).max(1) }).strict().optional(),
      fit: z.enum(["cover", "contain"]).optional(),
    })
    .strict(),
])

/** Complete public style-token shape. Board-only layout constructor knobs are
 * intentionally absent and therefore rejected by the strict shape object. */
export const StyleTokensFileSchema = z
  .object({
    id: z.string().min(1),
    allowCustomBackground: z.boolean().optional(),
    colors: z
      .object({
        bg: HexTokenSchema,
        surface: HexTokenSchema,
        panel: HexTokenSchema.optional(),
        primary: HexTokenSchema,
        accent: HexTokenSchema,
        text: HexTokenSchema,
        muted: HexTokenSchema,
        border: HexTokenSchema.optional(),
        chartPalette: z.array(HexTokenSchema).min(1),
        accentPool: z.array(HexTokenSchema).min(1).optional(),
        cardStroke: HexTokenSchema.optional(),
        danger: HexTokenSchema.optional(),
        warning: HexTokenSchema.optional(),
        success: HexTokenSchema.optional(),
      })
      .strict(),
    fonts: z
      .object({
        heading: z.array(z.string().min(1)).min(1),
        body: z.array(z.string().min(1)).min(1),
        mono: z.array(z.string().min(1)).min(1).optional(),
      })
      .strict(),
    shape: z
      .object({
        radius: z.number().min(0).max(32).optional(),
        gapScale: z.number().min(0.8).max(1.3).optional(),
        typeScale: z.number().min(0.5).max(2).optional(),
      })
      .strict()
      .optional(),
    defaultBackgrounds: z
      .object({
        cover: BackgroundSpecFileSchema,
        chapter: BackgroundSpecFileSchema,
        content: BackgroundSpecFileSchema,
        ending: BackgroundSpecFileSchema,
      })
      .strict(),
  })
  .strict()

const CommonThemeFileFields = {
  id: z.string().regex(THEME_ID_PATTERN, THEME_ID_CONSTRAINT),
  label: z.string().min(1).optional(),
  style: StyleTokensFileSchema,
  brand: BrandConfigSchema.optional(),
  occasions: z.array(z.enum(Object.keys(OCCASION_VOCAB) as [Occasion, ...Occasion[]])).min(1).optional(),
  identity: z.enum(["low", "medium", "high"]).optional(),
}

function validateCommonThemeFields(value: { id: string; style: { id: string } }, ctx: z.RefinementCtx): void {
  if (value.style.id !== value.id) {
    ctx.addIssue({
      code: "custom",
      path: ["style", "id"],
      message: `style.id "${value.style.id}" must match theme id "${value.id}"`,
    })
  }
}

export const MOTIF_IDS = [
  "banner-motif",
  "rail-motif",
  "poster-motif",
  "constellation-motif",
  "corner-ornament-motif",
  "tone-adaptive-motif",
  "campaign-motif",
  "classroom-motif",
  "ink-motif",
  "luxe-motif",
  "enterprise-motif",
  "heritage-motif",
  "pulse-motif",
  "terra-motif",
  "ember-motif",
  "vermilion-motif",
  "crayon-motif",
  "arena-motif",
  "lecture-motif",
  "swiss-motif",
  "memo-motif",
  "playbill-motif",
  "gauge-motif",
  "crayonbox-motif",
] as const satisfies readonly MotifId[]

type MissingMotifId = Exclude<MotifId, (typeof MOTIF_IDS)[number]>
const MOTIF_IDS_ARE_EXHAUSTIVE: MissingMotifId extends never ? true : never = true
void MOTIF_IDS_ARE_EXHAUSTIVE

export const SPARSE_LAYOUT_IDS = [
  "statement",
  "pull-quote",
  "verse-chapter",
  "stat-hero",
  "one-evidence",
  "mono-bleed",
] as const

/** Primitive values a menu may pass to adjustable parameters declared by a face. */
export const MenuParamValueSchema = z.union([z.string(), z.number().finite(), z.boolean()])

/**
 * A menu entry can select one registered motif or explicitly silence the
 * decorative layer. Omission leaves decoration at the theme renderer's
 * ordinary posture.
 */
export const MenuDecorSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("motif"),
      id: z.enum(MOTIF_IDS),
      params: z.object({ intensity: z.enum(["subtle", "normal"]).optional() }).strict().optional(),
    })
    .strict(),
  z.object({ kind: z.literal("silent") }).strict(),
])

/** One semantic menu choice mapped to one registered face. */
export const MenuEntrySchema = z
  .object({
    face: z.string().min(1),
    params: z.record(z.string().min(1), MenuParamValueSchema).optional(),
    decor: MenuDecorSchema.optional(),
    /** Switch the brand frame (footer rule, meta, logo) off on this page. */
    brand: z.literal("none").optional(),
  })
  .strict()

const ContentMenuSchema = z
  .object({
    points: MenuEntrySchema.optional(),
    list: MenuEntrySchema.optional(),
    comparison: MenuEntrySchema.optional(),
    process: MenuEntrySchema.optional(),
    data: MenuEntrySchema.optional(),
    photo: MenuEntrySchema.optional(),
    statement: MenuEntrySchema.optional(),
    quote: MenuEntrySchema.optional(),
    fact: MenuEntrySchema.optional(),
    evidence: MenuEntrySchema.optional(),
    hierarchy: MenuEntrySchema.optional(),
  })
  .strict()
  .refine((value) => KIND_VALUES.some((kind) => value[kind] !== undefined), {
    message: "a theme menu must offer at least one content kind",
  })

/**
 * A theme menu has one entry for each boundary page type and a non-empty
 * subset of the global content-kind vocabulary. Each key maps directly to
 * one face with no rotation or conditional branch.
 */
export const MenuSchema = z
  .object({
    cover: MenuEntrySchema,
    chapter: MenuEntrySchema,
    content: ContentMenuSchema,
    ending: MenuEntrySchema,
  })
  .strict()

/** Public v2 theme-file contract. Every file is complete and self-contained. */
export const ThemeFileSchema = z
  .object({
    ...CommonThemeFileFields,
    version: z.literal(2),
    menu: MenuSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    validateCommonThemeFields(value, ctx)
  })

export type MenuParamValue = z.infer<typeof MenuParamValueSchema>
export type MenuDecor = z.infer<typeof MenuDecorSchema>
export type MenuEntry = z.infer<typeof MenuEntrySchema>
export type Menu = z.infer<typeof MenuSchema>
export type ThemeFile = z.infer<typeof ThemeFileSchema>

/**
 * Internal declaration accepted from `builtin/`. It is intentionally a
 * superset of the public complete-theme contract: built-in board constructor
 * knobs stay in the engine-only `style.shape.cover` field (the public style
 * schema rejects it), and the theme-wide `motif` anchor stays here because
 * the public contract expresses decoration per menu entry only.
 */
export interface BuiltinThemeDeclaration {
  version: 2
  id: (typeof BUILTIN_THEME_IDS)[number]
  label: string
  style: StyleTokens
  brand?: BrandConfig
  occasions?: readonly Occasion[]
  identity?: "low" | "medium" | "high"
  menu: Menu
  motif?: {
    id: MotifId
    params?: { intensity?: "subtle" | "normal" }
  }
}
