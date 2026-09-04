<p align="center"><img src="assets/banner.png" alt="pptwise：真正的 PPT，不是图片也不是 HTML" width="100%"></p>

<h1 align="center">pptwise</h1>

<p align="center"><b>真正的 PPT，不是图片也不是 HTML</b></p>

<p align="center">🥇 <b>全网第一个 DeepSeek Harness PPT 生成插件</b> 🥇</p>

<p align="center">
  <a href="https://pptwise.com/zh">pptwise.com</a> ·
  <a href="./README.md">English</a> ·
  <a href="./INSTALL.md">安装（转发给你的 AI）</a> ·
  <a href="./docs/cli.zh-CN.md">命令</a> ·
  <a href="./docs/ir.zh-CN.md">IR</a> ·
  <a href="./docs/themes.zh-CN.md">主题</a> ·
  <a href="./skills/pptwise/SKILL.zh-CN.md">Agent skill</a> ·
  <a href="https://github.com/liustack/modlens">ModLens（视觉）</a>
</p>

<p align="center">
  <a href="https://x.com/liustack"><img src="https://img.shields.io/badge/follow-%40liustack-black?style=flat-square&logo=x&logoColor=white" alt="Follow @liustack on X"></a>
  <a href="https://www.npmjs.com/package/@liustack/pptwise"><img src="https://img.shields.io/npm/v/@liustack/pptwise?style=flat-square&label=npm&color=cb3837" alt="npm"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@liustack/pptwise?style=flat-square" alt="Node.js"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Not%20backed%20by-Y%20Combinator-FF6600?style=flat-square&logo=ycombinator&logoColor=white" alt="Not backed by Y Combinator">
  <img src="https://img.shields.io/badge/no%20API%20key-to%20render-4c1?style=flat-square" alt="No API key to render">
</p>

## 交流

