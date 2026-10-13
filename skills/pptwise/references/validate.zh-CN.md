---
summary: 'skills/pptwise/references/validate.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/validate.md
---

# 验证与评审循环

何时读：填充页面，构建，组装 deck 项目，渲染，审计，预览，启动评审服务，或修订内容时。

## 小批量填充

为 spec 中每张已确认页面编写 `pages/<page-id>.json`。页面文件只能包含 `components`、`background`、`image_side`、`footnote`、`fields`、`stamp`、`tag`、`ballot`、`years`、`stage` 与 `notes`。Spec 拥有 `type`、内容页 `kind`、`heading` 和页面顺序。在页面文件中重复任何锁定字段都会硬报错。

每次最多填四页，然后 build。宿主有 `pptwise_build` 工具时用它，它同时把目前画好的页面展示给用户。否则运行：

```bash
pptwise build deck-dir/ --json
```

`build` 一次跑完 assemble、validate、audit、preview 和 render，打印一份报告。只有每项检查都通过并写出 `.pptx` 时 `status` 才是 `ok`。否则是 `needs_revision`，命令以 1 退出。`errors` 里的每一项带 `stage`、`page`、`pageId`、要改的 `file`（页面内容是 `pages/<id>.json`，spec 锁定的内容是 `deck.spec.json`）、`field`，以及检查自己的 `message`，写明要改什么。audit 发现另带 `code`。警告放在 `warnings` 里，从不拦输出。还没写的页会被报为尚未写，audit 要等所有页写完才跑。只要 validate 通过，`preview` 就列出画好的页面。到指定文件修完每个错误，再 build。不要把页面转成 PNG 或当图片读来检查：报告就是检查结果。

处理某一页时想单独跑一项检查：

```bash
pptwise assemble deck-dir/
pptwise validate deck-dir/
```

`assemble` 把锁定语义与页面内容合并成 IR v5。它不会把脸的选择或其他渲染决定写回项目。没有页面文件时保留为合法占位页。孤儿页面文件、锁定字段冲突、未知主题都会硬报错。kind 不在已绑定主题菜单中时，按菜单里最近的讲法来画。

`validate` 检查 schema、组件、资产、叙事、物理容量与编辑预算。作者写的剩余条数或省略号替代会被拒绝，发生在页面画出来之前。修复错误，直到它打印 `OK`。警告不拦输出，但长标题、密度过高、资产悬空和重复选择通常都应在交付前收紧。

封面、章节页、结尾页的标题位置是固定的，放得下多长因主题而异，少的十来个汉字，多的七十多个。绑定的版式会截掉或放弃的标题，validate 直接拒绝，报错里写明是哪个版式、这一页它能放下这个标题的前多少（中文标题按字数，其他按词数，并引出放得下的那一段）、这个标题有多长。缩短标题，或者在该版式有副标题位置时把一部分挪进副标题。副标题同样如此：validate 用绑定的版式把这一页画一遍，版式会截掉或放弃的副标题直接拒绝，并引出这一页放得下的那一段。标题本身放得下，却占了下面卡片或清单要用的地方时，validate 也拒绝这一页，并引出能让它们留在页上的那段标题。最后，validate 把每张封面、章节页、结尾页画一遍，版式会漏掉任何内容的都拒绝：清单条目或按钮上的字超出了版式给它的那一行，就引出放得下的那一段；组件的写法版式画不了，比如年份刻度封面的时间线按季度标日期，或者卡片带了版式没地方放的字段（封面把行卡片画成胶囊时，卡片下的说明文字），就说明版式画每一项的哪些部分，并点出哪几项多带了什么。

内容页也会被画一遍。validate 按 render 的画法把每张内容页画一遍（包括改由朴素版式接手的情况），会漏掉任何内容、或截掉标题、来源行、组件文字的页直接拒绝。报错写明是哪一页、会丢什么（哪个组件、几项、哪段字被截），再画一遍能找到时，还写明删什么：缩短哪段字、这个清单这一页放得下几项，或者版式没地方放的字段。

