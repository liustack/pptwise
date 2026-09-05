import type { Lexicon } from "../lexicon"

/**
 * ledger 原生选题：独立研究所的年度宏观策略发布。
 * 主角是三个判断和一套数据，语域是卖方策略会：
 * 观点先行、赔率讲清、错了认账。
 */
export const INSIGHT_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "枢机研究 2027 年度策略",
  deckSubtitle: "利率下行的第二年，钱开始学会挑剔",
  author: "枢机研究所 宏观组",
  date: "2026 年 12 月",

  chapters: ["去年判断复盘", "三个核心判断", "利率与流动性", "行业配置", "风险清单", "操作纪律"],

  headings: [
    "去年三个判断：对了两个半，错的那半最值钱",
    "**挑剔的钱**：流动性宽松不再等于普涨",
    "十年期利率中枢下移四十个基点的三重证据",
    "居民存款搬家的方向变了：先出海后入市",
    "制造业出海从抢单进入建厂深水区",
    "红利资产的拥挤度已到警戒线上沿",
    "算力叙事进入验证期，看订单不看愿景",
    "消费的分化不是降级，是账本重排",
    "黄金的定价权正在从利率转向信用",
    "三条主线之外，仓位不超过两成",
    "错误预案：如果通胀回来，第一周做什么",
    "每个季度末公开对账一次",
    "赔率比故事诚实",
  ],

  kickers: ["复盘", "判断", "利率", "配置", "风险", "纪律"],

  paragraph:
    "先交去年的账：三个年度判断，利率下行与出海韧性两个兑现，消费复苏节奏只对了一半，错的那一半写在附录第三页，一个字没删。今年的核心判断是一句话：流动性宽松的第二年，钱开始学会挑剔，宽松不再等于普涨，估值分化会大于指数波动。全年配置围绕三条主线展开，主线之外的仓位纪律是不超过两成，每季度末公开对账。",

  shortParagraph:
    "先交去年的账：三个判断兑现两个半，错的那半写在附录第三页，一个字没删。今年的核心判断是一句话：宽松的第二年，钱开始学会挑剔，宽松不再等于普涨，估值分化大于指数波动。配置围绕三条主线，主线之外仓位不超两成，每季度末公开对账。",

  sentences: [
    "去年策略的三个判断，两个兑现，一个部分兑现。",
    "十年期利率中枢预计下移四十个基点至百分之一点六。",
    "居民超额储蓄约十九万亿元，入市节奏取决于赚钱效应确认。",
    "制造业海外产能开工率首次超过订单增速。",
    "红利指数的机构持仓拥挤度升至历史九十二分位。",
    "算力板块的订单兑现率是明年最重要的单一变量。",
    "必选消费与服务消费的剪刀差扩大到七个百分点。",
    "黄金与实际利率的相关性降到十年最低。",
    "三条主线：出海制造、真订单算力、现金流消费。",
    "主线外仓位上限两成，触线强制再平衡。",
    "通胀回归情形下的第一周操作清单见风险章。",
    "季度对账报告固定在季末最后一个交易日发布。",
  ],

  bullets: [
    "宽松不再等于普涨",
    "利率中枢下移四十基点",
    "红利拥挤度九十二分位",
    "算力看订单不看愿景",
    "主线外仓位不超两成",
    "季度末公开对账",
  ],

  phrases: [
    "挑剔的钱",
    "估值分化",
    "存款搬家",
    "出海深水区",
    "拥挤度警戒",
    "订单兑现率",
    "账本重排",
    "信用定价",
    "主线纪律",
    "错误预案",
    "公开对账",
    "赔率思维",
  ],

  labels: [
    "利率",
    "汇率",
    "流动性",
    "出海制造",
    "算力",
    "红利",
    "消费",
    "黄金",
    "一季度",
    "二季度",
    "三季度",
    "四季度",
    "超配",
    "标配",
    "低配",
    "观察仓",
  ],

  strengths: ["判断可回溯且公开对账", "赔率框架穿越过两轮周期", "产业调研覆盖一手工厂", "错误预案先于观点发布"],
  weaknesses: ["海外数据依赖第三方", "组合只覆盖流动性资产", "小组仅七人扩容受限", "高频数据处理能力一般"],
  opportunities: ["机构客户对独立研究付费意愿上升", "出海企业一手数据可交换", "对账文化形成口碑壁垒", "衍生品工具扩容"],
  threats: ["一致预期快速抢跑", "地缘变量冲击基准情形", "监管对研报口径收紧", "大平台免费研究挤压"],

  stages: ["数据采集", "产业验证", "判断成形", "组合落地", "季度对账", "年度复盘"],
  periods: ["一季度", "二季度", "三季度", "四季度", "次年一季度"],
  periodAxis: "季度",
  segmentAxis: "资产",
  decision: "明年的仓位先放哪一头",
  levels: [
    { title: "看过的行业", value: "42", unit: "个" },
    { title: "调研过的", value: "26", unit: "个" },
    { title: "建了模型的", value: "14", unit: "个" },
    { title: "进了组合的", value: "5", unit: "个" },
  ],
  handover: { owners: [1, 2, 0, 0, 1], note: "产业调研的结论要等利率研究给完贴现假设，才落得进组合" },
  choices: [
    {
      edge: "放出海 · 61%",
      title: "配制造出海链",
      detail: "汇率是主要风险",
      outcomes: [
        { edge: "38%", title: "只配整机", detail: "波动大", value: "180", unit: "bp" },
        { edge: "62%", title: "整机加零部件", detail: "分散单一客户", value: "240", unit: "bp", recommended: true },
      ],
    },
    {
      edge: "放内需 · 39%",
      title: "配存款搬家受益",
      detail: "看利率下行",
      outcomes: [
        { edge: "55%", title: "只配银行", detail: "股息稳", value: "120", unit: "bp" },
        { edge: "45%", title: "银行加保险", detail: "久期更长", value: "160", unit: "bp" },
      ],
    },
  ],

  orgs: [
    "枢机研究所",
    "宏观组",
    "产业调研组",
    "数据组",
    "机构客户会",
    "出海企业样本库",
    "衍生品柜台",
    "行业协会",
    "海外数据商",
    "对账委员会",
    "合规审核",
    "年度策略会",
  ],

  people: [
    { name: "凌枢", role: "首席宏观分析师", org: "枢机研究所" },
    { name: "简繁", role: "利率研究", org: "宏观组" },
    { name: "武行舟", role: "产业调研负责人", org: "产业调研组" },
    { name: "郝井", role: "数据工程", org: "数据组" },
    { name: "秦揽月", role: "组合策略", org: "宏观组" },
    { name: "客户老范", role: "机构客户代表", org: "机构客户会" },
  ],

  metrics: [
    { value: "40", unit: "bp", label: "利率中枢下移", delta: "down" },
    { value: "19", unit: "万亿", label: "居民超额储蓄", delta: "up" },
    { value: "92", unit: "分位", label: "红利拥挤度", delta: "up" },
    { value: "3", unit: "条", label: "年度主线", delta: "flat" },
    { value: "20", unit: "%", label: "主线外仓位上限", delta: "flat" },
    { value: "4", unit: "次", label: "年度公开对账", delta: "flat" },
  ],

  tags: [
    "年度策略",
    "利率中枢",
    "存款搬家",
    "出海制造",
    "订单验证",
    "红利拥挤",
    "消费分化",
    "黄金信用",
    "仓位纪律",
    "再平衡",
    "错误预案",
    "季度对账",
  ],
  goals: [
    { title: "利率中枢下移", target: "30 bp", actual: "40 bp", gap: "+10 bp", status: "on_track" },
    { title: "年度公开对账", target: "4 次", actual: "4 次", gap: "0 次", status: "on_track" },
    { title: "主线外仓位上限", target: "20%", actual: "17%", gap: "-3 pp", status: "on_track" },
    { title: "居民超额储蓄释放", target: "3 万亿", actual: "1.8 万亿", gap: "-1.2 万亿", status: "watch" },
    { title: "红利拥挤度回落", target: "70 分位", actual: "92 分位", gap: "+22 分位", status: "off_track" },
    { title: "年度主线命中", target: "3 条", actual: "1 条", gap: "-2 条", status: "off_track" },
  ],
  shortlist: {
    criteria: ["赔率", "胜率", "回撤容忍", "验证周期"],
    options: [
      { label: "红利继续加仓", scores: [0, 75, 75, 100], total: 62 },
      { label: "切向出海制造", scores: [100, 50, 50, 50], total: 62 },
      { label: "长久期利率债", scores: [75, 75, 100, 25], total: 69, chosen: true },
      { label: "等一个季度再定", scores: [50, 25, 100, 0], total: 44 },
      { label: "全线均衡摊薄", scores: [25, 100, 75, 75], total: 69 },
    ],
  },

  products: [
    { name: "年度策略订阅", note: "四期深度报告与季度更新", price: "¥3.8万", priceUnit: "年" },
    { name: "月度电话会", note: "每月一场，可提问可回听", price: "¥1.2万", priceUnit: "年" },
    { name: "定制研究", note: "按题立项，六到八周交付", price: "¥25万", priceUnit: "起 / 项" },
  ],

  orgChart: {
    root: { name: "凌枢", role: "首席宏观分析师" },
    managers: [
      {
        name: "简繁",
        role: "利率研究",
        reports: [{ name: "郝井", role: "数据工程" }, { name: "秦揽月", role: "组合策略" }],
      },
      {
        name: "武行舟",
        role: "产业调研负责人",
        reports: [{ name: "小滕", role: "实地调研" }],
      },
      {
        name: "方持",
        role: "风险与合规",
        reports: [{ name: "陈镜", role: "归因复核" }, { name: "老范", role: "机构客户代表" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "路演讲得出的",
    above: ["宽松不再等于普涨"],
    belowLabel: "底稿里写着的",
    below: [
      "海外数据依赖第三方",
      "组合只覆盖流动性资产",
      "小组仅七人扩容受限",
      "高频数据处理能力一般",
    ],
  },
  chain: {
    links: [
      { label: "数据采集", value: "11", unit: "%" },
      { label: "产业验证", value: "24", unit: "%" },
      { label: "判断成形", value: "28", unit: "%" },
      { label: "组合落地", value: "21", unit: "%" },
    ],
    support: [
      { label: "数据与工程", note: "行情底座 · 另类数据 · 回测框架" },
      { label: "调研与验证", note: "产业走访 · 专家访谈 · 渠道核查" },
      { label: "风控与合规", note: "归因复核 · 集中度限额 · 留痕存档" },
    ],
    margin: { label: "超额收益", value: "16%" },
  },
  quote: {
    text: "研究的信用不来自说对，来自错了以后怎么写下一页。",
    attribution: "凌枢，策略会开场",
  },

  callouts: {
    info: "本策略基准情形的全部假设与数据口径列于附录，与正文同步开放下载。",
    warn: "本材料为研究观点而非投资建议，据此操作的盈亏与本所无涉。",
    tip: "先读附录第三页的去年错题，再读今年判断，顺序别反。",
  },

  code: {
    language: "python",
    code: `def crowding_percentile(holdings: Series, window: int = 2520) -> float:
    """机构持仓拥挤度分位：过九十分位触发警戒复核。"""
    if holdings.count() < window // 2:
        raise DataQualityError("持仓序列不足十年，分位不可比")
    return holdings.rolling(window).rank(pct=True).iloc[-1] * 100`,
  },

  verdicts: {
    positive: "三条主线的证据链完整，进入组合执行阶段",
    warning: "红利拥挤度触及警戒上沿，超配部分启动减法",
    neutral: "通胀回归为小概率情形，仅保留预案不做对冲",
  },

  sources: [
    { label: "去年对账全文", ref: "枢机研究附录三，未删改" },
    { label: "出海企业开工率调研", ref: "样本库一百一十七家，十一月" },
    { label: "拥挤度指标方法论", url: "https://example.com/shuji-crowding-method" },
  ],

  captions: ["三个判断的证据链一页图", "出海工厂调研的产线现场", "拥挤度分位的十年走廊", "季度对账会的直播截屏"],

  url: "shuji-research.example.com/2027",

  scatterHeading: "拥挤度越高的板块，来年超额越薄",
  scatterSubhead: "过去十年三十个板块的年初拥挤度与次年超额收益",
  bubbleSizeNote: "口径：机构持仓数据库，气泡面积为板块自由流通市值。",
}
