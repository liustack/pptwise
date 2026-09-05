import type { Lexicon } from "../lexicon"

/**
 * museum 原生选题：策展人的特展媒体导览。
 * 主角是一批灯具文物和一条展线，语域是策展导览：
 * 讲展品也讲展陈决定，为什么这样挂、为什么这么暗。
 */
export const MUSEUM_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "长夜有灯 · 中国灯具三千年特展",
  deckSubtitle: "策展人导览 · 从豆灯到电石灯的一条光路",
  author: "策展人 闻照 · 江原博物馆",
  date: "2026 年 9 月",

  chapters: ["策展缘起", "展线设计", "重点展件", "光与展陈", "修复背后", "公众活动"],

  headings: [
    "一百四十六件灯具，排成一条三千年的光路",
    "**以灯还灯**：展厅照度压到五十勒克斯",
    "战国青铜人形灯：这次借展谈了两年",
    "汉代雁鱼灯的烟道，是最早的环保设计",
    "展线不按朝代走，按一个夜晚走",
    "宋代省油灯的夹层，注水降温省一半油",
    "从长明灯到电石灯，最后一展柜留给告别",
    "三件展品的修复用了十一个月",
    "灯影区：允许观众的影子成为展品",
    "每件展签都回答同一个问题：它照亮过谁",
    "夜场每周五开放，展厅只点「灯」",
    "文创只做三件，件件能用",
    "看灯的人，也在灯里",
  ],

  kickers: ["缘起", "展线", "展件", "展陈", "修复", "活动"],

  paragraph:
    "这个展的起点是一个朴素的问题：电灯出现之前，中国人的夜晚是什么样子。一百四十六件灯具排成一条光路，展线不按朝代走，按一个夜晚走，从掌灯、夜读、守岁走到天明。展厅照度压到五十勒克斯，不是为了氛围，是为了以灯还灯，让展品回到它们工作时的亮度。每件展签只回答一个问题：它照亮过谁。",

  shortParagraph:
    "这个展的起点是一个朴素的问题：电灯出现之前，中国人的夜晚是什么样子。一百四十六件灯具排成一条光路，展线不按朝代按一个夜晚走，从掌灯、夜读走到天明。展厅照度压到五十勒克斯，不为氛围，是以灯还灯，让展品回到工作时的亮度。每件展签只回答一个问题：它照亮过谁。",

  sentences: [
    "本展汇集十一家机构藏品一百四十六件。",
    "战国青铜人形灯为馆际借展，商谈历时两年。",
    "汉代雁鱼灯的导烟管设计早于同类西方设计千余年。",
    "宋代省油灯夹层注水，实测省油四成六。",
    "展线以一个夜晚为序：掌灯、宴饮、夜读、守岁、天明。",
    "展厅基础照度五十勒克斯，重点展柜局部提升。",
    "三件重点展品修复历时十一个月，过程影像同场播放。",
    "灯影互动区允许观众影子投入展墙。",
    "展签体例统一回答：形制、年代、出土地、照亮过谁。",
    "周五夜场以复原灯具照明，限流三百人。",
    "语音导览由修复师而非播音员录制。",
    "文创仅三件：省油灯茶烛台、雁鱼灯书签、灯影帆布包。",
  ],

  bullets: [
    "一百四十六件排成光路",
    "展线按一个夜晚走",
    "照度压到五十勒克斯",
    "修复影像同场播放",
    "展签回答照亮过谁",
    "夜场只点复原灯",
  ],

  phrases: [
    "以灯还灯",
    "一个夜晚的展线",
    "导烟管",
    "省油夹层",
    "灯影区",
    "照亮过谁",
    "复原照明",
    "馆际借展",
    "修复直播",
    "低照度展陈",
    "夜场限流",
    "告别展柜",
  ],

  labels: [
    "豆灯",
    "青铜灯",
    "陶灯",
    "瓷灯",
    "宫灯",
    "省油灯",
    "长明灯",
    "电石灯",
    "掌灯段",
    "宴饮段",
    "夜读段",
    "守岁段",
    "天明段",
    "灯影区",
    "修复展柜",
    "文创台",
  ],

  strengths: ["展线叙事有独创性", "借展级别十年最高", "修复过程全程留档", "低照度方案通过文保评审"],
  weaknesses: ["低照度增加观展难度", "重点展件保险费高企", "夜场人力成本翻倍", "导览册印量保守"],
  opportunities: ["中学历史课愿意包场", "纪录片团队洽谈跟拍", "巡展意向已有两馆", "灯具修复课可开工作坊"],
  threats: ["借展方随时可召回展品", "湿度波动威胁漆木灯", "同城大展分流观众", "文创仿品已在网上出现"],

  stages: ["借展谈判", "修复整理", "展陈搭建", "灯光调试", "开幕导览", "巡展评估"],
  periods: ["四月", "五月", "六月", "七月", "八月"],
  periodAxis: "月份",
  segmentAxis: "展段",
  decision: "展线按什么走",
  levels: [
    { title: "进过展厅", value: "42000", unit: "人" },
    { title: "走完全展线", value: "18000", unit: "人" },
    { title: "参加过导览", value: "4200", unit: "人" },
    { title: "看过修复纪录", value: "900", unit: "人" },
  ],
  handover: { owners: [0, 1, 2, 2, 0], note: "修复师放件到灯光调试只有一夜，导烟管那批最赶" },
  choices: [
    {
      edge: "按年代 · 55%",
      title: "从战国排到民国",
      detail: "教科书顺序",
      outcomes: [
        { edge: "47%", title: "只按朝代", detail: "观众走得快", value: "42", unit: "件" },
        { edge: "53%", title: "朝代加地域", detail: "展柜要多六个", value: "56", unit: "件" },
      ],
    },
    {
      edge: "按一个夜晚 · 45%",
      title: "从掌灯排到熄灯",
      detail: "叙事更强",
      outcomes: [
        { edge: "58%", title: "只做主线", detail: "重点件突出", value: "38", unit: "件", recommended: true },
        { edge: "42%", title: "主线加支线", detail: "灯光要重调", value: "51", unit: "件" },
      ],
    },
  ],

  orgs: [
    "江原博物馆",
    "国家一级借展馆",
    "省考古所",
    "文保评审组",
    "修复中心",
    "展陈设计公司",
    "灯光工作室",
    "志愿讲解队",
    "中学历史教研会",
    "纪录片团队",
    "文创部",
    "巡展意向馆",
  ],

  people: [
    { name: "闻照", role: "策展人", org: "江原博物馆" },
    { name: "梅屿", role: "首席修复师", org: "修复中心" },
    { name: "老熊", role: "灯光设计", org: "灯光工作室" },
    { name: "顾拾遗", role: "借展联络", org: "江原博物馆" },
    { name: "小樊", role: "志愿讲解队长", org: "志愿讲解队" },
    { name: "章馆长", role: "馆方总协调", org: "江原博物馆" },
  ],

  metrics: [
    { value: "146", unit: "件", label: "展品总数", delta: "flat" },
    { value: "11", unit: "家", label: "借展机构", delta: "up" },
    { value: "50", unit: "lux", label: "展厅照度", delta: "down" },
    { value: "11", unit: "个月", label: "重点修复工期", delta: "flat" },
    { value: "300", unit: "人", label: "夜场限流", delta: "flat" },
    { value: "3", unit: "件", label: "文创品类", delta: "flat" },
  ],

  tags: [
    "特展",
    "灯具史",
    "低照度",
    "借展",
    "雁鱼灯",
    "省油灯",
    "展线叙事",
    "修复影像",
    "灯影互动",
    "夜场",
    "策展导览",
    "巡展",
  ],
  goals: [
    { title: "展品总数", target: "140 件", actual: "146 件", gap: "+6 件", status: "on_track" },
    { title: "借展机构", target: "9 家", actual: "11 家", gap: "+2 家", status: "on_track" },
    { title: "展厅照度", target: "50 lux", actual: "50 lux", gap: "0 lux", status: "on_track" },
    { title: "重点修复工期", target: "9 个月", actual: "11 个月", gap: "+2 个月", status: "watch" },
    { title: "夜场限流", target: "300 人", actual: "412 人", gap: "+112 人", status: "off_track" },
    { title: "导览词到位率", target: "100%", actual: "72%", gap: "-28 pp", status: "off_track" },
  ],
  shortlist: {
    criteria: ["文物安全", "看得清", "叙事连贯", "布展工期"],
    options: [
      { label: "低照度独立柜", scores: [100, 50, 75, 25], total: 62, chosen: true },
      { label: "并柜集中陈列", scores: [50, 75, 100, 100], total: 81 },
      { label: "开放式无柜展台", scores: [0, 100, 75, 75], total: 62 },
      { label: "复制品替换原件", scores: [100, 100, 25, 50], total: 69 },
      { label: "沿用上次展线", scores: [75, 50, 25, 100], total: 62 },
    ],
  },

  products: [
    { name: "特展门票", note: "含分时预约与语音导览", price: "¥80", priceUnit: "人次" },
    { name: "展览图录", note: "二百八十页，全展品收录", price: "¥268", priceUnit: "册" },
    { name: "豆灯复刻摆件", note: "按馆藏一比一翻模", price: "¥480", priceUnit: "件" },
  ],

  orgChart: {
    root: { name: "章馆长", role: "馆方总协调" },
    managers: [
      {
        name: "闻照",
        role: "策展人",
        reports: [{ name: "小樊", role: "志愿讲解队长" }, { name: "顾拾遗", role: "借展联络" }],
      },
      {
        name: "梅屿",
        role: "首席修复师",
        reports: [{ name: "阿钿", role: "金工修复" }],
      },
      {
        name: "老熊",
        role: "灯光设计",
        reports: [{ name: "小照", role: "布光执行" }, { name: "周版", role: "展签设计" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "导览词说的",
    above: ["一百四十六件排成一条光路"],
    belowLabel: "馆务会才提的",
    below: [
      "低照度增加了观展难度",
      "重点展件保险费高企",
      "夜场人力成本翻倍",
      "导览册印量偏保守",
    ],
  },
  chain: {
    links: [
      { label: "借展谈判", value: "16", unit: "%" },
      { label: "修复整理", value: "28", unit: "%" },
      { label: "展陈搭建", value: "19", unit: "%" },
      { label: "灯光调试", value: "22", unit: "%" },
    ],
    support: [
      { label: "文保与修复", note: "恒湿展柜 · 金工除锈 · 灯油残留取样" },
      { label: "借展与保险", note: "十一家机构 · 点交清单 · 全险投保" },
      { label: "讲解与导览", note: "志愿讲解 · 夜场专场 · 导览册" },
    ],
    margin: { label: "展期结余", value: "15%" },
  },
  quote: {
    text: "博物馆的灯照了文物一百年，这一次，我们想让文物自己发光。",
    attribution: "闻照，媒体导览开场",
  },

  callouts: {
    info: "展期九月十日至明年一月十日，重点展件的借展窗口不同，观展前请查当日在展清单。",
    warn: "全展厅禁用闪光灯与补光设备，灯影区外请勿倚靠展柜。",
    tip: "建议留足九十分钟，从掌灯段顺序走完，倒序观展会错过展线的天明收束。",
  },

  code: {
    language: "python",
    code: `def lux_check(cases: list[Showcase]) -> None:
    """照度巡检：漆木灯展柜超标即刻降档，不过夜。"""
    for c in cases:
        if c.material == "lacquered_wood" and c.lux > 50:
            raise ConservationAlert(f"{c.id} 照度超标：{c.lux} lux")`,
  },

  verdicts: {
    positive: "展线、照度、修复三条线全部通过文保评审，如期开幕",
    warning: "漆木灯展柜湿度波动仍偏大，除湿方案本周复核",
    neutral: "两馆巡展意向待观展数据满月后再谈",
  },

  sources: [
    { label: "借展协议与在展清单", ref: "十一家机构，展务档案" },
    { label: "修复全程影像档案", ref: "修复中心，十一个月" },
    { label: "低照度展陈评审意见", url: "https://example.com/lamp-show-conservation" },
  ],

  captions: ["雁鱼灯导烟管的剖面示意", "五十勒克斯下的掌灯段展线", "修复台上的省油灯夹层", "夜场里观众与灯影同框"],

  url: "jiangyuan-museum.example.cn/lamps",

  scatterHeading: "停留越久的展段，留言越具体",
  scatterSubhead: "五个展段的平均停留时长与留言字数对照",
  bubbleSizeNote: "口径：开展首月观众动线抽样，气泡面积为该段展品数。",
}
