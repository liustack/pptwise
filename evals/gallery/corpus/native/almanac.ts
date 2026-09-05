import type { Lexicon } from "../lexicon"

/**
 * almanac 原生选题：生态农场合作社的年度分享会。
 * 主角是一块地和守着它的社员，语域是年记：
 * 节气口吻、账目实在、对土地有敬。
 */
export const TERRA_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "青禾农场丙午年记",
  deckSubtitle: "第五年，土地开始回礼",
  author: "青禾生态农场合作社",
  date: "2026 年 11 月",

  chapters: ["年景", "土壤五年", "作物与收成", "生灵回来了", "账目", "来年打算"],

  headings: [
    "第五个年头，八十六亩地交出的答卷",
    "**有机质百分之二点九**：五年爬坡终于过线",
    "今年只有一场大的涝，稻子扛住了",
    "二十七种作物轮着种，地不累",
    "白鹭回来了，田埂上数到十一只",
    "青蛙的叫声是最好的农药检测报告",
    "稻鸭共作第三年，鸭子比除草剂好用",
    "会员菜箱续订率八成七",
    "堆肥场吃掉了全场九成的秸秆",
    "亏了三年，今年账面第一次打平",
    "两位年轻人留下来当了长工",
    "冬闲不闲：修渠、堆肥、开社员大会",
    "土地的账，要用五年十年来算",
  ],

  kickers: ["年景", "土壤", "收成", "生灵", "账目", "来年"],

  paragraph:
    "第五年，土地开始回礼。最要紧的一个数是土壤有机质到了百分之二点九，五年前接手时是百分之一点一，这条爬坡线我们每年测两次，今年终于过了自己定的线。田里的变化不用仪器也看得见：白鹭回来了，田埂上一次数到十一只，夏夜的蛙声吵得人睡不着，这是最好的农药检测报告。账面上，亏了三年之后，今年第一次打平。",

  shortParagraph:
    "第五年，土地开始回礼。最要紧的数是土壤有机质到了百分之二点九，接手时是一点一，这条爬坡线每年测两次，今年终于过线。田里的变化不用仪器也看得见：白鹭回来了，一次数到十一只，夏夜蛙声吵得人睡不着，这是最好的农药检测报告。账面上，亏了三年，今年第一次打平。",

  sentences: [
    "农场八十六亩，水田五十二亩，旱地与果园三十四亩。",
    "土壤有机质从接手时的百分之一点一升至百分之二点九。",
    "全年零化学农药、零化学肥，第五年保持。",
    "二十七种作物轮作，水稻两季改一季加冬绿肥。",
    "七月一场大涝淹田三天，稻子倒伏不足一成。",
    "稻鸭共作放鸭三百二十只，除草人工省了六成。",
    "田埂鸟类记录新增七种，白鹭单次最多十一只。",
    "会员菜箱四百二十户，续订率八成七。",
    "堆肥场年处理秸秆与菜叶一百九十吨。",
    "年度收支第一次打平，盈余三千一百元。",
    "两位返乡青年转为全年在场社员。",
    "来年计划：修复最后一段老水渠，试种六亩旱稻。",
  ],

  bullets: [
    "有机质五年翻近三倍",
    "零农药零化肥第五年",
    "白鹭一次数到十一只",
    "菜箱续订率八成七",
    "秸秆九成回了堆肥场",
    "账面第一次打平",
  ],

  phrases: [
    "土地回礼",
    "有机质爬坡",
    "轮作不累地",
    "稻鸭共作",
    "蛙声报告",
    "冬绿肥",
    "会员菜箱",
    "堆肥还田",
    "田埂鸟录",
    "五年之约",
    "返乡青年",
    "冬闲三件事",
  ],

  labels: [
    "水稻",
    "旱稻",
    "时令菜",
    "果园",
    "绿肥",
    "水田区",
    "旱地区",
    "堆肥场",
    "育秧棚",
    "春耕",
    "夏耘",
    "秋收",
    "冬藏",
    "菜箱",
    "市集",
    "社员日",
  ],

  strengths: ["土壤数据五年连续向好", "会员关系稳固续订高", "生态指标肉眼可见", "年轻人愿意留下"],
  weaknesses: ["产量仍低于常规农场", "人力在农忙季吃紧", "冷链短板限制配送半径", "账面盈余薄如纸"],
  opportunities: ["周边学校想来自然课", "生态大米有溢价空间", "县里治水项目可借力", "农场民宿有人来问"],
  threats: ["极端天气一年比一年多", "地租五年约明年到期", "假有机产品搅乱行情", "野猪开始光顾旱地"],

  stages: ["春耕备秧", "插秧放鸭", "夏耘防涝", "秋收晒谷", "冬闲修渠", "社员大会"],
  periods: ["惊蛰", "芒种", "大暑", "秋分", "小雪"],
  periodAxis: "节气",
  segmentAxis: "地块",
  decision: "来年先做哪一件",
  levels: [
    { title: "试过一季", value: "42", unit: "户" },
    { title: "连种两年", value: "26", unit: "户" },
    { title: "转有机", value: "14", unit: "户" },
    { title: "拿到认证", value: "5", unit: "户" },
  ],
  handover: { owners: [1, 2, 1, 1, 0], note: "鸭子下田要跟插秧对上，差一周就白搭" },
  choices: [
    {
      edge: "先扩稻鸭 · 57%",
      title: "再放两百只",
      detail: "除草不用药",
      outcomes: [
        { edge: "45%", title: "只扩面积", detail: "看田的人不够", value: "1.8", unit: "%" },
        { edge: "55%", title: "扩面积加围网", detail: "冬天要修渠", value: "2.6", unit: "%", recommended: true },
      ],
    },
    {
      edge: "先养地 · 43%",
      title: "轮作豆科一季",
      detail: "少收一茬",
      outcomes: [
        { edge: "52%", title: "只轮一块", detail: "有机质慢慢爬", value: "1.1", unit: "%" },
        { edge: "48%", title: "轮两块", detail: "当年收成少三成", value: "2.2", unit: "%" },
      ],
    },
  ],

  sets: {
    labels: ["有机质达标", "轮作过绿肥", "会员认领"],
    overlap: "三样齐备的地块",
  },
  causes: {
    effect: "产量仍低于常规农场两成",
    categories: [
      { label: "土壤", causes: ["有机质才回到二点九", "旱地区保水能力弱"] },
      { label: "耕作", causes: ["不打除草剂靠人工", "插秧放鸭错过最佳窗口"] },
      { label: "人力", causes: ["农忙季只有九名社员", "秋收晒谷靠天排期"] },
      { label: "品种", causes: ["旱稻品种尚在试种", "时令菜种类过多分散"] },
    ],
  },
  positions: {
    x: { title: "投入强度", low: "低", high: "高" },
    y: { title: "土壤有机质", low: "低", high: "高" },
    quadrants: ["投入少地却肥，理想区", "投入多地也肥，我们在这", "投入少地也瘦，撂荒", "投入多但地瘦，越种越亏"],
    points: [
      { label: "青禾水田区", x: 72, y: 78, mine: true },
      { label: "青禾旱地区", x: 66, y: 52 },
      { label: "果园地块", x: 48, y: 62 },
      { label: "绿肥轮作区", x: 40, y: 84 },
      { label: "邻村常规田", x: 82, y: 26 },
      { label: "撂荒地", x: 8, y: 30 },
      { label: "县农技示范田", x: 88, y: 66 },
      { label: "五年前的自己", x: 60, y: 34 },
    ],
  },
  equation: {
    operands: [
      { label: "土壤有机质", value: "2.9%", note: "五年连续向好" },
      { label: "轮作作物", value: "27 种", note: "含四季绿肥" },
    ],
    result: { label: "会员续订率", value: "88%", note: "菜箱按周配送" },
  },
  wheel: {
    whole: "一年的六件农事",
    sectors: [
      { label: "春耕备秧", value: "三月" },
      { label: "插秧放鸭", value: "四月" },
      { label: "夏耘防涝", value: "六月" },
      { label: "秋收晒谷", value: "九月" },
      { label: "冬闲修渠", value: "十一月" },
      { label: "社员大会", value: "腊月" },
    ],
    marked: 1,
  },
  debate: {
    proposal: "把二十亩旱地改回水田",
    forTitle: "支持",
    againstTitle: "反对",
    pros: [
      { label: "水田有机质涨得更快", note: "水田区已到二点九" },
      { label: "放鸭能省一半除草工", note: "旱地全靠人工" },
      { label: "产量差距能补上一成", note: "水稻单产比旱稻高" },
      { label: "会员菜箱主粮更稳", note: "旱稻批次口感不一" },
    ],
    cons: [
      { label: "修渠要一个冬天", note: "冬闲的人力全押上" },
      { label: "旱地轮作会少八种", note: "二十七种是会员认的卖点" },
      { label: "用水指标要重新申请", note: "县里按亩核批" },
      { label: "改回来就难再改回去", note: "田埂与灌渠都是硬工程" },
    ],
    verdict: "先改八亩靠渠的旱地，冬闲修渠只做这一段，两季之后按有机质数据再定其余十二亩。",
  },
  orgs: [
    "青禾农场合作社",
    "社员大会",
    "会员菜箱群",
    "村委会",
    "县农技站",
    "土壤检测实验室",
    "自然教育机构",
    "周边小学",
    "农夫市集",
    "堆肥互助组",
    "护鸟志愿队",
    "返乡青年之家",
  ],

  people: [
    { name: "麦穗", role: "合作社发起人", org: "青禾农场合作社" },
    { name: "老甄", role: "田间总管 · 种了四十年地", org: "青禾农场合作社" },
    { name: "阿澈", role: "返乡青年 · 管鸭子", org: "返乡青年之家" },
    { name: "苗苗", role: "返乡青年 · 管菜箱", org: "会员菜箱群" },
    { name: "检测员小卫", role: "土壤取样", org: "土壤检测实验室" },
    { name: "会员张姐", role: "五年老会员", org: "会员菜箱群" },
  ],

  metrics: [
    { value: "2.9", unit: "%", label: "土壤有机质", delta: "up" },
    { value: "86", unit: "亩", label: "农场面积", delta: "flat" },
    { value: "27", unit: "种", label: "轮作作物", delta: "up" },
    { value: "87", unit: "%", label: "菜箱续订率", delta: "up" },
    { value: "190", unit: "吨", label: "年堆肥处理", delta: "up" },
    { value: "3100", unit: "元", label: "年度盈余", delta: "up" },
  ],

  tags: [
    "生态农业",
    "土壤修复",
    "轮作",
    "稻鸭共作",
    "堆肥还田",
    "会员制",
    "菜箱",
    "田埂观鸟",
    "零农残",
    "返乡",
    "自然教育",
    "五年之约",
  ],
  frequencies: [
    { text: "轮作", weight: 4 },
    { text: "堆肥", weight: 4 },
    { text: "菜箱", weight: 4 },
    { text: "地力", weight: 3 },
    { text: "节气", weight: 3 },
    { text: "绿肥", weight: 3 },
    { text: "断货", weight: 3 },
    { text: "社员", weight: 2 },
    { text: "育苗", weight: 2 },
    { text: "虫害", weight: 2 },
    { text: "分拣", weight: 2 },
    { text: "留种", weight: 1 },
    { text: "农事课", weight: 1 },
    { text: "开放日", weight: 1 },
  ],
  tallies: [
    { filled: 9, caption: "十位订菜箱的社员中", label: "今年续订了下一季" },
    { filled: 6, caption: "十块轮作地块中", label: "有机质比去年这时候高" },
    { filled: 4, caption: "十个夏季配送周中", label: "叶菜按原计划装满了箱" },
  ],
  goals: [
    { title: "菜箱续订率", target: "85%", actual: "87%", gap: "+2 pp", status: "on_track" },
    { title: "土壤有机质", target: "2.8%", actual: "2.9%", gap: "+0.1 pp", status: "on_track" },
    { title: "年堆肥处理", target: "200 吨", actual: "190 吨", gap: "-10 吨", status: "watch" },
    { title: "轮作作物", target: "24 种", actual: "27 种", gap: "+3 种", status: "on_track" },
    { title: "夏季断货天数", target: "6 天", actual: "14 天", gap: "+8 天", status: "off_track" },
    { title: "年度盈余", target: "5000 元", actual: "3100 元", gap: "-1900 元", status: "off_track" },
  ],
  shortlist: {
    criteria: ["地力恢复", "用工投入", "当年收成", "菜箱稳定"],
    options: [
      { label: "整块地休耕一年", scores: [100, 100, 0, 0], total: 50 },
      { label: "轮作绿肥压青", scores: [75, 50, 50, 75], total: 78, chosen: true },
      { label: "只加堆肥不换茬", scores: [25, 75, 75, 75], total: 62 },
      { label: "租下隔壁十亩", scores: [50, 0, 100, 100], total: 55 },
      { label: "照旧不动", scores: [0, 100, 50, 50], total: 41 },
    ],
  },

  products: [
    { name: "青禾米 · 五斤装", note: "自留种，一年一季，当季碾", price: "¥88", priceUnit: "袋" },
    { name: "四季菜箱", note: "每周一箱，八到十样当令菜", price: "¥168", priceUnit: "月 / 四次" },
    { name: "荆条蜜 · 秋", note: "山场三十箱，一年只取一次", price: "¥136", priceUnit: "罐" },
  ],

  orgChart: {
    root: { name: "麦穗", role: "合作社发起人" },
    managers: [
      {
        name: "老甄",
        role: "田间总管",
        reports: [{ name: "阿澈", role: "返乡青年 · 管鸭子" }, { name: "苗苗", role: "返乡青年 · 管菜箱" }],
      },
      {
        name: "小卫",
        role: "土壤取样",
        reports: [{ name: "张姐", role: "五年老会员" }],
      },
      {
        name: "阿禾",
        role: "仓储与配送",
        reports: [{ name: "老井", role: "修渠" }, { name: "豆子", role: "晒谷场" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "年记写的",
    above: ["有机质五年翻了近三倍"],
    belowLabel: "账本上的",
    below: [
      "产量仍然低于常规农场",
      "人力在农忙季吃紧",
      "冷链短板限制配送半径",
      "账面盈余薄如纸",
    ],
  },
  chain: {
    links: [
      { label: "春耕备秧", value: "15", unit: "%" },
      { label: "插秧放鸭", value: "23", unit: "%" },
      { label: "夏耘防涝", value: "19", unit: "%" },
      { label: "秋收晒谷", value: "28", unit: "%" },
    ],
    support: [
      { label: "土壤与轮作", note: "有机质监测 · 二十七种轮作 · 绿肥翻压" },
      { label: "生态与共作", note: "稻鸭共作 · 田埂留草 · 不打除草剂" },
      { label: "会员与配送", note: "菜箱预订 · 每周配送 · 开放田日" },
    ],
    margin: { label: "合作社结余", value: "15%" },
  },
  quote: {
    text: "老甄说，地跟人一样，你哄它一年，它记你五年。",
    attribution: "麦穗，年记序言",
  },

  callouts: {
    info: "土壤数据由县外第三方实验室检测，春秋各一次，五年原始报告在社员大会现场备查。",
    warn: "明年地租续约在谈，若租金涨幅超两成，菜箱定价将同步调整并提前告知。",
    tip: "冬闲的修渠日欢迎会员来搭手，干半天活，换一顿灶台饭和一袋新米。",
  },

  code: {
    language: "python",
    code: `def organic_matter_trend(samples: list[SoilSample]) -> float:
    """土壤有机质年化增速：五年之约的唯一硬指标。"""
    if len(samples) < 4:
        raise DataQualityError("样本不足两年，不谈趋势")
    yearly = group_by_year(samples)
    return (yearly[-1].mean - yearly[0].mean) / len(yearly)`,
  },

  verdicts: {
    positive: "土壤、生态、账目三条线同年转正，五年之约兑现",
    warning: "地租续约是来年最大变数，谈判底线社员大会已议定",
    neutral: "农场民宿的提议记录在案，不列入来年计划",
  },

  sources: [
    { label: "五年土壤检测原始报告", ref: "第三方实验室，春秋各一次" },
    { label: "合作社年度收支明细", ref: "社员大会审议版" },
    { label: "田埂鸟类观察记录", url: "https://example.com/qinghe-bird-log" },
  ],

  captions: ["白鹭落在田埂的那个清晨", "稻鸭共作的放鸭时刻", "堆肥场的翻堆测温", "社员大会的灶台饭"],

  url: "qinghe-farm.example.cn",

  scatterHeading: "绿肥种得越足的地块，来年产量越稳",
  scatterSubhead: "十二个地块的冬绿肥覆盖率与产量波动对照",
  bubbleSizeNote: "口径：五年田间台账，气泡面积为地块面积。",
}
