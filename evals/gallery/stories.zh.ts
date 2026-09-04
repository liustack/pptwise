import type { DesignStoryField } from "@/design-story"

/**
 * Chinese for the design cards, so a review sitting reads in the reviewer's
 * own language while the source copy stays English.
 *
 * Keyed by the same namespaced object id the manifest uses (`theme:swiss`,
 * `component:bullets`) and then by field, because translation arrives field
 * by field: the card falls back to the English of any field not listed here
 * and marks it 未译, which is what turns the gap into a work list instead of
 * a silent hole.
 *
 * `stories.zh.test.mts` holds the keys to objects that actually exist, so a
 * renamed theme takes its translation with it rather than leaving a row here
 * that no card will ever read.
 */
export const STORY_ZH: Readonly<Record<string, Partial<Record<DesignStoryField, string>>>> = {
  // The worked example. The other 23 themes and the components are the
  // translation batch — until then their cards read English under a 未译 tag.
  "theme:swiss": {
    name: "瑞士",
    story: "冷白底色，一道红色沿边压住，其余全是网格纪律。像一份没有什么要藏的机构年报封面。",
    positioning: "透明度报告、审计、政策通报——设计不该抢走对账目的注意力时选它。",
    audience: "基金会、机构或审计方，面向公众或理事会陈述。",
    notFor: "需要温度、庆祝气氛，或需要品牌个性登场的场合。",
    lineage: "机构在用的瑞士现代主义排版。",
  },
}
