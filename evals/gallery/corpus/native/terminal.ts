import type { Lexicon } from "../lexicon"

/**
 * terminal 原生选题：开源维护者在技术大会上的架构分享。
 * 主角是一个查询引擎项目和它的社区，语域是会议分享：
 * 讲设计取舍和翻过的车，不布道。
 */
export const TECH_LEXICON: Lexicon = {
  id: "zh",
  display: "中文",

  deckTitle: "Quill 查询引擎的三次重写",
  deckSubtitle: "一个开源维护者的架构账本 · 社区技术大会分享",
  author: "Quill 维护者 边城",
  date: "2026 年 10 月",

  chapters: ["项目现状", "第一次重写", "第二次重写", "第三次重写", "社区治理", "给维护者的话"],

  headings: [
    "七年，三次重写，星标四万二",
    "**向量化执行**：第三次重写只为这一件事",
    "第一次重写：把解析器从手写换成生成，又换回来",
    "错误信息是接口，不是日志",
    "第二次重写砍掉的插件系统，救了这个项目",
    "基准测试骗过我们两次",
    "单机性能榨干之前，不碰分布式",
    "破坏性变更的代价：迁移指南写了三个月",
    "四百二十位贡献者，活跃的是三十一位",
    "议题分诊轮值制运转两年",
    "拒绝功能请求的模板，是最常用的文档",
    "赞助收入全部买了持续集成的机器",
    "维护开源，是在时间里还技术债",
  ],

  kickers: ["现状", "重写一", "重写二", "重写三", "治理", "心得"],

  paragraph:
    "Quill 是一个嵌入式分析查询引擎，七年，三次重写，星标四万二，生产环境用户里最大的一家每天跑两亿次查询。这个分享不布道，只交账本：三次重写各自的动机、代价和翻过的车。一句话预告：第一次重写教会我们错误信息是接口，第二次教会我们删功能比加功能难，第三次教会我们基准测试会说谎，得让它先骗你两次。",

  shortParagraph:
    "Quill 是嵌入式分析查询引擎，七年三次重写，星标四万二，最大的生产用户每天跑两亿次查询。这个分享不布道只交账本：三次重写各自的动机、代价和翻过的车。第一次教会我们错误信息是接口，第二次教会我们删功能比加功能难，第三次教会我们基准测试会说谎。",

  sentences: [
    "Quill 定位是嵌入式分析查询引擎，单文件链接即用。",
    "第一次重写把手写解析器换成生成器，十四个月后又换了回来。",
    "换回来的原因是错误信息质量，生成器给不了指着逗号说话的报错。",
    "第二次重写删掉了插件系统，接口面从一百一十七个函数缩到二十九个。",
    "删插件当月掉了三千星标，半年后议题量降了六成。",
    "第三次重写引入向量化执行，热路径吞吐提升八点三倍。",
    "两次被基准测试误导：一次是缓存热身，一次是数据分布太乖。",
    "现在的基准套件强制混入倾斜数据与冷启动场景。",
    "破坏性变更集中在大版本发布，迁移指南先于代码合入。",
    "贡献者累计四百二十位，月活跃三十一位。",
    "议题分诊轮值制两年，首次响应中位数从九天缩到十六小时。",
    "年度赞助收入四万一千美元，全部投入持续集成算力。",
  ],

  bullets: [
    "三次重写各有一课",
    "错误信息是接口",
    "接口面砍到二十九个",
    "向量化提速八点三倍",
    "基准必混倾斜数据",
    "迁移指南先于代码",
  ],

  phrases: [
    "向量化执行",
    "手写解析器",
    "错误信息即接口",
    "接口面收缩",
    "基准测试陷阱",
    "冷启动场景",
    "倾斜数据",
    "破坏性变更纪律",
    "迁移指南先行",
    "议题分诊轮值",
    "拒绝模板",
    "赞助买算力",
  ],

  labels: [
    "解析器",
    "规划器",
    "优化器",
    "执行器",
    "存储层",
    "客户端",
    "v1 时代",
    "v2 时代",
    "v3 时代",
    "主干",
    "发布分支",
    "夜间构建",
    "议题",
    "拉取请求",
    "讨论区",
    "路线图",
  ],

  strengths: ["嵌入式定位没有直接对手", "错误信息口碑成护城河", "核心贡献者梯队稳定", "发布纪律七年未破"],
  weaknesses: ["总线因子仍然偏低", "文档翻译长期滞后", "视窗函数支持不全", "维护者时间靠业余挤"],
  opportunities: ["边缘计算带来嵌入式需求", "教学市场把它当教材", "云厂商来谈托管合作", "书稿邀约可反哺文档"],
  threats: ["大厂开源同类竞品", "核心成员职业变动", "供应链攻击盯上流行库", "许可证争议的行业余波"],

  stages: ["动机成立", "设计评审", "并行实现", "影子运行", "灰度切换", "旧路径下线"],
  periods: ["第一年", "第三年", "第五年", "第六年", "第七年"],
  periodAxis: "项目年份",
  segmentAxis: "模块",
  decision: "第四次重写先做哪一件",
  levels: [
    { title: "star 过", value: "4200", unit: "人" },
    { title: "提过 issue", value: "620", unit: "人" },
    { title: "提过 PR", value: "210", unit: "人" },
    { title: "有合并记录", value: "42", unit: "人" },
  ],
  handover: { owners: [0, 0, 1, 2, 1], note: "基准工作组跑完影子运行才敢灰度，两边结果对不齐就退回实现" },
  choices: [
    {
      edge: "先做向量化 · 61%",
      title: "重写执行器",
      detail: "热路径收益最大",
      outcomes: [
        { edge: "38%", title: "只做扫描算子", detail: "join 还是慢", value: "2.4", unit: "倍" },
        { edge: "62%", title: "扫描加 join", detail: "要重做内存布局", value: "4.1", unit: "倍", recommended: true },
      ],
    },
    {
      edge: "先收接口面 · 39%",
      title: "公开接口砍到二十九个",
      detail: "给下一次重写让路",
      outcomes: [
        { edge: "55%", title: "只标记废弃", detail: "两个大版本才清干净", value: "1.2", unit: "倍" },
        { edge: "45%", title: "废弃加迁移脚本", detail: "要写文档和 codemod", value: "1.5", unit: "倍" },
      ],
    },
  ],

  orgs: [
    "Quill 项目",
    "核心维护组",
    "分诊轮值组",
    "文档小组",
    "基准工作组",
    "最大生产用户",
    "云厂商合作方",
    "开源基金会",
    "安全响应组",
    "翻译志愿者",
    "大学数据库课程组",
    "赞助人集体",
  ],

  people: [
    { name: "边城", role: "创始维护者", org: "Quill 项目" },
    { name: "薄荷", role: "执行器负责人", org: "核心维护组" },
    { name: "Kai", role: "基准工作组发起人", org: "基准工作组" },
    { name: "阿计", role: "分诊轮值发明者", org: "分诊轮值组" },
    { name: "静静", role: "文档与拒绝模板作者", org: "文档小组" },
    { name: "老雷", role: "最大生产用户架构师", org: "最大生产用户" },
  ],

  metrics: [
    { value: "42000", unit: "star", label: "仓库星标", delta: "up" },
    { value: "8.3", unit: "倍", label: "热路径提速", delta: "up" },
    { value: "29", unit: "个", label: "公开接口数", delta: "down" },
    { value: "16", unit: "小时", label: "议题首响中位", delta: "down" },
    { value: "31", unit: "人", label: "月活跃贡献者", delta: "up" },
    { value: "41000", unit: "美元", label: "年度赞助", delta: "up" },
  ],

  tags: [
    "开源维护",
    "查询引擎",
    "向量化",
    "重写决策",
    "接口收缩",
    "报错设计",
    "基准方法论",
    "迁移指南",
    "议题分诊",
    "社区治理",
    "赞助透明",
    "总线因子",
  ],
  tallies: [
    { filled: 3, caption: "十位提过 PR 的人中", label: "在一年后仍在提交" },
    { filled: 7, caption: "十个新开议题中", label: "在一天内得到了第一次回复" },
    { filled: 2, caption: "十家生产环境用户中", label: "回报了自己的压测数据" },
  ],
  goals: [
    { title: "仓库星标", target: "40000 star", actual: "42000 star", gap: "+2000 star", status: "on_track" },
    { title: "热路径提速", target: "5 倍", actual: "8.3 倍", gap: "+3.3 倍", status: "on_track" },
    { title: "公开接口数", target: "35 个", actual: "29 个", gap: "-6 个", status: "on_track" },
    { title: "议题首响中位", target: "12 小时", actual: "16 小时", gap: "+4 小时", status: "watch" },
    { title: "月活跃贡献者", target: "50 人", actual: "31 人", gap: "-19 人", status: "off_track" },
    { title: "年度赞助", target: "80000 美元", actual: "41000 美元", gap: "-39000 美元", status: "off_track" },
  ],
  shortlist: {
    criteria: ["查询延迟", "内存占用", "实现复杂度", "兼容旧版"],
    options: [
      { label: "列式重写执行器", scores: [100, 75, 0, 25], total: 50 },
      { label: "向量化算子", scores: [75, 50, 50, 100], total: 69, chosen: true },
      { label: "只加结果缓存", scores: [25, 0, 100, 100], total: 56 },
      { label: "换第三方引擎", scores: [75, 75, 75, 0], total: 56 },
      { label: "维持现有实现", scores: [0, 50, 100, 100], total: 62 },
    ],
  },

  products: [
    { name: "Quill 社区版", note: "Apache 2.0，自行部署", price: "¥0", priceUnit: "永久" },
    { name: "云托管", note: "按查询量计费，含备份", price: "¥0.8", priceUnit: "万次查询" },
    { name: "企业支持", note: "四小时响应，含版本升级", price: "¥18万", priceUnit: "年" },
  ],

  orgChart: {
    root: { name: "边城", role: "创始维护者" },
    managers: [
      {
        name: "薄荷",
        role: "执行器负责人",
        reports: [{ name: "阿计", role: "分诊轮值发明者" }, { name: "静静", role: "文档与拒绝模板" }],
      },
      {
        name: "Kai",
        role: "基准工作组发起人",
        reports: [{ name: "老雷", role: "最大生产用户架构师" }],
      },
      {
        name: "宿羽",
        role: "发布管理",
        reports: [{ name: "小岑", role: "兼容性测试" }, { name: "阿柯", role: "翻译协调" }],
      },
    ],
  },
  iceberg: {
    waterline: "水面",
    aboveLabel: "README 写的",
    above: ["热路径提速八点三倍"],
    belowLabel: "维护者群里的",
    below: [
      "总线因子仍然偏低",
      "文档翻译长期滞后",
      "视窗函数支持不全",
      "维护者时间靠业余挤",
    ],
  },
  chain: {
    links: [
      { label: "动机成立", value: "11", unit: "%" },
      { label: "设计评审", value: "22", unit: "%" },
      { label: "并行实现", value: "31", unit: "%" },
      { label: "影子运行", value: "20", unit: "%" },
    ],
    support: [
      { label: "基准与回归", note: "基准工作组 · 每夜跑分 · 回归语料" },
      { label: "接口与文档", note: "公开接口二十九个 · 迁移指南 · 拒绝模板" },
      { label: "分诊与发布", note: "议题分诊轮值 · 灰度切换 · 版本公告" },
    ],
    margin: { label: "重写红利", value: "16%" },
  },
  quote: {
    text: "用户不读文档，但每个人都读报错。报错写好了，文档就少一半。",
    attribution: "边城，大会现场",
  },

  callouts: {
    info: "三次重写的设计文档与否决记录都在仓库 rfcs 目录，编号连续，含被毙掉的十一篇。",
    warn: "v2 到 v3 存在不兼容变更，生产升级前先在影子流量上跑满一周。",
    tip: "想给 Quill 提第一个补丁，从贴着「适合新手」标签的报错改进类议题开始最稳。",
  },

  code: {
    language: "rust",
    code: `/// 向量化执行的核心约定：批的大小是编译期常量。
/// 变长批在两次基准事故后被永久禁止。
pub fn scan_batch(col: &Column, sel: &Selection) -> Batch<1024> {
    debug_assert!(sel.len() <= 1024, "selection overflows batch");
    Batch::gather(col, sel) // 无分支收集，热路径禁止 panic
}`,
  },

  verdicts: {
    positive: "第三次重写目标全部兑现，v3 已承载最大用户全量流量",
    warning: "总线因子是当前最大风险，执行器要再养出一位共同负责人",
    neutral: "云厂商托管合作在谈，社区收益条款谈不拢就不签",
  },

  sources: [
    { label: "三次重写 RFC 与否决记录", ref: "仓库 rfcs 目录，编号 001-047" },
    { label: "基准套件与两次事故复盘", ref: "基准工作组，公开报告" },
    { label: "年度治理与赞助报告", url: "https://example.com/quill-governance-2026" },
  ],

  captions: ["三次重写的时间线一页图", "同一条 SQL 在 v1 与 v3 的报错对比", "向量化前后的火焰图", "分诊轮值表的看板截图"],

  url: "quill-engine.example.dev",

  scatterHeading: "报错越具体的模块，新人补丁越多",
  scatterSubhead: "十六个模块的报错质量评分与新人首补丁数量",
  bubbleSizeNote: "口径：仓库三年贡献统计，气泡面积为模块代码行数。",
}
