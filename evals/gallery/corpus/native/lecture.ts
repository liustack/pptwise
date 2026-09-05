import type { Lexicon } from "../lexicon"

/**
 * lecture 原生选题：社区夜校的一堂手机摄影课。
 * 主角是来上课的街坊和他们手里的手机，语域是讲义：
 * 一课一件事，讲完当场练。
 */
export const LECTURE_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "夜校手机摄影课 · 第三讲",
  deckSubtitle: "光：拍不好不是手机的错",
  author: "主讲 江一苇 · 河西社区夜校",
  date: "2026 年 4 月",

  chapters: ["上节课回顾", "今晚一件事", "三种光的练习", "常见错误", "当堂实拍", "回家作业"],

  headings: [
    "上节课交作业的有二十一位，先看三张好的",
    "**顺光、侧光、逆光**：今晚只认识这三个词",
    "把人从窗边挪开一步，照片就变了",
    "正午的太阳是最难用的灯",
    "逆光不是敌人，是轮廓的朋友",
    "手机点一下屏幕，就是在选曝光",
    "阴天是免费的柔光箱",
    "夜市的灯比闪光灯好用",
    "最常见的错：人脸黑成剪影还不知道为什么",
    "当堂练习：同一个人，三种光，各拍一张",
    "作业：拍家里晚饭的桌子，用窗光",
    "下节课讲构图，先别管它",
    "看见光，比买镜头便宜",
  ],

  kickers: ["回顾", "主题", "练习", "纠错", "实拍", "作业"],

  paragraph:
    "今晚只讲一件事：光。不讲参数，不讲设备，你们手里从两千块到一万块的手机都够用。先记三个词，顺光、侧光、逆光，分不清就看影子在哪边。然后记一个动作，拍人像之前，先看光从哪来，把人挪一步，比换手机管用。最后记一个手势，点一下屏幕上最亮或最暗的地方，看照片怎么变，那就是曝光在听你的话。",

  shortParagraph:
    "今晚只讲一件事：光。不讲参数不讲设备，你们手里的手机都够用。记三个词：顺光、侧光、逆光，分不清就看影子在哪边。记一个动作：拍人之前先看光从哪来，把人挪一步，比换手机管用。记一个手势：点一下屏幕最亮或最暗处，看照片怎么变。",

  sentences: [
    "上节课作业二十一人提交，比第一课多了八人。",
    "顺光拍人最保险，脸亮但容易眯眼。",
    "侧光让脸有立体感，窗边是最好的练习位。",
    "逆光拍轮廓，记得点按屏幕暗部提亮。",
    "正午顶光会在眼窝投下重影，尽量避开。",
    "阴天光线均匀，是练人像的好天气。",
    "夜市摊位的暖灯离人近，比闪光灯自然。",
    "点按屏幕就是告诉手机以哪里为准曝光。",
    "人脸拍黑的原因九成是背景太亮。",
    "当堂练习分三组，每组互拍十分钟。",
    "回家作业只有一张：用窗光拍晚饭的桌子。",
    "作业发到班级群，下节课开头一起看。",
  ],

  bullets: [
    "只记三个词：顺侧逆",
    "拍前先看光从哪来",
    "把人挪一步再按快门",
    "点按屏幕控制曝光",
    "阴天是免费柔光箱",
    "作业：窗光拍晚饭",
  ],

  phrases: [
    "看见光",
    "影子方向",
    "窗边一步",
    "点按曝光",
    "顶光重影",
    "轮廓光",
    "免费柔光箱",
    "夜市暖灯",
    "先挪人后拍照",
    "一课一事",
    "当堂互拍",
    "窗光作业",
  ],

  labels: [
    "顺光",
    "侧光",
    "逆光",
    "顶光",
    "窗光",
    "灯光",
    "人像",
    "静物",
    "白天",
    "傍晚",
    "夜晚",
    "阴天",
    "第一组",
    "第二组",
    "第三组",
    "作业墙",
  ],

  strengths: ["零门槛人人可练", "当堂出片看得见进步", "班级群交作业氛围好", "课程免费坚持一年"],
  weaknesses: ["教室灯光条件受限", "学员手机新旧差距大", "一周一课容易忘", "助教只有一位"],
  opportunities: ["社区愿意提供展墙", "学员想加开夜景专题", "老年大学来谈合作", "菜场愿当外拍场地"],
  threats: ["雨季外拍课停摆", "短视频教程分流学员", "教室档期被挤占", "学员流失在第四周"],

  stages: ["认识器材", "认识光", "学构图", "拍人像", "外拍实战", "结课影展"],
  periods: ["第一课", "第二课", "第三课", "第四课", "第五课"],
  periodAxis: "课次",
  segmentAxis: "光型",
  decision: "下节课先练哪一样",
  levels: [
    { title: "报了名", value: "62", unit: "人" },
    { title: "来满三次", value: "41", unit: "人" },
    { title: "交过作业", value: "24", unit: "人" },
    { title: "拍出成片", value: "9", unit: "人" },
  ],
  handover: { owners: [1, 0, 0, 0, 2], note: "助教收作业到主讲讲评之间隔一周，学员常忘了当时怎么拍的" },
  choices: [
    {
      edge: "先练光 · 60%",
      title: "只讲窗边一步",
      detail: "不用带脚架",
      outcomes: [
        { edge: "46%", title: "只看方向", detail: "阴天就抓瞎", value: "18", unit: "人" },
        { edge: "54%", title: "方向加强弱", detail: "多花二十分钟", value: "27", unit: "人", recommended: true },
      ],
    },
    {
      edge: "先练构图 · 40%",
      title: "三分法起步",
      detail: "室内就能练",
      outcomes: [
        { edge: "53%", title: "只讲取景", detail: "人像还是歪", value: "15", unit: "人" },
        { edge: "47%", title: "取景加前景", detail: "需要外拍", value: "21", unit: "人" },
      ],
    },
  ],

  sets: {
    labels: ["会看光", "会站位", "会等时机"],
    overlap: "三样都会的学员",
  },
  causes: {
    effect: "上次交作业只有二十一人",
    categories: [
      { label: "时间", causes: ["课后一周才交", "学员多为晚班工作"] },
      { label: "题目", causes: ["题目要求外拍", "天气连续两周阴雨"] },
      { label: "设备", causes: ["旧手机夜景噪点重", "部分机型无手动模式"] },
      { label: "反馈", causes: ["点评只在课上口头", "没交的人看不到别人的片"] },
    ],
  },
  positions: {
    x: { title: "光线难度", low: "顺光好拍", high: "逆光难拍" },
    y: { title: "出片率", low: "低", high: "高" },
    quadrants: ["好拍却出不了片，方法问题", "好拍又出片，先练这里", "难拍也出不了片，暂缓", "难拍还出片，练成了"],
    points: [
      { label: "本班这次", x: 42, y: 66, mine: true },
      { label: "窗光人像", x: 30, y: 78 },
      { label: "顺光静物", x: 14, y: 84 },
      { label: "侧光人像", x: 46, y: 62 },
      { label: "逆光轮廓", x: 84, y: 44 },
      { label: "顶光正午", x: 72, y: 22 },
      { label: "夜景灯光", x: 90, y: 18 },
      { label: "上节课平均", x: 40, y: 48 },
    ],
  },
  equation: {
    operands: [
      { label: "在册学员", value: "34 人", note: "夜校第三讲" },
      { label: "今晚学的光", value: "3 种", note: "顺光、侧光、窗光" },
    ],
    result: { label: "当堂出片", value: "27 张", note: "每人至少一张能用" },
  },
  wheel: {
    whole: "一门课的六讲",
    sectors: [
      { label: "认识器材", value: "第一讲" },
      { label: "认识光", value: "第三讲" },
      { label: "学构图", value: "第四讲" },
      { label: "拍人像", value: "第五讲" },
      { label: "外拍实战", value: "第六讲" },
      { label: "结课影展", value: "第八讲" },
    ],
    marked: 1,
  },
  debate: {
    proposal: "作业改成当堂拍当堂交",
    forTitle: "支持",
    againstTitle: "反对",
    pros: [
      { label: "交作业的人会翻倍", note: "上次课后交只有二十一人" },
      { label: "点评能当场对上片子", note: "现在隔一周谁都记不清" },
      { label: "不受天气影响", note: "教室窗光稳定可控" },
      { label: "旧手机也能完成", note: "室内光比夜景友好" },
    ],
    cons: [
      { label: "练不到真实场景", note: "外拍才有难处理的光" },
      { label: "课上时间要挪四十分钟", note: "讲解就得压缩" },
      { label: "同一场景片子雷同", note: "影展会少了层次" },
      { label: "拍得快的人先走", note: "课堂气氛会散" },
    ],
    verdict: "每讲留二十分钟当堂拍，外拍作业保留但改成两周一次，交不了的可用当堂片顶替。",
  },
  orgs: [
    "河西社区夜校",
    "摄影班",
    "班级群",
    "社区活动中心",
    "老年大学",
    "菜场管委会",
    "社区展墙",
    "志愿助教团",
    "器材角",
    "洗印店",
    "夜市摊主会",
    "结课影展组",
  ],

  people: [
    { name: "江一苇", role: "主讲 · 自由摄影师", org: "河西社区夜校" },
    { name: "小鹿", role: "助教", org: "志愿助教团" },
    { name: "王阿姨", role: "学员 · 进步最快", org: "摄影班" },
    { name: "老魏", role: "学员 · 全勤", org: "摄影班" },
    { name: "豆花摊老蔡", role: "夜市外拍模特", org: "夜市摊主会" },
    { name: "陈干事", role: "场地协调", org: "社区活动中心" },
  ],

  metrics: [
    { value: "34", unit: "人", label: "在册学员", delta: "up" },
    { value: "21", unit: "人", label: "上次交作业", delta: "up" },
    { value: "3", unit: "种", label: "今晚学的光", delta: "flat" },
    { value: "10", unit: "分钟", label: "每组互拍", delta: "flat" },
    { value: "1", unit: "张", label: "回家作业", delta: "flat" },
    { value: "0", unit: "元", label: "课程费用", delta: "flat" },
  ],

  tags: [
    "手机摄影",
    "认识光",
    "顺侧逆",
    "点按曝光",
    "窗光练习",
    "当堂互拍",
    "作业点评",
    "零基础",
    "社区夜校",
    "免费课",
    "外拍预告",
    "结课影展",
  ],
  frequencies: [
    { text: "自然光", weight: 4 },
    { text: "构图", weight: 4 },
    { text: "作业", weight: 4 },
    { text: "窗边", weight: 3 },
    { text: "对焦", weight: 3 },
    { text: "互拍", weight: 3 },
    { text: "手机", weight: 3 },
    { text: "逆光", weight: 2 },
    { text: "曝光", weight: 2 },
    { text: "留白", weight: 2 },
    { text: "点评", weight: 2 },
    { text: "夜景", weight: 1 },
    { text: "修图", weight: 1 },
    { text: "打印", weight: 1 },
  ],
  tallies: [
    { filled: 6, caption: "十位在册学员中", label: "上次按时交了作业" },
    { filled: 3, caption: "十位学员中", label: "已经会用手动曝光" },
    { filled: 8, caption: "十张课上互拍的照片中", label: "把人放在了窗边的光里" },
  ],
  goals: [
    { title: "在册学员", target: "30 人", actual: "34 人", gap: "+4 人", status: "on_track" },
    { title: "交作业人数", target: "18 人", actual: "21 人", gap: "+3 人", status: "on_track" },
    { title: "每组互拍", target: "10 分钟", actual: "10 分钟", gap: "0 分钟", status: "on_track" },
    { title: "到课率", target: "85%", actual: "76%", gap: "-9 pp", status: "watch" },
    { title: "会用手动曝光", target: "20 人", actual: "9 人", gap: "-11 人", status: "off_track" },
    { title: "课后一周仍在拍", target: "24 人", actual: "13 人", gap: "-11 人", status: "off_track" },
  ],
  shortlist: {
    criteria: ["当场学得会", "回家用得上", "不用买东西", "课上练得动"],
    options: [
      { label: "只讲窗边自然光", scores: [100, 100, 100, 75], total: 94, chosen: true },
      { label: "讲手动曝光三要素", scores: [25, 75, 100, 50], total: 62 },
      { label: "带补光灯上课", scores: [75, 25, 0, 75], total: 44 },
      { label: "讲后期修图", scores: [50, 75, 50, 25], total: 50 },
      { label: "外出夜景实拍", scores: [50, 50, 100, 0], total: 50 },
    ],
  },

  products: [
    { name: "单课旁听", note: "一课一主题，讲完当场练", price: "¥60", priceUnit: "课" },
    { name: "整季课程", note: "十二课连报，含点评", price: "¥580", priceUnit: "季" },
    { name: "周末外拍", note: "老街半日，最多十二人", price: "¥120", priceUnit: "人次" },
  ],

  orgChart: {
    root: { name: "陈干事", role: "夜校教务" },
    managers: [
      {
        name: "江一苇",
        role: "主讲 · 自由摄影师",
        reports: [{ name: "小鹿", role: "助教" }, { name: "老蔡", role: "夜市外拍模特" }],
      },
      {
        name: "王阿姨",
        role: "学员代表",
        reports: [{ name: "老魏", role: "全勤学员" }],
      },
      {
        name: "方灯",
        role: "场地与器材",
        reports: [{ name: "小童", role: "器材借还" }, { name: "阿棠", role: "作业收集" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "课上说的",
    above: ["只记三个词：顺侧逆"],
    belowLabel: "助教发现的",
    below: [
      "教室灯光条件受限",
      "学员手机新旧差距很大",
      "一周一课很容易忘",
      "助教从头到尾只有一位",
    ],
  },
  chain: {
    links: [
      { label: "认识器材", value: "10", unit: "%" },
      { label: "认识光", value: "27", unit: "%" },
      { label: "学构图", value: "24", unit: "%" },
      { label: "外拍实战", value: "23", unit: "%" },
    ],
    support: [
      { label: "场地与器材", note: "反光板 · 三脚架 · 借还登记" },
      { label: "作业与点评", note: "每周交作业 · 课上互评 · 一对一改图" },
      { label: "外拍组织", note: "夜市踩点 · 模特协调 · 安全提醒" },
    ],
    margin: { label: "学员留存", value: "16%" },
  },
  quote: {
    text: "王阿姨上周把孙子从窗边挪了一步，全家都问她是不是换了新手机。",
    attribution: "江一苇，课堂实录",
  },

  callouts: {
    info: "今晚课件与三张示范图课后发班级群，横屏看图，别用缩略图判断好坏。",
    warn: "逆光练习别对着太阳直拍超过几秒，伤眼睛也伤传感器。",
    tip: "交作业前把屏幕亮度调到一半再看一遍，太亮的屏幕会骗人。",
  },

  code: {
    language: "python",
    code: `def homework_streak(roster: list[Student]) -> list[str]:
    """连续交作业名单：结课影展的入选池，鼓励为主。"""
    keep = [s.name for s in roster if s.streak >= 3]
    if not keep:
        raise ClassMoraleAlert("连交三次的还没有，下课多聊聊")
    return keep`,
  },

  verdicts: {
    positive: "交作业人数连续两课上升，课程节奏保持现状",
    warning: "第四周是历史流失高发期，下节课加外拍预告拉一把",
    neutral: "夜景专题是否加开，等报名满二十人再定",
  },

  sources: [
    { label: "班级群作业存档", ref: "摄影班，第一课至今" },
    { label: "上期结课影展留言簿", ref: "社区展墙，去年十二月" },
    { label: "课件与示范图打包", url: "https://example.com/nightschool-photo-3" },
  ],

  captions: ["王阿姨挪一步前后的两张对比", "教室窗边的示范位", "夜市外拍的选灯示意", "上期结课影展的展墙"],

  url: "hexi-nightschool.example.cn/photo",

  scatterHeading: "练得越多的学员，进步越不靠天赋",
  scatterSubhead: "三十四位学员的累计练习张数与作业评分对照",
  bubbleSizeNote: "口径：班级群作业存档，气泡面积为出勤次数。",
}
