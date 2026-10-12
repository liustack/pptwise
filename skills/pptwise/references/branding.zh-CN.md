---
summary: 'skills/pptwise/references/branding.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/branding.md
---

# 品牌姿态与页脚标记

何时读：决定整份 deck 的品牌可见度，加页码或保密标识，抽取 Office 品牌，或理解某页为什么没有品牌框时。

品牌信号只控制外观，不负责选择叙事或页面讲法。

## 页脚标记

deck 不写就不印页脚：没有页码，没有机构名，没有日期，没有保密字样。场合需要哪几样，就在 `footer` 里写哪几样：

| 字段 | 印什么 |
| --- | --- |
| `page_number: true` | 页码，右下角，小字低对比，只印在内容页。封面、章节页、结尾页不印，整页金句、大数字页、压到页底的照片页也不印。导出文件用 PowerPoint 原生的页码字段，调整页序后数字自动更新。 |
| `organization: true` | `meta.organization`，左下角，每张内容页同一位置。 |
| `label` | 作者原样提供的「场合加日期」一行字，接在机构名后面。 |
| `notice` | 作者原样提供的版权行或免责声明提示，接在 label 后面。 |
| `draft` | 作者原样提供的草稿或版本标识，右下角，在页码前面。 |
| `confidentiality` | `meta.confidentiality` 的标识放哪：`"cover"` 只在封面放一次，`"footer"` 封面加每张内容页都放。 |

```json
{
  "meta": { "organization": "华东区域运营中心", "confidentiality": "confidential" },
  "footer": {
    "page_number": true,
    "organization": true,
    "label": "2026 年中期业绩 | 2026.08",
    "draft": "讨论稿",
    "confidentiality": "footer"
  }
}
```

```json
{
  "meta": { "organization": "Acme Holdings", "confidentiality": "confidential" },
  "footer": {
    "page_number": true,
    "label": "Investor Presentation | February 2026",
    "confidentiality": "cover"
  }
}
```

怎么选：

- 拿来读的材料（报告、董事会材料、讲义）通常要 `page_number`。上台讲的材料常常不放。
- 只有场合限制谁能看时才加保密标识。公开材料（路演、券商研报、公开汇报）不放，`public` 什么都不印。
- 标识的措辞跟 deck 的语言走。中文 deck 印「仅供内部讨论」（`internal`）、「内部资料，请勿外传」（`confidential`）或「限定范围阅读，请勿转发」（`restricted`），不印「机密」，因为它在中文里是国家秘密的法定密级。英文 deck 印 Internal、Confidential 或 Restricted。
- 法定密级和保密期限（如「秘密★1年」）写进 `meta.classification`，照原样写。它只在封面左上角印一次，不能和 `footer.confidentiality` 同时用。
- 不编造标记。不要为了填满角落编机构名、日期、版本号或项目代号。`label`、`notice`、`draft` 原样印作者写的字，deck 的日期和版本留在封面。
- 整个页脚只有一行小字。底部放不下的一行是校验错误：缩短 `label` 或 `notice`。

## Deck 级 logo 姿态

`branding` 决定品牌 logo 出现在哪里：

| value | 可见结果 |
| --- | --- |
| `full` | 全程保留 logo，封面和结尾的元数据行印日期。没写 `footer` 时还保留它原来的页脚：内容页印机构名和保密标识，等同于写了 `footer: { "organization": true, "confidentiality": "footer" }`。 |
| `cover-only` | 只在封面与章节页保留 logo。内容页与结尾页不放。 |
| `minimal` | 每页都保留 logo。 |

省略 `branding` 与显式写 `cover-only` 完全相同。写了 `footer` 就以它为准，替换 `full` 原本要印的页脚。写空的 `footer: {}` 可以关掉 `full` 的旧页脚，只留 logo。

## 页面级静默

Deck 姿态只是广义许可。一张脸可以把 `branding: "none"` 作为不可更改的结构事实。主题菜单条目也可以声明 `brand: "none"`。两者任意一个成立时，该页都不会出现共享品牌片段，页脚这一行也一起不出现，即使 deck 要了。菜单条目的 `brand: "none"` 还会让这一页的元数据和页脚标记一起静默。

这适用于构图本身没有安全品牌框的脸。它不是 logo 丢失，也不应通过页面内容补救。主题装饰与品牌相互独立，仍由脸与菜单的装饰规则决定。装饰不会印 deck 没要的页脚信息。有两个装饰在自己的位置上承担页脚标记：brief 的页脚装饰画整行页脚，ink 的落款列把机构名竖排在右缘。画在页脚带里的装饰（例如 homeroom 的两条作业本横线）在页脚行出现时让位。

## 用品牌色给主题重新上色

用户提供 `.thmx`、`.potx` 或带品牌的 `.pptx` 时，在本机抽取品牌色。按菜单和观感选要上色的主题：抽取保留这个主题的菜单、纸色、文字色、面板色和字体，只用品牌色（模板的 `accent1`）和公司的第二个颜色（`accent2`）重画它的彩色位置。只有用户要模板字体时才加 `--brand-fonts`，它打印的字体警告要转告用户。

```bash
pptwise brand extract corp-template.pptx \
  -o deck-dir/theme.json \
  --id acme \
  --from bulletin
```

用户给的是品牌色而不是文件时，用 `--brand` fork 主题。规则相同。公司有两个配色时两个都传，主色在前：`--brand '#156082,#E97132'`。

```bash
pptwise theme fork ink --brand "#C8102E" -o deck-dir/theme.json --id acme
```

两条命令都会打印每个颜色放进了哪里。品牌色原样放进主题最显眼的彩色位置。它在那里当标题字看不清时，标题保留主题原色，品牌色改放到线条、色块和图表里。只有哪里都放不下原色时，才把它调亮或调暗到刚好看得清。主题其余的彩色都变成品牌色的深浅。输出说颜色被调过时告诉用户，并给用户看结果。只有用户要精确指定某些 token 时，才用 `--primary`、`--accent`、`--bg`、`--text`、`--surface` 代替 `--brand`。

输出是自包含的版本 2 主题，包含样式 token、品牌 token、场合、个性强度和完整菜单。它没有基础引用，加载时也不继承任何东西。在 `deck.spec.json` 中绑定 `acme` 后，项目命令会自动解析 `deck-dir/theme.json`。

要把结果和其他命名主题并排给用户看，在所有名称都能解析的目录里，用用户自己的封面把每个主题画一遍：

```bash
pptwise theme try acme,brief,swiss --title "Q3 review"
```

两条命令写文件前都会检查对比度。不要增加临时的单页颜色覆盖。
