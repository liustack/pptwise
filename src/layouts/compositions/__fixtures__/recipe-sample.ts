import type { Component, Slide } from "@/ir"
import { irJsonSchema, type JsonSchemaDocument } from "@/ir/json-schema"
import { chartCategories, RECIPE_COUNTED, type RecipePageField, type RecipeShape } from "../recipe"

/*
 * Writing a page to a recipe, for the tests that hold recipes and
 * compositions together (`../recipes.test.tsx`).
 *
 * The words come from a sample page the composition draws, so they are the
 * length and kind its board was set for. Everything else comes from the
 * recipe: the components and their order, how many entries each list holds,
 * and which optional fields stay. Every optional field the recipe does not
 * name is taken out, so a recipe that leaves out a field its composition
 * needs fails here.
 */

type Loose = Record<string, unknown>
type Schema = { $ref?: string; type?: string; properties?: Record<string, Schema>; required?: string[]; items?: Schema; anyOf?: Schema[]; oneOf?: Schema[] }

let full: JsonSchemaDocument | undefined
function defs(): Record<string, Schema> {
  full ??= irJsonSchema()
  return (full.$defs ?? {}) as Record<string, Schema>
}

function resolve(schema: Schema | undefined): Schema | undefined {
  let s = schema
  for (let i = 0; s?.$ref !== undefined && i < 8; i++) s = defs()[s.$ref.replace("#/$defs/", "")]
  if (s?.properties === undefined && s?.items === undefined) {
    const options = s?.anyOf ?? s?.oneOf
    const object = options?.map(resolve).find((o) => o?.properties !== undefined || o?.items !== undefined)
    if (object !== undefined) return object
  }
  return s
}

/** The page fields a recipe may name, the ones a sample page is stripped of unless it does. */
export const STRIPPED_PAGE_FIELDS: readonly RecipePageField[] = ["footnote", "kicker", "tag", "stamp", "ballot"]

/** Paths the needs keep under one key: `items[].icon` keeps `icon` under `items`. */
function subNeeds(needs: readonly string[], key: string): { whole: boolean; rest: string[] } {
  let whole = false
  const rest: string[] = []
  for (const need of needs) {
    const path = need.split(/[=~]/, 1)[0]!
    const [head, ...tail] = path.split(".")
    if (head!.replace(/\[\*?\]$/, "") !== key) continue
    if (tail.length === 0) whole = true
    else rest.push(tail.join("."))
  }
  return { whole, rest }
}

function strip(value: unknown, schema: Schema | undefined, needs: readonly string[]): unknown {
  const s = resolve(schema)
  if (Array.isArray(value)) return value.map((entry) => strip(entry, s?.items, needs))
  if (value === null || typeof value !== "object" || s?.properties === undefined) return value
  const out: Loose = {}
  const required = new Set(s.required ?? [])
  for (const [key, child] of Object.entries(value as Loose)) {
    const { whole, rest } = subNeeds(needs, key)
    if (whole) out[key] = child
    else if (required.has(key) || rest.length > 0) out[key] = strip(child, s.properties[key], rest)
  }
  return out
}

/** `component` with every optional field taken out but those `needs` names. */
export function stripComponent(component: Component, needs: readonly string[]): Component {
  const schema = defs()[component.type]
  const chartType = component.type === "chart" ? ["chart_type"] : []
  return strip(component, schema, [...needs, ...chartType]) as Component
}

/**
 * Whether a list entry is one to keep when the list is cut: the one the
 * author marked, or one holding a field a need asks for on some entry
 * (`items[].tone`), so the cut list still meets the recipe. Dropped last,
 * never copied.
 */
function marked(entry: unknown, kept: readonly string[] = []): boolean {
  if (entry === null || typeof entry !== "object") return false
  const e = entry as Loose
  return e.emphasis === true || e.highlight === true || e.featured === true || kept.some((field) => e[field] !== undefined)
}

function unmark(entry: unknown): unknown {
  if (entry === null || typeof entry !== "object") return entry
  const { emphasis: _e, highlight: _h, featured: _f, ...rest } = entry as Loose
  return rest
}

/** Indexes of `n` entries out of `list`: the marked ones kept, the others from the front, cycled when there are too few. */
function pick(list: readonly unknown[], n: number, kept: readonly string[] = []): number[] {
  if (n <= list.length) {
    const keep = new Set<number>()
    list.forEach((entry, i) => marked(entry, kept) && keep.add(i))
    for (let i = 0; keep.size < n && i < list.length; i++) keep.add(i)
    return [...keep].slice(0, n).sort((a, b) => a - b)
  }
  const out = list.map((_, i) => i)
  const plain = out.filter((i) => !marked(list[i]))
  const pool = plain.length > 0 ? plain : out
  for (let k = 0; out.length < n; k++) out.push(-1 - pool[k % pool.length]!)
  return out
}

