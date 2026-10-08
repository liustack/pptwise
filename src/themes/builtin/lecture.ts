import type { StyleTokens } from "../tokens";
import type { BuiltinThemeDeclaration } from "../schema";

/**
 * lecture（黑板夜校）——2026-08-21 新增第 22 个 theme id（第 21 个结构身份）。
 * 性格：灯灭之后的大学黑板，粉笔只划一道
 * 重点。目标场景：大学/成人课程、技术分享、内训。与 homeroom（小学生
 * 白日讲义纸）分昼夜，与 thesis（祖母绿压暖象牙纸的书卷）分底色。
 *
 * 全仓唯一绿底。深底第七色温：ledger 暖黑终端 `#0F1216` / terminal 蓝黑
 * `#0A0F1E` / luxe 真黑 `#0B0908` / arena 紫黑 `#120B22` / museum 棕黑
 * `#211A12` / stage 青灰黑 `#141C22` 之后，lecture 墨绿板面 `#1C2823`
 * （RGB 28,40,35，H 155.0，L 0.133）。缩略图里是那块绿，不是又一块死黑。
 * 与最近六家深底的 CIE76 ΔE（本仓库实测）：stage 9.85 / museum 11.01 /
 * ledger 12.29 / luxe 14.16 / terminal 18.07 / arena 23.58。最近的是 stage，
 * 色相差 51°（绿板 vs 青灰黑），大色块一眼可辨。
 *
 * 黄粉笔与两家金分家（设计板点名写进注释）：
 *   - lecture `#E9C46A` H 42.5 / L 0.665 / S 0.743。板上的亮黄粉，只划重点。
 *   - luxe `#C6A15B` H 39.3 / L 0.567 / S 0.484。请柬浅香槟。色相近（ΔH
 *     3.2°），明度低一档、饱和低一截。ΔE 15.2。lecture 是粉笔，luxe 是烫金。
 *   - museum `#BE7A28` H 32.8 / L 0.451 / S 0.652。展签铜牌，更橙更暗。
 *     ΔH 9.7°，ΔL 0.21，ΔE 29.5。
 *
 * 逐条来历（设计源 `theme-wave7/Lecture.dc.html`，surface / chart / 语义
 * 三色自推，本仓库 `svg/ink.ts` 的 `contrastRatio` 压 `bg #1C2823` 实测）：
 *   - `bg` `#1C2823`：墨绿板面。
 *   - `surface` `#26342E`：板面同族抬升一档。深底不出白卡。
 *   - `primary` `#2E4038`：深色块，让黄粉笔唱主角。白字压 primary 11.01:1。
 *   - `accent` `#E9C46A`：黄粉笔（9.13:1），可直接承大标题。
 *   - `text` `#EFF3EC`：粉笔白（13.58:1）。
 *   - `muted` `#A9BCAF`：退淡的粉笔灰（7.62:1，压 surface 6.51:1）。
 *   - `border` `#35443C`：粉笔槽。motif 细框取这个角色。
 *   - `chartPalette` 四色：粉笔白 / 黄粉笔 / 灰蓝 / 陶土。灰蓝 `#8A9EAA`
 *     饱和 0.158，不进 vivid-blue 带（195-260 且 S≥0.35）。陶土 `#C47A68`
 *     H 11.7，落在红段，不进蓝配橙禁忌带。四格压 bg 13.58 / 9.13 / 5.48 /
 *     4.60，全过 3.0 装饰线。两两 ΔE 33-61。
 *
 * 语义三色压 `surface` 校准（kpi 箭头是字，callout 的 warning 是线与图标）：
 *   - `danger` `#E18474`：粉笔珊瑚（4.81:1），kpi 箭头当字，答 4.5。
 *   - `warning` `#E9C46A`：黄粉笔本色（7.79:1），只作线与图标。
 *   - `success` `#7AAB7E`：粉笔鼠尾草（4.93:1），不是 arena 电光绿。
 *
 * 字体：heading SimSun 族（journal / heritage / luxe / museum 先例），
 * Windows 安全面打头保导出无 tofu（2026-10 起 Times New Roman 打头配宋体，
 * 见文末）。body 仍是雅黑。圆角 0 + gapScale 0.9
 * （tight 档，arena 同值）。
 *
 * 装饰见 `../../motifs/motif-lecture-motif.tsx`（2026-08 是 26px 内缩 1px
 * 粉笔槽细框，2026-10 起是整块黑板，见文末）。
 *
 * 第八波批 4：封面 `board-head` 锁板不动。章节 pinOnly `chalk-rule-chapter`
 * （讲次 kicker + 黄粉笔弧是版式标题附着件）。ending pinOnly
 * `next-lecture-ending`（课后清单 + 下讲预告）。motif 粉笔槽框几何不动，
 * 四页都画。黄粉笔弧仍不进 motif。token hex / fonts / defaultBackgrounds
 * 四页墨绿 `#1C2823` 都不动。
 *
 * 四轴：L / top-band / light / tight。最近邻 bulletin（L / top / medium /
 * tight），岔装饰轴。封面倾向 banner-title / tone-adaptive-header。
 *
 * 可拉伸性：黄粉笔即参数（夜校品牌分享可换成品牌色，仍避开香槟金 / 铜金）。
 * 细框几何不动，不升级成双线，不加印章。
 *
 * **菜单分派（S1-B）**：黑板课用的是有框脸池，data 落在满幅收边的 tone-adaptive-content，photo 用能挂角注的 image-annotate，课堂不引名人语录，quote 不上。
 *
 * **2026-10 样例重画（设计源 `design/rounds/2026-10-08-lecture/`）**：按青年
 * 夜校「一节课学会个税年度汇算」的定稿整套重画，配色一处不改。上面几轮「封
 * 面锁 board-head」「motif 粉笔槽框几何不动」「黄粉笔弧不进 motif」的裁决
 * 让位给这一稿：
 *   - motif 换成整块黑板：10px 木框、底边粉笔槽（一截白粉笔、一截黄粉笔、
 *     一块板擦）、槽上写课名、右上「3 / 18」课时，四种页型都画，图片页也
 *     在。木头色由黄粉笔推出（`chalkboardLedge`），仍是零 hex。缩略图里一
 *     眼是一块黑板。
 *   - 内容页（十种 kind）都交给 `chalkboard-sheet`，正文交给 chalkboard 设
 *     定的构图：三件事粉笔框、两条路汇入、公式花括号、决策树、乘数排、减号
 *     排、扣除卡、税率阶梯、例题条件、等号板书、瀑布、练习题、答案栏、打叉
 *     清单、划掉的大数、比例时间线。封面 `chalkboard-cover`、章节
 *     `chalkboard-chapter`、结尾 `chalkboard-ending`。quote 仍不上。
 *   - 黄粉笔弧进了版式：每页一处黄色重点由构图自己划（两遍错开的手绘线、粉
 *     笔圈、花括号），跟着字走，不进 motif。
 *   - 字体：heading 改成 Times New Roman 打头配宋体（thesis、journal 先
 *     例）。宋体没有西文字形，英文 deck 的标题和弯引号原来会走全角，现在
 *     西文和数字走 Times New Roman，中文仍由 SimSun 承担，导出不会豆腐块。
 */
