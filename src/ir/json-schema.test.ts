import { describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { COMPONENT_TYPES } from "@/ir"
import { PPTX_ICON_NAMES } from "@/icons/catalog"
import {
  COMPONENT_UNION_DEF_ID,
  ICON_NAME_DEF_ID,
  componentJsonSchema,
  irJsonSchema,
  type JsonSchemaDocument,
} from "./json-schema"

/**
 * The `$defs` names a model or a tool may address by hand. Frozen as a
 * literal, not derived from `COMPONENT_TYPES`, so a renamed component or a
 * renamed shared fragment fails here and is reviewed instead of silently
 * moving every `$ref` that pointed at it.
 */
const EXPECTED_DEFS = [
  "Component",
  "IconName",
  "architecture",
  "blockquote",
  "bmc",
  "bullets",
  "callout",
  "chart",
  "chevron_process",
  "code",
  "comparison",
  "concept_equation",
  "cycle",
  "data_table",
  "decision_tree",
  "device_mockup",
  "fishbone",
  "five_forces",
  "flowchart",
  "from_to",
  "gantt",
  "harvey_balls",
  "heatmap",
  "hub_spoke",
  "iceberg",
  "icon_cards",
  "image",
  "image_compare",
  "image_grid",
  "insight_panel",
  "issue_tree",
  "journey_map",
  "kpi_cards",
  "logo_wall",
  "matrix",
  "numbered_cards",
  "org_tree",
  "paragraph",
  "people_cards",
  "pest",
  "pictogram",
  "pillar_model",
  "positioning_map",
  "product_cards",
  "progress_donuts",
  "pros_cons",
  "pyramid",
  "quote_wall",
  "rings",
  "roadmap",
  "row_cards",
  "sankey",
  "scorecard",
  "segmented_wheel",
  "staircase",
  "steps",
  "swimlane",
  "swot",
  "timeline",
  "value_chain",
  "venn",
  "verdict_banner",
  "waterfall",
  "word_cloud",
]

/** Every `#/$defs/<id>` pointer in `node`, transitively through `$defs` itself. */
function collectRefs(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, out)
  } else if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") out.add(value)
      else collectRefs(value, out)
    }
  }
  return out
}

function defsOf(doc: JsonSchemaDocument): Record<string, unknown> {
  return (doc.$defs ?? {}) as Record<string, unknown>
}

function expectRefsResolve(doc: JsonSchemaDocument): void {
  const defs = defsOf(doc)
  for (const ref of collectRefs(doc)) {
    expect(ref, `unexpected ref shape ${ref}`).toMatch(/^#\/\$defs\/[A-Za-z_]+$/)
    expect(defs, `dangling ${ref}`).toHaveProperty(ref.slice("#/$defs/".length))
  }
}

describe("irJsonSchema", () => {
  it("hoists every component, the component union, and the icon enum into named $defs", () => {
    const schema = irJsonSchema()
    expect(Object.keys(defsOf(schema)).sort()).toEqual(EXPECTED_DEFS)
    expect(EXPECTED_DEFS).toEqual([COMPONENT_UNION_DEF_ID, ICON_NAME_DEF_ID, ...[...COMPONENT_TYPES].sort()])
  })

  it("stays under the context budget in both print modes", () => {
    const schema = irJsonSchema()
    expect(JSON.stringify(schema).length).toBeLessThan(200_000)
    expect(JSON.stringify(schema, null, 2).length).toBeLessThan(200_000)
  })

  it("references the component union once per page type instead of expanding it four times", () => {
    const json = JSON.stringify(irJsonSchema())
    expect(json.match(/"#\/\$defs\/Component"/g)).toHaveLength(4)
    expect(json.match(/"const":"bullets"/g)).toHaveLength(1)
  })

  it("resolves every $ref against its own $defs", () => {
    expectRefsResolve(irJsonSchema())
    expectRefsResolve(irJsonSchema({ full: true }))
  })

  it("replaces the icon enum with a string that points at `pptwise icons` in the model view", () => {
    const icon = defsOf(irJsonSchema())[ICON_NAME_DEF_ID] as Record<string, unknown>
    expect(icon.type).toBe("string")
    expect(icon.enum).toBeUndefined()
    expect(String(icon.description)).toContain("pptwise icons")
    const callout = defsOf(irJsonSchema()).callout as { properties: Record<string, unknown> }
    expect(callout.properties.icon).toEqual({ $ref: `#/$defs/${ICON_NAME_DEF_ID}` })
  })

  it("keeps the closed icon enum under --full for programs", () => {
    const icon = defsOf(irJsonSchema({ full: true }))[ICON_NAME_DEF_ID] as Record<string, unknown>
    expect(icon.enum).toEqual([...PPTX_ICON_NAMES])
    expect(JSON.stringify(irJsonSchema({ full: true })).length).toBeLessThan(200_000)
  })

  it("still carries component-level and field-level descriptions", () => {
    const json = JSON.stringify(irJsonSchema())
    expect(json).toContain("Frames a product or app screenshot inside a real device")
    expect(json).toContain("never a row of gauges")
  })

  it("does not weaken validation: a bad icon name is still rejected", () => {
    irJsonSchema()
    const result = validateIr({
      version: "5",
      theme: { id: "brief" },
      slides: [
        {
          type: "content",
          kind: "points",
          heading: "Icons",
          components: [{ type: "callout", variant: "info", text: "hi", icon: "not-an-icon-name" }],
        },
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.map((e) => e.message).join("\n")).toContain("is not a valid icon name")
  })
})

describe("componentJsonSchema", () => {
  it("prints one component with only the $defs it depends on", () => {
    const callout = componentJsonSchema("callout")
    expect(callout.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
    expect(callout.component).toBe("callout")
    expect((callout.properties as Record<string, unknown>).type).toEqual({ type: "string", const: "callout" })
    expect(Object.keys(defsOf(callout))).toEqual([ICON_NAME_DEF_ID])
    expectRefsResolve(callout)

    const bullets = componentJsonSchema("bullets")
    expect(bullets.$defs).toBeUndefined()
    expect((bullets.properties as Record<string, unknown>).items).toEqual({ type: "array", items: { type: "string" } })
  })

  it("honors --full for the icon enum", () => {
    const icon = defsOf(componentJsonSchema("kpi_cards", { full: true }))[ICON_NAME_DEF_ID] as Record<string, unknown>
    expect(icon.enum).toHaveLength(PPTX_ICON_NAMES.length)
  })

  it("slices every component type without a dangling reference", () => {
    for (const type of COMPONENT_TYPES) {
      const doc = componentJsonSchema(type)
      expect(doc.component).toBe(type)
      expectRefsResolve(doc)
    }
  })

  it("rejects an unknown type and lists the valid ones", () => {
    expect(() => componentJsonSchema("quote")).toThrow(/unknown component type "quote"/)
    expect(() => componentJsonSchema("quote")).toThrow(/blockquote/)
    expect(() => componentJsonSchema("quote")).toThrow(/word_cloud/)
  })
})
