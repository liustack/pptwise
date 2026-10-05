import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * homeroom（教学课堂）——2026-07-13 第 13 主题（用户参考三张莫兰迪教学
 * 模板拍板新增教育培训类）。面向教学课件/课堂授课/培训机构/K12 儿童教育。
 * 与 thesis（深绿严肃学术研究/答辩）场景切分：homeroom 主打「亲和的
 * 教与学」，thesis 主打「严谨的学术」。
 *
 * **柔和组皮肤重设计（2026-08-20，设计源
 * `.issues/2026-08-18-theme-redesign/skins/group4-soft-boards.dc.html` 的
 * `section#g4` 里 homeroom 的色板角色表 + 封面样例）**：这一轮把 homeroom
 * 从「莫兰迪灰调米白纸」挪到「讲义雾蓝」——一间课室里真正有的东西是雾蓝的
 * 板书带、横线簿的格线、批改笔的红。旧表的藕粉/奶咖是装饰性的柔，不是教学
 * 场景自己的颜色。逐条来历：
 *   - `bg` `#F4F1EB` → `#ECF0F2`：米白纸 → 雾蓝讲义纸。整组「一静一闹」里
 *     homeroom 是静的那半，底色本身就要凉下来。
 *   - `surface` `#FFFFFF` → `#F9FBFC`：纯白 → 作业纸白。纯白压在雾蓝底上
 *     太硬，压半档之后卡片与墙才像同一间屋子里的两样东西（clinic 同款先例）。
 *   - `primary` `#6E8E9E` → `#4A6B8A`：雾蓝压深。旧值白字只有 ~2.9:1，
 *     content 因此长期禁配 `banner-heading`；新值白字实测 5.58:1，板书带
 *     终于真的能承白字。压 bg 实测 4.87:1（设计板自标 5.3:1，见下）。
 *   - `accent` `#D89A88` → `#B96A5E`：藕粉珊瑚 → 陶土红，批改笔的颜色。
 *   - `text` `#48545C` → `#23282E`：灰蓝黑 → 钢笔墨，压 bg 12.95:1。
 *   - `muted` `#657075` → `#5A6470`：铅笔灰，压 bg 5.24:1。
 *   - `border` `#E2DDD4` → `#D3DBE0`：横线簿的格线。
 *   - `chartPalette` 换成板上的莫兰迪四件套：雾蓝 / 陶土 / 鼠尾草 / 砂黄。
 *     前三格照抄设计板；第四格砂黄见下的偏离记录。
 *
 * 对比度实测（本仓库 `svg/ink.ts` 的 `contrastRatio`，压 `bg` `#ECF0F2`）：
 * primary 4.87:1、accent 3.46:1、text 12.95:1、muted 5.24:1（压 surface
 * 5.79:1）、chart 雾蓝 4.87 / 陶土 3.46 / 鼠尾草 3.18 / 砂黄 3.30。设计板
 * 自查写的 5.3 / 4.2 / 14 / 5.5 / 5.3·4.2·4·3.3 整体略高于实测（同向、
 * 同序），以实测为准——除砂黄一格，那一格是真的读不出来，见下。
 *
 * **一处偏离设计板 hex（板上数字赢，group2/group3 的同一条先例）**：
 * 板上砂黄写的是 `#C2A36B`，自标 3.3:1，但压新底实测只有 **2.09:1**——
 * 跌破装饰线 3.0 门槛，是四格里唯一读不出来的一格（group3 给 clinic 退役
 * 砂灰 `#B8AD98` 时实测 2.06:1，同一个病）。按同色相压暗到 `#988054`，
 * 实测 3.30:1，正是设计板自己写的那个数。其余六个 token 与四格里的前三格
 * 一字未改。
 *
 * `chartPalette` 即莫兰迪装饰四色，但 motif 本轮起不再读它（见
 * `../../motifs/motif-homeroom-motif.tsx` 的文件头，以及
 * `motif-chart-palette-isolation.test.tsx` 记着的那次图表调色板轮转改色的
 * Major）——图表色与装饰色从此各管各的。
 *
 * 第八波批 2（2026-08-22，设计源
 * `.issues/design-boards/wave8/b2/Classroom.dc.html`）：chapter 底色从
 * primary 雾蓝改为雾蓝讲义纸 `#ECF0F2`。环节盒由 `lesson-box-chapter` 自己
 * 承 primary 白字，浅底不再假设 rail-chapter 的满版深色。封面改锁
 * `chalk-band-cover`，不再走 `band-title`。`shape.cover` 里 bandWave 等旧
 * knobs 留下，别的路径可能还读。角色色与 fonts 不动。
 *
 * 装饰见 `../../motifs/motif-homeroom-motif.tsx`（横线簿格线：装订孔排与
 * 铅笔虚线退役）。
 *
 * **菜单分派（S1-B）**：讲义纸只做讲清楚的七道常规讲法，课堂不喊口号也不刷大数字，宣言、引用、大数字、单证据一律不上。
 *
 * **2026-10 样例重做（`design/rounds/2026-10-06-homeroom/`）**：照着定稿画成
 * 一堂课。封面换成 `lesson-cover`（左半板书深蓝、底边木色板槽，部门和场合、
 * 白色大标题、粉笔色波浪线、课程信息胶囊和日期，右半教室照片），章节页换成
 * `lesson-chapter`（通栏板书带，环节名写在描边小框里，作者自己写，不再固定写
 * LESSON；带下三张卡说这一环节学什么），结尾换成 `lesson-ending`（横线纸上的
 * 课后作业、黄色便利贴和「作业」印章）。七道内容讲法都走 `lesson-sheet`：左上
 * 是页面的 `kicker`（单元小标签），右上是 deck 的 `course` 画成的课程进度条，
 * 本页的 `stage` 点亮，标题 30px 粗体底对齐，下面一道 108px 的批改笔波浪线，
 * 正文交给 lesson 设定下的构图。页脚归 `homeroom-motif`（左边部门和课程，右边
 * 「N / M」），上面「横线簿格线 v3」那几句只剩历史意义，格线如今是横线纸题卡
 * 和作业纸自己的。色板角色不动，讲义雾蓝 #4A6B8A 与批改红 #B96A5E 的对比度裁
 * 定照旧，小于 24px 的红字和琥珀字由构图逐级压深到读得清。菜单的讲法集合不
 * 变，上面那条 S1-B 的取舍照旧。
 */