export const LECTURE_TOKENS: StyleTokens = {
  id: "lecture",
  colors: {
    bg: "#1C2823", // 墨绿板面。页底，正文墨压它 13.58:1，答 4.5
    surface: "#26342E", // 同族面板。卡面，正文墨压它 11.59:1，答 4.5
    primary: "#2E4038", // 深色块（让 accent 唱主角，白字 11.01:1）
    accent: "#E9C46A", // 黄粉笔（9.13:1）——比 luxe 香槟金更亮更饱和
    text: "#EFF3EC", // 粉笔白（13.58:1）
    muted: "#A9BCAF", // 退淡粉笔灰（7.62:1）
    border: "#35443C", // 粉笔槽。只作线，永不承字，不答文字门槛
    danger: "#E18474", // 粉笔珊瑚。kpi 箭头当字，压 surface 4.81:1，答 4.5
    warning: "#E9C46A", // 黄粉笔本色（7.79:1），只作线与图标
    success: "#7AAB7E", // 粉笔鼠尾草（4.93:1）
    // 四格只作图系列与色块。可作徽章底，字走 readableOn 并答 4.5。
    // 粉笔白是浅色块，不直接充当深底上的图系列文字墨。
    chartPalette: ["#EFF3EC", "#E9C46A", "#8A9EAA", "#C47A68"], // 粉笔白/黄粉笔/灰蓝/陶土
  },
  fonts: {
    // 板书衬线：SimSun/宋体 是 SAFE_FONTS 里的 CJK 衬线，放首位保导出。
    // Songti SC/STSong 留作 macOS 预览回退（journal/heritage/luxe/museum 同款）。
    // Times New Roman for the Latin and its figures, SimSun for the Chinese
    // (thesis and journal's pairing): SimSun has no Latin of its own, and an
    // English title's curly quotes came out full width in it.
    heading: ["Times New Roman", "SimSun", "宋体", "Songti SC", "STSong", "serif"],
    body: ["Microsoft YaHei", "Helvetica Neue", "Arial", "system-ui"],
  },
  shape: { radius: 0, gapScale: 0.9 }, // 黑板直角 + tight 留白（arena 同档）
  defaultBackgrounds: {
    cover: { kind: "color", value: "#1C2823" },
    chapter: { kind: "color", value: "#1C2823" },
    content: { kind: "color", value: "#1C2823" },
    ending: { kind: "color", value: "#1C2823" },
  },
};

export const LECTURE_THEME = {
  version: 2,
  id: "lecture",
  label: "Lecture",
  story: {
    name: "Lecture",
    story: "A dark green board after the lights go down, and one chalk line under the thing that matters. It teaches one lesson per page and practices it on the spot.",
    positioning: "Choose it for adult classes, evening courses, internal training, and technical teaching.",
    audience: "A teacher to adults who came to learn one thing tonight.",
    notFor: "Children, marketing, or formal institutional reporting.",
    lineage: "The university blackboard and the night-school handout.",
  },
  style: LECTURE_TOKENS,
  // A chalk line under the marked run, drawn the way it is on the board
  // this theme is named after.
  emphasis: "underline",
  menu: {
    cover: { face: "chalkboard-cover" },
    chapter: { face: "chalkboard-chapter" },
    content: {
      points: { face: "chalkboard-sheet" },
      list: { face: "chalkboard-sheet" },
      comparison: { face: "chalkboard-sheet" },
      process: { face: "chalkboard-sheet" },
      data: { face: "chalkboard-sheet" },
      photo: { face: "chalkboard-sheet" },
      statement: { face: "chalkboard-sheet" },
      fact: { face: "chalkboard-sheet" },
      evidence: { face: "chalkboard-sheet" },
      hierarchy: { face: "chalkboard-sheet" },
    },
    ending: { face: "chalkboard-ending" },
  },
  motif: { id: "lecture-motif" },
} satisfies BuiltinThemeDeclaration;
