import type { Lexicon } from "../lexicon"

/**
 * rally 原生选题：一款气泡茶新品的上市战役启动会。
 * 主角是产品和这场仗，语域是市场部动员：口号短、
 * 排期硬、预算一分一分抠。
 */
export const CAMPAIGN_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "「山茶气泡」上市战役启动",
  deckSubtitle: "三十天，让一罐茶在便利店冰柜里被看见",
  author: "山茶气泡项目组",
  date: "2026 年 3 月",

  chapters: ["为什么现在打", "人群与主张", "创意主线", "媒介与排期", "渠道联动", "预算与目标"],

  headings: [
    "无糖茶增速放缓，气泡茶的窗口就在今年夏天",
    "**第一口清爽**：一句话主张打穿所有物料",
    "十八到二十九岁，下午三点的困倦时刻",
    "三支十五秒短片，一个冰柜开门声",
    "冰柜贴纸是这场仗的第一物料",
    "达人矩阵按黄金三千粉一档铺",
    "便利店渠道首月铺市率目标七成",
    "试饮车巡回二十个城市高校圈",
    "包装上的山茶花必须在两米外可辨认",
    "预算七百二十万，六成压在开售前两周",
    "复购看第三十天，不看第三天",
    "所有素材当天数据当天复盘",
    "让货架自己说话",
  ],

  kickers: ["时机", "人群", "创意", "媒介", "渠道", "预算"],

  paragraph:
    "这场仗的窗口期只有一个夏天。无糖茶的增速已经放缓，气泡茶心智尚未被占领，谁先把第一口清爽这四个字和自己绑定，谁就拿走这个品类的入场券。战役的全部设计围绕一个场景：下午三点，写字楼和教室里的困倦时刻，一罐冰的山茶气泡在冰柜里被看见、被拿起、被拍照。三十天铺市率到七成，复购率看第三十天。",

  shortParagraph:
    "窗口期只有一个夏天：无糖茶增速放缓，气泡茶心智未被占领，谁先绑定第一口清爽，谁拿走品类入场券。全部设计围绕一个场景：下午三点的困倦时刻，一罐冰的山茶气泡被看见、被拿起、被拍照。三十天铺市率到七成，复购看第三十天。",

  sentences: [
    "品类数据：气泡茶年增速四成二，无糖茶回落到百分之七。",
    "核心人群是十八到二十九岁，下午时段饮料决策占全天四成六。",
    "主张只有一句：第一口清爽，所有物料不许改字。",
    "三支十五秒短片共用同一个冰柜开门声作听觉锤。",
    "冰柜贴纸覆盖两万家便利店，是预算里最贵的一项。",
    "达人投放按三千到三万粉的腰尾部矩阵铺，不买头部。",
    "首月便利店铺市率目标七成，重点城市九成。",
    "试饮车三十天巡回二十个城市的高校商圈。",
    "包装主视觉的山茶花在两米外的可辨认度经过实测。",
    "预算七百二十万，六成压在开售前两周集中引爆。",
    "评估指标以第三十天复购率为准，首周销量只作参考。",
    "每日素材数据晚十点复盘，次日十点前完成汰换。",
  ],

  bullets: [
    "窗口期只有一个夏天",
    "一句主张：第一口清爽",
    "冰柜贴纸两万家店",
    "腰尾部达人矩阵",
    "首月铺市率七成",
    "预算六成压前两周",
  ],

  phrases: [
    "第一口清爽",
    "冰柜可见性",
    "听觉锤",
    "腰尾部矩阵",
    "试饮巡回",
    "铺市率冲刺",
    "两米可辨认",
    "素材日抛",
    "复购三十天",
    "货架心智",
    "困倦时刻",
    "品类入场券",
  ],

  labels: [
    "短视频",
    "分众梯媒",
    "冰柜物料",
    "试饮车",
    "达人种草",
    "直播间",
    "便利店",
    "校园店",
    "电商旗舰",
    "会员小程序",
    "一线城市",
    "新一线",
    "开售周",
    "引爆周",
    "续销期",
    "复盘期",
  ],

  strengths: ["主张单一且已实测可记", "冰柜物料谈下独家位", "供应链可支撑爆量翻单", "数据复盘链路当天闭环"],
  weaknesses: ["品牌资产几乎从零开始", "预算不足以买头部声量", "南方市场团队人手紧", "口味只有一个 SKU"],
  opportunities: ["竞品涨价让出价格带", "便利店系统换季选品窗口", "高校社团合作意愿高", "短视频品类流量上行"],
  threats: ["巨头夏季同品类压货", "达人内容同质化审美疲劳", "冷链断档影响口感口碑", "天气不热直接打半折"],

  stages: ["物料锁定", "渠道进场", "预热种草", "开售引爆", "续销运营", "战役复盘"],
  periods: ["第一周", "第二周", "第三周", "第四周", "第五周"],
  periodAxis: "周次",
  segmentAxis: "媒介",
  decision: "预算先压在哪一头",
  levels: [
    { title: "看到广告", value: "412", unit: "万人" },
    { title: "记住名字", value: "186", unit: "万人" },
    { title: "进店找货", value: "74", unit: "万人" },
    { title: "买过第二次", value: "21", unit: "万人" },
  ],
  handover: { owners: [1, 2, 1, 0, 2], note: "物料锁定后渠道才报档期，空了两周" },
  choices: [
    {
      edge: "压曝光 · 63%",
      title: "买两周开屏",
      detail: "覆盖一线城市",
      outcomes: [
        { edge: "41%", title: "只买开屏", detail: "到店靠自然流", value: "38", unit: "万人" },
        { edge: "59%", title: "开屏加达人", detail: "口碑有二次传播", value: "62", unit: "万人", recommended: true },
      ],
    },
    {
      edge: "压终端 · 37%",
      title: "买冰柜陈列",
      detail: "只做华东",
      outcomes: [
        { edge: "52%", title: "只做冰柜", detail: "开盖率高", value: "29", unit: "万人" },
        { edge: "48%", title: "冰柜加试饮", detail: "要临时导购", value: "44", unit: "万人" },
      ],
    },
  ],

  orgs: [
    "山茶气泡项目组",
    "便利蜂系",
    "罗森华东",
    "全家华南",
    "分众传媒",
    "青柠创意",
    "试饮车队",
    "高校社团联盟",
    "冷链服务商",
    "电商旗舰店",
    "会员中心",
    "数据中台",
  ],

  people: [
    { name: "夏一舟", role: "战役操盘手", org: "山茶气泡项目组" },
    { name: "米朵", role: "创意负责人", org: "青柠创意" },
    { name: "梁千帆", role: "渠道总监", org: "山茶气泡项目组" },
    { name: "阿蔓", role: "达人投放", org: "山茶气泡项目组" },
    { name: "赵冰", role: "试饮车队长", org: "试饮车队" },
    { name: "何数", role: "数据复盘", org: "数据中台" },
  ],

  metrics: [
    { value: "720", unit: "万元", label: "战役总预算", delta: "flat" },
    { value: "70", unit: "%", label: "首月铺市率目标", delta: "up" },
    { value: "20000", unit: "家", label: "冰柜贴纸覆盖", delta: "up" },
    { value: "20", unit: "城", label: "试饮巡回", delta: "up" },
    { value: "30", unit: "天", label: "复购评估周期", delta: "flat" },
    { value: "15", unit: "秒", label: "主片时长", delta: "flat" },
  ],

  tags: [
    "上市战役",
    "冰柜争夺",
    "听觉锤",
    "种草矩阵",
    "试饮转化",
    "铺市率",
    "日抛素材",
    "复购口径",
    "货架陈列",
    "高校圈层",
    "价格带卡位",
    "冷链保障",
  ],
  tallies: [
    { filled: 7, caption: "十家覆盖门店中", label: "首月把货摆进了冰柜第一层" },
    { filled: 1, caption: "十位试饮过的人中", label: "一个月内自己回来买了一瓶" },
    { filled: 5, caption: "十座巡回城市中", label: "试饮当天完成了当月铺市目标" },
  ],
  goals: [
    { title: "首月铺市率", target: "70%", actual: "74%", gap: "+4 pp", status: "on_track" },
    { title: "冰柜贴纸覆盖", target: "20000 家", actual: "21600 家", gap: "+1600 家", status: "on_track" },
    { title: "试饮巡回城市", target: "20 城", actual: "20 城", gap: "0 城", status: "on_track" },
    { title: "战役总预算", target: "720 万元", actual: "764 万元", gap: "+44 万元", status: "watch" },
    { title: "首月复购率", target: "22%", actual: "12%", gap: "-10 pp", status: "off_track" },
    { title: "单店动销", target: "每周 18 瓶", actual: "每周 9 瓶", gap: "-9 瓶", status: "off_track" },
  ],
  shortlist: {
    criteria: ["首月铺市", "单箱成本", "复购拉动", "执行难度"],
    options: [
      { label: "全渠道买断陈列", scores: [100, 0, 25, 50], total: 44 },
      { label: "冰柜贴纸加试饮", scores: [75, 75, 75, 75], total: 75, chosen: true },
      { label: "只投线上种草", scores: [25, 100, 50, 100], total: 69 },
      { label: "买赠装冲量", scores: [75, 25, 0, 75], total: 44 },
      { label: "先做五城试点", scores: [25, 100, 75, 100], total: 75 },
    ],
  },

  products: [
    { name: "山茶气泡 · 单瓶", note: "冷萃茶底，零糖", price: "¥9.9", priceUnit: "瓶" },
    { name: "六瓶尝鲜装", note: "三个口味各两瓶", price: "¥55", priceUnit: "箱" },
    { name: "整箱囤货装", note: "二十四瓶，含冰袋直发", price: "¥199", priceUnit: "箱" },
  ],

  orgChart: {
    root: { name: "夏一舟", role: "战役操盘手" },
    managers: [
      {
        name: "米朵",
        role: "创意负责人",
        reports: [{ name: "阿蔓", role: "达人投放" }, { name: "小林", role: "短视频剪辑" }],
      },
      {
        name: "梁千帆",
        role: "渠道总监",
        reports: [{ name: "赵冰", role: "试饮车队长" }],
      },
      {
        name: "何数",
        role: "数据复盘",
        reports: [{ name: "陈盒", role: "铺市稽核" }, { name: "小唐", role: "冰柜巡检" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "发布会讲的",
    above: ["首月铺市率目标七成"],
    belowLabel: "项目组自己知道的",
    below: [
      "品牌资产几乎从零开始",
      "预算买不起头部声量",
      "南方市场只有三个人",
      "口味到现在只有一个 SKU",
    ],
  },
  chain: {
    links: [
      { label: "物料锁定", value: "9", unit: "%" },
      { label: "渠道进场", value: "17", unit: "%" },
      { label: "预热种草", value: "24", unit: "%" },
      { label: "开售引爆", value: "29", unit: "%" },
    ],
    support: [
      { label: "内容与创意", note: "主视觉 · 达人脚本 · 试饮话术" },
      { label: "渠道与陈列", note: "冰柜贴纸 · 端架排面 · 便利店进场" },
      { label: "数据与复盘", note: "铺市稽核 · 动销日报 · 达人 ROI" },
    ],
    margin: { label: "渠道净利", value: "21%" },
  },
  quote: {
    text: "广告的终点不在屏幕上，在便利店冰柜打开的那三秒钟。",
    attribution: "夏一舟，战役操盘手",
  },

  callouts: {
    info: "本案预算与排期以三月十日管理层批复版本为准，调整超一成需重新过会。",
    warn: "六成预算压在前两周，一旦铺市率未达标，引爆期顺延而不是加钱。",
    tip: "冰柜贴纸的实拍抽检每周两次，位置不对当场重贴，这比投放更影响转化。",
  },

  code: {
    language: "python",
    code: `def repurchase_rate(orders: Orders, day: int = 30) -> float:
    """第三十天复购率：这场战役唯一的成败口径。"""
    cohort = orders.first_time_buyers(window="launch_week")
    if cohort.size < 1000:
        raise DataQualityError("首购样本不足，口径不成立")
    return cohort.repurchased_within(days=day) / cohort.size`,
  },

  verdicts: {
    positive: "主张、物料、渠道三线对齐，开火条件已经具备",
    warning: "天气与冷链是两个不受控变量，预案必须本周落定",
    neutral: "第二口味 SKU 是否追加，等首月复购数据说话",
  },

  sources: [
    { label: "气泡茶品类增速测算", ref: "咨询机构联合报告，2026 年 2 月" },
    { label: "包装可辨认度货架实测", ref: "青柠创意实验室，样本四百人" },
    { label: "战役排期与预算批复", url: "https://example.com/sancha-launch-plan" },
  ],

  captions: ["便利店冰柜的独家贴纸位实拍", "试饮车在大学城的午后排队", "三支主片的冰柜开门声波形", "开售首周的货架陈列抽检"],

  url: "shancha.example.com/launch",

  scatterHeading: "冰柜位越靠视线层，单店转化越高",
  scatterSubhead: "六类陈列位的可见度评分与单店日销对照",
  bubbleSizeNote: "口径：试点两百家门店首周数据，气泡面积为门店客流。",
}
