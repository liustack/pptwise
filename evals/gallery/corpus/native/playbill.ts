import type { Lexicon } from "../lexicon"

/**
 * playbill 原生选题：大学生剧社的毕业大戏节目册。
 * 主角是一出戏和一群要散场的人，语域是节目册：
 * 热忱、直给，带着告别的劲儿。
 */
export const PLAYBILL_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "《候鸟旅馆》毕业公演",
  deckSubtitle: "拾光剧社第十二届毕业大戏 · 原创三幕剧",
  author: "拾光剧社",
  date: "2026 年 6 月",

  chapters: ["剧情简介", "主创名单", "幕次说明", "排练手记", "致谢", "散场之后"],

  headings: [
    "一间只在毕业季营业的旅馆",
    "**三幕九场**：入住、失物、退房",
    "十四个角色，十一位演员，三个人演了俩",
    "剧本改了十一稿，最后一稿在天台定的",
    "排练一百零二天，请假记录只有四条",
    "舞美预算三千二，床是从宿舍抬来的",
    "灯光台词本上贴了两百张便签",
    "音效全部现场收音，包括那场雨",
    "首演两场七百张票三天售罄",
    "加场的决定是全社投票的",
    "六位大四社员的最后一次谢幕",
    "戏散了，旅馆永远营业",
    "把没说完的话，留在台上",
  ],

  kickers: ["剧情", "主创", "幕次", "手记", "致谢", "散场"],

  paragraph:
    "《候鸟旅馆》讲一间只在毕业季营业的旅馆：入住的人寄存行李，也寄存没说出口的话。退房时，行李都在，话不一定。剧本改了十一稿，排练一百零二天，十一位演员演十四个角色，舞美预算三千二，那张床是从男生宿舍抬来的。这是拾光剧社第十二届毕业大戏，也是六位大四社员的最后一次谢幕。",

  shortParagraph:
    "《候鸟旅馆》讲一间只在毕业季营业的旅馆：入住的人寄存行李，也寄存没说出口的话。退房时行李都在，话不一定。剧本改了十一稿，排练一百零二天，十一位演员演十四个角色，舞美预算三千二，床是从宿舍抬来的。这是第十二届毕业大戏，也是六位大四社员最后一次谢幕。",

  sentences: [
    "全剧三幕九场约一百一十分钟，无中场。",
    "十一位演员分饰十四个角色，换装最快纪录十九秒。",
    "剧本历经十一稿，首稿与终稿只保留了同一句台词。",
    "排练自三月三日起共一百零二天，全员请假记录四条。",
    "舞美总预算三千二百元，四成花在那盏旅馆霓虹灯上。",
    "音效全部现场收音，雨声录自五月十四日凌晨的天台。",
    "首演两场七百张票三天售罄，加场票十九分钟售罄。",
    "加场决定由全社四十三人投票，四十一票赞成。",
    "本届毕业社员六人，谢幕环节有单独的一束光。",
    "演出收入扣除成本后全部注入剧社公积金。",
    "节目册插画由社员手绘，原稿演出后拍卖。",
    "散场通道设留言墙，笔和便签由前台提供。",
  ],

  bullets: [
    "三幕九场无中场",
    "十一人演十四个角色",
    "剧本改了十一稿",
    "排练一百零二天",
    "七百张票三天售罄",
    "六位毕业生最后谢幕",
  ],

  phrases: [
    "毕业大戏",
    "候鸟旅馆",
    "十一稿定本",
    "十九秒换装",
    "天台定稿",
    "现场收音",
    "宿舍抬床",
    "霓虹灯招牌",
    "加场投票",
    "单独一束光",
    "留言墙",
    "永远营业",
  ],

  labels: [
    "第一幕",
    "第二幕",
    "第三幕",
    "序场",
    "尾声",
    "导演组",
    "表演组",
    "舞美组",
    "灯光组",
    "音效组",
    "服装组",
    "前台组",
    "首演场",
    "第二场",
    "加演场",
    "校外场",
  ],

  strengths: ["原创剧本有真实底色", "排练出勤近乎全勤", "跨年级配合默契", "票房口碑双双超预期"],
  weaknesses: ["舞美经费捉襟见肘", "男生角色长期缺人", "灯光设备靠外借", "巡演经验为零"],
  opportunities: ["校外剧场发来邀约", "毕业剧本可投青年戏剧节", "往届社员愿意资助", "剧社公众号涨粉三倍"],
  threats: ["六位骨干毕业断层", "期末周挤压排练", "外借设备档期冲突", "雨季影响天台排练"],

  stages: ["剧本围读", "分幕排练", "合成联排", "带妆彩排", "正式公演", "复盘散伙饭"],
  periods: ["三月", "四月", "五月", "六月上", "六月下"],
  periodAxis: "月份",
  segmentAxis: "组别",
  decision: "散场之后先做哪一件",
  levels: [
    { title: "看过海报", value: "1200", unit: "人" },
    { title: "买过票", value: "420", unit: "人" },
    { title: "看完全场", value: "380", unit: "人" },
    { title: "二刷", value: "46", unit: "人" },
  ],
  handover: { owners: [0, 1, 2, 0, 0], note: "彩排改的台词要连夜发给两位主角，正式场前只剩一次对词" },
  choices: [
    {
      edge: "先巡演 · 52%",
      title: "去三所学校",
      detail: "场地免费",
      outcomes: [
        { edge: "44%", title: "只演一场", detail: "队伍好凑", value: "9", unit: "天" },
        { edge: "56%", title: "每校两场", detail: "要请两周假", value: "14", unit: "天", recommended: true },
      ],
    },
    {
      edge: "先留校复排 · 48%",
      title: "把第十一稿定本演完",
      detail: "不出校门",
      outcomes: [
        { edge: "53%", title: "只加排练", detail: "细节更稳", value: "11", unit: "天" },
        { edge: "47%", title: "排练加录像", detail: "要借设备", value: "16", unit: "天" },
      ],
    },
  ],

  sets: {
    labels: ["三幕都到场", "台词背熟", "有替补"],
    overlap: "三样齐备的角色",
  },
  causes: {
    effect: "第二幕合成联排延了三次",
    categories: [
      { label: "人", causes: ["男生角色长期缺人", "两位主演考试周撞车"] },
      { label: "本子", causes: ["第二幕改到第十一稿", "第二场的调度未定"] },
      { label: "场地", causes: ["大剧场每周只批两晚", "小剧场无侧台"] },
      { label: "舞美", causes: ["旅馆布景搭建超时", "灯光挂杆需另请工人"] },
    ],
  },
  positions: {
    x: { title: "排练投入", low: "少", high: "多" },
    y: { title: "现场效果", low: "弱", high: "强" },
    quadrants: ["投入少效果好，天赋场次", "投入多效果也好，压轴", "投入少效果也弱，可裁", "投入多效果弱，要改本"],
    points: [
      { label: "第三幕", x: 82, y: 88, mine: true },
      { label: "第一幕", x: 62, y: 74 },
      { label: "第二幕", x: 90, y: 52 },
      { label: "序场", x: 24, y: 46 },
      { label: "尾声", x: 30, y: 78 },
      { label: "群戏一", x: 70, y: 40 },
      { label: "独白段", x: 18, y: 66 },
      { label: "谢幕", x: 14, y: 30 },
    ],
  },
  equation: {
    operands: [
      { label: "排练天数", value: "102 天", note: "出勤近乎全勤" },
      { label: "剧本修改", value: "11 稿", note: "第二幕改得最多" },
    ],
    result: { label: "首轮票量", value: "700 张", note: "两场坐满" },
  },
  wheel: {
    whole: "一台戏的六段",
    sectors: [
      { label: "剧本围读", value: "十一稿" },
      { label: "分幕排练", value: "七十天" },
      { label: "合成联排", value: "三次" },
      { label: "带妆彩排", value: "两晚" },
      { label: "正式公演", value: "两场" },
      { label: "复盘散伙饭", value: "散场后" },
    ],
    marked: 2,
  },
  debate: {
    proposal: "把第二幕删掉一场",
    forTitle: "支持",
    againstTitle: "反对",
    pros: [
      { label: "联排三次都卡在这场", note: "调度到今天仍未定" },
      { label: "总时长能回到两小时", note: "现在超出十七分钟" },
      { label: "舞美搭建可省一景", note: "经费正好差这一笔" },
      { label: "两位主演压力减半", note: "考试周与彩排重叠" },
    ],
    cons: [
      { label: "旅馆老板的动机断了", note: "第三幕的转折要靠这场铺" },
      { label: "两位配角戏份归零", note: "毕业公演，谁都想上台" },
      { label: "第十一稿刚改完这场", note: "编剧熬了两周" },
      { label: "宣传已按三幕做过", note: "海报与节目单都印了" },
    ],
    verdict: "第二幕第二场压缩到六分钟，保留旅馆老板的两段独白，配角改到序场里出场。",
  },
  orgs: [
    "拾光剧社",
    "校学生活动中心",
    "校大剧场",
    "青年戏剧节组委会",
    "校外小剧场",
    "往届社员会",
    "校广播台",
    "手绘插画组",
    "服装租赁行",
    "灯光设备社",
    "剧社公众号",
    "散伙饭组委会",
  ],

  people: [
    { name: "戚照野", role: "编剧 · 导演 · 大四", org: "拾光剧社" },
    { name: "满天星", role: "女主角「旅馆老板娘」", org: "表演组" },
    { name: "胡十一", role: "男主角「迟到的房客」", org: "表演组" },
    { name: "毛豆", role: "舞美组长 · 霓虹灯手作人", org: "舞美组" },
    { name: "简单", role: "灯光执行 · 便签本主人", org: "灯光组" },
    { name: "老白师傅", role: "剧场技术指导", org: "校大剧场" },
  ],

  metrics: [
    { value: "102", unit: "天", label: "排练天数", delta: "flat" },
    { value: "11", unit: "稿", label: "剧本修改", delta: "flat" },
    { value: "700", unit: "张", label: "首轮票量", delta: "up" },
    { value: "19", unit: "分钟", label: "加场售罄", delta: "down" },
    { value: "3200", unit: "元", label: "舞美预算", delta: "flat" },
    { value: "6", unit: "人", label: "毕业社员", delta: "flat" },
  ],

  tags: [
    "毕业公演",
    "原创三幕剧",
    "校园戏剧",
    "十一稿",
    "现场收音",
    "手绘节目册",
    "加场",
    "谢幕之光",
    "留言墙",
    "公积金",
    "戏剧节投递",
    "散伙饭",
  ],
  frequencies: [
    { text: "排练", weight: 4 },
    { text: "定稿", weight: 4 },
    { text: "谢幕", weight: 4 },
    { text: "舞美", weight: 3 },
    { text: "灯光", weight: 3 },
    { text: "加场", weight: 3 },
    { text: "毕业", weight: 3 },
    { text: "台词", weight: 2 },
    { text: "候场", weight: 2 },
    { text: "音效", weight: 2 },
    { text: "海报", weight: 2 },
    { text: "道具", weight: 1 },
    { text: "签到墙", weight: 1 },
    { text: "散场", weight: 1 },
  ],
  tallies: [
    { filled: 6, caption: "十位社员中", label: "今年就要毕业离开剧社" },
    { filled: 9, caption: "十张首轮票中", label: "在开票当天卖了出去" },
    { filled: 4, caption: "十次合成排练中", label: "从头到尾没有中断" },
  ],
  goals: [
    { title: "排练天数", target: "90 天", actual: "102 天", gap: "+12 天", status: "on_track" },
    { title: "首轮票量", target: "600 张", actual: "700 张", gap: "+100 张", status: "on_track" },
    { title: "加场售罄用时", target: "30 分钟", actual: "19 分钟", gap: "-11 分钟", status: "on_track" },
    { title: "舞美预算", target: "3200 元", actual: "3860 元", gap: "+660 元", status: "watch" },
    { title: "剧本定稿轮次", target: "6 稿", actual: "11 稿", gap: "+5 稿", status: "off_track" },
    { title: "合成排练完成", target: "4 次", actual: "2 次", gap: "-2 次", status: "off_track" },
  ],
  shortlist: {
    criteria: ["排得出来", "舞美花钱", "观众进得去", "社员扛得住"],
    options: [
      { label: "空台加一束光", scores: [100, 100, 50, 100], total: 88, chosen: true },
      { label: "搭两层实景", scores: [25, 0, 100, 25], total: 38 },
      { label: "投影当布景", scores: [75, 75, 75, 75], total: 75 },
      { label: "借隔壁剧社的景", scores: [50, 100, 75, 50], total: 69 },
      { label: "沿用去年那套", scores: [75, 100, 25, 75], total: 69 },
    ],
  },

  products: [
    { name: "公演门票", note: "四场同价，可选座", price: "¥80", priceUnit: "张" },
    { name: "学生票", note: "凭学生证入场，限前两排外", price: "¥40", priceUnit: "张" },
    { name: "纪念节目册", note: "含剧本节选与后台照片", price: "¥35", priceUnit: "本" },
  ],

  orgChart: {
    root: { name: "戚照野", role: "编剧 · 导演" },
    managers: [
      {
        name: "满天星",
        role: "女主角",
        reports: [{ name: "胡十一", role: "男主角" }, { name: "阿桐", role: "群戏统筹" }],
      },
      {
        name: "毛豆",
        role: "舞美组长",
        reports: [{ name: "简单", role: "灯光执行" }],
      },
      {
        name: "老白师傅",
        role: "剧场技术指导",
        reports: [{ name: "小雀", role: "票务" }, { name: "阿鸣", role: "音效" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "海报上写的",
    above: ["三幕九场，中间不休息"],
    belowLabel: "排练厅里的",
    below: [
      "舞美经费捉襟见肘",
      "男生角色长期缺人",
      "灯光设备全靠外借",
      "巡演经验干脆是零",
    ],
  },
  chain: {
    links: [
      { label: "剧本围读", value: "12", unit: "%" },
      { label: "分幕排练", value: "26", unit: "%" },
      { label: "合成联排", value: "24", unit: "%" },
      { label: "正式公演", value: "23", unit: "%" },
    ],
    support: [
      { label: "舞美与道具", note: "霓虹灯手作 · 旅馆前台 · 雨声装置" },
      { label: "灯光与音效", note: "外借灯具 · 便签本 cue 表 · 返场音乐" },
      { label: "票务与宣传", note: "首轮七百张 · 校内海报 · 谢幕合影" },
    ],
    margin: { label: "巡演余力", value: "15%" },
  },
  quote: {
    text: "旅馆是假的，床是宿舍的，雨是录的，只有告别是真的。",
    attribution: "戚照野，导演的话",
  },

  callouts: {
    info: "演出全长约一百一十分钟无中场，开演后迟到观众请于第一幕换场时入座。",
    warn: "剧中有一段全场熄灯约四十秒，属剧情设计，请勿开手机照明。",
    tip: "散场别急着走，留言墙的便签写满一面时，前台会亮起旅馆的霓虹灯。",
  },

  code: {
    language: "python",
    code: `def quick_change(actor: Actor, scene: int) -> float:
    """换装秒表：超过三十秒就要改调度，不为难演员。"""
    t = actor.change_seconds(scene)
    if t > 30:
        raise BlockingNote(f"{actor.name} 第{scene}场换装 {t}s，调度重排")
    return t`,
  },

  verdicts: {
    positive: "首轮口碑与票房齐收，加演场如期落地",
    warning: "六位骨干毕业在即，秋招新社员是头等大事",
    neutral: "校外剧场邀约与戏剧节投递，散伙饭后再议",
  },

  sources: [
    { label: "排练日志与出勤表", ref: "拾光剧社，一百零二天全记录" },
    { label: "票务与结算流水", ref: "前台组，两场加一场" },
    { label: "十一稿剧本存档", url: "https://example.com/houniao-hotel-drafts" },
  ],

  captions: ["天台定稿那晚的剧本合影", "毛豆手作的旅馆霓虹灯", "十九秒换装的侧幕通道", "谢幕时留给毕业生的那束光"],

  url: "shiguang-drama.example.edu.cn",

  scatterHeading: "围读次数越多的场次，联排卡顿越少",
  scatterSubhead: "九场戏的围读次数与联排中断次数对照",
  bubbleSizeNote: "口径：排练日志统计，气泡面积为该场演员人数。",
}
