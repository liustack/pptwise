---
summary: '自包含 v2 主题、出厂预设拷贝、菜单绑定、三级查名、配色分叉与固定样张视觉对比'
read_when:
  - 选择、创建、绑定或冻结主题
  - 编写或装载版本 2 主题文件
  - 用 `theme fork` 改色，或用 `theme try` 比较候选
  - 排查 deck 最终解析到哪个命名主题
---

# 主题

主题是一个自包含的版本 2 文件。它把完整样式系统、可选品牌配置、场合元数据、个性强度和菜单放在一起。菜单把语义页面动作映射到视觉脸。

不存在局部格式、基础引用或装载期继承。创建主题就是拷贝一个已有的完整主题，并让副本从出生起独立。

## 公开 v2 结构

```json
{
  "version": 2,
  "id": "acme-report",
  "label": "Acme Report",
  "occasions": ["business"],
  "identity": "medium",
  "style": {
    "id": "acme-report",
    "colors": {
      "bg": "#F7F6F2",
      "surface": "#FFFFFF",
      "primary": "#1E2A4A",
      "accent": "#F5C518",
      "text": "#1C1E23",
      "muted": "#5B6069",
      "border": "#DDDCD4",
      "chartPalette": ["#1E2A4A", "#3B76A8", "#797D86"]
    },
    "fonts": {
      "heading": ["Georgia", "Source Han Serif SC", "serif"],
      "body": ["Georgia", "Source Han Serif SC", "serif"]
    },
    "shape": {
      "radius": 2,
      "gapScale": 1,
      "typeScale": 1
    },
    "defaultBackgrounds": {
      "cover": { "kind": "color", "value": "#F7F6F2" },
      "chapter": { "kind": "color", "value": "#1E2A4A" },
      "content": { "kind": "color", "value": "#F7F6F2" },
      "ending": { "kind": "color", "value": "#F7F6F2" }
    }
  },
  "menu": {
    "cover": { "face": "gauge-verdict" },
    "chapter": { "face": "gauge-section" },
    "content": {
      "points": { "face": "narrow-column" },
      "comparison": { "face": "two-column" },
      "process": { "face": "rail-numbered" },
      "data": { "face": "gauge-stats" },
      "statement": { "face": "gauge-point", "brand": "none" },
      "photo": {
        "face": "image-split",
        "decor": { "kind": "silent" }
      }
    },
    "ending": { "face": "gauge-next" }
  }
}
```

`version`、`id`、`style` 与 `menu` 必填。`style.id` 必须等于主题 `id`。主题 id 是小写字母、数字和连字符组成的 slug。Deck 与工作区文件可以保名遮蔽出厂预设。

`style` 对象是完整的。必需核心包括背景、表面、主色、强调色、正文色、弱化色、图表色板、标题字体、正文字体和四类默认背景。额外颜色、等宽字体、形状控制与 `allowCustomBackground` 可选。

菜单必须为每种边界页提供一个条目，并提供至少一个内容 kind。它不需要覆盖全部十一词。每个已提供 kind 映射到一张脸。`params` 必须符合该脸声明的可调值。`decor` 可以选择 motif 或让它静默。`brand: "none"` 会关闭该页的共享品牌片段。

## 从出厂预设起步

列出 24 个起点及其场合和个性强度：

```bash
pptwise themes --json
```

把一个预设拷入工作区：

```bash
pptwise theme new --from brief \
  -o themes/acme-report.theme.json \
  --id acme-report \
  --label "Acme Report"
```

写出的文件包含拷贝后的样式 token、品牌配置、元数据和菜单。它不再链接 `brief`。之后任一文件的变化都不会影响另一个。

`--from` 也可以命名另一个工作区主题。这是开始编辑菜单或创建视觉同类主题的标准入口。

## 绑定前看图比较

`theme try` 用同一份固定试衣样稿渲染两到四个命名主题，并输出对比图：

```bash
pptwise theme try brief,swiss,memo
```

样稿独立于任何 deck，用于在 spec 之前做视觉选择。`render` 与 `preview` 命令不接受临时主题覆盖。

## 绑定与冻结

Deck spec 按名称绑定主题：

```json
{
  "version": "1",
  "theme": "acme-report",
  "pages": []
}
```

裸 IR 文件中的绑定写作 `"theme": { "id": "acme-report" }`。

名称按三级顺序解析：

1. Deck 目录。依次检查 `theme.json`、`<name>.theme.json` 和能够完整解析且 id 匹配的 `<name>.json`。
2. 从起始目录向上查找各级工作区 `themes/`。
3. 24 个出厂预设。

Deck 与工作区文件可以保名遮蔽出厂预设。冻结就是下沉拷贝并保留绑定名，例如 `pptwise theme new --from brief -o deck-dir/theme.json --id brief`。未知名称会明确报错，并列出查过的位置。

要把工作区主题冻结给一份 deck，保留 id 并拷入 deck 目录的 `theme.json`：

```bash
pptwise theme new --from acme-report \
  -o deck-dir/theme.json \
  --id acme-report
```

项目命令会自动加载这个文件。`serve` 会在文件变化后重新读取，并刷新已经打开的评审页面。

## 用 fork 改配色

不要把共享主题中的单个 token 当作孤立补丁直接修改。创建分叉，让 pptwise 围绕锚色重推导整套配色：

```bash
pptwise theme fork acme-report \
  --primary "#0B5FFF" \
  --accent "#FFB000" \
  -o themes/acme-blue.theme.json \
  --id acme-blue
```

分叉会逐字节保留源菜单，推导 muted 等依赖 token，并运行对比度门。源主题保持不变。

菜单相同的分叉可以在流程中替换 deck 绑定。菜单不同则要回到主题选择，修订 spec 与受影响的页面填充。论点、数据、图片和文案仍可复用，但不能假设旧的语义页面序列继续成立。

## 抽取公司品牌

```bash
pptwise brand extract corp.pptx \
  -o themes/acme-brand.theme.json \
  --id acme-brand \
  --from brief
```

抽取完全在本机运行。它读取 Office 颜色与字体，复制供体的完整菜单，重推导整套 token，并写出完整 v2 文件。供体应按菜单与场合适配来选，不应只看配色。详见 [品牌抽取](./brand-extraction.md)（英文）。

每个装载的主题都要通过严格 schema、脸参数和对比度检查。失败时修主题源头，不要用单页颜色覆盖补偿。
