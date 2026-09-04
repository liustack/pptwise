import type { DesignStoryField } from "@/design-story"

/**
 * Chinese for the design cards, so a review sitting reads in the reviewer's
 * own language while the source copy stays English.
 *
 * Keyed by the same namespaced object id the manifest uses (`theme:swiss`,
 * `component:bullets`) and then by field, because translation arrives field
 * by field: the card falls back to the English of any field not listed here
 * and marks it 未译, which is what turns the gap into a work list instead of
 * a silent hole.
 *
 * `stories.zh.test.mts` holds the keys to objects that actually exist, so a
 * renamed theme takes its translation with it rather than leaving a row here
 * that no card will ever read.
 */
export const STORY_ZH: Readonly<Record<string, Partial<Record<DesignStoryField, string>>>> = {
  // ── themes (24) ─────────────────────────────────────────────────────────

  "theme:academic": {
    name: "论文",
    story: "祖母绿落在稿纸白上，衬线字体带书卷气。论证按答辩的路子走：假说、方法、证据，加一段坦诚的局限说明。",
    positioning: "研究汇报、答辩，或任何靠方法论可信度立足的场合。",
    audience: "研究者面对会追问逻辑的同行。",
    notFor: "销售、造势，或节奏必须快的页面。",
    lineage: "学位论文与课堂讲义，脚注线是它的签名。",
  },
  "theme:arena": {
    name: "竞技场",
    story: "开赛前一秒的紫黑底色，电光绿是唯一亮着的仪表。快、响、对数字一丝不苟。",
    positioning: "电竞、粉丝活动、赛季复盘，能量本身就是信息的场合。",
    audience: "俱乐部或主办方面向玩家和观众。",
    notFor: "机构汇报、学术场合，或需要安静叙事的内容。",
    lineage: "电竞直播叠加层和赛场大屏。",
  },
  "theme:campaign": {
    name: "动员",
    story: "深紫配锋利的强调色，为短标语和硬截止日期而生。每一页都是作战室里的行动号令。",
    positioning: "发布会、推广战役、动员宣讲，一句话必须穿透所有物料的场合。",
    audience: "团队在向合作方、渠道和自己人发出召集。",
    notFor: "沉思、学术或慢节奏叙事。",
    lineage: "上线倒计时和发布作战室。",
  },
  "theme:classroom": {
    name: "班会",
    story: "莫兰迪色系印在白天发的纸上，柔软的无衬线体，留白充裕。像老师跟家长谈话：具体、平静，不吓人也不捧人。",
    positioning: "家长会、班级报告、需要友善但诚实的教学材料。",
    audience: "教师面向家长或学生。",
    notFor: "职场受众、研究场合，或需要严肃感的内容。",
    lineage: "学校通知单和学期报告。",
  },
  "theme:consulting": {
    name: "简报",
    story: "藏青墨色，一线明黄，衬线字体像一份装订好的报告。结论先行，后面每页都是撑住结论的证据。",
    positioning: "听众想先听答案再听论证，而且会看数字能不能对上。",
    audience: "团队向决策者呈报结论。",
    notFor: "需要悬念、温度或慢慢揭开的叙事。",
    lineage: "咨询交付件：论断式标题、安静的仪表盘、一个指路的强调色。",
  },
  "theme:crayon": {
    name: "蜡笔",
    story: "硬纸板上一盒蜡笔，圆角、手绘线条，没有一块冷灰。明快但不吵闹。",
    positioning: "幼儿园和低年级的报告、家庭活动、绘本分享。",
    audience: "老师和孩子面向家庭。",
    notFor: "任何成人职业场合。",
    lineage: "幼儿园墙面和绘本。",
  },
  "theme:ember": {
    name: "余烬",
    story: "炭黑底，象牙字，一点火橙色每页只出现一次。像在果园里过了一夜、把数字背熟了的那场路演。",
    positioning: "你在争取资金或信任，必须先让问题刺痛，再让方案发光。",
    audience: "创始人向投资人或早期伙伴路演。",
    notFor: "机构汇报或需要保持中立感的内容。",
    lineage: "种子轮路演，削到只剩一点火星。",
  },
  "theme:enterprise": {
    name: "公告",
    story: "白墙配国际克莱因蓝，用朴素的无衬线体。像一个大组织在告诉三万人下个月一号会发生什么。",
    positioning: "动员、推行、内部通告，清晰和权威比个性更重要的场合。",
    audience: "管理层面向整个组织讲话。",
    notFor: "私密故事、精品品牌，或需要手工感的页面。",
    lineage: "公司公告栏和推行方案。",
  },
  "theme:heritage": {
    name: "传承",
    story: "勃艮第酒红配焦糖色，宋体衬线，页面带框。它代一个延续了百年的名号说话，打算再守一百年。",
    positioning: "老字号、周年纪念、交接仪式，延续性就是承诺的场合。",
    audience: "家族或品牌向在意不变的人解释什么不会变。",
    notFor: "颠覆叙事、新创品牌或极简现代风格。",
    lineage: "老牌品牌手册和家族账簿。",
  },
  "theme:ink": {
    name: "水墨",
    story: "宣纸底色，墨黑着色，一方朱印，标题用楷书。文字可以竖排，像一幅展开的卷轴。",
    positioning: "文化、书法、茶道、节庆，或任何需要文人语境的叙事。",
    audience: "学会、策展人或主人面向慢慢读的来宾。",
    notFor: "公司汇报、数据仪表盘，或拉丁字母为主的内容。",
    lineage: "中国水墨画与挂轴。",
  },
  "theme:insight": {
    name: "账簿",
    story: "暖黑终端底，琥珀数字，衬线用来写论点。像一位策略师，公开赔率，每季度结一次账。",
    positioning: "故事是一场押注，附带数字佐证，而且听众会记得你押对没有。",
    audience: "分析师或策略师面对分配资金的人。",
    notFor: "温情叙事、庆典，或没有数字可守的内容。",
    lineage: "行情屏和年度策略札记，连同滚动条。",
  },
  "theme:journal": {
    name: "期刊",
    story: "暖纸色，砖红色，衬线刊头加期号。读起来像一本小杂志在向读者解释自己。",
    positioning: "编辑口吻：改版手记、读者信、需要从容展开的长论证。",
    audience: "编辑或作者面向忠实读者群。",
    notFor: "快节奏路演、仪表盘或公司动员。",
    lineage: "独立期刊和它的刊头规范。",
  },
  "theme:lecture": {
    name: "夜课",
    story: "灯灭后的深绿黑板，一条粉笔线画在要紧的地方。每页讲一个知识点，当场练。",
    positioning: "成人课堂、夜校、内部培训和技术教学。",
    audience: "教师面向今晚来学一件事的成年人。",
    notFor: "面向儿童、用于推广，或正式机构汇报。",
    lineage: "大学黑板和夜校讲义。",
  },
  "theme:luxe": {
    name: "礼遇",
    story: "黑底，金线，低语般的衬线体。像一场每把椅子都已安排好的晚宴请柬。",
    positioning: "请柬、周年庆典，以及靠克制和工艺说话的品牌。",
    audience: "一个名号在向它已经叫得出名字的来宾致意。",
    notFor: "任何喧闹、紧急或大众化的场合。",
    lineage: "凹版请柬和高定工坊。",
  },
  "theme:memo": {
    name: "备忘",
    story: "打字机节奏，抬头线，FROM 和 RE 栏。这不是讨论，是一个已经写下来的决定。",
    positioning: "决策、留底件、政策备忘，供人事后独自阅读。",
    audience: "一个人写下来准备被人追责，包括被自己追责。",
    notFor: "现场演出、视觉大场面，或图片很多的页面。",
    lineage: "备忘录和打字决策记录。",
  },
  "theme:museum": {
    name: "展厅",
    story: "展厅灯关了，说明牌还亮着。五十勒克斯，一根细线，每页回答一个问题：这件东西照亮了什么？",
    positioning: "展览、策展讲座、安静的叙事文稿，每页像一件展品配一张说明牌。",
    audience: "策展人带领观众，一次看一件。",
    notFor: "销售文稿、快速更新或密集表格。",
    lineage: "展品说明牌和美术馆图录。",
  },
  "theme:playbill": {
    name: "节目单",
    story: "荧光黄铺满页面，黑色粗体负责喊话。开幕前十分钟发到手里的那份节目单。",
    positioning: "活动、招聘、节展阵容，十页以内、需要隔着一个房间被看见的短文稿。",
    audience: "剧团或主办方在招呼观众入场。",
    notFor: "长报告、数据页，或需要正式感的内容。",
    lineage: "剧院节目单和演出海报。",
  },
  "theme:pulse": {
    name: "诊室",
    story: "薄荷白配深青，干净线条，没有任何装饰会被误认为数据。说话朴素，像一位好医生。",
    positioning: "健康、身心，以及任何需要干净、可信、平静地传递数字的场合。",
    audience: "临床团队面向患者或公众。",
    notFor: "奢华感、娱乐性，或靠戏剧性取胜的内容。",
    lineage: "健康讲座和临床摘要。",
  },
  "theme:runway": {
    name: "秀场",
    story: "秀场白纸，黑色刊头，一滴深红。每页是一个从你面前走过的造型，图片替你开口。",
    positioning: "系列发布、造型册，图片就是论据、文字只是图注的场合。",
    audience: "设计师或工作室向来看的观众展示作品。",
    notFor: "数据密集的报告或文字量大的页面。",
    lineage: "时装秀节目册和造型册。",
  },
  "theme:stage": {
    name: "舞台",
    story: "场灯暗下去，黑底上留一句话。没有什么跟它抢。",
    positioning: "发布会或主题演讲，每页只放一个论断，其余全交给演讲者。",
    audience: "创始人或演讲者站在满场观众面前的大屏前。",
    notFor: "密集汇报、表格，或一页需要不止一个想法的场合。",
    lineage: "主题演讲传统：一页一行巨字。",
  },
  "theme:swiss": {
    name: "瑞士",
    story: "冷白底色，一道红色沿边压住，其余全是网格纪律。像一份没有什么要藏的机构年报封面。",
    positioning: "透明度报告、审计、政策通报，设计不该抢走对账目的注意力时选它。",
    audience: "基金会、机构或审计方，面向公众或理事会陈述。",
    notFor: "需要温度、庆祝气氛，或需要品牌个性登场的场合。",
    lineage: "机构在用的瑞士现代主义排版。",
  },
  "theme:tech": {
    name: "终端",
    story: "蓝黑纵深带青瓷微光，顶部一条细线，每页一个强调点。像一位维护者在解释架构：精确、不急、对炒作过敏。",
    positioning: "工程讲座、架构评审、开源项目叙事，取舍比口号重要的场合。",
    audience: "工程师向工程师解释一个系统。",
    notFor: "消费者发布、暖色人文故事，或需要颜色传递情感的页面。",
    lineage: "技术大会演讲和设计文档，放在暗色里。",
  },
  "theme:terra": {
    name: "年鉴",
    story: "沙色、橄榄、赭石，日历按节气走。它按年记土地的账，不是按季度。",
    positioning: "可持续发展、农业、社区、长周期报告，耐心本身就是论据的场合。",
    audience: "合作社、基金会或守护者向成员和邻里汇报。",
    notFor: "快节奏商业路演或都市科技风。",
    lineage: "农民历和季节账本。",
  },
  "theme:vermilion": {
    name: "朱批",
    story: "朱红底，一线金，暖白纸面。带着在大厅里被朗读的正式报告的分量。",
    positioning: "政府和机构工作报告、述职、年终总结，需要正式语域的场合。",
    audience: "一个部门在正式场合向上和向外汇报。",
    notFor: "新创品牌、活泼风格，或应该显得随意的场合。",
    lineage: "中式公文，红与金落在纸面上。",
  },
}
