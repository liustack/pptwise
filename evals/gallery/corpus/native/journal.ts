import type { Lexicon } from "../lexicon"

/**
 * journal 原生选题：独立编辑部的改版宣言。
 * 主角是一本小杂志和它的读者，语域是编辑部对读者交心：
 * 为什么改、改什么、哪些钱不挣。
 */
export const JOURNAL_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "《巷口》改版说明",
  deckSubtitle: "第四十九期起，我们决定慢下来",
  author: "《巷口》编辑部",
  date: "2026 年 6 月",

  chapters: ["为什么改", "改什么", "不变的", "新栏目", "钱的事", "给读者的话"],

  headings: [
    "四十八期做下来，我们和读者都累了",
    "**月刊改双月刊**：少一半期数，多一倍脚力",
    "每期从九个栏目砍到五个",
    "长报道下限八千字，短了不发",
    "读者问卷回收一千一百份，说真话的占多数",
    "「街角人物」升为固定头条",
    "广告只接与内容无关的：书、酒、乐器",
    "定价从十五元涨到二十四元",
    "订户流失预估两成，我们认",
    "印厂换成本地的，运费省下请校对",
    "错字率是编辑部的脸面",
    "每期附一张城市步行地图",
    "慢不是姿态，是工艺",
  ],

  kickers: ["缘由", "变化", "坚持", "栏目", "账目", "致读者"],

  paragraph:
    "四十八期做下来，问题不是没人看，是我们越做越快：截稿追着印期跑，选题追着热点跑，写稿的人两个月没在巷口坐过一个下午。一千一百份读者问卷里，被划得最多的一句是「宁可等，别注水」。所以第四十九期起，月刊改双月刊，栏目从九个砍到五个，长报道下限八千字，写不透就不发。定价涨到二十四元，订户流失预估两成，这笔账我们算过，认。",

  shortParagraph:
    "四十八期做下来，问题不是没人看，是越做越快：截稿追着印期跑，写稿的人两个月没在巷口坐过一个下午。一千一百份问卷里被划得最多的一句是「宁可等，别注水」。所以第四十九期起月刊改双月刊，栏目九砍到五，长报道下限八千字。定价涨到二十四元，流失预估两成，我们认。",

  sentences: [
    "《巷口》创刊四年，累计出刊四十八期。",
    "读者问卷发出两千份，回收一千一百份。",
    "问卷中「内容变薄」的提及率达四成七。",
    "改为双月刊，每年六期一百二十八页。",
    "栏目从九个精简至五个，砍掉的四个附录明细。",
    "长报道单篇下限八千字，采访周期不设上限。",
    "「街角人物」四年累计写了三十九位普通人。",
    "广告版面每期不超过四页，只接书、酒、乐器。",
    "单册定价由十五元调整为二十四元。",
    "现有订户三千二百人，流失预估两成以内。",
    "印制迁回本地印厂，单册运费下降一元七角。",
    "省下的运费全部用于增设一名专职校对。",
  ],

  bullets: [
    "月刊改双月刊",
    "栏目九个砍到五个",
    "长报道下限八千字",
    "广告只接书酒乐器",
    "定价涨到二十四元",
    "流失两成我们认",
  ],

  phrases: [
    "宁可等别注水",
    "脚力优先",
    "街角人物",
    "八千字下限",
    "本地印厂",
    "专职校对",
    "步行地图",
    "选题过夜制",
    "读者来信版",
    "不追热点",
    "双月节奏",
    "慢工艺",
  ],

  labels: [
    "街角人物",
    "长报道",
    "城市笔记",
    "书评",
    "读者来信",
    "封面",
    "内文",
    "别册",
    "订户",
    "零售",
    "独立书店",
    "咖啡馆寄售",
    "春夏号",
    "秋冬号",
    "特辑",
    "增刊",
  ],

  strengths: ["读者关系直接且诚实", "本地题材壁垒独一份", "作者队伍稳定四年", "小成本结构船小好调"],
  weaknesses: ["收入九成依赖发行", "人手六人抗风险弱", "摄影力量长期外借", "数字端只有一个邮件组"],
  opportunities: ["独立书店渠道回暖", "城市写作课可开分线", "旧刊合订本有藏家问价", "步行地图可做联名"],
  threats: ["纸价连续第三年上涨", "同城新刊分流作者", "寄售点倒闭连带坏账", "读者耐心的天花板"],

  stages: ["问卷复盘", "栏目重构", "作者约稿", "试刊打样", "订户告知", "四十九期发刊"],
  periods: ["二月", "三月", "四月", "五月", "六月"],
  periodAxis: "月份",
  segmentAxis: "栏目",
  decision: "版面先给哪一栏",
  levels: [
    { title: "翻过一期", value: "4200", unit: "人" },
    { title: "读完一篇", value: "1600", unit: "人" },
    { title: "订了一年", value: "480", unit: "人" },
    { title: "续订第二年", value: "190", unit: "人" },
  ],
  handover: { owners: [0, 0, 1, 2, 0], note: "记者交稿到美编排版之间压着两天，试刊打样常常等它" },
  choices: [
    {
      edge: "给长报道 · 58%",
      title: "每期一篇长报道",
      detail: "每期一篇",
      outcomes: [
        { edge: "45%", title: "只做本地选题", detail: "脚力够得着", value: "12", unit: "期" },
        { edge: "55%", title: "本地加外地", detail: "差旅要翻倍", value: "8", unit: "期", recommended: true },
      ],
    },
    {
      edge: "给街角人物 · 42%",
      title: "每期三个人",
      detail: "篇幅短",
      outcomes: [
        { edge: "51%", title: "只写店主", detail: "素材好找", value: "16", unit: "期" },
        { edge: "49%", title: "店主加常客", detail: "采访排期更密", value: "12", unit: "期" },
      ],
    },
  ],

  orgs: [
    "《巷口》编辑部",
    "本地印厂",
    "独立书店联盟",
    "咖啡馆寄售点",
    "读者会",
    "作者群",
    "城市档案馆",
    "步行地图小组",
    "旧刊整理组",
    "邮购组",
    "校对席",
    "发行仓",
  ],

  people: [
    { name: "阮巷", role: "主编", org: "《巷口》编辑部" },
    { name: "老柯", role: "长报道记者", org: "《巷口》编辑部" },
    { name: "苏晚晴", role: "美术编辑", org: "《巷口》编辑部" },
    { name: "丁一楷", role: "新任专职校对", org: "校对席" },
    { name: "修鞋匠老葛", role: "第一期街角人物", org: "读者会" },
    { name: "赵掌柜", role: "独立书店代表", org: "独立书店联盟" },
  ],

  metrics: [
    { value: "48", unit: "期", label: "已出刊数", delta: "flat" },
    { value: "1100", unit: "份", label: "问卷回收", delta: "up" },
    { value: "8000", unit: "字", label: "长报道下限", delta: "up" },
    { value: "24", unit: "元", label: "新定价", delta: "up" },
    { value: "3200", unit: "人", label: "现有订户", delta: "flat" },
    { value: "128", unit: "页", label: "改版后页数", delta: "up" },
  ],

  tags: [
    "改版",
    "双月刊",
    "长报道",
    "街角人物",
    "读者问卷",
    "涨价说明",
    "本地印制",
    "专职校对",
    "步行地图",
    "栏目精简",
    "订户告知",
    "慢出版",
  ],
  goals: [
    { title: "问卷回收", target: "800 份", actual: "1100 份", gap: "+300 份", status: "on_track" },
    { title: "长报道下限", target: "6000 字", actual: "8000 字", gap: "+2000 字", status: "on_track" },
    { title: "改版后页数", target: "120 页", actual: "128 页", gap: "+8 页", status: "on_track" },
    { title: "现有订户", target: "3600 人", actual: "3200 人", gap: "-400 人", status: "watch" },
    { title: "单期广告收入", target: "9 万元", actual: "5.2 万元", gap: "-3.8 万元", status: "off_track" },
    { title: "出刊准时率", target: "100%", actual: "83%", gap: "-17 pp", status: "off_track" },
  ],
  shortlist: {
    criteria: ["读者买账", "编辑部撑得住", "账算得平", "不违初衷"],
    options: [
      { label: "涨价到二十四元", scores: [50, 100, 75, 100], total: 81, chosen: true },
      { label: "接品牌定制内容", scores: [25, 75, 100, 0], total: 50 },
      { label: "季刊改双月刊", scores: [75, 25, 50, 75], total: 56 },
      { label: "只做电子版", scores: [25, 100, 100, 25], total: 62 },
      { label: "维持原价原页数", scores: [75, 50, 0, 100], total: 56 },
    ],
  },

  products: [
    { name: "单期零售", note: "改版后每期一百二十页", price: "¥45", priceUnit: "期" },
    { name: "全年订阅", note: "十二期直邮，含增刊", price: "¥480", priceUnit: "年" },
    { name: "旧刊合订本", note: "第一至四十八期，两卷", price: "¥360", priceUnit: "套" },
  ],

  orgChart: {
    root: { name: "阮巷", role: "主编" },
    managers: [
      {
        name: "老柯",
        role: "长报道记者",
        reports: [{ name: "丁一楷", role: "专职校对" }, { name: "苏晚晴", role: "美术编辑" }],
      },
      {
        name: "赵掌柜",
        role: "独立书店代表",
        reports: [{ name: "老葛", role: "街角人物专栏" }],
      },
      {
        name: "宋纸",
        role: "发行与订户",
        reports: [{ name: "小杜", role: "邮件组维护" }, { name: "阿宁", role: "打样跟印" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "改版说明写的",
    above: ["月刊改双月刊，长报道下限八千字"],
    belowLabel: "编辑部内部的",
    below: [
      "收入九成依赖发行",
      "人手六人抗风险很弱",
      "摄影力量长期外借",
      "数字端只有一个邮件组",
    ],
  },
  chain: {
    links: [
      { label: "问卷复盘", value: "12", unit: "%" },
      { label: "栏目重构", value: "20", unit: "%" },
      { label: "作者约稿", value: "30", unit: "%" },
      { label: "试刊打样", value: "19", unit: "%" },
    ],
    support: [
      { label: "编辑与校对", note: "三审三校 · 事实核查 · 引文回溯" },
      { label: "视觉与装帧", note: "版式重排 · 封面摄影 · 纸样比选" },
      { label: "发行与订户", note: "书店寄售 · 订户续订 · 邮件通告" },
    ],
    margin: { label: "发行结余", value: "19%" },
  },
  quote: {
    text: "我们不缺选题，缺的是在巷口坐一下午的时间。现在把它买回来。",
    attribution: "阮巷，改版说明会",
  },

  callouts: {
    info: "已付费订户按剩余期数自动折算为双月刊期数，差额多退少不补。",
    warn: "第四十九期发刊顺延至八月一日，此后固定逢单月一日出刊。",
    tip: "不想续订的读者，回函写「停」字即可，我们不做挽留电话。",
  },

  code: {
    language: "python",
    code: `def refund_periods(sub: Subscription) -> int:
    """老订户折算：月刊余期换双月刊期数，零头退款。"""
    if sub.remaining <= 0:
        raise SubscriptionExpired("订期已满，无需折算")
    converted, leftover = divmod(sub.remaining, 2)
    sub.refund = leftover * OLD_PRICE
    return converted`,
  },

  verdicts: {
    positive: "问卷与账本指向同一个方向，改版的理由充分",
    warning: "流失若超两成，砍印量而不是砍稿费",
    neutral: "数字版是否收费，观察两期读者来信再定",
  },

  sources: [
    { label: "读者问卷全量统计", ref: "编辑部整理，回收一千一百份" },
    { label: "四年发行与成本流水", ref: "邮购组与发行仓合并口径" },
    { label: "被砍栏目的告别附录", url: "https://example.com/xiangkou-farewell-columns" },
  ],

  captions: ["第一期到第四十八期的书脊墙", "老柯采访修鞋匠的那个下午", "新版式打样的红笔校对页", "随刊步行地图的第一张手稿"],

  url: "xiangkou.example.press",

  scatterHeading: "采访天数越多的稿子，读者读完率越高",
  scatterSubhead: "四十八期长报道的采访天数与读完率对照",
  bubbleSizeNote: "口径：邮件组阅读回执抽样，气泡面积为篇幅字数。",
}
