/**
 * Block shapes the sweeps build from the corpus's own blocks.
 *
 * Several sweeps write each block twice, the corpus's full one and its bare
 * required shape, and ask its schema how few items a list may hold. They
 * used to build the IR's whole JSON schema again for every block they
 * asked about, which was a large share of what the sweeps cost. The schema
 * is fixed for the life of the process, so each component's is built once
 * here and read from then on. The sweeps only read it.
 */
import { componentJsonSchema } from "@/ir/json-schema"

/** The parts of a component's JSON schema the sweeps read. */
export interface BlockSchema {
  required?: string[]
  properties?: Record<string, { minItems?: number; maxItems?: number; items?: { required?: string[] } }>
}

const SCHEMAS = new Map<string, BlockSchema>()

/** A component's JSON schema (`componentJsonSchema`), built once per type. Read it, never change it. */
export function blockSchema(type: string): BlockSchema {
  let schema = SCHEMAS.get(type)
  if (schema === undefined) SCHEMAS.set(type, (schema = componentJsonSchema(type) as BlockSchema))
  return schema
}

/** `block` with only the properties its schema requires, on the block and on each item of its lists. */
export function plainBlock(type: string, block: Record<string, unknown>): Record<string, unknown> {
  const schema = blockSchema(type)
  const required = new Set(schema.required ?? [])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(block)) {
    if (!required.has(key)) continue
    const itemRequired = schema.properties?.[key]?.items?.required
    out[key] =
      Array.isArray(value) && itemRequired !== undefined
        ? value.map((item: Record<string, unknown>) => Object.fromEntries(Object.entries(item).filter(([field]) => itemRequired.includes(field))))
        : value
  }
  return out
}
