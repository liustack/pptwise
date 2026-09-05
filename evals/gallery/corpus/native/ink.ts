import type { Lexicon } from "../lexicon"

/**
 * ink 原生选题：书法社秋季雅集暨社藏展的开幕导言。
 * 主角是一个民间书社和一批字，语域是雅集主持：
 * 有出处、有款识，克制而不掉书袋。
 */
export const INK_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "听雨书社丙午秋集",
  deckSubtitle: "社藏五十件暨社课汇观，兼致来宾",
  author: "听雨书社 同人谨启",
  date: "2026 年 10 月",

  chapters: ["缘起", "社藏选目", "社课汇观", "笔会安排", "藏品故事", "谢客"],

  headings: [
    "十四年秋集，头一次把库房搬进展厅",
    "**心画**：字是写字人的心电图",
    "五十件社藏，最远的一件走了三百年",
    "今年社课的主题只有一个字：慢",
    "二十七位社友，最小的十一岁",
    "临帖一年，通临《书谱》的有九人",
    "残帖的缺角，是时间自己的落款",
    "笔会不设评委，只设茶",
    "一方民国旧砚回到了它主人的故乡",
    "拓片修复用了整整八个月",
    "展签只写事实，好坏留给看的人",
    "所有展件谢绝闪光灯",
    "字外无字，见字如晤",
  ],

  kickers: ["缘起", "选目", "社课", "笔会", "故事", "谢客"],

  paragraph:
    "听雨书社立社十四年，秋集办了十三回，都是社友之间关起门写字。今年破例开门，把库房里的五十件社藏搬进展厅，不为别的：字这个东西，挂起来才活。选目不问名头大小，只问一件事，这张字有没有它自己的呼吸。展签一律只写尺寸、纸墨、年代和递藏，不写一个形容词，好坏高下，留给站在它面前的人。",

  shortParagraph:
    "听雨书社立社十四年，秋集办了十三回，都是社友关起门写字。今年破例开门，把库房里五十件社藏搬进展厅：字这个东西，挂起来才活。选目不问名头，只问这张字有没有自己的呼吸。展签只写尺寸、纸墨、年代和递藏，不写一个形容词，好坏留给站在它面前的人。",

  sentences: [
    "本届秋集展出社藏五十件，社课作品三十六件。",
    "年代最早的一件为清康熙间行书立轴，递藏有绪。",
    "社友二十七人，年龄自十一岁至八十三岁。",
    "本年社课以「慢」为题，日课一纸，全年不辍。",
    "通临孙过庭《书谱》全卷者九人，历时十至十四个月。",
    "残宋拓一册经八个月修复，缺角原样保留。",
    "民国铭砚一方经社友寻访，捐还原主家乡文史馆。",
    "笔会设长案六张，纸墨由社中公备。",
    "展厅恒温恒湿，全场谢绝闪光灯与触碰。",
    "展签体例：尺寸、纸墨、年代、递藏，凡四项。",
    "秋集不售门票，观者以留言代润。",
    "闭幕日举行小型雅集，来宾可同临一帖。",
  ],

  bullets: [
    "社藏五十件首次公开",
    "社课作品三十六件",
    "通临书谱者九人",
    "残拓修复八个月",
    "展签只写四项事实",
    "笔会不设评委只设茶",
  ],

  phrases: [
    "日课一纸",
    "通临全卷",
    "递藏有绪",
    "原样留缺",
    "以留言代润",
    "纸墨公备",
    "见字如晤",
    "临池之约",
    "款识细读",
    "残帖之美",
    "同临一帖",
    "字外功夫",
  ],

  labels: [
    "立轴",
    "手卷",
    "册页",
    "对联",
    "扇面",
    "拓片",
    "楷书",
    "行书",
    "草书",
    "隶书",
    "篆书",
    "社课区",
    "藏品区",
    "笔会区",
    "茶席",
    "留言台",
  ],

  strengths: ["社藏体系小而完整", "日课制度坚持十四年", "老中青三代传承不断", "修复与考据能力在社内"],
  weaknesses: ["展陈经验几乎为零", "库房恒湿设备老旧", "社费仅够日常笔墨", "考据人手只有两位"],
  opportunities: ["文史馆愿意长期借展", "青少年书法班反响热烈", "旧藏家后人主动联络", "高校书法社请求联谊"],
  threats: ["纸本藏品的虫霉风险", "商业机构借名办展", "老社友精力渐减", "场地租约明年到期"],

  stages: ["选目定件", "修复装池", "展签考据", "布展调光", "开幕雅集", "闭幕同临"],
  periods: ["立秋", "处暑", "白露", "秋分", "寒露"],
  periodAxis: "节气",
  segmentAxis: "书体",
  decision: "社课先排哪一课",
  levels: [
    { title: "来看过", value: "420", unit: "人" },
    { title: "报名社课", value: "168", unit: "人" },
    { title: "交过日课", value: "72", unit: "人" },
    { title: "有作品入展", value: "19", unit: "人" },
  ],
  handover: { owners: [0, 0, 1, 1, 2], note: "考据写完展签才定得了展线，布展那两天最紧" },
  choices: [
    {
      edge: "先排日课 · 59%",
      title: "每天一纸",
      detail: "门槛最低",
      outcomes: [
        { edge: "47%", title: "只临帖", detail: "进步看得见", value: "26", unit: "人" },
        { edge: "53%", title: "临帖加讲评", detail: "要占社长两个晚上", value: "41", unit: "人", recommended: true },
      ],
    },
    {
      edge: "先排通临 · 41%",
      title: "全卷临一遍",
      detail: "需要三个月",
      outcomes: [
        { edge: "55%", title: "只排一卷", detail: "完成率高", value: "14", unit: "人" },
        { edge: "45%", title: "排两卷", detail: "中途会掉人", value: "9", unit: "人" },
      ],
    },
  ],

  sets: {
    labels: ["社藏原件", "考据完整", "有社课临本"],
    overlap: "三样齐全的展件",
  },
  causes: {
    effect: "布展进度落后两周",
    categories: [
      { label: "展件", causes: ["三件手卷待修复装池", "两件展签考据未定"] },
      { label: "场地", causes: ["文史馆档期临时后移", "展墙尺寸与立轴不合"] },
      { label: "人手", causes: ["在社社友多为在职", "布展经验几乎为零"] },
      { label: "设备", causes: ["库房恒湿设备老旧", "调光轨道需另租"] },
    ],
  },
  positions: {
    x: { title: "展陈经验", low: "生", high: "熟" },
    y: { title: "藏品完整度", low: "散", high: "全" },
    quadrants: ["藏得全但不会展，我们在这", "又全又会展，可办巡展", "既不全也不会展，先积累", "会展但藏得散，靠借展"],
    points: [
      { label: "听雨书社", x: 22, y: 78, mine: true },
      { label: "区文史馆", x: 76, y: 52 },
      { label: "高校书法社", x: 34, y: 36 },
      { label: "青少年书法班", x: 28, y: 20 },
      { label: "装裱工坊", x: 62, y: 30 },
      { label: "纸墨庄", x: 44, y: 24 },
      { label: "邻市书社", x: 58, y: 68 },
      { label: "省书协展", x: 88, y: 74 },
    ],
  },
  equation: {
    operands: [
      { label: "社藏展件", value: "50 件", note: "立轴手卷册页各有" },
      { label: "社课作品", value: "36 件", note: "十四年日课所出" },
    ],
    result: { label: "秋集展线", value: "86 件", note: "分四厅一线走完" },
  },
  wheel: {
    whole: "办一次秋集",
    sectors: [
      { label: "选目定件", value: "五十件" },
      { label: "修复装池", value: "三件" },
      { label: "展签考据", value: "两件待定" },
      { label: "布展调光", value: "三天" },
      { label: "开幕雅集", value: "重阳" },
      { label: "闭幕同临", value: "全社" },
    ],
    marked: 2,
  },
  debate: {
    proposal: "秋集全部展件都配考据展签",
    forTitle: "支持",
    againstTitle: "反对",
    pros: [
      { label: "来宾多为初次观展", note: "去年问得最多的是年代" },
      { label: "考据是社课的成果", note: "十四年日课的另一半" },
      { label: "展签可留作社藏档案", note: "此后每次展览可复用" },
      { label: "社友愿意分担撰写", note: "已有九人报名" },
    ],
    cons: [
      { label: "两件出处尚有争议", note: "写定等于替争议下结论" },
      { label: "撰写周期压到十天", note: "布展本已落后两周" },
      { label: "展签排版需另请人", note: "社内无人做过版式" },
      { label: "字数一多观众不读", note: "去年长签前少有人停留" },
    ],
    verdict: "四十八件配短签，两件存疑的只标现藏与尺寸，考据长文另编一册放在案头。",
  },
  orgs: [
    "听雨书社",
    "区文史馆",
    "装裱工坊",
    "纸墨庄",
    "青少年书法班",
    "高校书法社",
    "藏家后人会",
    "展厅场务",
    "修复小组",
    "考据小组",
    "茶席同人",
    "留言整理组",
  ],

  people: [
    { name: "陆听雨", role: "社长 · 立社人", org: "听雨书社" },
    { name: "邵九如", role: "考据 · 展签执笔", org: "考据小组" },
    { name: "温阿宝", role: "最小社友 · 十一岁", org: "青少年书法班" },
    { name: "霍老", role: "最长社友 · 八十三岁", org: "听雨书社" },
    { name: "裴云装", role: "装裱师", org: "装裱工坊" },
    { name: "沈拓", role: "拓片修复", org: "修复小组" },
  ],

  metrics: [
    { value: "50", unit: "件", label: "社藏展件", delta: "flat" },
    { value: "36", unit: "件", label: "社课作品", delta: "up" },
    { value: "27", unit: "人", label: "在社社友", delta: "up" },
    { value: "9", unit: "人", label: "通临书谱", delta: "up" },
    { value: "8", unit: "个月", label: "残拓修复", delta: "flat" },
    { value: "14", unit: "年", label: "立社年头", delta: "flat" },
  ],

  tags: [
    "秋集",
    "社藏",
    "日课",
    "通临",
    "递藏",
    "装池",
    "款识",
    "拓片",
    "雅集",
    "茶席",
    "留言代润",
    "同临一帖",
  ],
  frequencies: [
    { text: "临帖", weight: 4 },
    { text: "书谱", weight: 4 },
    { text: "社课", weight: 4 },
    { text: "款识", weight: 3 },
    { text: "残拓", weight: 3 },
    { text: "生宣", weight: 3 },
    { text: "雅集", weight: 3 },
    { text: "揭裱", weight: 2 },
    { text: "松烟", weight: 2 },
    { text: "章法", weight: 2 },
    { text: "题跋", weight: 2 },
    { text: "钤印", weight: 1 },
    { text: "碑帖", weight: 1 },
    { text: "笔性", weight: 1 },
  ],
  tallies: [
    { filled: 3, caption: "十位在社社友中", label: "今年通临了一遍书谱" },
    { filled: 7, caption: "十件社课作品中", label: "被选入了这次社藏展" },
    { filled: 5, caption: "十张残拓中", label: "已经完成揭裱与补全" },
  ],
  goals: [
    { title: "社藏展件", target: "48 件", actual: "50 件", gap: "+2 件", status: "on_track" },
    { title: "社课作品", target: "30 件", actual: "36 件", gap: "+6 件", status: "on_track" },
    { title: "在社社友", target: "25 人", actual: "27 人", gap: "+2 人", status: "on_track" },
    { title: "通临书谱", target: "12 人", actual: "9 人", gap: "-3 人", status: "watch" },
    { title: "残拓修复", target: "6 个月", actual: "8 个月", gap: "+2 个月", status: "off_track" },
    { title: "雅集到场", target: "80 人", actual: "52 人", gap: "-28 人", status: "off_track" },
  ],
  shortlist: {
    criteria: ["纸墨相宜", "初学好上手", "留得住", "耗费"],
    options: [
      { label: "生宣配松烟", scores: [100, 25, 75, 50], total: 62 },
      { label: "半熟宣配油烟", scores: [75, 100, 75, 75], total: 81, chosen: true },
      { label: "毛边纸练日课", scores: [25, 100, 25, 100], total: 62 },
      { label: "洒金笺写小品", scores: [75, 25, 100, 0], total: 50 },
      { label: "仿古皮纸", scores: [50, 50, 100, 25], total: 56 },
    ],
  },

  products: [
    { name: "社藏册页", note: "五十件影印，宣纸线装", price: "¥380", priceUnit: "函" },
    { name: "笔墨入门套", note: "羊毫两支、松烟一锭、毡一方", price: "¥260", priceUnit: "套" },
    { name: "社课 · 秋季", note: "每周一课，十二课一期", price: "¥1600", priceUnit: "期" },
  ],

  orgChart: {
    root: { name: "陆听雨", role: "社长 · 立社人" },
    managers: [
      {
        name: "邵九如",
        role: "考据 · 展签执笔",
        reports: [{ name: "温阿宝", role: "最小社友 · 十一岁" }, { name: "霍老", role: "最长社友 · 八十三岁" }],
      },
      {
        name: "裴云装",
        role: "装裱师",
        reports: [{ name: "沈拓", role: "拓片修复" }],
      },
      {
        name: "阮砚",
        role: "布展与调光",
        reports: [{ name: "小雪", role: "展签誊写" }, { name: "周晏", role: "开幕雅集" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "请柬上写的",
    above: ["社藏五十件首次公开"],
    belowLabel: "库房里知道的",
    below: [
      "展陈经验几乎为零",
      "库房恒湿设备老旧",
      "社费只够日常笔墨",
      "考据人手只有两位",
    ],
  },
  chain: {
    links: [
      { label: "选目定件", value: "13", unit: "%" },
      { label: "修复装池", value: "29", unit: "%" },
      { label: "展签考据", value: "22", unit: "%" },
      { label: "布展调光", value: "19", unit: "%" },
    ],
    support: [
      { label: "库房与养护", note: "恒湿柜 · 樟木箱 · 防虫香" },
      { label: "考据与文墨", note: "题跋比对 · 印鉴查证 · 展签誊写" },
      { label: "社课与雅集", note: "每月社课 · 秋集开幕 · 拓片同乐" },
    ],
    margin: { label: "可续办余力", value: "17%" },
  },
  quote: {
    text: "把字挂起来，不是让人来评的，是让字透一口气。",
    attribution: "陆听雨，开幕致辞",
  },

  callouts: {
    info: "展期十月十日至三十一日，逢周一闭馆整理，笔会限闭幕日下午。",
    warn: "展厅内谢绝闪光灯、触碰与临摹架设备，纸寿有限，敬请体谅。",
    tip: "看残帖先看缺角与虫蚀的走向，时间改过的地方往往最耐看。",
  },

  code: {
    language: "python",
    code: `def provenance_chain(item: Piece) -> list[str]:
    """整理一件藏品的递藏链，缺环如实标注，不补不猜。"""
    chain = [h.holder for h in item.history if h.verified]
    if len(chain) < len(item.history):
        chain.append("（递藏有缺，存疑待考）")
    return chain`,
  },

  verdicts: {
    positive: "选目、修复、考据三事齐备，开门办展的条件成熟",
    warning: "恒湿设备须在展前更换，纸本安全高于一切",
    neutral: "与文史馆的长期借展之议，秋集之后再定",
  },

  sources: [
    { label: "社藏总目与递藏考", ref: "考据小组辑，丙午秋定稿" },
    { label: "日课登记簿", ref: "听雨书社，十四年连续记录" },
    { label: "残宋拓修复记录", url: "https://example.com/tingyu-rubbing-repair" },
  ],

  captions: ["残宋拓修复前后的同一页", "霍老八十三岁的日课一纸", "布展夜里的最后一次调光", "十一岁社友的通临起笔"],

  url: "tingyushushe.example.cn",

  scatterHeading: "日课越勤的社友，通临完成度越高",
  scatterSubhead: "二十七位社友的年日课纸数与通临进度对照",
  bubbleSizeNote: "口径：日课登记簿，气泡面积为入社年数。",
}