export const CLASSROOM_TOKENS: StyleTokens = {
  id: "homeroom",
  colors: {
    bg: "#ECF0F2", // 雾蓝讲义纸。页底，正文墨压它 12.95:1，答 4.5
    surface: "#F9FBFC", // 作业纸白。卡面，正文墨压它 14.30:1，答 4.5
    primary: "#4A6B8A", // 雾蓝压深（压 bg 4.87:1，白字 5.58:1）——板书带承白字
    accent: "#B96A5E", // 批改笔，只给线与点。压 bg 3.46:1 答 3.0，不承小字
    text: "#23282E", // 钢笔墨（12.95:1）
    muted: "#5A6470", // 铅笔灰（5.24:1）
    border: "#D3DBE0", // 横线簿格线。只作线，永不承字，不答文字门槛
    danger: "#A04A38", // 批改笔压深。kpi 箭头当字，压 surface 5.73:1，答 4.5
    warning: "#9A7318", // 砂黄压深。只作线与图标，压 surface 4.18:1，不答文字门槛
    success: "#55704A", // 鼠尾草压深。kpi 箭头当字，压 surface 5.32:1，答 4.5
    // 四格只作图系列与色块，可作徽章底，字走 readableOn 并答 4.5。
    // c2 鼠尾草压 bg 3.18:1，答 3.0 装饰线。余量仅 0.18，只作标记，永不当正文。
    chartPalette: ["#4A6B8A", "#B96A5E", "#7A8B6F", "#988054"], // 雾蓝/陶土/鼠尾草/砂黄
  },
  fonts: {
    heading: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
    body: ["Microsoft YaHei", "PingFang SC", "Helvetica Neue", "system-ui"],
  },
  shape: {
    radius: 12,
    gapScale: 1.1, // 全主题最圆润档（课堂亲和）+呼吸感
    cover: { textAnchor: "start", bandY: 260, bandH: 200, bandWave: true },
  },
  defaultBackgrounds: {
    cover: { kind: "color", value: "#ECF0F2" },
    // 第八波批 2：chapter 改雾蓝讲义纸。环节盒自己承 primary。
    chapter: { kind: "color", value: "#ECF0F2" },
    content: { kind: "color", value: "#ECF0F2" },
    ending: { kind: "color", value: "#ECF0F2" },
  },
};

export const CLASSROOM_THEME = {
  version: 2,
  id: "homeroom",
  label: "Homeroom",
  story: {
    name: "Homeroom",
    story: "Morandi tones on daytime handout paper, a soft sans, plenty of air. It is the teacher talking to parents: specific, calm, not alarming and not flattering.",
    positioning: "Choose it for parent meetings, class reports, and teaching material that must stay friendly while it stays honest.",
    audience: "A teacher addressing parents or students.",
    notFor: "Corporate audiences, research, or anything that should feel severe.",
    lineage: "The school handout and the term report.",
  },
  style: CLASSROOM_TOKENS,
  menu: {
    cover: { face: "lesson-cover" },
    chapter: { face: "lesson-chapter" },
    content: {
      points: { face: "lesson-sheet" },
      list: { face: "lesson-sheet" },
      comparison: { face: "lesson-sheet" },
      process: { face: "lesson-sheet" },
      data: { face: "lesson-sheet" },
      photo: { face: "lesson-sheet" },
      hierarchy: { face: "lesson-sheet" },
    },
    ending: { face: "lesson-ending" },
  },
  motif: { id: "homeroom-motif" },
} satisfies BuiltinThemeDeclaration;
