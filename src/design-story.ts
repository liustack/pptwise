/**
 * A design story is the public record of one design object: what it is, when
 * to choose it, who it is for, and when not to choose it. Themes, content
 * kinds, faces, and components all carry one, in the same six fields.
 *
 * Stories are customer-facing copy. They are written in English at the
 * definition they describe, and the gallery translates them for review. Two
 * consequences follow, and both are enforced below:
 *
 * - No maintainer vocabulary. A story never names a file, a registry, an
 *   internal id, or the machinery that draws a page. It reads like product
 *   copy because it is product copy — README sections, theme pages, and the
 *   gallery all draw from it. See {@link MAINTAINER_WORDS}.
 * - A name names a voice or a genre, never a vertical, a function, an
 *   audience, or an organization type. See {@link FORBIDDEN_NAME_WORDS}. A
 *   name that squats on one of those locks the object to one customer while
 *   what it actually sells is a tone of voice any customer can borrow.
 *
 * This module is a leaf: it imports nothing, so every layer can hold a story
 * beside its definition without a dependency cycle.
 */

/** One design object's public record, shared by every layer. */
export interface DesignStory {
  /** Display name. A voice or a genre — see the naming rule above. */
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
 * shorter and is the one field that must not end in a full stop.
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

// ── sentence boundaries ────────────────────────────────────────────────────

/**
 * Abbreviations whose full stop closes nothing. Masked before the scan, so
 * "Leaders, e.g. directors." is one sentence rather than two.
 *
 * Matched case-insensitively, longest first, so "et al." wins over "al.".
 */
const ABBREVIATIONS: readonly string[] = [
  "et al.",
  "approx.",
  "e.g.",
  "i.e.",
  "etc.",
  "vs.",
  "cf.",
  "no.",
  "nos.",
  "fig.",
  "figs.",
  "vol.",
  "pp.",
  "est.",
  "a.m.",
  "p.m.",
  "u.s.",
  "u.k.",
  "e.u.",
  "mr.",
  "mrs.",
  "ms.",
  "dr.",
  "prof.",
  "st.",
  "jr.",
  "sr.",
  "inc.",
  "ltd.",
  "co.",
]

/** Closers that may sit between a full stop and the end of its sentence. */
const SENTENCE_CLOSERS = "\"'”’»)\\]）】》」』"
const TERMINATORS = ".!?。！？"
const CJK_TERMINATORS = /[。！？]/

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Blank out every full stop that is not a sentence boundary, keeping the
 * string's length so nothing downstream has to re-derive positions.
 *
 * An abbreviation is masked whole unless it lands at the very end of the
 * text, where its own full stop is doing double duty and does close the
 * sentence ("reports, memos, etc." is finished). Decimals lose the point
 * between their digits.
 */
function maskNonBoundaries(text: string): string {
  const lastIndex = text.replace(/\s+$/, "").length
  let masked = text
  for (const abbreviation of ABBREVIATIONS) {
    masked = masked.replace(new RegExp(escapeRegExp(abbreviation), "gi"), (match, offset: number) => {
      const endsText = offset + match.length === lastIndex
      const body = "x".repeat(match.length - 1)
      return endsText ? body + match.slice(-1) : `${body}x`
    })
  }
  return masked.replace(/(\d)\.(\d)/g, "$1x$2")
}

export interface SentenceScan {
  /** How many sentences the text closes. */
  readonly count: number
  /** Whether the text ends on a closed sentence rather than a fragment. */
  readonly closed: boolean
}

/**
 * The one place sentence boundaries are decided, for counting and for
 * "did this finish" alike — two questions with one answer, so they can never
 * disagree about where a sentence ended.
 *
 * A full stop closes a sentence when what follows it is the end of the text
 * or a space, after any closing quotes or brackets are stepped over. Chinese
 * and Japanese full stops close one whether or not a space follows, because
 * consecutive sentences in those scripts do not use one.
 */
export function scanSentences(text: string): SentenceScan {
  const masked = maskNonBoundaries(text)
  const end = masked.replace(/\s+$/, "").length
  const pattern = new RegExp(`[${escapeRegExp(TERMINATORS)}]+[${SENTENCE_CLOSERS}]*`, "g")
  let count = 0
  let lastClose = -1
  for (const match of masked.matchAll(pattern)) {
    const stop = (match.index ?? 0) + match[0].length
    const next = masked[stop]
    if (next !== undefined && !/\s/.test(next) && !CJK_TERMINATORS.test(match[0])) continue
    count += 1
    lastClose = stop
  }
  return { count, closed: count > 0 && lastClose === end }
}

// ── the rules ──────────────────────────────────────────────────────────────

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
    | "forbidden_name_word"
    | "maintainer_word"
  /** One line a human can act on. */
  readonly message: string
}

