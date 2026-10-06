import type { Lexicon } from "../lexicon"

/**
 * proposal 原生选题：一家空压机服务商递给某汽配厂管理层的空压站节能改造方案。
 * 主角是客户和它的电费单，语域是面向客户的说服：先说贵司得到什么，
 * 再算账、给方案、讲落地，最后请客户定事。服务商和客户都不写名字。
 */
export const PROPOSAL_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "让空压站少吃一半电",
  deckSubtitle: "空压站节能改造与能效托管方案",
  author: "呈 贵司管理层",
  date: "2026 年 11 月",

  chapters: ["贵司得到什么", "先算账", "改什么", "谁出钱", "怎么落地", "请贵司定"],

  headings: [
    "空压站吃掉全厂三成电，改完能省一半",
    "**一年省电约 96 万度**，三年左右回本",
    "泄漏占了三成产气，先堵漏再换机",
    "两台变频机顶替四台老机，按用气量开机",
    "余热回收给热水，冬天省下一台锅炉",
    "自投三年回本，托管不出钱分成省下的电",
    "改造分四步，每一步都有贵司签字的验收单",
    "停机窗口排在周末，不碰生产班次",
    "省多少电以电表为准，月底对账",
    "风险写进合同：省不到约定数，我们补差",
    "报价按设备、管网、控制三块逐项列",
    "请贵司提供四份资料，测算就换成贵司自己的账",
    "请贵司定三件事，我们就开始测量",
  ],

  kickers: ["概要", "算账", "方案", "出资", "落地", "决定"],

  paragraph:
    "贵司空压站现有四台定频螺杆机，装机 440 千瓦，一年用电约 210 万度，占全厂三成。我们在两周的测量里看到三件事：管网泄漏约占产气的三成，四台机长期一起开但只有六成负荷，压缩热全部排到了车间外面。所以方案分三步：先堵漏、把压力从 0.8 降到 0.7 兆帕，再用两台变频机顶替四台老机按用气量开机，最后把余热接进浴室热水。按测量数据算，一年省电约 96 万度，按贵司 0.68 元的平均电价，约省 65 万元。",

  shortParagraph:
    "贵司空压站四台定频机，一年用电约 210 万度，占全厂三成。两周测量看到：泄漏约占产气三成，四台机一起开只有六成负荷，压缩热全部排掉。方案是先堵漏降压，再换两台变频机，最后回收余热。一年省电约 96 万度，约 65 万元。",

  sentences: [
    "空压站一年用电约 210 万度，占全厂用电的三成。",
    "两周测量里，管网泄漏约占产气量的三成。",
    "四台定频机长期同时运行，平均负荷只有六成。",
    "排气压力每降 0.1 兆帕，电耗约降百分之七。",
    "两台变频机按用气量开机，夜班只开一台。",
    "压缩热回收后，可供全厂浴室和食堂热水。",
    "改造按周末停机窗口排期，不占生产班次。",
    "省电量以改造前后的电表读数为准，按月对账。",
    "托管模式下，贵司不出设备钱，按省下的电费分成。",
    "约定节电率达不到时，差额由我们补给贵司。",
    "老机拆下后可作备机，保留一台应急。",
    "全部验收单由贵司设备部门签字确认。",
  ],

  bullets: [
    "一年省电约 96 万度",
    "泄漏先堵上三成",
    "压力降到 0.7 兆帕",
    "两台变频机按需开",
    "余热接进浴室热水",
    "省不到约定数我们补差",
  ],

  phrases: [
    "管网堵漏",
    "降压运行",
    "变频替换",
    "群控联调",
    "余热回收",
    "能效托管",
    "电表对账",
    "周末停机",
    "备机保留",
    "节电分成",
    "补差条款",
    "验收签字",
  ],

  labels: [
    "泄漏",
    "压力",
    "负荷",
    "电耗",
    "热水",
    "电价",
    "停机",
    "对账",
    "一号机",
    "二号机",
    "三号机",
    "四号机",
    "白班",
    "中班",
    "夜班",
    "周末",
  ],

  strengths: ["测量数据两周不间断", "老机可作备机不浪费", "省电量以电表为准", "停机只占周末"],
  weaknesses: ["管网图纸不全要现场补测", "余热回收要改浴室管路", "夜班用气数据只有一周", "变频机交货期六周"],
  opportunities: ["电价再涨省得更多", "余热可再接食堂", "其余车间可照搬", "能耗数据可用于碳盘查"],
  threats: ["产量下滑用气减少", "管网老化泄漏复发", "停机窗口被订单挤占", "电价政策调整"],

  stages: ["现场测量", "方案与测算", "堵漏降压", "变频替换", "余热回收", "托管对账"],
  periods: ["第一周", "第二周", "第四周", "第六周", "第八周"],
  periodAxis: "周次",
  segmentAxis: "机组",
  decision: "先自投还是先托管",
  levels: [
    { title: "测过的用气点", value: "64", unit: "处" },
    { title: "找到的漏点", value: "42", unit: "处" },
    { title: "当周堵上", value: "31", unit: "处" },
    { title: "复测合格", value: "29", unit: "处" },
  ],
  handover: { owners: [0, 2, 1, 0, 1, 0], note: "堵漏要等贵司停机窗口，排在第二个周末" },
  choices: [
    {
      edge: "贵司自投 · 约 160 万元",
      title: "设备归贵司",
      detail: "省下的电全归贵司",
      outcomes: [
        { edge: "约 2.5 年", title: "一次付清", detail: "回本最快", value: "65", unit: "万元/年", recommended: true },
        { edge: "约 3 年", title: "分期付款", detail: "多付利息", value: "58", unit: "万元/年" },
      ],
    },
    {
      edge: "能效托管 · 不出钱",
      title: "设备归我们",
      detail: "按省下的电费分成",
      outcomes: [
        { edge: "五年", title: "七三分成", detail: "贵司拿七成", value: "45", unit: "万元/年" },
        { edge: "八年", title: "八二分成", detail: "期满设备移交", value: "52", unit: "万元/年" },
      ],
    },
  ],

  sets: {
    labels: ["省电", "不出钱", "不停产"],
    overlap: "托管加周末施工",
  },
  causes: {
    effect: "空压站电费一年比一年高",
    categories: [
      { label: "泄漏", causes: ["快插接头老化", "排水阀常开"] },
      { label: "压力", causes: ["按最远工位设压", "滤芯堵塞压降大"] },
      { label: "开机", causes: ["四台一起开", "夜班不减机"] },
      { label: "热量", causes: ["压缩热直接排掉", "冷却风扇常转"] },
    ],
  },
  positions: {
    x: { title: "改造投入", low: "少", high: "多" },
    y: { title: "一年省电", low: "少", high: "多" },
    quadrants: ["投入多省得少，不做", "投入多省得多，第二步", "投入少省得少，顺手做", "投入少省得多，先做"],
    points: [
      { label: "堵漏", x: 12, y: 78, mine: true },
      { label: "降压", x: 8, y: 52 },
      { label: "变频替换", x: 72, y: 84 },
      { label: "群控", x: 40, y: 46 },
      { label: "余热回收", x: 58, y: 38 },
      { label: "管网改造", x: 86, y: 30 },
      { label: "干燥机换型", x: 46, y: 18 },
      { label: "排水阀更换", x: 10, y: 24 },
    ],
  },
  equation: {
    operands: [
      { label: "堵漏降压", value: "48 万度", note: "泄漏和压降两项" },
      { label: "变频替换", value: "48 万度", note: "按用气量开机" },
    ],
    result: { label: "一年省电", value: "96 万度", note: "约 65 万元" },
  },
  wheel: {
    whole: "改造的六项工作",
    sectors: [
      { label: "现场测量", value: "两周" },
      { label: "方案测算", value: "一周" },
      { label: "堵漏降压", value: "两个周末" },
      { label: "变频替换", value: "第六周" },
      { label: "余热回收", value: "第八周" },
      { label: "托管对账", value: "每月" },
    ],
    marked: 2,
  },
  debate: {
    proposal: "现在就改",
    forTitle: "支持",
    againstTitle: "顾虑",
    pros: [
      { label: "一年省约 65 万元", note: "按测量数据和贵司电价" },
      { label: "托管不出设备钱", note: "按省下的电费分成" },
      { label: "施工只占周末", note: "不碰生产班次" },
      { label: "省不到我们补差", note: "写进合同" },
    ],
    cons: [
      { label: "要停两个周末", note: "需要提前排单" },
      { label: "浴室管路要改", note: "后勤要配合" },
      { label: "托管期八年", note: "期满才移交设备" },
      { label: "夜班数据只测一周", note: "测算会再校一次" },
    ],
    verdict: "先做堵漏和降压，省下的电一个月就能在电表上看到，再定变频和余热怎么出钱。",
  },
  orgs: [
    "贵司设备部",
    "贵司财务部",
    "贵司后勤部",
    "贵司生产部",
    "供电所",
    "空压机原厂",
    "管网施工队",
    "第三方检测",
    "能效托管方",
    "保险公司",
    "园区管委会",
    "节能服务协会",
  ],

  people: [
    { name: "项目经理", role: "改造总负责", org: "我方" },
    { name: "生产经理", role: "安排停机", org: "贵司生产部" },
    { name: "财务负责人", role: "定出资方式", org: "贵司财务部" },
    { name: "设备部负责人", role: "验收签字", org: "贵司设备部" },
    { name: "后勤负责人", role: "浴室热水", org: "贵司后勤部" },
    { name: "测量工程师", role: "两周测量", org: "我方" },
  ],

  metrics: [
    { value: "96", unit: "万度", label: "一年省电", delta: "up" },
    { value: "65", unit: "万元", label: "一年省电费", delta: "up" },
    { value: "30", unit: "%", label: "泄漏占产气", delta: "down" },
    { value: "0.7", unit: "兆帕", label: "改造后压力", delta: "down" },
    { value: "2.5", unit: "年", label: "自投回本", delta: "flat" },
    { value: "0", unit: "元", label: "托管出资", delta: "flat" },
  ],

  tags: [
    "空压站",
    "节能改造",
    "堵漏",
    "降压",
    "变频",
    "群控",
    "余热回收",
    "能效托管",
    "电表对账",
    "补差条款",
    "周末施工",
    "验收单",
  ],
  frequencies: [
    { text: "省电", weight: 4 },
    { text: "泄漏", weight: 4 },
    { text: "变频", weight: 4 },
    { text: "电表", weight: 3 },
    { text: "托管", weight: 3 },
    { text: "压力", weight: 3 },
    { text: "余热", weight: 3 },
    { text: "停机", weight: 2 },
    { text: "验收", weight: 2 },
    { text: "分成", weight: 2 },
    { text: "备机", weight: 2 },
    { text: "热水", weight: 1 },
    { text: "排水阀", weight: 1 },
    { text: "滤芯", weight: 1 },
  ],
  tallies: [
    { filled: 3, caption: "十立方米产气里", label: "约三立方米漏掉了" },
    { filled: 6, caption: "十个小时开机里", label: "四台机只有六小时带满负荷" },
    { filled: 7, caption: "十度用电里", label: "约七度变成了排掉的热" },
  ],
  goals: [
    { title: "一年省电", target: "90 万度", actual: "96 万度", gap: "+6 万度", status: "on_track" },
    { title: "泄漏率", target: "10%", actual: "12%", gap: "+2 个点", status: "watch" },
    { title: "排气压力", target: "0.7 兆帕", actual: "0.7 兆帕", gap: "0", status: "on_track" },
    { title: "热水温度", target: "50 ℃", actual: "46 ℃", gap: "-4 ℃", status: "watch" },
    { title: "停机时长", target: "48 小时", actual: "40 小时", gap: "-8 小时", status: "on_track" },
    { title: "对账准时", target: "每月 5 日", actual: "每月 8 日", gap: "晚 3 天", status: "off_track" },
  ],
  shortlist: {
    criteria: ["省电", "出资", "停产", "风险"],
    options: [
      { label: "只堵漏降压", scores: [50, 100, 100, 100], total: 81 },
      { label: "堵漏加变频，自投", scores: [100, 25, 75, 75], total: 69 },
      { label: "堵漏加变频，托管", scores: [100, 100, 75, 75], total: 88, chosen: true },
      { label: "全部改造加余热，自投", scores: [100, 0, 50, 75], total: 56 },
      { label: "暂不改造", scores: [0, 100, 100, 25], total: 56 },
    ],
  },

  products: [
    { name: "堵漏降压", note: "两个周末做完，一个月见效", price: "¥18万", priceUnit: "项" },
    { name: "变频替换", note: "两台变频机加群控", price: "¥120万", priceUnit: "项" },
    { name: "余热回收", note: "接进浴室和食堂热水", price: "¥22万", priceUnit: "项" },
  ],

  orgChart: {
    root: { name: "项目经理", role: "改造总负责" },
    managers: [
      {
        name: "测量组",
        role: "两周不间断测量",
        reports: [{ name: "测量工程师", role: "流量与电量" }, { name: "检漏员", role: "超声检漏" }],
      },
      {
        name: "施工组",
        role: "周末停机施工",
        reports: [{ name: "管网队", role: "堵漏与改管" }],
      },
      {
        name: "托管组",
        role: "月度对账",
        reports: [{ name: "运维工程师", role: "巡检与备件" }, { name: "数据专员", role: "电表读数" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "贵司看得到的",
    above: ["电费一年比一年高"],
    belowLabel: "测量才看得到的",
    below: ["管网泄漏约占三成", "四台机一起开只带六成负荷", "压力按最远工位设高了", "压缩热全部排掉"],
  },
  chain: {
    links: [
      { label: "现场测量", value: "6", unit: "%" },
      { label: "堵漏降压", value: "14", unit: "%" },
      { label: "变频替换", value: "58", unit: "%" },
      { label: "余热回收", value: "17", unit: "%" },
    ],
    support: [
      { label: "数据与对账", note: "电表读数 · 流量计 · 月度报告" },
      { label: "施工与停机", note: "周末窗口 · 安全交底 · 验收单" },
      { label: "合同与补差", note: "约定节电率 · 补差条款 · 期满移交" },
    ],
    margin: { label: "不可预见费", value: "5%" },
  },
  quote: {
    text: "电表上看得到的省，我们才算省；看不到的，我们补。",
    attribution: "改造合同第七条",
  },

  callouts: {
    info: "本方案所有省电数字都来自两周不间断测量，改造后按同一块电表对账。",
    warn: "托管期内产量大幅下滑时，约定节电量按用气量折算，写进合同附件。",
    tip: "先做堵漏降压，一个月就能在电表上看到省下的电，再定后两步。",
  },

  code: {
    language: "python",
    code: `def monthly_saving(kwh_before: float, kwh_after: float, price: float = 0.68) -> float:
    """按同一块电表算当月省下的电费，月底对账用。"""
    saved = kwh_before - kwh_after
    if saved < 0:
        raise ValueError("用电不降反升，先查用气量变化")
    return round(saved * price, 2)`,
  },

  verdicts: {
    positive: "堵漏降压一个月见效，电表上看得到",
    warning: "夜班用气数据只测了一周，测算会再校一次",
    neutral: "余热回收等浴室管路改造方案定了再报",
  },

  sources: [
    { label: "两周现场测量记录", ref: "流量计与电表，逐小时" },
    { label: "贵司近 12 个月电费单", ref: "财务部提供" },
    { label: "空压机原厂能效曲线", url: "https://example.com/air-compressor-curves" },
  ],

  captions: ["改造前的空压站", "超声检漏找到的快插接头", "两台变频机的安装位置", "接进浴室的余热回收管路"],

  url: "air-retrofit.example.com/proposal",

  scatterHeading: "开机台数越多的时段，单位产气电耗越高",
  scatterSubhead: "两周测量里每小时开机台数与单位产气电耗对照",
  bubbleSizeNote: "口径：流量计与电表逐小时读数，气泡面积为当小时产气量。",
}
