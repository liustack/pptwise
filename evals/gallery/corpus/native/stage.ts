import type { Lexicon } from "../lexicon"

/**
 * stage 原生选题：创始人的新品发布会 keynote。
 * 主角是一个人和一副眼镜，语域是发布会：短宣言、一页一个数、
 * 黑场里只留最要紧的话。
 */
export const STAGE_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "目光 One 发布会",
  deckSubtitle: "一副把屏幕从手里拿走的眼镜",
  author: "林目 · 目光科技创始人",
  date: "2026 年 9 月",

  chapters: ["为什么是眼镜", "目光 One", "显示与续航", "隐私设计", "价格与发售", "One More Thing"],

  headings: [
    "我们每天看手机一百二十七次",
    "**目光 One**：十二克镜腿里装下一整块屏幕",
    "视网膜投影亮度做到了三千尼特",
    "整机重量三十八克，比一副墨镜轻",
    "续航十四小时，从早会撑到夜航",
    "指环交互：拇指一划，不用抬手",
    "摄像头指示灯由硬件直连，无法被软件关闭",
    "所有影像默认本机处理，云端为零",
    "开发者套件今天开放申请",
    "首发价三千九百九十九元",
    "十月十日，一百个城市同步发售",
    "眼镜不该让人看起来像半个机器人",
    "屏幕消失的那天，注意力才回到眼前的人",
  ],

  kickers: ["问题", "产品", "参数", "隐私", "发售", "彩蛋"],

  paragraph:
    "过去十年，屏幕越做越好，我们的脖子越来越低。目光 One 想做的事情只有一件：把屏幕从手里拿走，放回视线里，然后让它在不需要的时候彻底消失。三十八克的整机重量、十四小时续航、三千尼特的视网膜投影，这些数字都服务于同一个判断：一副眼镜首先得是一副好眼镜，其次才是一台设备。",

  shortParagraph:
    "过去十年，屏幕越做越好，我们的脖子越来越低。目光 One 只想做一件事：把屏幕从手里拿走，放回视线里，并在不需要时彻底消失。三十八克、十四小时续航、三千尼特投影，都服务于同一个判断：它首先得是一副好眼镜，其次才是设备。",

  sentences: [
    "普通人每天平均解锁手机一百二十七次，累计低头四小时。",
    "目光 One 整机三十八克，其中光学模组只占九克。",
    "视网膜投影峰值亮度三千尼特，正午户外依然可读。",
    "续航十四小时，快充十五分钟补足四小时。",
    "指环交互的误触率压到了百分之零点八。",
    "摄像头指示灯与传感器硬件直连，任何软件都关不掉。",
    "影像处理默认全部发生在本机，不上传任何一帧。",
    "镜片支持全系近视度数定制，验光数据只存在本机。",
    "开发者套件今天开放申请，首批一千个名额。",
    "首发价三千九百九十九元，教育优惠再减四百。",
    "十月十日在一百个城市的两千家门店同步开售。",
    "明年春天，目光 One 将支持第二块虚拟屏。",
  ],

  bullets: [
    "整机三十八克，镜腿十二克",
    "三千尼特视网膜投影",
    "续航十四小时",
    "指示灯硬件直连不可关",
    "影像默认本机处理",
    "首发三千九百九十九元",
  ],

  phrases: [
    "把屏幕拿走",
    "视网膜投影",
    "指环交互",
    "硬件级指示灯",
    "本机影像处理",
    "全天候续航",
    "度数定制镜片",
    "开发者套件",
    "百城同发",
    "注意力回归",
    "第二块虚拟屏",
    "像眼镜的眼镜",
  ],

  labels: [
    "光学",
    "显示",
    "续航",
    "交互",
    "隐私",
    "佩戴",
    "镜架",
    "镜腿",
    "指环",
    "充电盒",
    "标准版",
    "轻曜版",
    "线上",
    "门店",
    "首发日",
    "预售期",
  ],

  strengths: ["重量对齐普通眼镜", "亮度领先同代产品", "隐私做到硬件级", "渠道首发规模罕见"],
  weaknesses: ["产能爬坡期交付吃紧", "指环需要单独充电", "深度近视定制周期十天", "应用生态刚刚起步"],
  opportunities: ["通勤与差旅场景需求明确", "开发者对新交互热情高", "企业巡检场景主动接洽", "海外市场等待认证放行"],
  threats: ["大厂年底同类发布", "光学供应链单一依赖", "隐私议题的舆论敏感", "渠道压货的价格风险"],

  stages: ["光学定型", "工程样机", "量产爬坡", "渠道铺货", "首发开售", "生态开放"],
  periods: ["五月", "六月", "七月", "八月", "九月"],
  periodAxis: "月份",
  segmentAxis: "版本",
  decision: "这一代先做哪一件",
  levels: [
    { title: "试戴过", value: "4200", unit: "人" },
    { title: "戴满十分钟", value: "1800", unit: "人" },
    { title: "预约了", value: "620", unit: "人" },
    { title: "首发下单", value: "210", unit: "人" },
  ],
  handover: { owners: [1, 1, 2, 0, 0], note: "光学定型冻结后工业设计才敢开模，中间来回过三轮" },
  choices: [
    {
      edge: "先做投影 · 61%",
      title: "视网膜投影上量产",
      detail: "重量是代价",
      outcomes: [
        { edge: "39%", title: "只做单目", detail: "轻但视野窄", value: "42", unit: "克" },
        { edge: "61%", title: "做双目", detail: "多两颗光机", value: "58", unit: "克", recommended: true },
      ],
    },
    {
      edge: "先做交互 · 39%",
      title: "指环先出",
      detail: "光学沿用上一代",
      outcomes: [
        { edge: "54%", title: "只做指环", detail: "眼镜不变", value: "51", unit: "克" },
        { edge: "46%", title: "指环加语音", detail: "要加一颗麦", value: "53", unit: "克" },
      ],
    },
  ],

  orgs: [
    "目光科技",
    "临港光学",
    "云台代工厂",
    "极目镜片",
    "首发合作门店",
    "指环实验室",
    "开发者社区",
    "视觉健康研究所",
    "航旅测试队",
    "无障碍顾问组",
    "供应链联盟",
    "校园体验站",
  ],

  people: [
    { name: "林目", role: "创始人", org: "目光科技" },
    { name: "许晨", role: "光学负责人", org: "目光科技" },
    { name: "白桦", role: "工业设计师", org: "目光科技" },
    { name: "郑南", role: "隐私架构师", org: "目光科技" },
    { name: "方圆", role: "开发者关系", org: "目光科技" },
    { name: "凌一舟", role: "首批测试用户", org: "航旅测试队" },
  ],

  metrics: [
    { value: "38", unit: "克", label: "整机重量", delta: "down" },
    { value: "3000", unit: "尼特", label: "峰值亮度", delta: "up" },
    { value: "14", unit: "小时", label: "典型续航", delta: "up" },
    { value: "0.8", unit: "%", label: "指环误触率", delta: "down" },
    { value: "3999", unit: "元", label: "首发价", delta: "flat" },
    { value: "100", unit: "城", label: "同步发售", delta: "up" },
  ],

  tags: [
    "视网膜投影",
    "指环交互",
    "本机计算",
    "硬件指示灯",
    "度数定制",
    "十四小时续航",
    "快充",
    "开发者套件",
    "空间提醒",
    "导航平视",
    "会议字幕",
    "无障碍模式",
  ],
  goals: [
    { title: "整机重量", target: "40 克", actual: "38 克", gap: "-2 克", status: "on_track" },
    { title: "峰值亮度", target: "2500 尼特", actual: "3000 尼特", gap: "+500 尼特", status: "on_track" },
    { title: "典型续航", target: "12 小时", actual: "14 小时", gap: "+2 小时", status: "on_track" },
    { title: "指环误触率", target: "0.5%", actual: "0.8%", gap: "+0.3 pp", status: "watch" },
    { title: "首发价", target: "3499 元", actual: "3999 元", gap: "+500 元", status: "off_track" },
    { title: "同步发售城市", target: "150 城", actual: "100 城", gap: "-50 城", status: "off_track" },
  ],
  shortlist: {
    criteria: ["整机重量", "亮度", "续航", "成本"],
    options: [
      { label: "单目光波导", scores: [100, 50, 100, 75], total: 81 },
      { label: "双目光波导", scores: [50, 100, 50, 25], total: 56 },
      { label: "微型投影方案", scores: [25, 75, 25, 100], total: 56 },
      { label: "分体计算单元", scores: [100, 75, 75, 50], total: 75, chosen: true },
      { label: "沿用一代方案", scores: [0, 25, 50, 100], total: 44 },
    ],
  },

  products: [
    { name: "目光 One", note: "四十克机身，全天佩戴", price: "¥2499", priceUnit: "副" },
    { name: "长续航版", note: "同款机身，续航翻倍", price: "¥2999", priceUnit: "副" },
    { name: "定制镜片", note: "按验光单磨制，两周取", price: "¥899", priceUnit: "副" },
  ],

  orgChart: {
    root: { name: "林目", role: "创始人" },
    managers: [
      {
        name: "许晨",
        role: "光学负责人",
        reports: [{ name: "郑南", role: "隐私架构师" }, { name: "白桦", role: "工业设计师" }],
      },
      {
        name: "方圆",
        role: "开发者关系",
        reports: [{ name: "凌一舟", role: "首批测试用户" }],
      },
      {
        name: "秦岭",
        role: "供应链负责人",
        reports: [{ name: "小池", role: "量产爬坡" }, { name: "阿岚", role: "渠道铺货" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "发布会讲的",
    above: ["整机三十八克，镜腿十二克"],
    belowLabel: "产线上的",
    below: [
      "产能爬坡期交付吃紧",
      "指环还要单独充电",
      "深度近视定制要十天",
      "应用生态刚刚起步",
    ],
  },
  chain: {
    links: [
      { label: "光学定型", value: "24", unit: "%" },
      { label: "工程样机", value: "19", unit: "%" },
      { label: "量产爬坡", value: "27", unit: "%" },
      { label: "渠道铺货", value: "16", unit: "%" },
    ],
    support: [
      { label: "光学与显示", note: "视网膜投影 · 三千尼特 · 屈光定制" },
      { label: "隐私与安全", note: "硬件级指示灯 · 本地推理 · 录制提示音" },
      { label: "生态与开发者", note: "SDK 首发 · 指环交互规范 · 示例应用" },
    ],
    margin: { label: "整机毛利", value: "14%" },
  },
  quote: {
    text: "最好的屏幕，是需要时在眼前、不需要时不存在的那一块。",
    attribution: "林目，目光科技创始人",
  },

  callouts: {
    info: "本场演示全部使用量产版样机，未使用任何后期合成画面。",
    warn: "首发批次产能有限，度数定制订单请预留十个工作日。",
    tip: "现场体验区提供验光适配，佩戴调试整流程约八分钟。",
  },

  code: {
    language: "python",
    code: `def frame_privacy_guard(frame: Frame) -> Frame:
    """影像帧默认本机处理，出境即拒绝。"""
    if frame.destination != "on_device":
        raise PrivacyViolation("影像不出本机，这是硬规则")
    return pipeline.process(frame)`,
  },

  verdicts: {
    positive: "重量、亮度、续航三个硬指标全部兑现发布承诺",
    warning: "产能是发布后九十天内最大的风险，交付节奏必须透明",
    neutral: "第二块虚拟屏的开放时间以开发者测试结论为准",
  },

  sources: [
    { label: "目光 One 量产测试报告", ref: "目光实验室，九月封样" },
    { label: "佩戴舒适度盲测", ref: "视觉健康研究所，样本三百人" },
    { label: "发布会演示序列", url: "https://example.com/mu-one-keynote" },
  ],

  captions: ["三十八克的整机在天平上", "正午户外的投影可读性实拍", "指环交互的拇指划动", "首发门店的体验验光位"],

  url: "one.muguang.example.com/launch",

  scatterHeading: "佩戴越轻，日均使用时长越长",
  scatterSubhead: "四轮工程样机的重量与日均佩戴时长对照",
  bubbleSizeNote: "口径：三百人盲测样本，气泡面积为该轮样机人数。",
}
