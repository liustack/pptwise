/**
 * The per-face sample slides the registry scans render.
 *
 * Until this file existed the scans in `scan.tsx` fed every face the same
 * generic page: an empty `components` array on boundary pages, one shared
 * heading, one shared meta block. That input never reaches the branches a
 * face draws for real content — the three scored rows of `scorecard-ending`,
 * the CTA plate of `pill-cta-ending`, the emphasis runs a theme turns into a
 * `path`. A review of the deduplication that deleted the 74 per-file copies
 * showed the shared fixture passing while a deliberate mutation inside one of
 * those branches went unnoticed.
 *
 * So the input each of those 74 faces was tested with is registered here,
 * verbatim: its slide list, the index of the page under test, the deck meta
 * and branding posture the face reads, and any params its test passed. Three
 * faces ran their two checks on two different pages, so both are registered.
 * `face-scan.test.tsx` renders every entry against all 24 canonical themes,
 * which restores the 1,776 face x theme combinations the per-file copies used
 * to cover.
 *
 * A face with no entry here falls back to the generic sample in `scan.tsx`,
 * marked `generic`, and is scanned all the same.
 */

import type { SvgTemplateProps } from "../types"
import type { PptxIR, Slide } from "@/ir"

/** Where a sample came from: a deleted per-face test, or the shared filler. */
export type FaceSampleOrigin = "legacy" | "generic"

export interface FaceSampleInput {
  /** Registry id of the face this sample was written for. */
  readonly id: string
  /**
   * Which of a face's samples this is, when its deleted test checked more
   * than one input. `corner-wedge` ran its subset sweep with no `params` and
   * its determinism check with fixed ones; `close-word-ending` and
   * `gilt-word-ending` swept a plain heading and pinned an emphasised one.
   * Both inputs are registered, and both are scanned on all 24 themes.
   */
  readonly variant?: string
  readonly slideType: Slide["type"]
  /** Which slide of `slides` is the page under test. */
  readonly index: number
  readonly meta: PptxIR["meta"]
  /**
   * The deck-level branding posture the original IR carried.
   *
   * It is a render switch, not decoration: `showsDocumentMeta` resolves an
   * omitted value to `cover-only`, which leaves the date off the canvas
   * however full `meta` is, and without a `footer` an omitted posture asks
   * for no confidentiality mark either. Four covers declared `"full"` and
   * drew a date line because of it.
   */
  readonly branding?: PptxIR["branding"]
  readonly slides: readonly Slide[]
  /**
   * Where the face's `params` come from, when it takes any.
   *
   * `verdict-index`'s deleted helper defaulted the prop to
   * `tokens.shape?.[type]`, the theme's own constructor knobs for that page
   * type — which is how it gets brief's `verdictFootRule` and the `line`
   * that rule draws. Every other deleted helper either passed nothing or
   * passed a literal, registered as `params` below.
   */
  readonly paramsSource?: "theme-shape"
  /** Fixed `params`, for a sample whose test passed a literal. */
  readonly params?: SvgTemplateProps["params"]
  /**
   * Text the render must still contain, for a sample whose original test
   * proved a branch by the words it printed.
   */
  readonly requiredText?: readonly string[]
  /**
   * A theme whose palette this face must not bake in.
   *
   * The deleted test swept all 24 themes asserting that under any theme but
   * `ownerTheme` none of `hexes` appears. A legal hex from the wrong theme
   * passes every other check in this scan, so it is carried here.
   */
  readonly forbiddenHex?: {
    readonly ownerTheme: string
    readonly hexes: readonly string[]
  }
}

/**
 * One entry per input a face was checked with before the deduplication: one
 * for each of the 74 faces that owned a determinism and a subset check, plus
 * a second for the three whose two checks did not render the same page.
 */
