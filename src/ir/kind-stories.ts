import type { DesignStory } from "../design-story"
import type { KIND_VALUES } from "./narrative-values"

/**
 * The design story of every content-page move, beside the vocabulary itself.
 *
 * A kind's story describes the rhetorical action the page performs: advance
 * an argument, set two things against each other, hand the floor to someone
 * else. `notFor` is where the vocabulary keeps itself honest, because the
 * pairs that get confused (points and list, data and fact, statement and
 * quote) each say so in the other's `notFor`.
 *
 * Public copy, in English at the source, the way every design story is.
 */
export const KIND_STORIES = {
  points: {
    name: "Points",
    story: "Reasoning laid out step by step, in an order that cannot be shuffled.",
    positioning: "Use it when the argument builds, and each line depends on the one before.",
    audience: "Listeners following a chain of thought.",
    notFor: "Items that are merely parallel, which belong in a list.",
  },
  list: {
    name: "List",
    story: "Parallel items set side by side, any order, each one complete on its own.",
    positioning: "Use it for options, features, criteria, or anything the audience will scan rather than follow.",
    audience: "Readers looking for the item that concerns them.",
    notFor: "Arguments with a sequence, which belong in points.",
  },
  comparison: {
    name: "Comparison",
    story: "Two sides placed against each other so the difference does the talking.",
    positioning: "Use it when the point is the contrast: before and after, us and them, option A and option B.",
    audience: "Deciders weighing alternatives.",
    notFor: "A single subject described from several angles.",
  },
  process: {
    name: "Process",
    story: "Steps with a direction: a sequence, a timeline, or a loop that comes back around.",
    positioning: "Use it when order and movement are the meaning: how something is made, when it happens, how it repeats.",
    audience: "People who need to know what comes next.",
    notFor: "Static structures or unordered collections.",
  },
  data: {
    name: "Data",
    story: "A set of numbers or a table takes the whole page, and the words only frame it.",
    positioning: "Use it when the evidence is quantitative and the audience should read the figures themselves.",
    audience: "Readers who trust numbers more than adjectives.",
    notFor: "A single headline number, which belongs in fact.",
  },
  photo: {
    name: "Photo",
    story: "The picture is the content, and everything else steps aside.",
    positioning: "Use it when an image says what a paragraph cannot: a product, a place, a person, a moment.",
    audience: "Anyone who came to see rather than read.",
    notFor: "Diagrams or screenshots that need annotation, which belong in evidence.",
  },
  statement: {
    name: "Statement",
    story: "One sentence of your own, set large enough to be the whole page.",
    positioning: "Use it for the claim you want remembered, at the turn of a story or at its end.",
    audience: "A room that needs one line to take home.",
    notFor: "Borrowed words, which belong in quote.",
  },
  quote: {
    name: "Quote",
    story: "Someone else's words, with their name under them.",
    positioning: "Use it when a voice other than yours carries the weight: a customer, an authority, a founder.",
    audience: "Listeners who will trust the source more than the speaker.",
    notFor: "Your own thesis, which belongs in statement.",
  },
  fact: {
    name: "Fact",
    story: "A single number so large it needs no chart.",
    positioning: "Use it when one figure is the whole story and the audience should feel its size before reading its label.",
    audience: "A room that will remember one number.",
    notFor: "Several figures at once, which belong in data.",
  },
  evidence: {
    name: "Evidence",
    story: "One assertion at the top, one exhibit below it: a chart, a screenshot, a table.",
    positioning: "Use it when a claim needs its proof on the same page, and only one proof.",
    audience: "Skeptics who want to see it.",
    notFor: "Pages with several exhibits or no claim.",
  },
  hierarchy: {
    name: "Hierarchy",
    story: "Layers, containment, or a center with its satellites.",
    positioning: "Use it when the meaning is structure: what sits inside what, what depends on what, what surrounds a core.",
    audience: "People who need the shape of a system before its details.",
    notFor: "Sequences or flat lists.",
  },
} as const satisfies Partial<Record<(typeof KIND_VALUES)[number], DesignStory>>

/**
 * Every kind carries a story today, so the lookup is total. It stays a
 * function rather than a bare record read so a caller written against it
 * keeps working if the vocabulary ever grows a kind before its copy is
 * written.
 */
export function kindStory(kind: (typeof KIND_VALUES)[number]): DesignStory | undefined {
  return KIND_STORIES[kind]
}
