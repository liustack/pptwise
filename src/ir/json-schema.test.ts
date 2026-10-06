import { describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { COMPONENT_TYPES } from "@/ir"
import {
  BALLOT_DEF_ID,
  COMPONENT_UNION_DEF_ID,
  FIELDS_DEF_ID,
  ICON_NAME_DEF_ID,
  KICKER_DEF_ID,
  STAGE_DEF_ID,
  STAMP_DEF_ID,
  TAG_DEF_ID,
  TONE_DEF_ID,
  YEARS_DEF_ID,
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
  "Ballot",
  "Component",
  "Fields",
  "IconName",
  "Kicker",
  "Stage",
  "Stamp",
  "Tag",
  "Tone",
  "Years",
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
  "sketch",
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
  it("hoists every component, the component union, the icon enum, the shared tag and the strip of years into named $defs", () => {
    const schema = irJsonSchema()
    expect(Object.keys(defsOf(schema)).sort()).toEqual(EXPECTED_DEFS)
    expect(EXPECTED_DEFS).toEqual([BALLOT_DEF_ID, COMPONENT_UNION_DEF_ID, FIELDS_DEF_ID, ICON_NAME_DEF_ID, KICKER_DEF_ID, STAGE_DEF_ID, STAMP_DEF_ID, TAG_DEF_ID, TONE_DEF_ID, YEARS_DEF_ID, ...[...COMPONENT_TYPES].sort()])
  })

  it("keeps each use site's own words about its tag beside the shared definition", () => {
    const kpi = componentJsonSchema("kpi_cards") as unknown as { properties: { items: { items: { properties: { tag: { $ref: string; description: string } } } } }; $defs: Record<string, unknown> }
    const tag = kpi.properties.items.items.properties.tag
    expect(tag.$ref).toBe(`#/$defs/${TAG_DEF_ID}`)
    expect(tag.description).toMatch(/^What the figure is/)
    expect(kpi.$defs).toHaveProperty(TAG_DEF_ID)
  })

  it("keeps each use site's own words about its tone beside the shared definition", () => {
    const steps = componentJsonSchema("steps") as unknown as { properties: { items: { items: { properties: { tone: { $ref: string; description: string } } } } }; $defs: Record<string, unknown> }
    const tone = steps.properties.items.items.properties.tone
    expect(tone.$ref).toBe(`#/$defs/${TONE_DEF_ID}`)
    expect(tone.description).toMatch(/^What kind of step it is/)
    expect(steps.$defs).toHaveProperty(TONE_DEF_ID)
  })

  it("keeps the page's ballot once, every page type pointing at it beside its own description", () => {
    const json = JSON.stringify(irJsonSchema())
    expect(json.match(new RegExp(`"\\$ref":"#/\\$defs/${BALLOT_DEF_ID}"`, "g"))).toHaveLength(4)
    expect(json.match(/The boxes each item can be ticked in, in order/g)).toHaveLength(1)
  })

  it("keeps the page fields only some faces draw once, every page type pointing at each", () => {
    const json = JSON.stringify(irJsonSchema())
    for (const id of [KICKER_DEF_ID, FIELDS_DEF_ID, STAMP_DEF_ID, STAGE_DEF_ID]) {
      expect(json.match(new RegExp(`"\\$ref":"#/\\$defs/${id}"`, "g")), id).toHaveLength(4)
    }
    expect(json.match(/One to four header lines a document form prints/g)).toHaveLength(1)
    expect(json.match(/A stamp pressed on the page/g)).toHaveLength(1)
    expect(json.match(/Which stage of the deck's course this page belongs to/g)).toHaveLength(1)
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
  })

  it("replaces the icon enum with a string that points at `pptwise icons` in the model view", () => {
    const icon = defsOf(irJsonSchema())[ICON_NAME_DEF_ID] as Record<string, unknown>
    expect(icon.type).toBe("string")
    expect(icon.enum).toBeUndefined()
    expect(String(icon.description)).toContain("pptwise icons")
    const callout = defsOf(irJsonSchema()).callout as { properties: Record<string, unknown> }
    expect(callout.properties.icon).toEqual({ $ref: `#/$defs/${ICON_NAME_DEF_ID}` })
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
    expect(Object.keys(defsOf(callout))).toEqual([TAG_DEF_ID, TONE_DEF_ID, ICON_NAME_DEF_ID])
    expectRefsResolve(callout)

    const bullets = componentJsonSchema("bullets")
    expect(bullets.$defs).toBeUndefined()
    expect((bullets.properties as Record<string, unknown>).items).toEqual({ type: "array", items: { type: "string" } })
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
