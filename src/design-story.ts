/**
 * A design story is the public record of one design object: what it is, when
 * to choose it, who it is for, and when not to choose it. Themes, content
 * kinds, faces, and components all carry one, in the same six fields.
 *
 * Stories are customer-facing copy. They are written in English at the
 * definition they describe, and the gallery translates them for review. Two
 * consequences follow, and both are enforced below or by
 * `design-story.test.ts`:
 *
 * - No maintainer vocabulary. A story never names a file, a registry, an
 *   internal id, a face, or a test. It reads like product copy because it is
 *   product copy — README sections, theme pages, and the gallery all draw
 *   from it.
 * - A name names a voice or a genre, never an industry. See
 *   {@link INDUSTRY_WORDS} and `naming-rule.test.ts`. A name that squats on
 *   an industry locks an object to one customer while what it actually sells
 *   is a tone of voice any customer can borrow.
 *
 * This module is a leaf: it imports nothing, so every layer can hold a story
 * beside its definition without a dependency cycle.
 */

/** One design object's public record, shared by every layer. */
export interface DesignStory {
  /** Display name. A voice or a genre, never an industry and never an id. */
  name: string
  /** What it is, and which real-world form of print or staging it borrows. */
  story: string
  /** When to choose it. */
  positioning: string
  /** Who speaks from it, and who is listening. */
  audience: string
  /** When not to choose it. Reverse positioning prevents more misuse than the forward kind. */
  notFor: string
  /** Optional: where it comes from, what it references, what it pays tribute to. */
  lineage?: string
}

/**
 * Per-field length caps.
 *
 * `story` and `positioning` carry the argument, so they get two sentences.
 * Everything else is one. The character caps are the real fence — a single
 * sentence can still run for a paragraph — and they are round numbers chosen
 * to fit the gallery's design card without wrapping past a few lines, not
 * measurements of anything.
 *
 * `name` is the exception: it is a name, not a sentence, so it is capped far
 * shorter and is the one field that must *not* end in a full stop.
 */
export const STORY_LIMITS = {
  name: { chars: 60, sentences: 1 },
  story: { chars: 240, sentences: 2 },
  positioning: { chars: 240, sentences: 2 },
  audience: { chars: 140, sentences: 1 },
  notFor: { chars: 140, sentences: 1 },
  lineage: { chars: 140, sentences: 1 },
} as const satisfies Record<keyof DesignStory, { chars: number; sentences: number }>

export type DesignStoryField = keyof typeof STORY_LIMITS

/** Fields every story must fill. `lineage` is the only optional one. */
export const REQUIRED_STORY_FIELDS = ["name", "story", "positioning", "audience", "notFor"] as const

/** Prose fields — the ones that must read as finished sentences. */
const PROSE_FIELDS = ["story", "positioning", "audience", "notFor", "lineage"] as const

const TERMINAL_PUNCTUATION = /[.!?。！？]/

/**
 * Sentence count, by terminal punctuation that actually closes a sentence:
 * end of string, or followed by a space. An abbreviation mid-sentence ("e.g.")
 * would miscount, which is one more reason not to write one into public copy.
 */
function countSentences(text: string): number {
  return (text.match(/[.!?。！？]+(?=\s|$)/g) ?? []).length
}

export interface StoryProblem {
  /** Which field is at fault. */
  readonly field: DesignStoryField
  /** Machine-readable reason, stable enough to assert on. */
  readonly code:
    | "missing"
    | "blank"
    | "untrimmed"
    | "too_long"
    | "too_many_sentences"
    | "unfinished_sentence"
    | "name_reads_as_sentence"
    | "industry_word"
  /** One line a human can act on. */
  readonly message: string
}

/**
 * Check one story against the field caps and the naming rule. Returns every
 * problem it finds rather than throwing on the first, so a batch of drafts
 * can be fixed in one pass.
 *
 * The industry-word rule is checked on `name` only. Positioning and audience
 * are exactly where an industry belongs: "a quarterly review in any industry"
 * is a fine sentence, `Financial Insight` is not a fine name.
 */
