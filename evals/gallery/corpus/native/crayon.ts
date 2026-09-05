import type { Lexicon } from "../lexicon"

/**
 * crayon 原生选题：向日葵班的学期成长汇报，讲给家长听。
 * 主角是一个班的孩子，不是任何公司。语域是老师的口吻：具体、温和、
 * 有名字有数目，不写教育行话。
 */
export const CRAYON_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "向日葵班的一学期",
  deckSubtitle: "三十个孩子的春季成长记录，讲给爸爸妈妈听",
  author: "向日葵班 王老师",
  date: "2026 年 6 月",

  chapters: ["我们的班级", "会做的事变多了", "好朋友和小矛盾", "身体长高了", "需要家里帮忙的", "暑假与下学期"],

  headings: [
    "三十个孩子，学期末都能自己整理书包了",
    "午睡入睡时间从二十五分钟缩短到十二分钟",
    "**每天户外两小时**，风雨无阻的一学期",
    "自己吃完午饭的孩子从十九个变成二十八个",
    "绘本角本学期借阅了四百一十二本",
    "搭积木从各玩各的变成了四人一组",
    "春游那天没有一个孩子掉队",
    "小小值日生轮了整整一圈",
    "戏剧节我们班演了三只小猪",
    "有六个孩子还不太敢举手发言",
    "指尖精细动作的练习要坚持到大班",
    "识字不是这个学期的任务",
    "从抢玩具到商量着来，用了一个春天",
  ],

  kickers: ["班级日常", "成长记录", "朋友们", "健康", "给家长的话", "下学期"],

  paragraph:
    "这个学期我们最大的变化不在墙上的作品，而在每天早晨的门口：九月还要抱着妈妈哭一会儿的孩子，六月已经会挥挥手说妈妈再见，然后自己把水壶放进格子里。三十个孩子里有二十八个能独立吃完午饭，二十六个会自己穿脱外套，值日生轮了整整一圈，每个人都浇过那盆绿萝。孩子的成长不是我们教出来的，是他们在一起过日子过出来的。",

  shortParagraph:
    "这个学期最大的变化在每天早晨的门口：九月还要抱着妈妈哭一会儿的孩子，六月已经会挥挥手说再见，自己把水壶放进格子里。二十八个孩子能独立吃完午饭，二十六个会自己穿脱外套，值日生轮了整整一圈。成长不是教出来的，是他们在一起过日子过出来的。",

  sentences: [
    "全班三十个孩子，出勤率保持在百分之九十四。",
    "午睡入睡时间从学期初的二十五分钟缩短到十二分钟。",
    "独立吃完午饭的孩子从十九个到二十八个。",
    "绘本角一学期借出四百一十二本。",
    "户外每天两小时，只因暴雨停过三次。",
    "搭积木从各玩各的，变成四人一组。",
    "春游走了两公里，没有一个孩子要抱。",
    "戏剧节排练了四个星期，每个孩子都有一句台词。",
    "还有六个孩子在集体活动里不太敢举手，我们不催他们。",
    "串珠子和用剪刀的练习每周三次，指尖的稳当要慢慢来。",
    "班里的小矛盾从老师断案，变成了孩子自己商量。",
    "下学期的重点是自己的事情自己做，再往前走一步。",
  ],

  bullets: [
    "出勤率九成四，生病主要集中在三月",
    "二十八个孩子独立吃完午饭",
    "午睡入睡快了一倍",
    "绘本借阅四百一十二本",
    "值日生轮满一整圈",
    "春游两公里无人掉队",
  ],

  phrases: [
    "自己的事情自己做",
    "每天两小时户外",
    "四人小组搭积木",
    "绘本角的旧沙发",
    "小小值日生",
    "戏剧节三只小猪",
    "门口的再见仪式",
    "浇绿萝的日子",
    "串珠子练指尖",
    "商量着来",
    "午睡小夜灯",
    "春游远足",
  ],

  labels: [
    "晨间入园",
    "自主进餐",
    "午睡",
    "户外",
    "绘本角",
    "积木区",
    "值日生",
    "戏剧节",
    "小班组",
    "中班组",
    "混龄组",
    "家长开放日",
    "春季",
    "夏季",
    "教室",
    "操场",
  ],

  strengths: ["生活自理进步看得见", "户外时间在全园最足", "绘本借阅习惯已经养成", "同伴合作有了固定小组"],
  weaknesses: ["六个孩子还不敢当众发言", "指尖精细动作参差", "整理玩具还要老师提醒", "部分孩子挑食反复"],
  opportunities: ["大班混龄活动可以多做", "家里坚持自理会翻倍见效", "社区图书馆愿意接待参观", "秋天可以种一畦小菜地"],
  threats: ["暑假两个月自理容易回潮", "电子屏时间挤占绘本时间", "换季病毒高发影响出勤", "个别家庭包办代替过多"],

  stages: ["入园适应", "生活自理", "同伴相处", "表达分享", "合作游戏", "幼小衔接"],
  periods: ["九月", "十一月", "一月", "四月", "六月"],
  periodAxis: "月份",
  segmentAxis: "活动区",
  decision: "下学期先练哪一样",
  levels: [
    { title: "会自己吃饭", value: "32", unit: "人" },
    { title: "会自己穿衣", value: "24", unit: "人" },
    { title: "会收拾玩具", value: "17", unit: "人" },
    { title: "会照顾同伴", value: "6", unit: "人" },
  ],
  handover: { owners: [0, 2, 1, 0, 1], note: "保育员记的自理情况要交回班主任，午睡后才对得上" },
  choices: [
    {
      edge: "先练自理 · 62%",
      title: "把穿脱交给孩子",
      detail: "从穿鞋开始",
      outcomes: [
        { edge: "45%", title: "只在园里练", detail: "回家还是家长代劳", value: "9", unit: "人" },
        { edge: "55%", title: "园里家里一起练", detail: "要家长每天回执", value: "17", unit: "人", recommended: true },
      ],
    },
    {
      edge: "先练相处 · 38%",
      title: "每天一次小组游戏",
      detail: "每天三十分钟",
      outcomes: [
        { edge: "53%", title: "只加时长", detail: "抢玩具还会有", value: "7", unit: "人" },
        { edge: "47%", title: "时长加轮流规则", detail: "老师要盯前两周", value: "12", unit: "人" },
      ],
    },
  ],

  orgs: [
    "向日葵班",
    "小海豚班",
    "白云班",
    "彩虹桥班",
    "月亮船班",
    "小橡树班",
    "蒲公英班",
    "星星屋班",
    "青草地班",
    "小蜗牛班",
    "萤火虫班",
    "风车班",
  ],

  people: [
    { name: "王雨晴", role: "班主任", org: "向日葵班" },
    { name: "李慧敏", role: "配班老师", org: "向日葵班" },
    { name: "周阿姨", role: "保育员", org: "向日葵班" },
    { name: "陈园长", role: "园长", org: "阳光幼儿园" },
    { name: "豆豆妈妈", role: "家委会代表", org: "家委会" },
    { name: "林医生", role: "保健医生", org: "阳光幼儿园" },
  ],

  metrics: [
    { value: "94", unit: "%", label: "学期出勤率", delta: "up" },
    { value: "28", unit: "人", label: "独立进餐", delta: "up" },
    { value: "12", unit: "分钟", label: "午睡入睡用时", delta: "down" },
    { value: "412", unit: "本", label: "绘本借阅量", delta: "up" },
    { value: "2", unit: "小时", label: "每日户外", delta: "flat" },
    { value: "30", unit: "人", label: "值日生轮值", delta: "flat" },
  ],

  tags: [
    "生活自理",
    "户外游戏",
    "绘本共读",
    "积木合作",
    "值日轮岗",
    "戏剧表演",
    "手指精细",
    "情绪认知",
    "同伴商量",
    "亲子任务",
    "混龄活动",
    "幼小衔接",
  ],
  tallies: [
    { filled: 9, caption: "班里每十个孩子中", label: "这学期能自己吃完一整碗饭" },
    { filled: 7, caption: "十个孩子中", label: "午睡能在十五分钟内睡着" },
    { filled: 6, caption: "十个孩子中", label: "玩完会把积木送回筐里" },
  ],
  goals: [
    { title: "学期出勤率", target: "92%", actual: "94%", gap: "+2 pp", status: "on_track" },
    { title: "独立进餐人数", target: "26 人", actual: "28 人", gap: "+2 人", status: "on_track" },
    { title: "午睡入睡用时", target: "15 分钟", actual: "12 分钟", gap: "-3 分钟", status: "on_track" },
    { title: "绘本借阅量", target: "360 本", actual: "412 本", gap: "+52 本", status: "on_track" },
    { title: "每日户外", target: "2 小时", actual: "1.6 小时", gap: "-0.4 小时", status: "off_track" },
    { title: "自己收玩具", target: "25 人", actual: "21 人", gap: "-4 人", status: "watch" },
  ],
  shortlist: {
    criteria: ["孩子喜欢", "老师看得过来", "场地够用", "家长省心"],
    options: [
      { label: "全班一起做操", scores: [50, 100, 100, 100], total: 88 },
      { label: "分四组轮玩教具", scores: [100, 50, 75, 75], total: 75, chosen: true },
      { label: "整班去后院跑", scores: [100, 25, 25, 50], total: 50 },
      { label: "自由活动不分组", scores: [75, 0, 50, 50], total: 44 },
      { label: "看一集动画片", scores: [75, 100, 100, 0], total: 69 },
    ],
  },

  products: [
    { name: "绘本套装 · 春", note: "十二本，配家长共读卡", price: "¥240", priceUnit: "套" },
    { name: "亲子手工包", note: "每月一份材料，回家一起做", price: "¥45", priceUnit: "月" },
    { name: "成长纪念册", note: "一学期的照片与作品装订", price: "¥98", priceUnit: "本" },
  ],

  orgChart: {
    root: { name: "陈园长", role: "园长" },
    managers: [
      {
        name: "王雨晴",
        role: "班主任",
        reports: [{ name: "李慧敏", role: "配班老师" }, { name: "周阿姨", role: "保育员" }],
      },
      {
        name: "林医生",
        role: "保健医生",
        reports: [{ name: "小何", role: "晨检" }],
      },
      {
        name: "豆豆妈妈",
        role: "家委会代表",
        reports: [{ name: "苗苗妈妈", role: "绘本借阅" }, { name: "阿乐爸爸", role: "亲子活动" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "家长看得见的",
    above: ["出勤率九成四，二十八个孩子能自己吃饭"],
    belowLabel: "老师记在本子上的",
    below: [
      "六个孩子还不敢当众发言",
      "指尖精细动作参差很大",
      "整理玩具还要老师提醒",
      "部分孩子挑食反反复复",
    ],
  },
  chain: {
    links: [
      { label: "入园适应", value: "14", unit: "%" },
      { label: "生活自理", value: "24", unit: "%" },
      { label: "同伴相处", value: "21", unit: "%" },
      { label: "合作游戏", value: "18", unit: "%" },
    ],
    support: [
      { label: "一日流程", note: "晨检 · 加餐 · 午睡 · 离园" },
      { label: "环境与材料", note: "娃娃家 · 建构区 · 绘本角" },
      { label: "家园共育", note: "成长手册 · 每周照片 · 家长开放日" },
    ],
    margin: { label: "成长余量", value: "23%" },
  },
  quote: {
    text: "别急着让孩子学会什么，先让他每天都想来。想来了，剩下的都会发生。",
    attribution: "陈园长，阳光幼儿园",
  },

  callouts: {
    info: "本记录的数目都来自班级日志，出勤按实到统计，病假事假分开记。",
    warn: "暑假是自理习惯最容易回潮的两个月，请家里尽量让孩子自己的事情自己做。",
    tip: "每晚睡前十五分钟亲子共读，是绘本角借阅数据背后最有效的一件事。",
  },

  code: {
    language: "python",
    code: `def naptime_minutes(diary: Diary) -> float:
    """班级日志里的平均入睡用时（分钟）。"""
    rows = diary.filter(activity="午睡")
    if rows.count() < 10:
        raise DataQualityError("样本太少，这个月先不下结论")
    return rows.mean("minutes_to_sleep")`,
  },

  verdicts: {
    positive: "生活自理与同伴合作双双上台阶，这学期过得值得",
    warning: "六个不敢举手的孩子需要家园一起慢慢托一把",
    neutral: "识字与算数不是本学期目标，衔接安排到大班再谈",
  },

  sources: [
    { label: "向日葵班班级日志", ref: "2026 春季学期，逐日记录" },
    { label: "幼儿发展观察量表", ref: "阳光幼儿园保教组，六月测评" },
    { label: "家长开放日反馈问卷", url: "https://example.com/sunflower-feedback" },
  ],

  captions: ["春游路上的小队伍", "绘本角的午后", "戏剧节后台的三只小猪", "值日生在浇那盆绿萝"],

  url: "class.sunshine-kids.example.com/sunflower",

  scatterHeading: "户外时间越足，午睡入睡越快",
  scatterSubhead: "四个班组的每日户外时长与入睡用时对照",
  bubbleSizeNote: "口径：本学期各班日志，气泡面积为班级人数。",
}
