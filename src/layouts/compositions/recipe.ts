import type { Component, PageKind, Slide } from "@/ir"
import type { CompositionSetting } from "./shared"

/*
 * Recipes: what an author writes to get a composition.
 *
 * A composition recognises one content shape and declines everything else
 * (`./shared.tsx`). Its recipe says that shape in the author's terms: which
 * components, how many items each, which optional fields it needs filled,
 * and which page kinds it is drawn for. `pptwise inspect` prints the recipes
 * a page's face offers, so a page can be written for a signature drawing
 * rather than land on the ordinary renderer by luck, and `pptwise build`
 * names the nearest recipe for a page that landed there anyway.
 *
 * Each recipe sits in its composition's own file, beside the code that
 * declines, and `recipes.test.tsx` holds the two together: for every theme
 * and every composition its faces offer, a page written to the recipe at its
 * fewest and its most items, with no optional field the recipe does not
 * name, is drawn by that composition. A recipe is a sufficient way in, not
 * the whole of what the composition takes: the words still have to fit.
 *
 * Recipes are engine and output facts. They never reach the IR.
 */

/** A page field outside the components that a recipe needs written. */
export type RecipePageField = "footnote" | "kicker" | "tag" | "stamp" | "ballot"

/**
 * One component a recipe asks for.
 *
 * `count` bounds the component's counted list (`RECIPE_COUNTED`): its items,
 * rows, milestones, or a chart's categories. `needs` names the optional
 * fields the drawing needs filled, as paths into the component: `caption`,
 * `items[].icon` (at least one item carries an icon), `items[*].icon` (every
 * item does), `direction=horizontal` (the field holds that value),
 * `chart_type=bar|line` (one of those), `items[*]~colon` and
 * `milestones[*].desc~figure` (its words are written `lead: rest`, or hold
 * a number). A field the schema requires is named only for a value or a way
 * of writing it. `optional` marks a part the drawing does without, every
 * combination of a shape's optional parts left out tested.
 */
export interface RecipePart {
  type: Component["type"]
  count?: readonly [number, number]
  needs?: readonly string[]
  /** The drawing takes the page without it too: written, it is drawn, and left out, nothing is missing. */
  optional?: true
}

/**
 * One way of writing the page: its components in order, and the page fields
 * it needs. `settings` names the settings it holds in, when a composition
 * several settings share takes a different shape in some (brief's rows take
 * bullets, the others numbered cards). Omitted, it holds in every setting.
 */
export interface RecipeShape {
  parts: readonly RecipePart[]
  page?: readonly RecipePageField[]
  settings?: readonly CompositionSetting[]
}

export interface Recipe {
  /** What the drawn page looks like, in one line. */
  look: string
  /** The page kinds the drawing is made for. */
  kinds: readonly PageKind[]
  /** The ways of writing a page this composition draws, the plainest first. */
  shapes: readonly RecipeShape[]
}

/**
 * The list `count` counts on each component type that has one. A chart
 * counts its categories, the distinct `x` across its series. A harvey ball table
 * counts its criteria.
 */
export const RECIPE_COUNTED: Readonly<Partial<Record<Component["type"], string>>> = {
  bullets: "items",
  kpi_cards: "items",
  icon_cards: "items",
  row_cards: "items",
  numbered_cards: "items",
  steps: "items",
  rings: "items",
  roadmap: "items",
  matrix: "items",
  insight_panel: "rows",
  image_grid: "items",
  logo_wall: "items",
  product_cards: "items",
  quote_wall: "quotes",
  waterfall: "items",
  gantt: "items",
  data_table: "rows",
  comparison: "rows",
  from_to: "rows",
  timeline: "milestones",
  people_cards: "people",
  progress_donuts: "items",
  staircase: "items",
  chevron_process: "items",
  cycle: "items",
  hub_spoke: "items",
  scorecard: "rows",
  pyramid: "layers",
  issue_tree: "branches",
  decision_tree: "branches",
  concept_equation: "operands",
  architecture: "layers",
  org_tree: "children",
  chart: "series[].data",
  harvey_balls: "criteria",
}

/** What one counted entry is called in a recipe line. */
const COUNT_NOUN: Readonly<Record<string, string>> = {
  items: "items",
  rows: "rows",
  quotes: "quotes",
  milestones: "milestones",
  people: "people",
  layers: "layers",
  branches: "branches",
  operands: "operands",
  children: "branches",
  "series[].data": "categories",
  criteria: "criteria",
}

/** One counted entry's noun, for a count of exactly one. */
const ONE_NOUN: Readonly<Record<string, string>> = {
  items: "item",
  rows: "row",
  quotes: "quote",
  milestones: "milestone",
  people: "person",
  layers: "layer",
  branches: "branch",
  operands: "operand",
  categories: "category",
  criteria: "criterion",
}

