/**
 * Render-side component form assignment table. Forms are not IR: one
 * theme + one component maps to at most one form, looked up here.
 * Shrinking table — every component listed here is on its way to a single
 * canonical rendering.
 */

export const COMPONENT_FORMS = [
  "arrow_steps",
  "tint_panel",
  "hanging_bare",
  "lead_word",
  "typed_nodes",
  "layer_stack",
] as const

export type ComponentFormId = (typeof COMPONENT_FORMS)[number]

/**
 * Optional render knobs. A form reads the fields it knows and ignores
 * the rest.
 */
export interface FormKnobs {
  nodeFill?: "surface" | "none"
  nodeStroke?: "border" | "dashed" | "primary"
  radius?: "soft" | "square" | "round"
  iconInk?: "accent" | "text"
  badge?: "circle-outline" | "circle-solid" | "square-solid"
  highlightFirst?: boolean
  arrow?: "chevron" | "notch" | "slope"
  pulseLine?: boolean
  stamp?: boolean
  weight?: "regular" | "bold" | "black"
}

export interface FormAssignment {
  form: ComponentFormId
  knobs?: FormKnobs
}

const ASSIGNMENTS: Record<string, Record<string, FormAssignment>> = {
  steps: {
    runway: {
      form: "arrow_steps",
      knobs: { arrow: "chevron", badge: "circle-outline" },
    },
    enterprise: {
      form: "arrow_steps",
      knobs: { arrow: "notch", badge: "square-solid" },
    },
    pulse: {
      form: "arrow_steps",
      knobs: { arrow: "slope", badge: "circle-solid", pulseLine: true },
    },
  },
  callout: {
    heritage: { form: "tint_panel", knobs: { radius: "soft" } },
    swiss: { form: "tint_panel", knobs: { radius: "square", weight: "bold" } },
    tech: { form: "tint_panel", knobs: { radius: "round" } },
    academic: { form: "tint_panel", knobs: { radius: "square" } },
    enterprise: { form: "tint_panel", knobs: { radius: "square" } },
    consulting: { form: "tint_panel", knobs: { radius: "soft" } },
    journal: { form: "tint_panel", knobs: { radius: "soft" } },
    classroom: { form: "tint_panel", knobs: { radius: "round" } },
    lecture: { form: "tint_panel", knobs: { radius: "soft" } },
    memo: { form: "hanging_bare", knobs: { stamp: true } },
    insight: { form: "hanging_bare" },
    ink: { form: "hanging_bare" },
    stage: { form: "hanging_bare" },
    terra: { form: "hanging_bare" },
    crayon: { form: "hanging_bare" },
    museum: { form: "hanging_bare" },
    luxe: { form: "lead_word", knobs: { iconInk: "accent" } },
    vermilion: { form: "lead_word" },
    playbill: { form: "lead_word", knobs: { weight: "black" } },
    campaign: { form: "lead_word" },
    arena: { form: "lead_word" },
    pulse: { form: "lead_word" },
    runway: { form: "lead_word" },
    ember: { form: "lead_word" },
  },
  flowchart: {
    swiss: {
      form: "typed_nodes",
      knobs: { radius: "square", nodeStroke: "primary" },
    },
    academic: {
      form: "typed_nodes",
      knobs: { radius: "square", nodeFill: "none", nodeStroke: "primary" },
    },
    tech: {
      form: "typed_nodes",
      knobs: { radius: "soft", highlightFirst: true },
    },
    museum: {
      form: "typed_nodes",
      knobs: { nodeStroke: "border" },
    },
    crayon: {
      form: "typed_nodes",
      knobs: { radius: "round" },
    },
    journal: {
      form: "typed_nodes",
      knobs: { highlightFirst: true },
    },
    insight: {
      form: "typed_nodes",
      knobs: { highlightFirst: true, radius: "soft" },
    },
  },
  architecture: {
    consulting: {
      form: "layer_stack",
      knobs: { highlightFirst: true },
    },
    swiss: {
      form: "layer_stack",
      knobs: { radius: "square", nodeFill: "none" },
    },
    academic: {
      form: "layer_stack",
      knobs: { radius: "square", nodeFill: "none" },
    },
    tech: {
      form: "layer_stack",
      knobs: { radius: "square" },
    },
    museum: {
      form: "layer_stack",
      knobs: { nodeStroke: "border" },
    },
  },
}

export function resolveComponentForm(
  componentType: string,
  themeId: string | undefined,
): FormAssignment | undefined {
  if (themeId === undefined) return undefined
  return ASSIGNMENTS[componentType]?.[themeId]
}

export function assignedThemeIds(componentType: string): string[] {
  const byTheme = ASSIGNMENTS[componentType]
  return byTheme === undefined ? [] : Object.keys(byTheme)
}