欢迎随时提 [issue](https://github.com/liustack/pptwise/issues/new/choose)。也欢迎在 X 关注 **[@liustack](https://x.com/liustack)**，聊聊你用 pptwise 做了什么、在哪个 harness 上运行，以及下一版最该解决什么。新版本也会第一时间在那里发布。

## 亮点

**⚡ 跟 AI 说一句，PPT 就好了。** 你给出意图，引擎把语义讲法与类型化组件做成一份主题统一的 deck。同一份绑定输入每次都会渲成同一份结果。

**✏️ 打开就能接着改。** 每个标题、每条要点、每根柱子都能在 PowerPoint 里点开改字改色。图表和表格里的数字是例外，换数字让 AI 重做一版。可以从 24 个出厂主题起步，拷进工作区继续改，也能从公司现有 PPT 抽取配色与字体。

**🔌 装进你正在用的 agent。** 一条命令装进 DeepSeek Harness、Claude Code，或任何读 skill 文件夹的 agent（Codex 等），装完就会用。

**🔁 改稿不用重新描述一遍。** 一条命令打开实时预览网页，用一句话告诉 AI 要改哪里，改完网页自动刷新。

**🔒 不用注册、渲染不用配 key、渲染时不联网。** 装好就能用，电脑上有 Node 22.19+ 或 Bun 就行。可选的图库搜索用用户自己的 Pexels key。

## 安装

**第一步，交给你的 AI。** 把这行话发给它：

> 按照 https://raw.githubusercontent.com/liustack/pptwise/main/INSTALL.md 安装 pptwise，装完跑一遍健康检查，把结果告诉我。

**在 DeepSeek Harness 上发另一句。** 那里 pptwise 是原生插件不是 skill 文件夹，所以有自己的一份指引。由你来挑发哪一句，不是让 agent 猜：agent 判断不了自己跑在哪个 harness 里。

> 按照 https://raw.githubusercontent.com/liustack/pptwise/main/INSTALL-dsh.md 安装 pptwise，装完跑一遍健康检查，把结果告诉我。

没有第二步。你的 AI 会把 skill 文件夹放到你这个 harness 读取的位置，skill 自带钉死版本的启动器，不需要你手动装 CLI。pptwise 在本地渲染 PPTX：渲染不要 API key、不用注册、无需配置。可选的图库搜索需要用户自己的 Pexels key。唯一前置是 Node 22.19+（或 Bun）。

## 快速开始

IR v5 是一份描述完整绑定 deck 的 JSON 文件。每张内容页都要写明语义 `kind`，主题菜单再把这个 kind 变成视觉脸。

```json
{
  "version": "5",
  "filename": "hello.pptx",
  "theme": { "id": "brief" },
  "slides": [
    {
      "type": "cover",
      "heading": "Hello pptwise",
      "subheading": "A first native deck"
    },
    {
      "type": "content",
      "kind": "points",
      "heading": "Why it works",
      "components": [
        {
          "type": "bullets",
          "items": ["Semantic IR in", "Theme-menu lookup", "Native DrawingML out"]
        }
      ]
    },
    { "type": "ending", "heading": "Thanks" }
  ]
}
```

保存为 `deck.json`，然后运行：

```bash
pptwise validate deck.json
pptwise render deck.json -o out/hello.pptx
pptwise preview deck.json -o out/review --html
```

按 `pptwise themes --json` 的 `occasions` 与 `identity` 选择主题。绑定前可以比较两到四个候选：

```bash
pptwise theme try brief,swiss,memo
```

可以通过拷贝预设、创建配色分叉，或抽取 Office 品牌，得到完整独立的 v2 主题：

```bash
pptwise theme new --from brief -o themes/acme.theme.json --id acme
pptwise theme fork acme --primary "#0B5FFF" -o themes/acme-blue.theme.json --id acme-blue
pptwise brand extract corp.pptx -o themes/acme-brand.theme.json --id acme-brand --from brief
```

Deck 项目在 `deck.spec.json` 中绑定唯一主题，再把页面内容放进 `pages/<id>.json`。渲染阶段没有临时主题切换。菜单相同的配色分叉可以替换绑定。菜单不同则需要回到主题选择，再修订 spec、受影响的 kind 与页面填充。

不安装也能运行：`npx -y @liustack/pptwise validate deck.json`。源码仓库中用 `node dist/cli.js` 代替 `pptwise`。`examples/` 下有可直接尝试的 v5 文件。

最常用的命令：

| command | 作用 |
| --- | --- |
| `spec validate <spec.json>` | 验证页面顺序、kind、标题、叙事与主题菜单适配。 |
| `assemble <dir>` | 把 deck 项目组合成派生 IR v5，不保存渲染选择。 |
| `validate <target>` | 检查 IR、绑定、菜单、组件、资产与内容质量。 |
| `render <target> [-o <out.pptx>]` | 渲染原生可编辑 PPTX。 |
| `audit <target>` | 检查几何、对比度、截断、内容丢失与单调性。 |
| `preview <target> [--html]` | 写出 SVG 页面与可选的自包含评审文件。 |
| `serve <target>` | 启动随源文件变化自动刷新的实时评审。 |
| `themes [--json]` | 列出带场合与个性强度元数据的出厂主题。 |
| `theme try <id,id,...>` | 用两到四个主题对比固定样稿。 |
| `theme new`、`theme fork` | 拷贝完整主题，或创建整套配色分叉。 |
| `doctor` | 检查运行时、skill 副本、可选能力与自检渲染。 |

完整命令表见 [`docs/cli.zh-CN.md`](./docs/cli.zh-CN.md)。

## 文档

| 文档 | 适用场景 |
| :-- | :-- |
| [安装手册](./INSTALL.md) | 把安装交给 agent，或检查运行前提 |
| [Agent skill](./skills/pptwise/SKILL.zh-CN.md) | 了解 pptwise 教给 agent 的完整工作流 |
| [CLI 手册](./docs/cli.zh-CN.md) | 查询命令、参数、审查、预览与健康检查 |
| [IR 参考](./docs/ir.zh-CN.md) | 用 JSON 编写 IR v5 页面、kind、组件、资产与叙事 |
| [主题](./docs/themes.zh-CN.md) | 拷贝、对比、分叉、绑定或编写完整 v2 主题 |
| [核心概念](./docs/concepts.md) | 理解主题、spec、组件、讲法、菜单与容量模型 |
| [架构](./docs/architecture.md) | 修改菜单路径、渲染链或导出边界 |
| [Deck 项目](./docs/deck-projects.md) | 用绑定主题、锁定 spec、页面文件、素材与实时评审制作 PPT |
| [菜单查表](./docs/menu-lookup.md) | 排查页面 kind 如何在验证与渲染中到达同一张脸 |
| [对比度系统](./docs/contrast-system.md) | 排查文字颜色、自绘背景与低对比度问题 |
| [测试](./docs/testing.md) | 选择验证命令、检查快照，或修改导出 XML |
| [内部 API](./docs/internal-api.md) | 了解 JavaScript 内部模块为何不承诺 semver 稳定性 |
| [发布手册](./docs/releasing.md) | 准备并发布 npm 版本 |
| [更新日志](./CHANGELOG.md) | 查询各版本的变化 |

## 关注「liustack」

关注微信公众号「liustack」：AI 创业机会、独立开发见解、AI 实战与工具，第一时间推送。微信扫码，或搜一搜「liustack」：

<p align="center">
  <img src="assets/wechat-qrcode.png" width="420" alt="微信公众号 liustack" />
</p>

⭐ 如果 pptwise 对你有用，请给[项目](https://github.com/liustack/pptwise)一个 star，并在 X 关注 **[@liustack](https://x.com/liustack)**。这是让更多开发者找到它最直接的方式。

## 致谢

图标原语抽取自 [lucide](https://lucide.dev)（ISC License）。pptwise 本身从一套生产环境的 AI 出 PPT 系统中抽取而来，从第一天起就针对 CJK 排版做了优化（全角标点宽度、中文换行、雅黑优先字体栈、显式东亚字体槽声明）。

## License

[MIT](./LICENSE)
