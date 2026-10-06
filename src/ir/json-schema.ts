/**
 * The JSON Schema a model reads before it writes IR (`pptwise schema`).
 *
 * `z.toJSONSchema` inlines every shared fragment by default. The IR reuses
 * the 62-member component union on all four page types and the 1,758-name
 * icon enum on five fields, so the naive output ran to 2.6 MB. Seven
 * fragments carry a stable `id` in zod's registry instead, which makes the
 * emitter hoist each into `$defs` once and point at it by name: every
 * component under its own type name, the union as `Component`, the icon
 * enum as `IconName`, the tag that rows, figures, cards, charts and pages
 * share as `Tag`, the kind of news a figure, row or milestone is as `Tone`,
 * a page's strip of years as `Years`, and a page's ballot as `Ballot`. Named refs are what let `componentJsonSchema` cut
 * one component out with exactly the `$defs` it needs.
 *
 * The ids are attached to the existing schema instances through the same
 * global registry `.describe()` writes to, so validation, error hints, and
 * every description stay untouched.
 */
import { z } from "zod"
import { PptwiseError } from "../errors"
import { IconNameSchema, TagSchema, ToneSchema } from "./components/shared"
import { BallotSchema, COMPONENT_TYPES, ComponentSchema, PptxIRSchema, YearsSchema } from "./index"

export const COMPONENT_UNION_DEF_ID = "Component"
export const ICON_NAME_DEF_ID = "IconName"
export const TAG_DEF_ID = "Tag"
export const TONE_DEF_ID = "Tone"
export const YEARS_DEF_ID = "Years"
export const BALLOT_DEF_ID = "Ballot"

/** What the model view says where the closed enum used to be. */
export const ICON_NAME_MODEL_DESCRIPTION =
  "One icon name from the bundled catalog. Run `pptwise icons` for the full list."

export type JsonSchemaDocument = Record<string, unknown> & { $defs?: Record<string, unknown> }

let idsRegistered = false

/** Register the `$defs` ids once, merging with any metadata `.describe()` already stored. */
function registerDefIds(): void {
  if (idsRegistered) return
  const withId = (schema: z.ZodType, id: string): void => {
    z.globalRegistry.add(schema, { ...(z.globalRegistry.get(schema) ?? {}), id })
  }
  withId(IconNameSchema, ICON_NAME_DEF_ID)
  withId(TagSchema, TAG_DEF_ID)
  withId(ToneSchema, TONE_DEF_ID)
  withId(YearsSchema, YEARS_DEF_ID)
  withId(BallotSchema, BALLOT_DEF_ID)
  withId(ComponentSchema, COMPONENT_UNION_DEF_ID)
  for (const option of ComponentSchema.options) withId(option, option.shape.type.value)
  idsRegistered = true
}

/** Swap the icon enum for a string plus a pointer at `pptwise icons`. */
function replaceIconEnum(ctx: { zodSchema: unknown; jsonSchema: Record<string, unknown> }): void {
  if (ctx.zodSchema !== IconNameSchema) return
  for (const key of Object.keys(ctx.jsonSchema)) delete ctx.jsonSchema[key]
  ctx.jsonSchema.type = "string"
  ctx.jsonSchema.description = ICON_NAME_MODEL_DESCRIPTION
}

/** JSON Schema for the IR — feed this to a model before it writes IR. */
export function irJsonSchema(): JsonSchemaDocument {
  registerDefIds()
  return z.toJSONSchema(PptxIRSchema, {
    override: replaceIconEnum,
  }) as JsonSchemaDocument
}

/** Every `#/$defs/<id>` pointer inside `node`. */
function collectRefIds(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectRefIds(item, out)
    return
  }
  if (node === null || typeof node !== "object") return
  for (const [key, value] of Object.entries(node)) {
    if (key === "$ref" && typeof value === "string" && value.startsWith("#/$defs/")) {
      out.add(value.slice("#/$defs/".length))
    } else {
      collectRefIds(value, out)
    }
  }
}

/** The `$defs` entries `roots` reach, transitively, in the full schema's key order. */
export function reachableDefs(defs: Record<string, unknown>, roots: readonly unknown[]): Record<string, unknown> {
  const needed = new Set<string>()
  const pending: unknown[] = [...roots]
  while (pending.length > 0) {
    const found = new Set<string>()
    collectRefIds(pending.pop(), found)
    for (const id of found) {
      if (needed.has(id)) continue
      if (!(id in defs)) throw new Error(`schema $ref "#/$defs/${id}" has no $defs entry`)
      needed.add(id)
      pending.push(defs[id])
    }
  }
  const out: Record<string, unknown> = {}
  for (const id of Object.keys(defs)) if (needed.has(id)) out[id] = defs[id]
  return out
}

export function assertComponentType(type: string): void {
  if (COMPONENT_TYPES.includes(type)) return
  throw new PptwiseError(`unknown component type "${type}". Valid types: ${COMPONENT_TYPES.join(", ")}`)
}

/**
 * JSON Schema for one component (`pptwise schema --component <type>`): the
 * component's own object schema at the top, plus only the `$defs` it refers
 * to. Cut from the same emitted schema as {@link irJsonSchema}.
 */
export function componentJsonSchema(type: string): JsonSchemaDocument {
  assertComponentType(type)
  const full = irJsonSchema()
  const defs = full.$defs ?? {}
  const component = defs[type] as Record<string, unknown> | undefined
  if (component === undefined) throw new Error(`component "${type}" is missing from the schema $defs`)
  const needed = reachableDefs(defs, [component])
  return {
    $schema: full.$schema,
    component: type,
    ...component,
    ...(Object.keys(needed).length > 0 ? { $defs: needed } : {}),
  }
}
