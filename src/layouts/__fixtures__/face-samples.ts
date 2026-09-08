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
 * verbatim: its slide list, the index of the page under test, and the deck
 * meta and branding posture the face reads. `face-scan.test.tsx` renders every entry against all
 * 24 canonical themes, which restores the 1,776 face x theme combinations the
 * per-file copies used to cover.
 *
 * A face with no entry here falls back to the generic sample in `scan.tsx`,
 * marked `generic`, and is scanned all the same.
 */

import type { PptxIR, Slide } from "@/ir"

/** Where a sample came from: a deleted per-face test, or the shared filler. */
export type FaceSampleOrigin = "legacy" | "generic"

export interface FaceSampleInput {
  /** Registry id of the face this sample was written for. */
  readonly id: string
  readonly slideType: Slide["type"]
  /** Which slide of `slides` is the page under test. */
  readonly index: number
  readonly meta: PptxIR["meta"]
  /**
   * The deck-level branding posture the original IR carried.
   *
   * It is a render switch, not decoration: `showsDocumentMeta` resolves an
   * omitted value to `cover-only`, which leaves date and confidentiality off
   * the canvas however full `meta` is. Four covers declared `"full"` and drew
   * a date line because of it.
   */
  readonly branding?: PptxIR["branding"]
  readonly slides: readonly Slide[]
  /**
   * Where the face's `params` come from, when it takes any.
   *
   * Two of the deleted tests defaulted the prop to `tokens.shape?.[type]`,
   * the theme's own constructor knobs for that page type — which is how
   * `verdict-index` gets brief's `verdictFootRule` and the `line` that rule
   * draws. The other 72 passed no params at all, and neither does the scan.
   */
  readonly paramsSource?: "theme-shape"
  /**
   * Text the render must still contain, for a sample whose original test
   * proved a branch by the words it printed.
   */
  readonly requiredText?: readonly string[]
}

/**
 * One entry per face that owned a determinism and a subset check before the
 * deduplication, carrying that check's exact input.
 */
