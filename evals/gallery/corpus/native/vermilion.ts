import type { Lexicon } from "../lexicon"

/**
 * vermilion 原生选题：区政务服务中心的半年工作报告。
 * 主角是一个区级机构，语域是公文体：数目字准确、句式平实、
 * 成绩与问题分开讲，不带营销腔。
 */
export const VERMILION_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "云江区政务服务中心 2026 年上半年工作报告",
  deckSubtitle: "一窗受理改革推进情况与下半年重点安排",
  author: "云江区政务服务中心",
  date: "2026 年 7 月",

  chapters: ["总体情况", "一窗受理改革", "线上服务", "作风与效能", "存在的问题", "下半年安排"],

  headings: [
    "上半年办件总量四十一万件，同比增加一成二",
    "**一窗受理**覆盖事项从两百项扩展到五百四十项",
    "平均办理时限压缩至三点二个工作日",
    "网上可办率达到九成二，全程网办占六成八",
    "群众满意率九十八点六，投诉量下降四成",
    "帮办代办队伍覆盖全部十二个街道",
    "午间延时服务累计接待两万一千人次",
    "高频事项材料清单平均精简三成五",
    "跨省通办专窗上半年办结四千二百件",
    "适老化窗口与无障碍改造全部到位",
    "三个事项的承诺时限仍未兑现",
    "窗口人员流动率偏高的问题尚未缓解",
    "下半年围绕高效办成一件事再推十个场景",
  ],

  kickers: ["总体情况", "改革进展", "线上服务", "效能建设", "问题清单", "工作安排"],

  paragraph:
    "上半年，中心围绕一窗受理改革主线，将综合窗口受理事项从两百项扩展到五百四十项，覆盖市场准入、社会事务、工程建设三大板块。办件总量四十一万件，同比增加一成二，平均办理时限压缩至三点二个工作日，较改革前减少一点八个工作日。改革的关键在后台：受理与审批分离后，材料流转由中心统一调度，部门审批时限首次实现全流程留痕可查。",

  shortParagraph:
    "上半年，中心将综合窗口受理事项从两百项扩展到五百四十项，覆盖市场准入、社会事务、工程建设三大板块。办件总量四十一万件，同比增加一成二，平均办理时限压缩至三点二个工作日。受理与审批分离后，材料流转统一调度，部门审批时限首次全流程留痕可查。",

  sentences: [
    "综合窗口受理事项扩展到五百四十项，占进驻事项总数的八成六。",
    "办件总量四十一万件，其中综合窗口办理二十九万件。",
    "平均办理时限三点二个工作日，较改革前减少一点八个工作日。",
    "网上可办率九成二，全程网办占比六成八。",
    "群众满意率九十八点六，有效投诉量同比下降四成。",
    "帮办代办队伍一百零六人，覆盖全部十二个街道。",
    "午间延时服务累计接待两万一千人次，主要集中在社保与不动产。",
    "高频事项申请材料平均精简三成五，重复提交材料基本消除。",
    "跨省通办专窗办结四千二百件，长三角事项占七成。",
    "三个工程建设类事项的承诺时限尚未兑现，卡点在中介测绘环节。",
    "窗口人员年流动率两成三，业务熟练度受到影响。",
    "下半年将高效办成一件事扩展到新生儿出生等十个场景。",
  ],

  bullets: [
    "办件总量四十一万件，同比增一成二",
    "一窗受理事项扩展到五百四十项",
    "平均时限压缩至三点二个工作日",
    "网上可办率九成二",
    "满意率九十八点六，投诉降四成",
    "帮办代办覆盖十二个街道",
  ],

  phrases: [
    "一窗受理改革",
    "受理审批分离",
    "全程网办",
    "帮办代办服务",
    "午间延时服务",
    "材料清单精简",
    "跨省通办专窗",
    "适老化改造",
    "全流程留痕",
    "好差评闭环",
    "一件事一次办",
    "首问负责制",
  ],

  labels: [
    "市场准入",
    "社会事务",
    "工程建设",
    "不动产",
    "社保医保",
    "税务",
    "公安户籍",
    "综合窗口",
    "专窗",
    "自助区",
    "线上大厅",
    "帮办点",
    "一街道",
    "二街道",
    "老城片区",
    "新城片区",
  ],

  strengths: ["一窗受理覆盖面走在全市前列", "办理时限连续四个季度下降", "满意率保持高位且投诉下降", "帮办代办网络实现街道全覆盖"],
  weaknesses: ["三个事项承诺时限未兑现", "窗口人员流动率偏高", "部分部门授权事项仍未进驻", "自助终端使用率不均衡"],
  opportunities: ["市级一体化平台年内贯通", "高效办成一件事新增场景清单", "长三角通办范围继续扩围", "数字政务专项资金支持"],
  threats: ["办件量增长快于人员配置", "个别高频系统稳定性不足", "中介服务环节时限不可控", "数据共享权责边界待明确"],

  stages: ["申请受理", "材料流转", "部门审批", "结果制证", "送达反馈", "好差评回访"],
  periods: ["二月", "三月", "四月", "五月", "六月"],
  periodAxis: "月份",
  segmentAxis: "业务板块",
  decision: "下半年先推哪一项",
  levels: [
    { title: "到过大厅", value: "42", unit: "万人次" },
    { title: "一次办成", value: "31", unit: "万人次" },
    { title: "全程网办", value: "14", unit: "万人次" },
    { title: "不用到场", value: "5", unit: "万人次" },
  ],
  handover: { owners: [1, 1, 2, 0, 1], note: "综合窗口收件后要转专窗预审，工程类件常常卡在这一步" },
  choices: [
    {
      edge: "推全程网办 · 58%",
      title: "先上二十个高频事项",
      detail: "系统已具备",
      outcomes: [
        { edge: "44%", title: "只上申报", detail: "取件还要跑一趟", value: "8", unit: "万件" },
        { edge: "56%", title: "申报带邮寄", detail: "要跟邮政签约", value: "14", unit: "万件", recommended: true },
      ],
    },
    {
      edge: "推帮办代办 · 42%",
      title: "增设两个帮办席",
      detail: "面向老年人",
      outcomes: [
        { edge: "53%", title: "只在大厅", detail: "覆盖有限", value: "5", unit: "万件" },
        { edge: "47%", title: "大厅加社区", detail: "要培训四十人", value: "9", unit: "万件" },
      ],
    },
  ],

  orgs: [
    "区市场监管局",
    "区人社局",
    "区住建局",
    "区税务局",
    "区公安分局",
    "区医保局",
    "区自然资源所",
    "区卫健委",
    "区民政局",
    "区城管局",
    "区司法局",
    "区数据局",
  ],

  people: [
    { name: "周正明", role: "中心主任", org: "云江区政务服务中心" },
    { name: "郑晓芸", role: "综合窗口负责人", org: "云江区政务服务中心" },
    { name: "吴建国", role: "工程建设专窗负责人", org: "云江区政务服务中心" },
    { name: "刘敏", role: "帮办代办队长", org: "云江区政务服务中心" },
    { name: "黄立群", role: "审改科科长", org: "区数据局" },
    { name: "沈玉兰", role: "监督员", org: "区政务服务监督队" },
  ],

  metrics: [
    { value: "41", unit: "万件", label: "上半年办件总量", delta: "up" },
    { value: "540", unit: "项", label: "一窗受理事项", delta: "up" },
    { value: "3.2", unit: "工作日", label: "平均办理时限", delta: "down" },
    { value: "92", unit: "%", label: "网上可办率", delta: "up" },
    { value: "98.6", unit: "%", label: "群众满意率", delta: "up" },
    { value: "4200", unit: "件", label: "跨省通办办结", delta: "up" },
  ],

  tags: [
    "一窗受理",
    "一网通办",
    "跨省通办",
    "帮办代办",
    "延时服务",
    "免证办",
    "告知承诺",
    "容缺受理",
    "好差评",
    "电子证照",
    "自助终端",
    "适老服务",
  ],
  frequencies: [
    { text: "一窗受理", weight: 4 },
    { text: "办理时限", weight: 4 },
    { text: "网上可办", weight: 4 },
    { text: "帮办代办", weight: 3 },
    { text: "预约", weight: 3 },
    { text: "跨省通办", weight: 3 },
    { text: "等候时长", weight: 3 },
    { text: "叫号", weight: 2 },
    { text: "材料清单", weight: 2 },
    { text: "延时服务", weight: 2 },
    { text: "回访", weight: 2 },
    { text: "自助机", weight: 1 },
    { text: "导办", weight: 1 },
    { text: "满意率", weight: 1 },
  ],
  tallies: [
    { filled: 9, caption: "十件办件中", label: "在承诺时限内办结" },
    { filled: 6, caption: "十位到场群众中", label: "此前已在网上预约" },
    { filled: 3, caption: "十位老年办事群众中", label: "独立完成了自助机取号" },
  ],
  goals: [
    { title: "上半年办件总量", target: "38 万件", actual: "41 万件", gap: "+3 万件", status: "on_track" },
    { title: "一窗受理事项", target: "500 项", actual: "540 项", gap: "+40 项", status: "on_track" },
    { title: "平均办理时限", target: "4 工作日", actual: "3.2 工作日", gap: "-0.8 工作日", status: "on_track" },
    { title: "网上可办率", target: "95%", actual: "92%", gap: "-3 pp", status: "watch" },
    { title: "高峰期等候时长", target: "20 分钟", actual: "38 分钟", gap: "+18 分钟", status: "off_track" },
    { title: "帮办代办覆盖", target: "全部窗口", actual: "六成窗口", gap: "-4 成", status: "off_track" },
  ],
  shortlist: {
    criteria: ["缩短等候", "改造投入", "老年人友好", "上线周期"],
    options: [
      { label: "增开四个综合窗口", scores: [100, 25, 75, 50], total: 62 },
      { label: "推广线上预约叫号", scores: [75, 75, 25, 100], total: 69 },
      { label: "错峰延时服务", scores: [50, 100, 100, 100], total: 88, chosen: true },
      { label: "全面自助机替代", scores: [75, 50, 0, 25], total: 38 },
      { label: "维持现有安排", scores: [0, 100, 50, 100], total: 62 },
    ],
  },

  products: [
    { name: "不动产登记 · 即办", note: "材料齐全，当场出证", price: "¥80", priceUnit: "件" },
    { name: "企业开办套餐", note: "执照、刻章与税务一次办", price: "¥0", priceUnit: "件" },
    { name: "公证代办", note: "全程代跑，七个工作日", price: "¥260", priceUnit: "件" },
  ],

  orgChart: {
    root: { name: "周正明", role: "中心主任" },
    managers: [
      {
        name: "郑晓芸",
        role: "综合窗口负责人",
        reports: [{ name: "刘敏", role: "帮办代办队长" }, { name: "沈玉兰", role: "监督员" }],
      },
      {
        name: "吴建国",
        role: "工程建设专窗负责人",
        reports: [{ name: "黄立群", role: "审改科科长" }],
      },
      {
        name: "陆平",
        role: "数据与终端",
        reports: [{ name: "小岑", role: "自助终端运维" }, { name: "阿彬", role: "电子证照" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "报告里写的",
    above: ["办件总量四十一万件，同比增一成二"],
    belowLabel: "窗口自己知道的",
    below: [
      "三个事项承诺时限没兑现",
      "窗口人员流动率偏高",
      "部分部门授权事项仍未进驻",
      "自助终端使用率很不均衡",
    ],
  },
  chain: {
    links: [
      { label: "申请受理", value: "19", unit: "%" },
      { label: "材料流转", value: "16", unit: "%" },
      { label: "部门审批", value: "31", unit: "%" },
      { label: "结果制证", value: "18", unit: "%" },
    ],
    support: [
      { label: "一窗与帮办", note: "五百四十项一窗受理 · 帮办代办 · 老年专窗" },
      { label: "数据与证照", note: "电子证照互认 · 材料免提交 · 自助终端" },
      { label: "监督与评价", note: "好差评 · 监督员巡查 · 超时预警" },
    ],
    margin: { label: "时限结余", value: "16%" },
  },
  quote: {
    text: "群众不关心事项归哪个部门，只关心这件事今天能不能办成。窗口的全部改革，都是围绕这句话做的。",
    attribution: "周正明，云江区政务服务中心主任",
  },

  callouts: {
    info: "本报告数据统计区间为 2026 年 1 月 1 日至 6 月 30 日，口径与区统计局核定一致。",
    warn: "工程建设类三个事项承诺时限未兑现，若三季度仍无改善将启动部门约谈。",
    tip: "材料清单精简经验已形成模板，建议在卫健、民政两个板块优先复制。",
  },

  code: {
    language: "python",
    code: `def overdue_items(ledger: Ledger) -> list[Item]:
    """筛出超承诺时限的在办件，供每周效能通报。"""
    rows = ledger.filter(status="在办")
    late = [r for r in rows if r.days_open > r.promised_days]
    if ledger.coverage < 0.95:
        raise DataQualityError("台账覆盖率不足，先补录再通报")
    return sorted(late, key=lambda r: r.days_open, reverse=True)`,
  },

  verdicts: {
    positive: "改革主要指标全部完成序时进度，群众获得感有实绩支撑",
    warning: "承诺时限未兑现事项虽少，但影响政府公信力，必须限期整改",
    neutral: "窗口人员编制问题已上报区编办，待统一研究",
  },

  sources: [
    { label: "云江区政务服务中心办件台账", ref: "2026 年上半年，6 月 30 日封账" },
    { label: "全区政务服务好差评汇总", ref: "区数据局，2026 年 7 月" },
    { label: "政务服务效能第三方测评", url: "https://example.com/gov-service-eval" },
  ],

  captions: ["综合受理区的午间延时服务", "帮办代办队在老城片区上门服务", "跨省通办专窗的联办流程", "自助服务区的电子证照打印"],

  url: "zwfw.yunjiang.example.gov.cn/hall",

  scatterHeading: "材料精简越多的事项，办理时限降得越快",
  scatterSubhead: "四类高频事项的材料精简率与时限降幅对照",
  bubbleSizeNote: "口径：2026 年上半年办件台账，气泡面积为该事项办件量。",
}
