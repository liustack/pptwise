---
summary: 'skills/pptwise/references/density.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/density.md
---

# 密度与装饰

何时读：按 pacing 预算写作，适配已绑定的脸，或判断页面是否需要局部装饰时。

## 两种容量限制

每张内容页同时受两种独立限制。叙事 pacing 给出编辑预算，主题菜单选中的脸给出正文物理容量。实际组件上限取两者中的较小值。

| pacing | 正文基线 | components | bullet 条目 | 每条宽度单位 |
| --- | ---: | ---: | ---: | ---: |
| `dense` | 24px | 5 | 6 | 27 |
| `balanced` | 24px | 4 | 5 | 25 |
| `spacious` | 32px | 3 | 4 | 22 |

`validate` 会按实际主题与 kind 报出有效上限。超出编辑预算通常是警告，越过渲染安全线或造成内容丢失仍然是硬错误。应该缩短或拆页，不要隐藏溢出。

`spacious` 表示元素更少且正文字号更大，不是把同样多的内容压缩进一张看似更干净的页面。标题要短而有判断，bullet 条目尽量控制在两行附近。

连续三张内容页使用相同 kind 时，spec 会给出提示。重复可能正确，但应确认故事确实需要连续三次相同的语义动作。

八种组件独占整个正文区：`swot`、`bmc`、`waterfall`、`gantt`、`pest`、`five_forces`、`heatmap` 与 `sankey`。每种都必须是该页唯一的组件。

## 装饰归属

装饰按以下顺序解析：

1. 一张脸若把 `suppressMotif: true` 声明为结构事实，就永远不接收主题 motif。
2. 其他脸可以由菜单条目选择 `decor.kind: "silent"`，或换用另一个 motif。
3. 菜单没有表达意见时，绘制主题的普通 motif。

菜单不能推翻脸的结构静默。页面级 `decor` 是受控的局部原语，例如线、标签、引号、圆点或大数字。只有页面含义确实需要这一个强调时才使用。它不能替代主题菜单，也不应整份 deck 到处盖章。