/**
 * Check one story against the field caps, the naming rule, and the ban on
 * maintainer vocabulary. Returns every problem it finds rather than throwing
 * on the first, so a batch of drafts can be fixed in one pass.
 *
 * The naming rule is checked on `name` only. Positioning and audience are
 * exactly where an industry belongs: "a quarterly review in any industry" is
 * a fine sentence, `Financial Insight` is not a fine name.
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
    if ((PROSE_FIELDS as readonly string[]).includes(field)) {
      const scan = scanSentences(value)
      if (scan.count > limit.sentences) {
        add(field, "too_many_sentences", `${field} runs ${scan.count} sentences, over the ${limit.sentences}-sentence cap`)
      }
      if (!scan.closed) add(field, "unfinished_sentence", `${field} does not end a finished sentence`)
    }
    for (const word of findMaintainerWords(value)) {
      add(field, "maintainer_word", `${field} says "${word}" — a story is product copy, not a note to the maintainers`)
    }
  }

  // Anchored: a name may carry a full stop inside it ("No. 5"), it just may
  // not end on one, which is what would make it read as a sentence.
  if (typeof story.name === "string" && new RegExp(`[${escapeRegExp(TERMINATORS)}]\\s*$`).test(story.name)) {
    add("name", "name_reads_as_sentence", "name is a name, not a sentence — drop the closing punctuation")
  }
  for (const word of findForbiddenNameWords(story.name ?? "")) {
    add(
      "name",
      "forbidden_name_word",
      `name says "${word}" — a name names a voice or a genre, never a vertical, a function, an audience, or an organization type`,
    )
  }

  return problems
}

/** True when a story passes every cap and every rule. */
export function isValidDesignStory(story: DesignStory): boolean {
  return validateDesignStory(story).length === 0
}

// ── the naming rule ────────────────────────────────────────────────────────

/**
 * Words a name may not be built from.
 *
 * The rule is one sentence: **a name names a voice or a genre, never a
 * vertical, a function, an audience, or an organization type.** All four of
 * those lock an object to one customer while what it actually sells is a way
 * of speaking — the report voice that opens with its conclusion serves a
 * hospital board as well as a bank, so `Brief` is a name and
 * `Business Consulting` is a fence.
 *
 * So the list holds more than industries by design: `enterprise` is an
 * organization type, `kids` and `academic` are audiences, `marketing` is a
 * function, `startup` is a company stage, `esg` is a reporting framework.
 * Each one answers "who is this for" instead of "how does this sound".
 *
 * Words that name a form, a venue, or a craft — runway, museum, playbill,
 * ledger, clinic, almanac, homeroom — are deliberately absent. A clinic is a
 * room with a manner of speaking, the way a museum is. Healthcare is the
 * industry that happens to work in one.
 *
 * The list is about the *name*. All of these are welcome in `positioning`,
 * in `audience`, and in a theme's occasions, which is where a story says who
 * a voice happens to suit rather than who owns it.
 */
export const FORBIDDEN_NAME_WORDS: readonly string[] = [
  // Verticals.
  "accounting",
  "advertising",
  "aerospace",
  "agriculture",
  "asset management",
  "automotive",
  "aviation",
  "banking",
  "biotech",
  "construction",
  "consulting",
  "consultancy",
  "consultant",
  "cybersecurity",
  "defense",
  "ecommerce",
  "e commerce",
  "education",
  "energy",
  "esports",
  "entertainment",
  "fashion",
  "finance",
  "financial",
  "fintech",
  "food and beverage",
  "gaming",
  "healthcare",
  "hospitality",
  "insurance",
  "legal",
  "law firm",
  "life science",
  "logistics",
  "luxury",
  "manufacturing",
  "maritime",
  "media",
  "medical",
  "medicine",
  "mining",
  "oil and gas",
  "pharma",
  "pharmaceutical",
  "publishing",
  "real estate",
  "realty",
  "recruitment",
  "retail",
  "saas",
  "semiconductor",
  "shipping",
  "sports",
  "staffing",
  "tech",
  "technology",
  "telecom",
  "tourism",
  "transportation",
  "utilities",
  "wealth management",
  // Functions and practices.
  "business",
  "consumer goods",
  "esg",
  "marketing",
  "sustainability",
  // Audiences and organization types.
  "academic",
  "academia",
  "classroom",
  "enterprise",
  "government",
  "health",
  "kids",
  "municipal",
  "nonprofit",
  "public sector",
  "startup",
]