演讲者 `notes` 会导出为原生 PowerPoint 备注，从不画在页面上。

## 一份 deck，一个最终文件

`build` 把 `.pptx` 写到 `.pptwise/<deck>/<filename>.pptx`，文件名取 spec 的 `filename`（spec 没写时用 deck 目录名），与 `render` 用的是同一路径，而且只在每项检查都通过时才写。没通过的 build 会删掉之前 build 留在那里的文件，所以磁盘上的文件总是和源文件一致。按报告里的 `pptx` 路径原样交付：不要再渲染、复制、改名，也不要另导出一份。在 DSH 上用 `present` 交给用户。渲染阶段没有临时换主题的开关。项目 spec 就是绑定。

单独的 `render` 只用于下面两种妥协：

```bash
pptwise render deck-dir/
```

未填完的项目需要显式使用 `--draft`。可能丢失的内容仍会被拦截，除非用户明确接受 `--allow-dropped-content`，这个开关也让内容页越过 validate 的画页检查。应优先修复或拆页。

deck 第一次 build 时，还会用另外最多三个主题画出它的封面和一两页内容页，列在 `alternatives` 里，带每个主题的 id。要换主题，把 `deck.spec.json` 里的 `theme` 改掉再 build。报告在 `drawnAs` 里列出按别的讲法画的页面，对新脸不画的装饰字段给出警告，需要改动的页面列在 `errors` 里。之前有一次 build 把每页都画全过，新主题画不全的页面就不再报错，而是去掉接不住的部分照常画出，给出警告，`writtenFor` 写明哪个主题能画全。`themeSource` 写明绑定的主题是 `builtin`（内置）、`file`（主题文件）还是 `pack`（内容包）。

## 审计几何

所有页写完后 `build` 会跑 audit。单独运行：

```bash
pptwise audit deck-dir/
```

确定性审计会检查溢出、越界、低对比度、重叠、截断、内容丢失和连续使用相同首组件。发现问题时退出码为 1，并指出页面。标题、来源行或组件文字会被主题版式截断时，改由朴素版式把这一页画全（`stepped-aside`）。`content-truncated` 带 `"tier": "hard"` 时，说明没有哪个版式放得下这段字：缩短它或拆页。重组内容，再 build，直到通过。

封面或章节页使用照片背景时，加上 `--pixels`。像素采样能发现文字落在真实图片不安全区域的问题。

页面 `background` 涂成中间调颜色（大约和 `#777777`、`#6B7B8C` 一样亮）时报出的 `low-contrast`，要改背景，不是改字：主题字色读不清的地方渲染器已经改用纯黑，卡片也挑纯黑读得清的一侧加深或提亮，封面左上角的标记按它落在的色带取色。把颜色调浅或调深。

## 评审整份 deck

尽早给用户看页面。有对话内工具时，spec 一校验通过就对 deck 目录调用 `pptwise_outline`，让用户在写页之前看到大纲，之后每批写完用 `pptwise_build`。否则把 build 报告里的 `preview.html` 路径给用户，或生成自包含评审文件：

```bash
pptwise preview deck-dir/ --html
```

它会在 `.pptwise/<deck>/` 下写出每页一个 SVG 与 `preview.html`。预览只读。占位页会被标记，完整 deck 会在评审界面中带上 audit 发现。

用户需要浏览器实时评审时，把项目服务作为后台任务启动：

```bash
pptwise serve deck-dir/ --no-open
```

分享命令打印的准确 localhost 地址，在评审轮次中保留进程，结束时只停止这个进程。

## 在源头修订

- 内容变化只编辑受影响的 `pages/<id>.json`，再 build 一次。
- 页面顺序、页型、kind、标题或主题绑定变化时，编辑 `deck.spec.json`，运行 `pptwise spec validate`，再重复项目检查。
- 主题或受众完全不同的新任务应创建新项目，从意图与叙事重新开始。

聚焦修订时不要重新生成无关页面。把截图反馈解释为内容要求，修改拥有这项要求的最小源文件，并始终保持预览产物只读。