export const LEGACY_FACE_SAMPLES = [
  {
    id: "act-chapter",
    slideType: "chapter",
    index: 0,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "内容打法",
        subheading: "短视频 · 直播 · 案例长文的分工",
        components: [],
      },
    ],
  },
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
    id: "chalk-rule-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "开场",
        components: [],
      },
      {
        type: "chapter",
        heading: "铺垫",
        components: [],
      },
      {
        type: "chapter",
        heading: "囚徒困境与重复博弈",
        subheading: "为什么背叛是理性的，合作却真实存在",
        components: [],
      },
    ],
  },
  {
    id: "day-bill-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "开场",
        subheading: "午后两点开闸 · 三个舞台 · 十一组演出",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "阵容",
        components: [],
      },
      {
        type: "chapter",
        heading: "野台不散场",
        subheading: "午后两点开闸 · 三个舞台 · 十一组演出",
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
    id: "ember-index-chapter",
    slideType: "chapter",
    index: 0,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "凭什么是我们",
        subheading: "数据壁垒 · 选品命中率 · 成本结构",
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
    id: "folio-ghost-chapter",
    slideType: "chapter",
    index: 4,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "模型设计与求解",
        subheading: "时空图构建 · 注意力聚合 · 复杂度分析",
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
        heading: "模型设计与求解",
        subheading: "时空图构建 · 注意力聚合 · 复杂度分析",
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
        heading: "模型设计与求解",
        subheading: "时空图构建 · 注意力聚合 · 复杂度分析",
        components: [],
      },
    ],
  },
  {
    id: "ghost-rule-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "加盟模式的三处手术",
        subheading: "小店型单店模型 · 督导线上化 · 县域直配",
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
        heading: "加盟模式的三处手术",
        subheading: "小店型单店模型 · 督导线上化 · 县域直配",
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
    id: "gilt-ordinal-chapter",
    slideType: "chapter",
    index: 1,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "开篇",
        components: [],
      },
      {
        type: "chapter",
        heading: "今 年 的 谢 意",
        components: [],
      },
    ],
  },
  {
    id: "hall-label-chapter",
    slideType: "chapter",
    index: 1,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "开篇",
        subheading: "鼎 · 簋 · 尊：数量即身份",
        components: [],
      },
      {
        type: "chapter",
        heading: "礼器的秩序",
        subheading: "鼎 · 簋 · 尊：数量即身份",
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
    id: "lesson-box-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "引入",
        subheading: "开口方向",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "例题",
        components: [],
      },
      {
        type: "chapter",
        heading: "动手画一画",
        subheading: "同一坐标系里画出三条抛物线，观察 a 的作用",
        components: [],
      },
    ],
  },
  {
    id: "look-range-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "夜的针脚",
        subheading: "羊绒 · 漆皮 · 一条贯穿全组的**红线**",
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
        heading: "夜的针脚",
        subheading: "羊绒 · 漆皮 · 一条贯穿全组的**红线**",
        components: [],
      },
    ],
  },
  {
    id: "mirror-volume-chapter",
    slideType: "chapter",
    index: 1,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "开篇",
        subheading: "从七位先生到三万八千名毕业生",
        components: [],
      },
      {
        type: "chapter",
        heading: "传承篇",
        subheading: "从七位先生到三万八千名毕业生",
        components: [],
      },
    ],
  },
  {
    id: "one-word-chapter",
    slideType: "chapter",
    index: 1,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "开篇",
        subheading: "快，是一种诚意",
        components: [],
      },
      {
        type: "chapter",
        heading: "性能",
        subheading: "快，是一种诚意",
        components: [],
      },
    ],
  },
  {
    id: "round-mark-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "流量在哪里",
        subheading: "直播峰值 · 短视频二创 · 城市线下人流",
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
        heading: "流量在哪里",
        subheading: "直播峰值 · 短视频二创 · 城市线下人流",
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
    id: "sticker-numeral-chapter",
    slideType: "chapter",
    index: 1,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "开场",
        components: [],
        subheading: "问好",
      },
      {
        type: "chapter",
        heading: "孩子们的新本领",
        components: [],
        subheading: "自己吃饭 · 排队洗手 · 会说「我来帮你」",
      },
    ],
  },
  {
    id: "stroke-index-chapter",
    slideType: "chapter",
    index: 4,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "召回为什么要拆三层",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "中间页",
        components: [],
      },
      {
        type: "chapter",
        heading: "特征回流怎么压延迟",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "中间页",
        components: [],
      },
      {
        type: "chapter",
        heading: "推理为什么敢上主站",
        subheading: "特征回流 · 边缘缓存 · 降级策略",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "中间页",
        components: [],
      },
      {
        type: "chapter",
        heading: "发布窗口",
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
    id: "volume-slip-chapter",
    slideType: "chapter",
    index: 2,
    meta: {},
    slides: [
      {
        type: "chapter",
        heading: "舟楫往来处",
        subheading: "水路即商路：从「夜泊」读宋人的流动",
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
        heading: "舟楫往来处",
        subheading: "水路即商路：从「夜泊」读宋人的流动",
        components: [],
      },
    ],
  },
  {
    id: "band-title",
    slideType: "cover",
    index: 0,
    branding: "full",
    requiredText: ["Internal · 2026 年 7 月"],
    meta: {
      organization: "云觅科技 · 战略与运营部",
      authors: [
        {
          name: "陈砚清",
          role: "首席技术官",
        },
      ],
      date: "2026 年 7 月",
      confidentiality: "internal",
    },
    slides: [
      {
        type: "cover",
        heading: "云觅科技 2026 年第二季度业务评审",
        subheading: "工作区席位订阅业务的增长质量与下半年投入方向",
        components: [],
      },
    ],
  },
  {
    id: "bill-head",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "城市青年戏剧节 · 主单元",
      date: "9.20—28",
    },
    slides: [
      {
        type: "cover",
        heading: "开演前十分钟",
        subheading: "RIVERSIDE WAREHOUSE",
        components: [],
      },
    ],
  },
  {
    id: "board-head",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "INTRO TO MACHINE LEARNING · LECTURE III",
      authors: [
        {
          name: "chalk · board · dusk",
        },
      ],
    },
    slides: [
      {
        type: "cover",
        heading: "反向传播",
        subheading: "梯度是什么，从哪来，到哪去",
        components: [],
      },
    ],
  },
  {
    id: "capsule-open-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "小海豚班 · 二〇二六年秋季",
      date: "19:00 小礼堂",
    },
    slides: [
      {
        type: "cover",
        heading: "家长会，开啦",
        subheading: "这学期孩子们长大了多少，我们一件一件讲",
        components: [],
      },
    ],
  },
  {
    id: "chalk-band-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "高一数学 · 必修一",
      authors: [
        {
          name: "程雨桐",
          role: "明澜中学",
        },
      ],
      date: "第 3 课时 · 共 4 课时 · **本节重点：顶点式**",
    },
    slides: [
      {
        type: "cover",
        heading: "二次函数的图像与性质",
        subheading: "从一张抛物线，读出开口、顶点和对称轴",
        components: [],
      },
    ],
  },
  {
    id: "colophon",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "云帆科技",
      date: "2026-08-15",
      confidentiality: "internal",
      version: "v1.2",
    },
    slides: [
      {
        type: "cover",
        heading: "二季度经营回顾",
        subheading: "收入、成本与下季度重点",
        components: [],
      },
    ],
  },
  {
    id: "corner-wedge",
    slideType: "cover",
    paramsSource: "theme-shape",
    index: 0,
    meta: {
      organization: "云觅电竞 · 赛事运营部",
      authors: [
        {
          name: "陈砚清",
          role: "首席技术官",
        },
      ],
    },
    slides: [
      {
        type: "cover",
        heading: "巅峰之夜",
        subheading: "八强出炉 · 决赛日程与观赛指南",
        components: [],
      },
    ],
  },
  {
    id: "cut-panel-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "星环杯 · 城市邀请赛",
      date: "2026.10 - 2027.01",
    },
    slides: [
      {
        type: "cover",
        heading: "S3 点火",
        subheading: "八城海选 · 十六强线下 · 总决赛主场馆",
        components: [],
      },
    ],
  },
  {
    id: "double-frame-cover",
    slideType: "cover",
    index: 0,
    branding: "full",
    requiredText: ["一九〇六 · 二〇二六"],
    meta: {
      organization: "明川大学建校一百二十周年",
      date: "一九〇六 · 二〇二六",
      authors: [
        {
          name: "校庆筹备委员会",
          role: "谨制",
        },
      ],
    },
    slides: [
      {
        type: "cover",
        heading: "百廿明川",
        components: [],
      },
    ],
  },
  {
    id: "header-band",
    slideType: "cover",
    index: 0,
    branding: "full",
    requiredText: ["2026 春"],
    meta: {
      organization: "星芽美术 · 春季招生",
      authors: [
        {
          name: "周老师",
          role: "教学主管",
        },
      ],
      date: "2026 春",
    },
    slides: [
      {
        type: "cover",
        heading: "每个孩子都能画出自己的星球",
        subheading: "星芽美术 4-12 岁分龄课程体系 · 春季班报名开放",
        components: [],
      },
    ],
  },
  {
    id: "horizon-wedge",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "云觅科技 · 战略与运营部",
      authors: [
        {
          name: "陈砚清",
          role: "首席技术官",
        },
      ],
    },
    slides: [
      {
        type: "cover",
        heading: "云觅科技 2026 年第二季度业务评审",
        subheading: "工作区席位订阅业务的增长质量与下半年投入方向",
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
    id: "invitation-plate-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "璟园 · 岁末答谢",
      date: "二零二六",
      authors: [
        {
          name: "礼宾处",
        },
      ],
    },
    slides: [
      {
        type: "cover",
        heading: "致一百位挚友",
        subheading: "十二月十九日 · 晚七时 · 湖畔宅邸",
        components: [],
      },
    ],
  },
  {
    id: "issue-head-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "观潮",
      date: "2026-08-15",
      authors: [
        {
          name: "消费组",
        },
      ],
    },
    slides: [
      {
        type: "cover",
        heading: "县城咖啡的第二个春天",
        subheading: "九个县、四十家店、三种活法：一线打法在县城为何失灵",
        components: [],
      },
    ],
  },
  {
    id: "lookbook-open-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "ECHO",
      date: "AW 2027 · 买手订货会",
    },
    slides: [
      {
        type: "cover",
        heading: "回声，穿在身上",
        subheading: "秋冬系列 · 三十六个 look · 九月十日 上海",
        components: [],
      },
    ],
  },
  {
    id: "memo-head",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "STRATEGY & OPERATIONS",
    },
    slides: [
      {
        type: "cover",
        heading: "关于下半年交付侧投入的决定",
        subheading: "This is a decision, not a discussion.",
        components: [],
      },
    ],
  },
  {
    id: "paper-masthead",
    slideType: "cover",
    index: 0,
    branding: "full",
    requiredText: ["二〇二六年七月"],
    meta: {
      organization: "CLOUDSEEK COLLABORATION · Q2 REVIEW",
      authors: [
        {
          name: "陈砚清",
          role: "首席技术官",
        },
      ],
      date: "2026-07",
      version: "v1.0",
    },
    slides: [
      {
        type: "cover",
        heading: "云觅科技季度评审",
        subheading: "工作区席位订阅业务的增长质量与下半年投入方向",
        components: [],
      },
    ],
  },
  {
    id: "pledge-open-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "绿洲乳业 · 可持续发展中期报告",
      date: "二〇二六年中期 · ESG 委员会",
    },
    slides: [
      {
        type: "cover",
        heading: "每一杯奶的碳账，\n今年起**对外公开**",
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
    id: "report-open-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "安和健康 · 企业健康管理",
      authors: [
        {
          name: "健康管理中心",
        },
      ],
      date: "二〇二六年八月",
    },
    slides: [
      {
        type: "cover",
        heading: "星桥集团员工健康年报",
        subheading: "2,340 人年度体检的解读与干预建议",
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
    id: "thesis-plate-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "城市数据科学实验室",
      authors: [
        {
          name: "沈知远",
        },
        {
          name: "闻一鸣",
          role: "教授",
          org: "交通工程系",
        },
      ],
      date: "二〇二六年六月",
    },
    slides: [
      {
        type: "cover",
        heading: "基于图神经网络的城市交通流短时预测研究",
        components: [],
      },
    ],
  },
  {
    id: "type-rule-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "白帆科技 · 技术白皮书",
      authors: [
        {
          name: "平台架构组",
          role: "架构",
        },
      ],
      version: "v3.0",
    },
    slides: [
      {
        type: "cover",
        heading: "推荐引擎 3.0",
        subheading: "从热度榜到实时个性化的架构演进",
        components: [],
      },
    ],
  },
  {
    id: "verdict-index",
    slideType: "cover",
    paramsSource: "theme-shape",
    index: 0,
    meta: {
      organization: "云觅科技 · 战略与运营部",
      authors: [
        {
          name: "陈砚清",
          role: "首席技术官",
        },
      ],
      version: "v1.0",
    },
    slides: [
      {
        type: "cover",
        heading: "工作区订阅增长优质，下半年应加倍投入交付侧",
        subheading: "云觅科技 2026 年第二季度业务评审 · 三个论据支撑，附敏感性分析",
        components: [],
      },
    ],
  },
  {
    id: "vertical-title-cover",
    slideType: "cover",
    index: 0,
    meta: {
      organization: "听雨书院 · 秋季雅集第四讲",
    },
    slides: [
      {
        type: "cover",
        heading: "宋词里的江南",
        subheading: "烟雨 · 舟楫 · 灯火",
        components: [],
      },
    ],
  },
  {
    id: "action-pad-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "霁川咨询",
      authors: [
        {
          name: "零售消费组",
        },
      ],
    },
    slides: [
      {
        type: "ending",
        heading: "九月三城再开十家小店型\n十月上线加盟督导系统\n年底跑通县域直配",
        subheading: "本周定人定责",
        components: [],
      },
    ],
  },
  {
    id: "afterword-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "观潮",
      authors: [
        {
          name: "消费组",
        },
      ],
    },
    slides: [
      {
        type: "ending",
        heading: "县城不缺咖啡，缺的是\n把一家店开成十年的耐心。",
        subheading: "社区食堂，是生意还是公益",
        components: [],
      },
    ],
  },
  {
    id: "ask-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "我们在募 **3000 万**，用来把数据源扩三倍。",
        subheading: "18 个月 · 覆盖六大类目 · 现金流转正",
        components: [],
      },
    ],
  },
  {
    id: "care-plan-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "下一步，我们建议这样做",
        subheading: "个体报告已发至本人，集体数据仅呈人力资源部",
        components: [
          {
            type: "bullets",
            items: [
              "三高人群分层随访，高危组季度复查",
              "食堂营养标签九月上线",
              "久坐岗位工间操试点两个楼层",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "close-word-ending",
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
    id: "decision-close-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "海外仓",
        subheading: "拟稿：运营部 · 审定：总经理办公会\n抄送：财务部 · 供应链部 · 二〇二六年八月二十三日",
        components: [
          {
            type: "bullets",
            items: [
              "一、华东仓续租两年，锁定现价",
              "二、华南自建缓行，明年一季度复议",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "defense-close-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "一、时空注意力使 15 分钟预测误差下降 12.6%\n二、稀疏路网上的泛化性优于三类基线\n三、推理开销满足路侧设备实时性约束",
        subheading: "欢迎讨论与指正",
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
    id: "exit-word-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "市博物馆",
      date: "2026-09-01",
    },
    slides: [
      {
        type: "ending",
        heading: "三千年前的秩序，看完了。",
        subheading: "出口右转 · 特展图录与纹样文创 · 盖章处在服务台",
        components: [],
      },
    ],
  },
  {
    id: "gilt-word-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "璟园",
      authors: [
        {
          name: "礼宾处",
        },
      ],
    },
    slides: [
      {
        type: "ending",
        heading: "这一年最好的作品，\n是与各位的**交情**。",
        components: [],
      },
    ],
  },
  {
    id: "homework-close-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "把 y = x² - 4x + 3 化成顶点式并画图\n判断开口方向与对称轴\n预习：抛物线与 x 轴的交点",
        subheading: "明天随堂小测：顶点式互化，十分钟",
        components: [],
      },
    ],
  },
  {
    id: "invite-field-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "校庆筹备委员会",
    },
    slides: [
      {
        type: "ending",
        heading: "十月十日，回明川看看",
        subheading: "庆典大会 · 院系开放日 · 老照片展 · 校友晚宴",
        components: [],
      },
    ],
  },
  {
    id: "next-lecture-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "课后",
        subheading: "下一讲 · 信号与承诺：怎么让威胁可信",
        components: [
          {
            type: "bullets",
            items: [
              "读：《合作的进化》第一、二章",
              "做：习题册 3.1 - 3.4，下周三前交",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "pill-cta-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "九月一日，全渠道开闸",
        subheading: "各渠道负责人本周五前交排期表",
        components: [
          {
            type: "bullets",
            items: [
              "进战役群对齐",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "release-close-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "白帆开发者大会",
      date: "2026",
      contact: {
        website: "whitesail.dev/engine3",
        name: "unused",
      },
    },
    slides: [
      {
        type: "ending",
        heading: "今天，开放下载",
        subheading: "do-not-use.example",
        components: [],
      },
    ],
  },
  {
    id: "reminder-list-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "回家前，记三件小事",
        subheading: "有任何问题，随时来找李老师和王老师",
        components: [
          {
            type: "bullets",
            items: [
              "换季衣物周五前带来，绣好名字",
              "下周三秋游，鞋要好走路",
              "每晚一个绘本故事，十分钟就够",
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
    id: "rule-close-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "平台架构组",
      contact: {
        name: "RFC",
        email: "arch@example.com",
      },
    },
    slides: [
      {
        type: "ending",
        heading: "架构已经就位，下一步是把它扛过大促。",
        components: [],
      },
    ],
  },
  {
    id: "scorecard-ending",
    slideType: "ending",
    index: 0,
    meta: {},
    slides: [
      {
        type: "ending",
        heading: "对表 2030，我们走到哪了",
        subheading: "全部口径经第三方鉴证 · 附录列鉴证声明",
        components: [
          {
            type: "bullets",
            items: [
              "碳强度较基准年 **-18%**（目标 -40%）",
              "绿电占比 **34%**（目标 60%）",
              "包装可回收率 **71%**（目标 100%）",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "seal-close-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "听雨书院",
    },
    slides: [
      {
        type: "ending",
        heading: "词读完了，雨还没停。",
        subheading: "下一讲 · 灯火：夜市与词中的人间",
        components: [],
      },
    ],
  },
  {
    id: "seat-cta-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "商务组",
      contact: {
        name: "预约席位",
        email: "biz@starloop.gg",
      },
    },
    slides: [
      {
        type: "ending",
        heading: "主赞助席位，只剩两个",
        subheading: "十月十五日海选开票前锁定，权益按 S2 实测数据对赌",
        components: [],
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
  {
    id: "ticket-cta-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "野台音乐节",
      contact: {
        name: "即刻入场",
      },
    },
    slides: [
      {
        type: "ending",
        heading: "开闸入场",
        subheading: "九月十日零点开售 · 售完即止",
        components: [],
      },
    ],
  },
  {
    id: "window-close-ending",
    slideType: "ending",
    index: 0,
    meta: {
      organization: "ECHO",
      contact: {
        email: "desk@example.com",
        name: "Showroom",
      },
    },
    slides: [
      {
        type: "ending",
        heading: "订货窗口，只开十天",
        subheading: "九月十日至十九日 · showroom 预约制",
        components: [],
      },
    ],
  },
] as unknown as readonly FaceSampleInput[]

/** Legacy sample by face id, for the scans to look up. */
export const LEGACY_FACE_SAMPLES_BY_ID: ReadonlyMap<string, FaceSampleInput> = new Map(
  LEGACY_FACE_SAMPLES.map((sample) => [sample.id, sample]),
)