export function validateDesignStory(story: DesignStory): readonly StoryProblem[] {
  const problems: StoryProblem[] = []
  const add = (field: DesignStoryField, code: StoryProblem["code"], message: string): void => {
    problems.push({ field, code, message })
  }

  for (const field of REQUIRED_STORY_FIELDS) {
    const value = story[field]
    if (typeof value !== "string") {
      add(field, "missing", `${field} is required`)
      continue
    }
    if (value.trim() === "") add(field, "blank", `${field} is empty`)
  }

  for (const field of Object.keys(STORY_LIMITS) as DesignStoryField[]) {
    const value = story[field]
    if (typeof value !== "string" || value.trim() === "") continue
    const limit = STORY_LIMITS[field]
    if (value !== value.trim()) add(field, "untrimmed", `${field} has leading or trailing whitespace`)
    if (value.length > limit.chars) {
      add(field, "too_long", `${field} is ${value.length} characters, over the ${limit.chars} cap`)
    }
    const sentences = countSentences(value)
    if (sentences > limit.sentences) {
      add(
        field,
        "too_many_sentences",
        `${field} runs ${sentences} sentences, over the ${limit.sentences}-sentence cap`,
      )
    }
    if ((PROSE_FIELDS as readonly string[]).includes(field) && sentences === 0) {
      add(field, "unfinished_sentence", `${field} does not end a sentence`)
    }
  }

  if (typeof story.name === "string" && TERMINAL_PUNCTUATION.test(story.name)) {
    add("name", "name_reads_as_sentence", "name is a name, not a sentence — drop the punctuation")
  }
  for (const word of findIndustryWords(story.name ?? "")) {
    add("name", "industry_word", `name says "${word}" — a name names a voice or a genre, never an industry`)
  }

  return problems
}

/** True when a story passes every cap and the naming rule. */
export function isValidDesignStory(story: DesignStory): boolean {
  return validateDesignStory(story).length === 0
}

/**
 * Industries a name may not squat on.
 *
 * The first block is drawn from the industries the built-in themes name
 * themselves after today. The rest are the ones a new theme would most
 * plausibly reach for next. Chinese entries are listed because names and
 * translated names are checked by the same rule.
 *
 * The list is about the *name*. An industry is welcome in `positioning`,
 * `audience`, and in a theme's occasions, which is where it says who a voice
 * happens to suit rather than who owns it. Words that name a form, a venue,
 * or a craft — runway, museum, lecture hall, playbill, ledger, clinic — are
 * not on this list and are not meant to be: they name a genre, which is the
 * whole point. A clinic is a room with a manner of speaking, the way a
 * museum is. Healthcare is the industry that happens to work in one.
 */
export const INDUSTRY_WORDS: readonly string[] = [
  // Industries the built-ins currently name themselves after.
  "consulting",
  "consultancy",
  "consultant",
  "business",
  "academic",
  "academia",
  "health",
  "healthcare",
  "life science",
  "medical",
  "medicine",
  "tech",
  "technology",
  "sustainability",
  "esg",
  "finance",
  "financial",
  "marketing",
  "enterprise",
  "classroom",
  "education",
  "educational",
  "kids",
  "esports",
  "entertainment",
  "startup",
  // Industries a new name would most plausibly reach for next.
  "legal",
  "law firm",
  "government",
  "public sector",
  "municipal",
  "real estate",
  "realty",
  "retail",
  "ecommerce",
  "e-commerce",
  "banking",
  "insurance",
  "biotech",
  "fintech",
  "saas",
  "pharma",
  "pharmaceutical",
  "manufacturing",
  "logistics",
  "agriculture",
  "hospitality",
  "tourism",
  "nonprofit",
  "telecom",
  "automotive",
  // Chinese.
  "咨询",
  "学术",
  "医疗",
  "健康",
  "科技",
  "环保",
  "金融",
  "财务",
  "营销",
  "企业",
  "课堂",
  "教育",
  "儿童",
  "电竞",
  "创业",
  "法律",
  "政务",
  "地产",
  "零售",
  "银行",
  "保险",
  "制造",
  "物流",
  "农业",
  "旅游",
]

/** Latin words match whole; CJK entries have no word boundaries to match on. */
function industryWordPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return /^[\x20-\x7e]+$/.test(word) ? new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i") : new RegExp(escaped)
}

/**
 * Every industry word a piece of text says, in list order. Use it on names,
 * labels, and ids — never on positioning or audience, where an industry is
 * legitimate.
 */
export function findIndustryWords(text: string): readonly string[] {
  // Ids join their words with a hyphen or an underscore, so a separator-free
  // pass catches `real-estate` while the raw pass still catches `e-commerce`.
  const spaced = text.replace(/[-_]/g, " ")
  return INDUSTRY_WORDS.filter((word) => {
    const pattern = industryWordPattern(word)
    return pattern.test(text) || pattern.test(spaced)
  })
}
