export { VERSION } from "./version"
export { PptwiseError } from "./errors"
export {
  validateIr,
  formatIssues,
  renderSlideSvg,
  generatePptx,
  listThemes,
  irJsonSchema,
  type ValidateResult,
  type ValidationIssue,
  type ThemeInfo,
} from "./api"
export {
  PptxIRSchema,
  ThemeSchema,
  BUILTIN_THEME_IDS,
  COMPONENT_TYPES,
  KIND_VALUES,
  BrandConfigSchema,
} from "./ir"
export type {
  PptxIR,
  Slide,
  PageKind,
  Component,
  Meta,
  Assets,
  BackgroundSpec,
  BrandConfig,
} from "./ir"
export { registerTheme, getInstalledThemeIds, getThemeDefinition } from "./themes/definitions"
export type { ThemeDefinition } from "./themes/definitions"
// The factory preset shelf: the read source for "create a theme = copy a
// preset into the workspace". A copy shares nothing with its preset.
export { THEME_PRESETS, getThemePreset, isThemePresetId, copyThemePreset } from "./themes/presets"
export type { ThemePresetSummary } from "./themes/presets"
// Brand extraction (brand-extract wave, roadmap §2.0.1): extract brand
// colors/fonts from a user's own .thmx/.potx/.pptx locally — zip bytes in,
// pure theme-file JSON out (jszip only, browser-safe) — and load such a file
// back through the registerTheme seam (with its contrast hard gate). The
// `pptwise brand extract` CLI command wraps these.
export { extractBrandTheme } from "./themes/extract/brand-extract"
export type { BrandThemeFile, ExtractBrandThemeOptions } from "./themes/extract/brand-extract"
export { parseBrandThemeFile, registerBrandThemeFile, BrandThemeFileSchema } from "./themes/brand-theme-file"
export { forkTheme } from "./cli/theme-fork"
export type { ForkThemeAnchors, ForkThemeIdentity } from "./cli/theme-fork"
export {
  resolveNarrative,
  NARRATIVE_PRESETS,
  PACING_BUDGETS,
  STRATEGY_DEFINITIONS,
  DEFAULT_NARRATIVE,
  STRATEGY_VALUES,
  PACING_VALUES,
  AUDIENCE_VALUES,
  type Strategy,
  type Pacing,
  type Audience,
  type NarrativeProfile,
  type StrategyDefinition,
  type PacingBudget,
  type NarrativePreset,
} from "./narrative"
export { installPlatform, type PptwisePlatform, type RasterizedImage } from "./platform/registry"
export {
  validateSpec,
  specJsonSchema,
  formatSpecIssues,
  resolveSpecThemeId,
  DeckSpecSchema,
  PageSpecSchema,
  SPEC_PAGE_COUNT_RANGE,
  type DeckSpec,
  type PageSpec,
  type PageSpecType,
  type SpecValidateResult,
  type SpecValidationIssue,
} from "./spec"
export { assembleDeck, disassembleDeck, type PageContent, type AssembleResult } from "./spec/assemble"
export {
  auditDeck,
  type AuditReport,
  type AuditFinding,
  type AuditChecks,
  type AuditDeckOptions,
} from "./audit/deck-audit"
export {
  buildAssetBrief,
  type AssetBrief,
  type AssetBriefItem,
  type AssetBriefPage,
  type AssetBriefFrame,
  type AssetBriefFit,
  type AssetBriefPalette,
  type AssetBriefMood,
} from "./render/asset-brief"