/** `2 to 4 items`, `3 rows`, `1 item`. */
function countPhrase(type: Component["type"], [min, max]: readonly [number, number]): string {
  const path = RECIPE_COUNTED[type]
  if (path === undefined) throw new Error(`a recipe counts ${type}, which has no counted list`)
  const noun = COUNT_NOUN[path]!
  if (min !== max) return `${min} to ${max} ${noun}`
  return `${min} ${min === 1 ? ONE_NOUN[noun]! : noun}`
}

type Loose = Record<string, unknown>

/** How many entries the component's counted list holds, or undefined when its type has none. */
export function recipeCount(component: Component): number | undefined {
  const path = RECIPE_COUNTED[component.type]
  if (path === undefined) return undefined
  const c = component as unknown as Loose
  if (path === "series[].data") return chartCategories(component).length
  return (c[path] as unknown[] | undefined)?.length ?? 0
}

/** A chart's categories: the distinct `x` of its points, in the order they first appear across its series. */
export function chartCategories(component: Component): string[] {
  if (component.type !== "chart") return []
  const seen: string[] = []
  for (const series of component.series) for (const point of series.data) if (!seen.includes(String(point.x))) seen.push(String(point.x))
  return seen
}

function present(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return false
  if (typeof value === "string") return value.trim() !== ""
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * Whether `node` meets `test` along `steps`: a `list[]` step on some entry
 * of the list, a `list[*]` step on every entry of a list that has one.
 */
function meets(node: unknown, steps: readonly string[], test: (value: unknown) => boolean): boolean {
  if (steps.length === 0) return test(node)
  if (node === null || typeof node !== "object") return false
  const [step, ...rest] = steps as [string, ...string[]]
  const every = step.endsWith("[*]")
  const list = every || step.endsWith("[]")
  const value = (node as Loose)[step.replace(/\[\*?\]$/, "")]
  if (!list) return meets(value, rest, test)
  if (!Array.isArray(value) || value.length === 0) return false
  return every ? value.every((entry) => meets(entry, rest, test)) : value.some((entry) => meets(entry, rest, test))
}

/** How a field's words are written, for a need `path~colon` or `path~figure`. */
const WORDS: Readonly<Record<string, { test: (text: string) => boolean; as: (where: string) => string }>> = {
  // `预算管理：没管过全年预算`, `Budgets: never ran a year's`.
  colon: { test: (text) => /^[^：:]+[：:]\s*\S/u.test(text.trim()), as: (where) => `${where} as "lead: rest"` },
  // `周末翻台率从 2.1 提到 2.8`, `2019`.
  figure: { test: (text) => /\d/u.test(text), as: (where) => `a number in ${where}` },
}

/** Whether `component` meets one need: the field is filled, holds one of the values named, or its words are written as named, on some entry of a `[]` list and on every entry of a `[*]` one. */
export function meetsNeed(component: Component, need: string): boolean {
  const words = /^(.+)~(\w+)$/.exec(need)
  if (words !== null) {
    const rule = WORDS[words[2]!]!
    return meets(component, words[1]!.split("."), (value) => typeof value === "string" && rule.test(value))
  }
  const [path, want] = need.split("=", 2) as [string, string | undefined]
  const allowed = want?.split("|")
  return meets(component, path.split("."), (value) => (allowed === undefined ? present(value) : allowed.includes(String(value))))
}

/** Whether a need is about how words are written (`path~colon`), not whether a field is filled. */
export function isWordsNeed(need: string): boolean {
  return need.includes("~")
}

/** `items[].icon` as `icon on an item`, `items[*].icon` as `icon on every item`, `direction=horizontal` as `direction horizontal`. */
export function describeNeed(need: string): string {
  const words = /^(.+)~(\w+)$/.exec(need)
  if (words !== null) return WORDS[words[2]!]!.as(wordsWhere(words[1]!))
  const [path, want] = need.split("=", 2) as [string, string | undefined]
  const steps = path.split(".")
  if (want !== undefined) return `${steps.join(".").replace(/\[\*?\]/g, "")} ${want.split("|").join(" or ")}`
  const field = steps[steps.length - 1]!.replace(/\[\*?\]$/, "")
  if (steps.length === 1) return field
  const owner = steps[steps.length - 2]!
  const noun = singular(owner.replace(/\[\*?\]$/, ""))
  return owner.endsWith("[*]") ? `${field} on every ${noun}` : `${field} on ${articled(noun)}`
}

/** Where a words need applies: `items[*]` as `each item`, `cells[]` as `a cell`, `milestones[*].desc` as `each milestone's desc`, `title` as `the title`. */
function wordsWhere(path: string): string {
  const steps = path.split(".")
  const last = steps[steps.length - 1]!
  const which = (step: string) => {
    const noun = singular(step.replace(/\[\*?\]$/, ""))
    return step.endsWith("[*]") ? `each ${noun}` : articled(noun)
  }
  if (last.endsWith("]")) return which(last)
  if (steps.length === 1) return `the ${last}`
  return `${which(steps[steps.length - 2]!)}'s ${last}`
}

/** `items` as `item`, `series` as `series`, `data` as `point`, `entries` as `entry`. */
function singular(word: string): string {
  if (word === "series") return "series"
  if (word === "data") return "point"
  if (word === "people") return "person"
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`
  return word.endsWith("s") ? word.slice(0, -1) : word
}

function articled(noun: string): string {
  return /^[aeiou]/.test(noun) ? `an ${noun}` : `a ${noun}`
}

/** One part as a recipe line writes it: `icon_cards (2 to 4 items, icon on an item)`, `callout (optional)`. */
export function describePart(part: RecipePart): string {
  const bits: string[] = []
  if (part.count !== undefined) bits.push(countPhrase(part.type, part.count))
  for (const need of part.needs ?? []) bits.push(describeNeed(need))
  if (part.optional) bits.push("optional")
  return bits.length > 0 ? `${part.type} (${bits.join(", ")})` : part.type
}

/** A shape as a recipe line writes it: `image + icon_cards (2 to 4 items)`, its page fields after it. */
export function describeShape(shape: RecipeShape): string {
  const parts = shape.parts.length > 0 ? shape.parts.map(describePart).join(" + ") : "no component, the heading alone"
  return shape.page !== undefined && shape.page.length > 0 ? `${parts}, with a ${shape.page.join(" and a ")}` : parts
}

/** Whether `shape` is `other` with all of its optional parts left out, so `other` already says it. */
function subsumedBy(shape: RecipeShape, other: RecipeShape): boolean {
  if (shape === other || !other.parts.some((part) => part.optional)) return false
  const required = other.parts.filter((part) => !part.optional)
  const same = (a: RecipePart, b: RecipePart) =>
    a.type === b.type && a.count?.[0] === b.count?.[0] && a.count?.[1] === b.count?.[1] && (a.needs ?? []).join() === (b.needs ?? []).join()
  return required.length === shape.parts.length && required.every((part, i) => same(part, shape.parts[i]!)) && (shape.page ?? []).join() === (other.page ?? []).join()
}

/** The shapes of `recipe` that hold in `setting`, less any another of them already says with its optional parts left out. */
export function shapesIn(recipe: Recipe, setting: CompositionSetting): RecipeShape[] {
  const holding = recipe.shapes.filter((shape) => shape.settings === undefined || shape.settings.includes(setting))
  return holding.filter((shape) => !holding.some((other) => subsumedBy(shape, other)))
}

/**
 * Component types an author writes from the same material: one turns into
 * another with no new content (a row of titled cards into a row of cards
 * with icons, a timeline or a row of steps into a roadmap). A type may sit
 * in more than one family.
 */
const RECIPE_KIN: readonly (readonly Component["type"][])[] = [
  ["bullets", "row_cards", "icon_cards", "numbered_cards", "steps", "chevron_process", "staircase"],
  ["timeline", "roadmap", "gantt", "steps", "chevron_process"],
  ["kpi_cards", "progress_donuts"],
  ["comparison", "data_table", "from_to", "scorecard"],
  ["paragraph", "blockquote", "callout", "verdict_banner"],
]

function kin(a: Component["type"], b: Component["type"]): boolean {
  return RECIPE_KIN.some((family) => family.includes(a) && family.includes(b))
}

/**
 * What a page lacks to be written to `shape`, each as a short instruction,
 * empty when it is written to it. The parts are matched by type in the
 * order written. A part the page has no component of takes a component of
 * a kindred type the shape does not otherwise use, to be turned into it.
 * Any component left over is named as one the recipe has no room for.
 */
export function shapeGaps(shape: RecipeShape, slide: Pick<Slide, "components"> & Partial<Record<RecipePageField, unknown>>): string[] {
  const gaps: string[] = []
  const left = [...slide.components]
  const matched = shape.parts.map((part) => {
    const at = left.findIndex((component) => component.type === part.type)
    return at === -1 ? undefined : (left.splice(at, 1)[0] as Component)
  })
  shape.parts.forEach((part, i) => {
    const component = matched[i]
    if (component === undefined) {
      const at = left.findIndex((other) => kin(other.type, part.type))
      // The turned component is rewritten to the part as a whole, its counts and fields with it.
      if (at !== -1) gaps.push(`turn the ${left.splice(at, 1)[0]!.type} into ${describePart({ ...part, optional: undefined })}`)
      else if (!part.optional) gaps.push(`add ${describePart(part)}`)
      return
    }
    const count = recipeCount(component)
    if (part.count !== undefined && count !== undefined && (count < part.count[0] || count > part.count[1])) {
      gaps.push(`give the ${part.type} ${countPhrase(part.type, part.count)} (it has ${count})`)
    }
    for (const need of part.needs ?? []) {
      if (meetsNeed(component, need)) continue
      gaps.push(isWordsNeed(need) ? `in the ${part.type}, write ${describeNeed(need)}` : `set ${describeNeed(need)} in the ${part.type}`)
    }
  })
  for (const component of left) gaps.push(`the recipe has no room for the ${component.type}`)
  for (const field of shape.page ?? []) {
    if (!present(slide[field])) gaps.push(`add a ${field}`)
  }
  return gaps
}
