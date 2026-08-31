import { describe, expect, it } from "vitest"
import {
  assignedThemeIds,
  resolveComponentForm,
  type ComponentFormId,
  type FormKnobs,
} from "./form-assignments"

// Render-side form assignment table (component-forms-w1 plumbing). Pure
// lookup contract, independent of any component renderer: missing /
// unknown / unassigned pairs stay undefined so today's default face is
// unchanged. classroom is listed on callout like every other canonical
// theme.

type AssignmentRow = {
  componentType: string
  themeId: string
  form: ComponentFormId
  knobs?: FormKnobs
}

const ASSIGNMENTS: AssignmentRow[] = [
  {
    componentType: "steps",
    themeId: "runway",
    form: "arrow_steps",
    knobs: { arrow: "chevron", badge: "circle-outline" },
  },
  {
    componentType: "steps",
    themeId: "enterprise",
    form: "arrow_steps",
    knobs: { arrow: "notch", badge: "square-solid" },
  },
  {
    componentType: "steps",
    themeId: "pulse",
    form: "arrow_steps",
    knobs: { arrow: "slope", badge: "circle-solid", pulseLine: true },
  },
  { componentType: "callout", themeId: "heritage", form: "tint_panel", knobs: { radius: "soft" } },
  { componentType: "callout", themeId: "swiss", form: "tint_panel", knobs: { radius: "square", weight: "bold" } },
  { componentType: "callout", themeId: "tech", form: "tint_panel", knobs: { radius: "round" } },
  { componentType: "callout", themeId: "academic", form: "tint_panel", knobs: { radius: "square" } },
  { componentType: "callout", themeId: "enterprise", form: "tint_panel", knobs: { radius: "square" } },
  { componentType: "callout", themeId: "consulting", form: "tint_panel", knobs: { radius: "soft" } },
  { componentType: "callout", themeId: "journal", form: "tint_panel", knobs: { radius: "soft" } },
  { componentType: "callout", themeId: "classroom", form: "tint_panel", knobs: { radius: "round" } },
  { componentType: "callout", themeId: "lecture", form: "tint_panel", knobs: { radius: "soft" } },
  { componentType: "callout", themeId: "memo", form: "hanging_bare", knobs: { stamp: true } },
  { componentType: "callout", themeId: "insight", form: "hanging_bare" },
  { componentType: "callout", themeId: "ink", form: "hanging_bare" },
  { componentType: "callout", themeId: "stage", form: "hanging_bare" },
  { componentType: "callout", themeId: "terra", form: "hanging_bare" },
  { componentType: "callout", themeId: "crayon", form: "hanging_bare" },
  { componentType: "callout", themeId: "museum", form: "hanging_bare" },
  { componentType: "callout", themeId: "luxe", form: "lead_word", knobs: { iconInk: "accent" } },
  { componentType: "callout", themeId: "vermilion", form: "lead_word" },
  { componentType: "callout", themeId: "playbill", form: "lead_word", knobs: { weight: "black" } },
  { componentType: "callout", themeId: "campaign", form: "lead_word" },
  { componentType: "callout", themeId: "arena", form: "lead_word" },
  { componentType: "callout", themeId: "pulse", form: "lead_word" },
  { componentType: "callout", themeId: "runway", form: "lead_word" },
  { componentType: "callout", themeId: "ember", form: "lead_word" },
  {
    componentType: "flowchart",
    themeId: "swiss",
    form: "typed_nodes",
    knobs: { radius: "square", nodeStroke: "primary" },
  },
  {
    componentType: "flowchart",
    themeId: "academic",
    form: "typed_nodes",
    knobs: { radius: "square", nodeFill: "none", nodeStroke: "primary" },
  },
  {
    componentType: "flowchart",
    themeId: "tech",
    form: "typed_nodes",
    knobs: { radius: "soft", highlightFirst: true },
  },
  {
    componentType: "flowchart",
    themeId: "museum",
    form: "typed_nodes",
    knobs: { nodeStroke: "border" },
  },
  {
    componentType: "flowchart",
    themeId: "crayon",
    form: "typed_nodes",
    knobs: { radius: "round" },
  },
  {
    componentType: "flowchart",
    themeId: "journal",
    form: "typed_nodes",
    knobs: { highlightFirst: true },
  },
  {
    componentType: "flowchart",
    themeId: "insight",
    form: "typed_nodes",
    knobs: { highlightFirst: true, radius: "soft" },
  },
  {
    componentType: "architecture",
    themeId: "consulting",
    form: "layer_stack",
    knobs: { highlightFirst: true },
  },
  {
    componentType: "architecture",
    themeId: "swiss",
    form: "layer_stack",
    knobs: { radius: "square", nodeFill: "none" },
  },
  {
    componentType: "architecture",
    themeId: "academic",
    form: "layer_stack",
    knobs: { radius: "square", nodeFill: "none" },
  },
  {
    componentType: "architecture",
    themeId: "tech",
    form: "layer_stack",
    knobs: { radius: "square" },
  },
  {
    componentType: "architecture",
    themeId: "museum",
    form: "layer_stack",
    knobs: { nodeStroke: "border" },
  },
]

