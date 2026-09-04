import { z } from "zod"
import {
  BrandConfigSchema,
  KIND_VALUES,
  THEME_ID_CONSTRAINT,
  THEME_ID_PATTERN,
  type BrandConfig,
  type BUILTIN_THEME_IDS,
} from "@/ir"
import { findForbiddenNameWords, validateDesignStory, type DesignStory } from "../design-story"
import { isLegacyThemeName } from "./legacy-names"
import type { MotifId } from "../motifs/types"
import { OCCASION_VOCAB, type Occasion } from "./occasions"
import type { StyleTokens } from "./tokens"
import { HexTokenSchema } from "./hex"

export { HexTokenSchema } from "./hex"

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
        emphasisInk: HexTokenSchema.optional(),
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

/**
 * How a theme draws a `**marked**` run inside body text. Part of a theme's
 * identity, not of any component: `"tint"` (omitted) recolors the run in the
 * accent, `"pad"` swipes a marker-pen block behind it, `"underline"` strikes
 * a chalk line under it.
 */
export const EMPHASIS_TREATMENTS = ["tint", "pad", "underline"] as const
export type EmphasisTreatment = (typeof EMPHASIS_TREATMENTS)[number]
export const EmphasisTreatmentSchema = z.enum(EMPHASIS_TREATMENTS)

/**
 * A theme's design story: the public record of the voice it speaks in, when
 * to reach for it, and when not to. Optional on the file contract because a
 * theme still renders without one, and refused at the boundary when it
 * breaks a field cap or names an industry — see `../design-story.ts`.
 */
export const DesignStoryFileSchema = z
  .object({
    name: z.string().min(1),
    story: z.string().min(1),
    positioning: z.string().min(1),
    audience: z.string().min(1),
    notFor: z.string().min(1),
    lineage: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const problem of validateDesignStory(value)) {
      ctx.addIssue({ code: "custom", path: [problem.field], message: problem.message })
    }
  })

type DesignStoryFileShape = z.infer<typeof DesignStoryFileSchema>
const DESIGN_STORY_FILE_MATCHES_TYPE: DesignStoryFileShape extends DesignStory ? true : never = true
void DESIGN_STORY_FILE_MATCHES_TYPE

const CommonThemeFileFields = {
  id: z.string().regex(THEME_ID_PATTERN, THEME_ID_CONSTRAINT),
  label: z.string().min(1).optional(),
  style: StyleTokensFileSchema,
  brand: BrandConfigSchema.optional(),
  occasions: z.array(z.enum(Object.keys(OCCASION_VOCAB) as [Occasion, ...Occasion[]])).min(1).optional(),
  identity: z.enum(["low", "medium", "high"]).optional(),
  /** The theme's design story. See {@link DesignStoryFileSchema}. */
  story: DesignStoryFileSchema.optional(),
  /** Emphasis stroke for `**marked**` runs. Omitted equals `"tint"`. */
  emphasis: EmphasisTreatmentSchema.optional(),
}

/**
 * The naming rule at the public boundary: a theme's id, its display label,
 * and its story name all name a voice or a genre, never a vertical, a
 * function, an audience, or an organization type.
 *
 * Checked here rather than only in a test over the built-ins, because the
 * contract is what a workspace theme, a copied preset, and a colour fork are
 * all held to — a rule the engine enforces on itself and waives for everyone
 * else is a style guide, not a contract.
 *
 * The thirteen names that predate the rule are waved through by exact match
 * (see `legacy-names.ts`), so copying one of those presets still works until
 * the rename lands.
 */
function checkNameRule(text: string | undefined, path: (string | number)[], ctx: z.RefinementCtx): void {
  if (text === undefined || isLegacyThemeName(text)) return
  for (const word of findForbiddenNameWords(text)) {
    ctx.addIssue({
      code: "custom",
      path,
      message: `"${text}" says "${word}" — a name names a voice or a genre, never a vertical, a function, an audience, or an organization type`,
    })
  }
}

/**
 * Whether this parse is holding the file to the customer naming rule.
 *
 * `"named"` is the public contract and the only mode a theme file, the CLI,
 * or the SDK can ask for. `"structural"` exists for one caller: the review
 * corpus and the unit fixtures, which compose a theme id out of a source
 * theme, a page type, and the internal name of the drawing under test.
 * Those ids are handles nobody reads, and they are the only reason the rule
 * ever looked like it needed a loophole.
 *
 * The exception is drawn at the *source* of the theme rather than at the
 * shape of its id, which is the only place it can be drawn safely. A rule
 * that waved through any id merely containing a style word would wave
 * through `fintech-dark` too, and a user can write that.
 */
export type ThemeNameEnforcement = "named" | "structural"

function validateCommonThemeFields(
  value: { id: string; label?: string; story?: DesignStory; style: { id: string } },
  ctx: z.RefinementCtx,
  enforcement: ThemeNameEnforcement,
): void {
  if (enforcement === "named") {
    checkNameRule(value.id, ["id"], ctx)
    checkNameRule(value.label, ["label"], ctx)
    checkNameRule(value.story?.name, ["story", "name"], ctx)
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
function themeFileSchema(enforcement: ThemeNameEnforcement) {
  return z
    .object({
      ...CommonThemeFileFields,
      version: z.literal(2),
      menu: MenuSchema,
    })
    .strict()
    .superRefine((value, ctx) => {
      validateCommonThemeFields(value, ctx, enforcement)
    })
}

/** Public v2 theme-file contract: structure, and the customer naming rule. */
export const ThemeFileSchema = themeFileSchema("named")

/**
 * The same contract with the naming rule stood down, and nothing else.
 * Version, strict shape, `style.id === id`, and the whole menu contract are
 * all still checked — see {@link ThemeNameEnforcement} for who may use it.
 * Deliberately absent from `src/index.ts`, so no CLI or SDK path can reach it.
 */
export const StructuralThemeFileSchema = themeFileSchema("structural")

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
  /** The theme's design story. */
  story?: DesignStory
  emphasis?: EmphasisTreatment
  menu: Menu
  motif?: {
    id: MotifId
    params?: { intensity?: "subtle" | "normal" }
  }
}
