import { z } from "zod"
import { BrandConfigSchema, BUILTIN_THEME_IDS, type BrandConfig, type Slide } from "@/ir"
import { MAX_DECOR_PIECES } from "../motifs/decor-budget"
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
  version: z.literal(1),
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  style: StyleTokensFileSchema,
  brand: BrandConfigSchema.optional(),
  occasions: z.array(z.enum(OCCASION_VOCAB)).min(1).optional(),
  identity: z.enum(["low", "medium", "high"]).optional(),
}

function validateCommonThemeFields(value: { id: string; style: { id: string } }, ctx: z.RefinementCtx): void {
  if ((BUILTIN_THEME_IDS as readonly string[]).includes(value.id)) {
    ctx.addIssue({
      code: "custom",
      path: ["id"],
      message: `theme id "${value.id}" collides with a built-in pptwise theme`,
    })
  }
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

export const FaceParametersSchema = z
  .object({
    morph: z.object({ variant: z.string().min(1) }).strict().optional(),
    decor: z.object({ pieces: z.number().int().min(0).max(MAX_DECOR_PIECES) }).strict().optional(),
    capacity: z.object({ slot: z.string().min(1), max: z.number().int().min(0) }).strict().optional(),
  })
  .strict()

export const FaceReferenceSchema = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1), params: FaceParametersSchema.optional() }).strict(),
])

export const ThemeFacesSchema = z
  .object({
    cover: z.array(FaceReferenceSchema).min(1),
    chapter: z.array(FaceReferenceSchema).min(1),
    content: z.array(FaceReferenceSchema).min(1),
    ending: z.array(FaceReferenceSchema).min(1),
  })
  .strict()

export const ThemeMotifSchema = z
  .object({
    id: z.enum(MOTIF_IDS),
    params: z.object({ intensity: z.enum(["subtle", "normal"]).optional() }).strict().optional(),
  })
  .strict()

export const ThemeTendenciesSchema = z
  .object({
    cover: z.array(z.string().min(1)).min(1).optional(),
    chapter: z.array(z.string().min(1)).min(1).optional(),
    content: z.array(z.string().min(1)).min(1).optional(),
    ending: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict()

export const PartialThemeFileSchema = z
  .object({
    ...CommonThemeFileFields,
    base: z.enum(BUILTIN_THEME_IDS),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    validateCommonThemeFields(value, ctx)
    const knownFields = new Set(["version", "id", "label", "style", "brand", "occasions", "identity", "base"])
    const completeFields = new Set(["faces", "motif", "tendencies", "sparse"])
    for (const field of Object.keys(value)) {
      if (knownFields.has(field)) continue
      const message = completeFields.has(field)
        ? `"${field}" is a complete theme field and cannot appear when "base" is present`
        : `Unrecognized key: "${field}"`
      ctx.addIssue({ code: "custom", path: [field], message })
    }
  })

export const CompleteThemeFileSchema = z
  .object({
    ...CommonThemeFileFields,
    faces: ThemeFacesSchema,
    motif: ThemeMotifSchema.optional(),
    tendencies: ThemeTendenciesSchema.optional(),
    sparse: z.array(z.enum(SPARSE_LAYOUT_IDS)).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    validateCommonThemeFields(value, ctx)
  })

/**
 * Public v1 theme-file contract. Presence of `base` selects partial
 * completeness. Its absence selects complete completeness and requires all
 * four face pools.
 */
export const ThemeFileSchema = z
  .object({
    ...CommonThemeFileFields,
    base: z.enum(BUILTIN_THEME_IDS).optional(),
    faces: ThemeFacesSchema.partial().optional(),
    motif: ThemeMotifSchema.optional(),
    tendencies: ThemeTendenciesSchema.optional(),
    sparse: z.array(z.enum(SPARSE_LAYOUT_IDS)).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    validateCommonThemeFields(value, ctx)
    if (value.base !== undefined) {
      for (const field of ["faces", "motif", "tendencies", "sparse"] as const) {
        if (!Object.hasOwn(value, field)) continue
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `"${field}" is a complete theme field and cannot appear when "base" is present`,
        })
      }
      return
    }
    for (const slideType of ["cover", "chapter", "content", "ending"] as const) {
      if (value.faces?.[slideType] !== undefined) continue
      ctx.addIssue({
        code: "custom",
        path: ["faces", slideType],
        message: `a complete theme without "base" must declare a non-empty "${slideType}" face pool`,
      })
    }
  })

export type PartialThemeFile = z.infer<typeof PartialThemeFileSchema>
export type CompleteThemeFile = z.infer<typeof CompleteThemeFileSchema>
export type ThemeFile = PartialThemeFile | CompleteThemeFile
export type FaceReference = z.infer<typeof FaceReferenceSchema>

/**
 * Internal declaration accepted from `builtin/`. It is intentionally a
 * superset of the public complete-theme contract. Existing built-in board
 * constructor knobs remain in the engine-only `style.shape.cover` field.
 * The public style schema rejects that field, and limited decorations remain
 * inside the registered motif implementations.
 */
export interface BuiltinThemeDeclaration {
  version: 1
  id: (typeof BUILTIN_THEME_IDS)[number]
  label: string
  style: StyleTokens
  brand?: BrandConfig
  occasions?: readonly Occasion[]
  identity?: "low" | "medium" | "high"
  faces: Record<Slide["type"], readonly FaceReference[]>
  motif?: {
    id: MotifId
    params?: { intensity?: "subtle" | "normal" }
  }
  tendencies?: Partial<Record<Slide["type"], readonly string[]>>
  sparse?: readonly (typeof SPARSE_LAYOUT_IDS)[number][]
}