const FORM_COMPONENT_TYPES = [
  "steps",
  "callout",
  "flowchart",
  "architecture",
] as const

describe("resolveComponentForm", () => {
  it("carries no emphasis rows — the stroke is a theme field, not a component form", () => {
    expect(assignedThemeIds("emphasis")).toEqual([])
    expect(resolveComponentForm("emphasis", "consulting")).toBeUndefined()
    expect(resolveComponentForm("emphasis", "lecture")).toBeUndefined()
  })

  describe("unassigned / missing themeId → undefined", () => {
    it("resolveComponentForm(icon_cards, undefined) → undefined", () => {
      expect(resolveComponentForm("icon_cards", undefined)).toBeUndefined()
    })

    it("resolveComponentForm(icon_cards, consulting) → undefined (unassigned contrast theme)", () => {
      expect(resolveComponentForm("icon_cards", "consulting")).toBeUndefined()
    })

    it("resolveComponentForm(flowchart, consulting) → undefined", () => {
      expect(resolveComponentForm("flowchart", "consulting")).toBeUndefined()
    })

    it("resolveComponentForm(icon_cards, not-a-theme) → undefined", () => {
      expect(resolveComponentForm("icon_cards", "not-a-theme")).toBeUndefined()
    })

    it("resolveComponentForm(paragraph, swiss) → undefined (unknown / unassigned component type)", () => {
      expect(resolveComponentForm("paragraph", "swiss")).toBeUndefined()
    })
  })

  describe("each spec assignment resolves to the expected form", () => {
    it.each(ASSIGNMENTS)(
      "$componentType × $themeId → $form with spec knobs",
      ({ componentType, themeId, form, knobs }) => {
        expect(resolveComponentForm(componentType, themeId)).toEqual(
          knobs === undefined ? { form } : { form, knobs },
        )
      },
    )
  })

  describe("uniqueness: no theme has two forms for the same component", () => {
    it("maps each (componentType, themeId) pair to exactly one form", () => {
      const seen = new Set<string>()
      for (const componentType of FORM_COMPONENT_TYPES) {
        const themeIds = assignedThemeIds(componentType)
        expect(new Set(themeIds).size).toBe(themeIds.length)
        for (const themeId of themeIds) {
          const key = `${componentType}/${themeId}`
          expect(seen.has(key)).toBe(false)
          seen.add(key)
          const assignment = resolveComponentForm(componentType, themeId)
          expect(assignment).toBeDefined()
          expect(assignment!.form).toBeTruthy()
        }
      }
    })
  })

  it("cycle carries no form assignment at all — one canonical loop drawing", () => {
    expect(assignedThemeIds("cycle")).toEqual([])
    expect(resolveComponentForm("cycle", "campaign")).toBeUndefined()
  })

  describe("knobs for a few skins", () => {
    it("every collapsed component carries no assignment at all", () => {
      for (const type of ["icon_cards", "numbered_cards", "comparison", "timeline", "image_grid", "cycle"]) {
        expect(assignedThemeIds(type), type).toEqual([])
      }
    })

    it("kpi_cards carries no form assignment at all — one canonical card grid", () => {
      expect(assignedThemeIds("kpi_cards")).toEqual([])
      expect(resolveComponentForm("kpi_cards", "swiss")).toBeUndefined()
    })
  })

  it("assignment count matches the table exactly, across every assigned type", () => {
    const total = FORM_COMPONENT_TYPES.reduce(
      (n, componentType) => n + assignedThemeIds(componentType).length,
      0,
    )
    expect(total).toBe(ASSIGNMENTS.length)
    expect(ASSIGNMENTS.length).toBeGreaterThan(0)
  })
})

describe("assignedThemeIds", () => {
  it("unknown component → []", () => {
    expect(assignedThemeIds("paragraph")).toEqual([])
    expect(assignedThemeIds("not-a-component")).toEqual([])
  })

  it("callout lists 24 themes", () => {
    expect(assignedThemeIds("callout")).toHaveLength(24)
  })
})