/**
 * The same rule in Chinese, matched as text rather than as words because
 * Chinese writes no spaces between them. Kept in step with the list above —
 * a translated name is checked by the same rule as the name it translates.
 */
export const FORBIDDEN_NAME_WORDS_ZH: readonly string[] = [
  "会计",
  "广告",
  "航天",
  "农业",
  "汽车",
  "航空",
  "银行",
  "生物科技",
  "建筑",
  "咨询",
  "网络安全",
  "国防",
  "电商",
  "教育",
  "教室",
  "课堂",
  "能源",
  "电竞",
  "娱乐",
  "时尚",
  "金融",
  "财务",
  "金融科技",
  "食品",
  "饮料",
  "游戏",
  "医疗",
  "酒店",
  "餐饮",
  "保险",
  "法律",
  "生命科学",
  "物流",
  "奢侈",
  "制造",
  "航运",
  "媒体",
  "医药",
  "矿业",
  "石油",
  "天然气",
  "制药",
  "出版",
  "房地产",
  "房产",
  "地产",
  "招聘",
  "零售",
  "软件服务",
  "半导体",
  "体育",
  "科技",
  "电信",
  "通信",
  "旅游",
  "运输",
  "公用事业",
  "消费品",
  "环保",
  "可持续",
  "营销",
  "学术",
  "儿童",
  "企业",
  "政务",
  "公共部门",
  "市政",
  "非营利",
  "公益",
  "健康",
  "初创",
  "创业",
]

/**
 * Maintainer vocabulary. A story that says any of these has stopped being
 * product copy and started describing the machine, which is the one thing
 * the contract asks it never to do. Whole words, case-insensitive, and
 * unforgiving on purpose: "a brand that needs a face" reads fine to a person
 * and reads as a layout to anyone who works here, and a name for a human
 * expression is always available. Singular forms only — both the prose and
 * this list are singularized before they are compared, so "faces" is caught
 * by "face".
 */
export const MAINTAINER_WORDS: readonly string[] = ["face", "layout", "renderer", "component", "ir", "slot"]

/**
 * Fold a name down to the tokens the rule compares.
 *
 * Separators of every kind become spaces, runs of whitespace collapse, and
 * each token is singularized by a small controlled set of English rules, so
 * `e_commerce`, `real--estate`, `Technologies` and `life sciences` all land
 * on the entry that names them instead of needing an entry each.
 */
function nameTokens(text: string): readonly string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token !== "")
    .map(singularize)
}

/** Controlled singularization. Deliberately small — it runs on both sides of the comparison. */
function singularize(token: string): string {
  if (token.length <= 3) return token
  if (token.endsWith("ies")) return `${token.slice(0, -3)}y`
  if (/(?:s|x|z|ch|sh)es$/.test(token)) return token.slice(0, -2)
  if (token.endsWith("ss")) return token
  if (token.endsWith("s")) return token.slice(0, -1)
  return token
}

function containsSequence(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0) return false
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    if (needle.every((token, j) => haystack[i + j] === token)) return true
  }
  return false
}

/**
 * Every forbidden word a name says, in list order. Use it on names, labels,
 * and ids — never on positioning or audience, where a vertical or an
 * audience is legitimate.
 */
export function findForbiddenNameWords(text: string): readonly string[] {
  const tokens = nameTokens(text)
  const latin = FORBIDDEN_NAME_WORDS.filter((word) => containsSequence(tokens, nameTokens(word)))
  const zh = FORBIDDEN_NAME_WORDS_ZH.filter((word) => text.includes(word))
  return [...latin, ...zh]
}

/** Every maintainer word a piece of prose says, in list order. */
export function findMaintainerWords(text: string): readonly string[] {
  const tokens = new Set(nameTokens(text))
  return MAINTAINER_WORDS.filter((word) => tokens.has(singularize(word)))
}
