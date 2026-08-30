---
summary: 'skills/pptwise/references/validate.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/validate.md
---

# 验证与评审循环

何时读：填充页面，组装 deck 项目，渲染，审计，预览，启动评审服务，或修订内容时。

## 小批量填充

为 spec 中每张已确认页面编写 `pages/<page-id>.json`。页面文件只能包含 `components`、`background`、`image_side`、`footnote` 与 `notes`。Spec 拥有 `type`、内容页 `kind`、`heading` 和页面顺序。在页面文件中重复任何锁定字段都会硬报错。

每次最多填四页，然后运行：

```bash
pptwise assemble deck-dir/
pptwise validate deck-dir/
```

`assemble` 把锁定语义与页面内容合并成 IR v5。它不会把脸的选择或其他渲染决定写回项目。没有页面文件时保留为合法占位页。孤儿页面文件、锁定字段冲突、未知主题，或 kind 不在已绑定主题菜单中，都会硬报错。

`validate` 检查 schema、组件、资产、叙事、物理容量与编辑预算。修复错误，直到它打印 `OK`。警告不拦输出，但长标题、密度过高、资产悬空和重复选择通常都应在交付前收紧。

演讲者 `notes` 会导出为原生 PowerPoint 备注，从不画在页面上。

## 只按绑定渲染

```bash
pptwise render deck-dir/
```

`.pptx` 写到 `.pptwise/<deck>/`，命令会打印绝对路径。渲染阶段没有临时换主题的开关。项目 spec 就是绑定。

未填完的项目需要显式使用 `--draft`。可能丢失的内容仍会被拦截，除非用户明确接受 `--allow-dropped-content`。应优先修复或拆页。

更换主题前，用 `pptwise theme try` 比较候选。菜单相同的分叉可以换绑，再依次运行 assemble、validate、audit 和 render。菜单不同则要回到主题选择，修订 spec 与受影响的页面填充，再重复这些检查。

## 审计几何

全部页面填完后运行：

```bash
pptwise audit deck-dir/
```

确定性审计会检查溢出、越界、低对比度、重叠、截断、内容丢失和连续使用相同首组件。发现问题时退出码为 1，并指出页面。重组内容，源文件改变后重跑 assemble 与 validate，再重复 audit，直到退出码为 0。

封面或章节页使用照片背景时，加上 `--pixels`。像素采样能发现文字落在真实图片不安全区域的问题。

## 评审整份 deck

运行环境若有对话内 deck 预览工具，优先使用。否则生成自包含评审文件：

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

- 内容变化只编辑受影响的 `pages/<id>.json`，再依次运行 assemble、validate、audit 和 render。
- 页面顺序、页型、kind、标题或主题绑定变化时，编辑 `deck.spec.json`，运行 `pptwise spec validate`，再重复项目检查。
- 主题或受众完全不同的新任务应创建新项目，从意图与叙事重新开始。

聚焦修订时不要重新生成无关页面。把截图反馈解释为内容要求，修改拥有这项要求的最小源文件，并始终保持预览产物只读。