function take<T>(list: readonly T[], at: readonly number[]): T[] {
  return at.map((i) => (i >= 0 ? list[i]! : (unmark(list[-1 - i]) as T)))
}

/**
 * `component` with its counted list at `n` entries (`RECIPE_COUNTED`), or
 * undefined when it cannot grow that far: a chart whose series do not each
 * hold every category is cut, never filled.
 */
export function resizeComponent(component: Component, n: number, needs: readonly string[] = []): Component | undefined {
  const path = RECIPE_COUNTED[component.type]
  if (path === undefined) return component
  const c = component as unknown as Loose
  if (path === "series[].data") {
    const series = c.series as { data: { x: unknown }[] }[]
    const categories = chartCategories(component)
    if (n === categories.length) return component
    const full = series.every((s) => s.data.length === categories.length)
    if (n > categories.length && !full) return undefined
    if (full) {
      const at = pick(series[0]!.data.map((_, i) => (series.some((s) => marked(s.data[i])) ? { emphasis: true } : {})), n)
      return { ...c, series: series.map((s) => ({ ...s, data: take(s.data, at) })) } as unknown as Component
    }
    const keep = new Set(take(categories, pick(categories.map((x) => (series.some((s) => s.data.some((d) => String(d.x) === x && marked(d))) ? { emphasis: true } : {})), n)))
    const cut = series.map((s) => ({ ...s, data: s.data.filter((d) => keep.has(String(d.x))) })).filter((s) => s.data.length > 0)
    return { ...c, series: cut } as unknown as Component
  }
  if (path === "criteria") {
    const at = pick(c.criteria as unknown[], n)
    const options = (c.options as { scores: unknown[] }[]).map((o) => ({ ...o, scores: take(o.scores, at) }))
    return { ...c, criteria: take(c.criteria as unknown[], at), options } as unknown as Component
  }
  // The fields a need asks for on some entry of this list, kept on the entries that hold them.
  const kept = needs.flatMap((need) => {
    const m = new RegExp(`^${path}\\[\\]\\.(\\w+)`).exec(need)
    return m === null ? [] : [m[1]!]
  })
  return { ...c, [path]: take(c[path] as unknown[], pick(c[path] as unknown[], n, kept)) } as unknown as Component
}

/**
 * The sample page written to `shape`, each part taken from the sample's
 * component of that type in order, its list at `counts[i]` entries (the
 * part's fewest when not given). Undefined when the sample lacks a part.
 */
export function writeToShape<S extends Slide>(sample: S, shape: RecipeShape, counts?: readonly (number | undefined)[]): S | undefined {
  const left = [...sample.components]
  const components: Component[] = []
  for (const [i, part] of shape.parts.entries()) {
    const at = left.findIndex((c) => c.type === part.type)
    if (at === -1) return undefined
    const [found] = left.splice(at, 1) as [Component]
    const n = counts?.[i] ?? part.count?.[0]
    const stripped = stripComponent(found, part.needs ?? [])
    const sized = n !== undefined && part.count !== undefined ? resizeComponent(stripped, n, part.needs ?? []) : stripped
    if (sized === undefined) return undefined
    components.push(sized)
  }
  const page: Loose = { ...sample, components }
  delete page.subheading
  for (const field of STRIPPED_PAGE_FIELDS) if (!(shape.page ?? []).includes(field)) delete page[field]
  return page as S
}

/** The optional fields `component` fills, as need paths, nested optional fields left under the one that holds them. */
export function optionalPaths(component: Component): string[] {
  const out: string[] = []
  const walk = (value: unknown, schema: Schema | undefined, prefix: string): void => {
    const s = resolve(schema)
    if (Array.isArray(value)) {
      value.forEach((entry) => walk(entry, s?.items, `${prefix}[]`))
      return
    }
    if (value === null || typeof value !== "object" || s?.properties === undefined) return
    const required = new Set(s.required ?? [])
    for (const [key, child] of Object.entries(value as Loose)) {
      const path = prefix === "" ? key : `${prefix}.${key}`
      if (key === "type") continue
      if (required.has(key)) walk(child, s.properties[key], path)
      else if (!out.includes(path)) out.push(path)
    }
  }
  walk(component, defs()[component.type], "")
  return out
}
