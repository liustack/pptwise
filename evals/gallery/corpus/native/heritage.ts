import type { Lexicon } from "../lexicon"

/**
 * heritage 原生选题：百年酱园第四代接班人的焕新交底会。
 * 主角是一口酱缸和一条老街，听众是家族长辈和老街坊：
 * 什么坚决不变、什么必须要变，一条一条说清楚。
 */
export const HERITAGE_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "沈记酱园焕新交底会",
  deckSubtitle: "一百零三年的酱缸不动，动的是别的",
  author: "第四代主理人 沈曼笙",
  date: "2026 年 4 月",

  chapters: ["家底盘点", "不变的清单", "要变的清单", "新铺与老街", "账目与分工", "百年之约"],

  headings: [
    "一百零三年，四代人，两百一十七口老缸",
    "**古法三伏酱**的工序一步不减，这是底线",
    "老主顾平均年龄六十四岁，这是最响的警钟",
    "三年间老街客流少了四成，酱园销量只跌一成八",
    "小罐装让年轻人第一次把酱油带回了家",
    "前店后坊改成可参观，玻璃换墙不换灶",
    "线上只卖三款，卖多就是砸招牌",
    "二伯守缸，三姑管账，我跑新渠道",
    "定价涨一成二，涨的是手工的实价",
    "学徒招了四个年轻人，最小的十九岁",
    "祖训八个字重新挂回门楣",
    "翻新预算四十八万，不借外债",
    "把一百年攒下的信任，再传一百年",
  ],

  kickers: ["家底", "不变", "要变", "店面", "账目", "约定"],

  paragraph:
    "先把家底交代清楚：沈记今年一百零三年，两百一十七口老缸都还活着，古法三伏酱的十二道工序一步没减。但另一本账也得摆出来，老主顾平均年龄六十四岁，老街客流三年少了四成。焕新不是把老的丢掉，是把不变的守死、把该变的变透：酱缸、工序、原料一个字不动，动的是罐子的大小、店面的门脸和卖酱的路子。翻新预算四十八万，全部自有，不借外债。",

  shortParagraph:
    "家底先交代清楚：沈记一百零三年，两百一十七口老缸都活着，十二道工序一步没减。另一本账也得摆出来：老主顾平均六十四岁，老街客流三年少四成。焕新不是丢掉老的，是把不变的守死、该变的变透：缸、工序、原料一字不动，动的是罐子、门脸和卖酱的路子。",

  sentences: [
    "沈记创号于一九二三年，现存老缸两百一十七口。",
    "古法三伏酱全程五百四十天，十二道工序保持原样。",
    "老主顾平均年龄六十四岁，四十岁以下顾客占比不足一成。",
    "老街客流三年下滑四成，酱园销量同期只跌一成八。",
    "一百八十克小罐装试销三个月，复购率三成六。",
    "前店后坊改造为可参观动线，发酵区隔玻璃不隔味。",
    "线上渠道只上三款经典品，不做联名不做代工。",
    "家族分工重定：守缸、管账、拓渠各归其人。",
    "零售价整体上调一成二，敬老街坊价保持不变。",
    "新收学徒四人，签的是六年师承约。",
    "翻新预算四十八万元，全部来自自有积蓄。",
    "祖训「宁少一缸，不欺一人」重新制匾挂回门楣。",
  ],

  bullets: [
    "两百一十七口老缸不动",
    "十二道工序一步不减",
    "小罐装复购三成六",
    "线上只卖三款经典",
    "涨价一成二敬老价不变",
    "四十八万翻新不借债",
  ],

  phrases: [
    "古法三伏酱",
    "老缸活养",
    "前店后坊",
    "可参观动线",
    "小罐装",
    "敬老街坊价",
    "六年师承约",
    "不做代工",
    "门楣祖训",
    "自有翻新",
    "守缸人",
    "百年之约",
  ],

  labels: [
    "头抽",
    "二抽",
    "豆瓣酱",
    "甜面酱",
    "腐乳",
    "老缸区",
    "晒场",
    "前店",
    "后坊",
    "老街铺",
    "线上店",
    "市集摊",
    "春酿",
    "三伏",
    "秋收",
    "冬藏",
  ],

  strengths: ["百年字号信任仍在", "工序完整且有人守", "口味在盲测中稳赢", "家族分工达成一致"],
  weaknesses: ["客群老化严重", "产能被工序天花板锁死", "包装设计长期缺位", "年轻学徒刚刚起步"],
  opportunities: ["老街改造带来参观客流", "小罐装打开家用场景", "本地文旅愿意合作导流", "手作食品的信任溢价"],
  threats: ["工业酱油的价格挤压", "仿冒「沈记」字号出现", "老师傅年事渐高", "原料黄豆价格波动"],

  stages: ["家底盘点", "工序封档", "门店翻新", "小罐试销", "学徒开班", "焕新开街"],
  periods: ["立春", "谷雨", "小暑", "白露", "冬至"],
  periodAxis: "节气",
  segmentAxis: "品类",
  decision: "新铺先做哪一件",
  levels: [
    { title: "认得招牌", value: "4200", unit: "人" },
    { title: "买过一次", value: "1800", unit: "人" },
    { title: "每年都买", value: "620", unit: "人" },
    { title: "带人来买", value: "180", unit: "人" },
  ],
  handover: { owners: [2, 1, 0, 0, 1], note: "账房盘完家底才轮到守缸师傅封工序，中间隔了一个伏天" },
  choices: [
    {
      edge: "先开新铺 · 57%",
      title: "老街口那一间",
      detail: "租期五年",
      outcomes: [
        { edge: "44%", title: "只做零售", detail: "回本慢", value: "4", unit: "年" },
        { edge: "56%", title: "零售带参观动线", detail: "要留出后坊", value: "3", unit: "年", recommended: true },
      ],
    },
    {
      edge: "先做小罐 · 43%",
      title: "试销两百罐",
      detail: "不动门店",
      outcomes: [
        { edge: "52%", title: "只在门店卖", detail: "客群不变", value: "5", unit: "年" },
        { edge: "48%", title: "门店加线上", detail: "得请人拍图", value: "4", unit: "年" },
      ],
    },
  ],

  sets: {
    labels: ["老缸发酵", "三伏晒足", "手工翻醅"],
    overlap: "三样都守住的酱",
  },
  causes: {
    effect: "客群平均年龄升到五十七岁",
    categories: [
      { label: "产品", causes: ["最小规格是五斤装", "口味只有传统一档"] },
      { label: "门店", causes: ["前店陈列二十年未变", "招牌看不出在卖什么"] },
      { label: "渠道", causes: ["只在老街两家店卖", "没有可寄送的包装"] },
      { label: "讲述", causes: ["工序没人讲得出来", "学徒不出现在店里"] },
    ],
  },
  positions: {
    x: { title: "购买便利度", low: "难买", high: "好买" },
    y: { title: "客单价", low: "低", high: "高" },
    quadrants: ["难买且贵，只剩老客", "好买又贵，礼品路线", "难买也便宜，守摊", "好买而便宜，走量"],
    points: [
      { label: "沈记酱园", x: 26, y: 62, mine: true },
      { label: "老街同行甲", x: 32, y: 48 },
      { label: "老街同行乙", x: 30, y: 40 },
      { label: "商超酱料品牌", x: 92, y: 24 },
      { label: "电商新锐", x: 88, y: 46 },
      { label: "文旅礼盒", x: 58, y: 84 },
      { label: "社区团购", x: 76, y: 18 },
      { label: "餐饮供货", x: 44, y: 30 },
    ],
  },
  equation: {
    operands: [
      { label: "现存老缸", value: "217 口", note: "缸不动，动的是别的" },
      { label: "三伏酱周期", value: "540 天", note: "工序封档不改" },
    ],
    result: { label: "小罐试销", value: "每月 800 罐", note: "新客占七成" },
  },
  wheel: {
    whole: "焕新的六件事",
    sectors: [
      { label: "家底盘点", value: "两百一十七口" },
      { label: "工序封档", value: "十四道" },
      { label: "门店翻新", value: "前店" },
      { label: "小罐试销", value: "八百罐" },
      { label: "学徒开班", value: "六人" },
      { label: "焕新开街", value: "腊月" },
    ],
    marked: 3,
  },
  debate: {
    proposal: "把主销规格改成一斤小罐",
    forTitle: "支持",
    againstTitle: "反对",
    pros: [
      { label: "年轻客第一次愿意试", note: "试销新客占七成" },
      { label: "可寄送，能进礼盒", note: "五斤装无法快递" },
      { label: "周转变快，缸位轮得动", note: "同产量分批出货" },
      { label: "价格带落在百元内", note: "老客的复购不受影响" },
    ],
    cons: [
      { label: "分装工序要加人", note: "现有师傅只会大缸打酱" },
      { label: "玻璃罐成本占三成", note: "五斤装摊薄得多" },
      { label: "老客认桶不认罐", note: "有人说小罐不像酱园的东西" },
      { label: "产能天花板不变", note: "缸数与周期都锁死" },
    ],
    verdict: "小罐做新客与礼盒，五斤装继续供老客与餐饮，分装先请两位学徒专做。",
  },
  orgs: [
    "沈记酱园",
    "老街商会",
    "文旅集团",
    "非遗保护中心",
    "黄豆合作社",
    "玻璃罐厂",
    "老主顾会",
    "学徒班",
    "市集联盟",
    "街道办",
    "设计工作室",
    "盲测小组",
  ],

  people: [
    { name: "沈曼笙", role: "第四代主理人", org: "沈记酱园" },
    { name: "沈二伯", role: "守缸师傅 · 第三代", org: "沈记酱园" },
    { name: "沈三姑", role: "账房 · 第三代", org: "沈记酱园" },
    { name: "小满", role: "学徒 · 十九岁", org: "学徒班" },
    { name: "顾奶奶", role: "五十年老主顾", org: "老主顾会" },
    { name: "阿改", role: "店面设计师", org: "设计工作室" },
  ],

  metrics: [
    { value: "103", unit: "年", label: "字号年头", delta: "flat" },
    { value: "217", unit: "口", label: "现存老缸", delta: "flat" },
    { value: "540", unit: "天", label: "三伏酱周期", delta: "flat" },
    { value: "36", unit: "%", label: "小罐复购率", delta: "up" },
    { value: "48", unit: "万元", label: "翻新预算", delta: "flat" },
    { value: "4", unit: "人", label: "新收学徒", delta: "up" },
  ],

  tags: [
    "百年字号",
    "古法工序",
    "守缸",
    "小罐装",
    "可参观工坊",
    "师承制",
    "敬老价",
    "不代工",
    "老街焕新",
    "盲测",
    "非遗申报",
    "字号维权",
  ],
  frequencies: [
    { text: "三伏晒酱", weight: 4 },
    { text: "老缸", weight: 4 },
    { text: "字号", weight: 4 },
    { text: "小罐装", weight: 3 },
    { text: "学徒", weight: 3 },
    { text: "老街", weight: 3 },
    { text: "翻酱", weight: 3 },
    { text: "配方", weight: 2 },
    { text: "封口", weight: 2 },
    { text: "回头客", weight: 2 },
    { text: "上门腌", weight: 2 },
    { text: "招牌", weight: 1 },
    { text: "开缸日", weight: 1 },
    { text: "老照片", weight: 1 },
  ],
  tallies: [
    { filled: 4, caption: "十位买过小罐的客人中", label: "半年内回来买了第二次" },
    { filled: 7, caption: "现存每十口老缸中", label: "今年三伏仍在下酱" },
    { filled: 2, caption: "十位新来的学徒中", label: "熬过了第一个夏天" },
  ],
  goals: [
    { title: "小罐复购率", target: "30%", actual: "36%", gap: "+6 pp", status: "on_track" },
    { title: "新收学徒", target: "3 人", actual: "4 人", gap: "+1 人", status: "on_track" },
    { title: "三伏酱周期", target: "540 天", actual: "540 天", gap: "0 天", status: "on_track" },
    { title: "老缸修复", target: "40 口", actual: "31 口", gap: "-9 口", status: "watch" },
    { title: "老街门店客流", target: "每日 260 人", actual: "每日 180 人", gap: "-80 人", status: "off_track" },
    { title: "翻新预算", target: "48 万元", actual: "57 万元", gap: "+9 万元", status: "off_track" },
  ],
  shortlist: {
    criteria: ["守住味道", "老街脸面", "年轻人愿买", "手上人手"],
    options: [
      { label: "只换包装不动工艺", scores: [100, 75, 75, 100], total: 88, chosen: true },
      { label: "老缸全换不锈钢罐", scores: [0, 25, 50, 100], total: 44 },
      { label: "开一间前店后坊", scores: [75, 100, 100, 25], total: 75 },
      { label: "上电商只做小罐", scores: [75, 25, 100, 50], total: 62 },
      { label: "维持原样不改", scores: [100, 50, 0, 100], total: 62 },
    ],
  },

  products: [
    { name: "头道原汁酱油", note: "春晒秋收，一年只出一批", price: "¥68", priceUnit: "瓶" },
    { name: "陈年豆瓣酱", note: "三年缸，五百克陶罐装", price: "¥128", priceUnit: "罐" },
    { name: "百年礼盒", note: "酱油、豆瓣与酱菜各一", price: "¥298", priceUnit: "盒" },
  ],

  orgChart: {
    root: { name: "沈曼笙", role: "第四代主理人" },
    managers: [
      {
        name: "沈二伯",
        role: "守缸师傅 · 第三代",
        reports: [{ name: "小满", role: "学徒 · 十九岁" }, { name: "阿栓", role: "翻缸工" }],
      },
      {
        name: "沈三姑",
        role: "账房 · 第三代",
        reports: [{ name: "阿改", role: "店面设计师" }],
      },
      {
        name: "顾奶奶",
        role: "老主顾顾问",
        reports: [{ name: "小林", role: "小罐试销" }, { name: "阿桃", role: "门店接待" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "牌匾上写的",
    above: ["两百一十七口老缸一口不动"],
    belowLabel: "账房本子里的",
    below: [
      "客群老化得比想象快",
      "产能被工序天花板锁死",
      "包装设计长期缺位",
      "年轻学徒才刚刚起步",
    ],
  },
  chain: {
    links: [
      { label: "家底盘点", value: "9", unit: "%" },
      { label: "工序封档", value: "18", unit: "%" },
      { label: "门店翻新", value: "20", unit: "%" },
      { label: "小罐试销", value: "32", unit: "%" },
    ],
    support: [
      { label: "工艺与守缸", note: "三伏晒制 · 翻缸时序 · 老缸养护" },
      { label: "字号与门店", note: "招牌复原 · 前店后坊 · 试吃台" },
      { label: "学徒与传承", note: "开班带教 · 工序口诀 · 手写工单" },
    ],
    margin: { label: "小罐毛利", value: "21%" },
  },
  quote: {
    text: "缸是祖上的，手艺是师傅的，招牌是街坊给的，我只是这一棒的跑腿人。",
    attribution: "沈曼笙，交底会上",
  },

  callouts: {
    info: "本次交底所列账目与预算，四月底前在店内柜台备纸质本，老街坊随时可翻。",
    warn: "市面已出现仿冒「沈记」字号的散装酱，认准门楣木匾与罐底钢印。",
    tip: "三伏酱每年只出一批，老主顾预订从立夏开始，别等出缸再来问。",
  },

  code: {
    language: "python",
    code: `def batch_yield(cellar: Cellar) -> int:
    """当季出酱量：产能被老缸数量与周期锁死，不掺假。"""
    active = [c for c in cellar.jars if c.age_days >= 540]
    if not active:
        raise BatchNotReady("酱未足日，宁少一缸")
    return sum(c.litres for c in active)`,
  },

  verdicts: {
    positive: "守变两张清单获全家签字认可，焕新按此推进",
    warning: "产能天花板锁死，任何渠道扩张不得倒逼工序",
    neutral: "非遗申报材料是否今年递交，听老师傅们再议",
  },

  sources: [
    { label: "沈记百年账本摘录", ref: "一九二三至二〇二六，柜台备查" },
    { label: "小罐装试销三月小结", ref: "线上店与市集摊合并口径" },
    { label: "老街客流改造调研", url: "https://example.com/oldstreet-renewal" },
  ],

  captions: ["晒场上的两百一十七口老缸", "头抽出缸那一勺的色泽", "翻新前后的门脸对照", "学徒班开班那天的合影"],

  url: "shenji1923.example.cn",

  scatterHeading: "参观动线走得越深，客单越高",
  scatterSubhead: "试运营首月参观时长与购买金额对照",
  bubbleSizeNote: "口径：店内登记簿抽样三百组，气泡面积为同行人数。",
}
