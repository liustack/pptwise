---
summary: 'skills/pptwise/references/branding.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/branding.md
---

# 品牌姿态

何时读：决定整份 deck 的品牌可见度，抽取 Office 品牌，或理解某页为什么没有品牌框时。

品牌信号只控制外观，不负责选择叙事或页面讲法。

## Deck 级姿态

`branding` 有三个值：

| value | 可见结果 |
| --- | --- |
| `full` | 全程保留 logo，绘制内容页页脚与元数据，并允许封面和结尾的元数据行显示保密级别与日期。 |
| `cover-only` | 只在封面与章节页保留 logo。内容页与结尾页不画共享页脚、元数据和 logo。 |
| `minimal` | 保留 logo，但不画内容页页脚线与元数据。 |

省略 `branding` 与显式写 `cover-only` 完全相同。只有每张内容页都需要机构页脚时才选 `full`，例如保密或受控文档。

## 页面级静默

Deck 姿态只是广义许可。一张脸可以把 `branding: "none"` 作为不可更改的结构事实。主题菜单条目也可以声明 `brand: "none"`。两者任意一个成立时，该页都不会出现共享品牌片段，即使 deck 选择了 `full`。

这适用于构图本身没有安全品牌框的脸。它不是 logo 丢失，也不应通过页面内容补救。主题装饰与品牌相互独立，仍由脸与菜单的装饰规则决定。

## 抽取完整 v2 主题

用户提供 `.thmx`、`.potx` 或带品牌的 `.pptx` 时，在本机抽取颜色和字体。先选择一个菜单适合目标故事的供体，因为抽取结果会完整复制该菜单。

```bash
pptwise brand extract corp-template.pptx \
  -o deck-dir/theme.json \
  --id acme \
  --from consulting
```

输出是自包含的版本 2 主题，包含样式 token、品牌 token、场合、个性强度和完整菜单。它没有基础引用，加载时也不继承任何东西。在 `deck.spec.json` 中绑定 `acme` 后，项目命令会自动解析 `deck-dir/theme.json`。

要与其他命名主题比较，在所有名称都能解析的目录运行固定试衣样稿：

```bash
pptwise theme try acme,consulting,swiss
```

装载器会检查对比度。抽取结果若产生不安全的文字与背景组合，应调整主题或创建配色分叉，不要增加临时的单页颜色覆盖。