export const LEGACY_FACE_SAMPLES = [
  {
    id: "block-numeral-chapter",
    slideType: "chapter",
    index: 0,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "门店与运营",
        components: [],
        subheading: "门店焕新 · 自有品牌 · 会员体系",
      },
      {
        type: "chapter",
        heading: "商品与供应链",
        components: [],
      },
      {
        type: "chapter",
        heading: "会员与增长",
        components: [],
      },
      {
        type: "chapter",
        heading: "组织与机制",
        components: [],
      },
    ],
  },
  {
    id: "decimal-index-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "治理与合规",
        subheading: "董事会构成 · 审计安排 · 利益冲突申报",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "现状",
        components: [],
      },
      {
        type: "chapter",
        heading: "治理与合规",
        subheading: "董事会构成 · 审计安排 · 利益冲突申报",
        components: [],
      },
    ],
  },
  {
    id: "fascicle-ghost-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "三种活法",
        subheading: "夫妻店 · 加盟店 · 本地连锁，各自的账各自的命",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "现状",
        components: [],
      },
      {
        type: "chapter",
        heading: "三种活法",
        subheading: "夫妻店 · 加盟店 · 本地连锁，各自的账各自的命",
        components: [],
      },
    ],
  },
  {
    id: "field-band-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "牧场的水与土",
        subheading: "节水灌溉 · 粪肥还田 · 土壤有机质三年计划",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "现状",
        components: [],
      },
      {
        type: "chapter",
        heading: "牧场的水与土",
        subheading: "节水灌溉 · 粪肥还田 · 土壤有机质三年计划",
        components: [],
      },
    ],
  },
  {
    id: "ghost-section-chapter",
    slideType: "chapter",
    index: 0,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "收入结构在换血",
        subheading: "订阅占比 · 客单结构 · 续约质量",
        components: [],
      },
    ],
  },
  {
    id: "issue-line-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "海外仓：自建还是租",
        subheading: "涉及资金 ¥4,200 万 · 需今日拍板",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "现状",
        components: [],
      },
      {
        type: "chapter",
        heading: "海外仓：自建还是租",
        subheading: "涉及资金 ¥4,200 万 · 需今日拍板",
        components: [],
      },
    ],
  },
  {
    id: "seal-numeral-chapter",
    slideType: "chapter",
    index: 1,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "开篇：通办入口",
        subheading: "报表精简 · 系统合并 · 数据只填一次",
        components: [],
      },
      {
        type: "chapter",
        heading: "基层减负：把表格砍下来",
        subheading: "报表精简 · 系统合并 · 数据只填一次",
        components: [],
      },
      {
        type: "chapter",
        heading: "数据只填一次",
        subheading: "报表精简 · 系统合并 · 数据只填一次",
        components: [],
      },
      {
        type: "chapter",
        heading: "窗口通办",
        subheading: "报表精简 · 系统合并 · 数据只填一次",
        components: [],
      },
    ],
  },
  {
    id: "subject-rule-chapter",
    slideType: "chapter",
    index: 4,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "概述",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "现状",
        components: [],
      },
      {
        type: "chapter",
        heading: "分层",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "现状",
        components: [],
      },
      {
        type: "chapter",
        heading: "代谢三高：最该管的一群人",
        subheading: "检出率 · 年龄分布 · 干预路径",
        components: [],
      },
    ],
  },
  {
    id: "ikb-field-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "星桥零售集团 · 集团经营部",
    },
    slides: [
      {
        type: "cover",
        heading: "二〇二六年第二季度业务评审",
        subheading: "连锁零售业务的增长质量与下半年投入方向",
        components: [],
      },
    ],
  },
  {
    id: "institutional-block",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "CloudSeek Institutional Review",
      date: "2026-08-22",
      confidentiality: "internal",
      version: "v1",
      authors: [
        {
          name: "战略与运营部",
          role: "GRID 12",
        },
      ],
    },
    slides: [
      {
        type: "cover",
        heading: "季度机构评审",
        components: [],
      },
    ],
  },
  {
    id: "red-head-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "市数字政务服务中心",
      date: "二〇二六年七月",
      authors: [
        {
          name: "政务服务工作专班",
        },
      ],
    },
    slides: [
      {
        type: "cover",
        heading: "二〇二六年上半年工作汇报",
        subheading: "「一网通办」深化与基层减负专项",
        components: [],
      },
    ],
  },
  {
    id: "stat-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "云觅科技",
      date: "2026 Q2",
      authors: [
        {
          name: "经营分析部",
          role: "评审",
        },
      ],
      version: "v1.0",
    },
    slides: [
      {
        type: "cover",
        heading: "+34%",
        subheading: "增长的质量，比增长本身更值得看",
        components: [],
      },
    ],
  },
  {
    id: "close-word-ending",
    variant: "plain-heading",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "数字都在牌面上，下一季看兑现。",
        subheading: "附录与数据口径备查 · 经营分析部",
        components: [],
      },
    ],
  },
  {
    id: "close-word-ending",
    variant: "marked-heading",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "数字都在牌面上，下一季看**兑现**。",
        subheading: "附录与数据口径备查 · 经营分析部",
        components: [],
      },
    ],
  },
  {
    id: "deliberation-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "下半年三项安排",
        subheading: "以上汇报，请结合各地实际推进",
        components: [
          {
            type: "bullets",
            items: [
              "一、高频事项「免申即享」再扩五十项",
              "二、区级窗口「全市通办」年内全覆盖",
              "三、政务数据目录第三轮归集",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "resolution-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "本轮三条",
        subheading: "存档规范委员会",
        components: [
          {
            type: "bullets",
            items: [
              "品牌规范 v3 通过，十月一日生效",
              "旧版模板十二月底前全部下线",
              "例外申请一律走规范委员会",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "signoff-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "集团经营部",
    },
    slides: [
      {
        type: "ending",
        heading: "三件事，下周一前回签",
        components: [],
      },
    ],
  },
] as unknown as readonly FaceSampleInput[]

/** Legacy samples by face id, in registration order, for the scans to look up. */
export const LEGACY_FACE_SAMPLES_BY_ID: ReadonlyMap<string, readonly FaceSampleInput[]> = LEGACY_FACE_SAMPLES.reduce(
  (byId, sample) => byId.set(sample.id, [...(byId.get(sample.id) ?? []), sample]),
  new Map<string, FaceSampleInput[]>(),
)
