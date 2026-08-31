/**
 * Render-side component form assignment table. Forms are not IR: one
 * theme + one component maps to at most one form, looked up here.
 * Shrinking table — every component listed here is on its way to a single
 * canonical rendering.
 */

export const COMPONENT_FORMS = [
  "icon_columns",
  "badge_cards",
  "outline_grid",
  "numbered_pills",
  "hex_cluster",
  "pill_panels",
  "arrow_steps",
  "vert_timeline",
  "numbered_photos",
  "tint_panel",
  "hanging_bare",
  "lead_word",
  "pad",
  "underline",
  "typed_nodes",
  "layer_stack",
] as const

export type ComponentFormId = (typeof COMPONENT_FORMS)[number]

/**
 * Optional render knobs. A form reads the fields it knows and ignores
 * the rest.
 */
export interface FormKnobs {
  node?: "circle" | "square"
  nodeFill?: "surface" | "none"
  nodeStroke?: "border" | "dashed" | "primary"
  iconInk?: "accent" | "text"
  radius?: "soft" | "square" | "round"
  badge?: "circle-outline" | "circle-solid" | "square-solid"
  paletteStroke?: boolean
  highlightFirst?: boolean
  stagger?: boolean
  waveFirst?: boolean
  hexFill?: "palette" | "accent-ramp"
  hexStroke?: "bg" | "accent"
  frame?: "dashed" | "solid" | "none"
  pillFill?: "accent-primary" | "accent-all"
  cornerMarks?: boolean
  arrow?: "chevron" | "notch" | "slope"
  pulseLine?: boolean
  axis?: "hairline" | "dashed"
  stamp?: boolean
  caption?: "above" | "below"
  numberBadge?: "specimen" | "invert" | "accent"
  weight?: "regular" | "bold" | "black"
}

export interface FormAssignment {
  form: ComponentFormId
  knobs?: FormKnobs
}

const ASSIGNMENTS: Record<string, Record<string, FormAssignment>> = {
  emphasis: {
    consulting: { form: "pad" },
    lecture: { form: "underline" },
  },
  icon_cards: {
    terra: {
      form: "icon_columns",
      knobs: { node: "circle", nodeFill: "surface", nodeStroke: "border", iconInk: "accent" },
    },
    lecture: {
      form: "icon_columns",
      knobs: { node: "circle", nodeFill: "none", nodeStroke: "dashed", iconInk: "accent" },
    },
    swiss: {
      form: "icon_columns",
      knobs: { node: "square", nodeFill: "surface", nodeStroke: "border", iconInk: "text" },
    },
    tech: {
      form: "badge_cards",
      knobs: { radius: "soft", badge: "circle-outline" },
    },
    luxe: {
      form: "badge_cards",
      knobs: { radius: "square", badge: "circle-outline" },
    },
    vermilion: {
      form: "badge_cards",
      knobs: { radius: "soft", badge: "circle-solid" },
    },
    academic: {
      form: "outline_grid",
      knobs: { nodeFill: "none", nodeStroke: "primary", radius: "square" },
    },
    ember: {
      form: "outline_grid",
      knobs: { nodeFill: "surface", nodeStroke: "border", iconInk: "accent", radius: "square" },
    },
    crayon: {
      form: "outline_grid",
      knobs: { nodeFill: "surface", paletteStroke: true, radius: "soft" },
    },
  },
  numbered_cards: {
    pulse: {
      form: "numbered_pills",
      knobs: { node: "circle", stagger: true, radius: "round" },
    },
    enterprise: {
      form: "numbered_pills",
      knobs: { node: "square", stagger: false, radius: "square" },
    },
    classroom: {
      form: "numbered_pills",
      knobs: {
        node: "circle",
        stagger: true,
        radius: "soft",
        badge: "circle-outline",
        waveFirst: true,
      },
    },
    tech: {
      form: "hex_cluster",
      knobs: { hexFill: "palette", hexStroke: "bg" },
    },
    ember: {
      form: "hex_cluster",
      knobs: { hexFill: "accent-ramp", hexStroke: "bg" },
    },
    arena: {
      form: "hex_cluster",
      knobs: { hexFill: "palette", hexStroke: "accent" },
    },
  },
  comparison: {
    consulting: {
      form: "pill_panels",
      knobs: { frame: "dashed", radius: "round", pillFill: "accent-primary" },
    },
    vermilion: {
      form: "pill_panels",
      knobs: { frame: "solid", radius: "round", cornerMarks: true, pillFill: "accent-all" },
    },
    ember: {
      form: "pill_panels",
      knobs: { frame: "none", radius: "soft", pillFill: "accent-all" },
    },
  },
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
  timeline: {
    stage: {
      form: "vert_timeline",
      knobs: { axis: "hairline", badge: "circle-outline" },
    },
    memo: {
      form: "vert_timeline",
      knobs: { axis: "dashed", stamp: true },
    },
    classroom: {
      form: "vert_timeline",
      knobs: { axis: "dashed", badge: "circle-solid", waveFirst: true },
    },
  },
  image_grid: {
    museum: {
      form: "numbered_photos",
      knobs: { caption: "above", numberBadge: "specimen" },
    },
    playbill: {
      form: "numbered_photos",
      knobs: { caption: "below", numberBadge: "invert" },
    },
    runway: {
      form: "numbered_photos",
      knobs: { caption: "below", numberBadge: "accent" },
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
