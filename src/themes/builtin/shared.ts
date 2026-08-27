/** Ordered shared face pools. Keep order stable because seeded selection uses it. */
export const DEFAULT_CONTENT_FACES = [
  "narrow-column",
  "two-column",
  "rail-numbered",
  "stacked-poster",
  "bento-panel",
  "tone-adaptive-content",
  "asymmetric-triptych",
  "quiet-frame",
  "split-band",
] as const

export const FRAMED_CONTENT_FACES = [
  "narrow-column",
  "two-column",
  "rail-numbered",
  "bento-panel",
  "tone-adaptive-content",
  "asymmetric-triptych",
  "quiet-frame",
] as const

export const CONSULTING_CONTENT_FACES = ["gauge-stats", ...DEFAULT_CONTENT_FACES] as const
export const CRAYON_CONTENT_FACES = ["crayonbox-cards", ...DEFAULT_CONTENT_FACES] as const
export const RUNWAY_CONTENT_FACES = ["show-statement", "show-figures", ...DEFAULT_CONTENT_FACES] as const
