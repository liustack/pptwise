---
summary: 'skills/pptwise/references/materials.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/materials.md
---

# 素材

何时读：收集一份 deck 的原料时：事实和出处、品牌、每页该配什么图。

收集素材时不问用户任何事。在写 spec 之前把它们写进 `deck-dir/materials.md`，之后每一步都重新读这个文件：写 spec 时、写每一页时、为每张图找来源时、检查 deck 时。这个文件就是 deck 的记忆。同一份素材跑两次，做出同一份 deck，要改 deck 也先改这个文件。

## 文件

按这个顺序用这四节。每行写短、写具体。

```markdown
# <deck title>

## Request
- Audience: <who>
- Outcome: <what they should do or think afterwards>
- Delivery: presented | circulated, <time>
- Narrative: <preset or strategy, pacing, audience>

## Facts
- <claim or figure> | <source title>, <URL or file>, <date>
- ...

## Brand
- Scan: <the scan's summary line>
- Colors: <next.brandFlag>, from <brand.from>
- Logo: <file> -> asset `logo`
- Fonts: <heading>, <body>
- Templates: <file>, scheme <name>

## Pictures
- Direction: <what the pictures show, and the look: documentary, product, archival, illustrated>
- Sources: own | stock | web | generated
- <page id> | <frame: cover background, photo, chapter, grid item> | <subject> | <source>: <file, search words, or page URL> | asset `<asset_id>`
- ...
```

deck 没有的条目就不写。检索什么都没找到时，在 `Brand` 下写 `none found`，后面的步骤就不会再跑一遍。

## 事实

案头调查默认要做。上网查 deck 需要的数字、日期、名字和例子。优先找一手来源：机构自己的报告、统计部门、论文、公告。每个数字都记下出处和日期。用户给的材料已经包含内容时，按它来，只补出处。查不到出处的数字不进 deck，交付时如实告诉用户，不要估一个。

## 品牌

在项目目录里运行 `pptwise brand scan --json`，把找到的东西抄进文件（见 `branding.md`）。用户交来的 Office 模板、logo 或照片也算。检索找到品牌色时，第 3 步的主题墙会多一个品牌选项。

## 配图

主题在哪个画框里画图，就给哪个画框规划一张（哪些画框配图见 `images.md`）。从内容出发规划：这一页说什么，读者看到什么才会信。主体写具体（「新装配线，工位上的工人」，而不是「工厂」）。来源依次是：检索找到的用户和项目自己的图，然后是图库，然后是网上许可允许 deck 使用的图，生成器启用时最后才是生成的图。大纲定下后补上页面 id，图钉进来后补上 asset id。
