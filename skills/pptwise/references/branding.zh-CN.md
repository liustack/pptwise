---
summary: 'skills/pptwise/references/branding.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/branding.md
---

# Branding 姿态

何时读：抽取公司模板，或决定要不要写 `branding: "full"` 时。

品牌信号回答的是这份 deck 长什么样，从来不回答它该怎么论证。把「这家公司的配色像咨询公司」读成一种叙事，是把推断当事实抬上来，一份没人选过的论证形状就是这样上台的。

## 品牌主题：用户自己的公司模板

当用户递来或提到 `.thmx` 主题、`.potx` 模板，或带品牌的 `.pptx` 时，先把配色和字体抽成自定义 theme，再决定最终视觉方向。抽取完全在本地进行，文件从不离开这台机器。

```bash
pptwise brand extract corp-template.pptx -o deck-dir/acme.theme.json --id acme
pptwise preview deck-dir/ --theme-file deck-dir/acme.theme.json --theme acme --html
```

抽取结果是版本 1 的 partial 主题。它包含 style 与 brand token，把 `base` 设为 `consulting`，并继承该基础主题的结构骨相。只有确实要采用另一套内置结构时，才在装载前修改结果里的 `base` 字段。对比视觉方向期间保留候选文件名。在预览命令里，`--theme-file` 注册候选，`--theme acme` 选中它，但不会把它变成项目默认主题。

用户确认自定义视觉后，把完全相同的候选保存为 `deck-dir/theme.json`，再把 id 写入 `deck.spec.json`。项目会在 assemble 前注册该文件，并在 validate、render、audit、preview、serve 时自动装载，所以项目命令不需要任何主题 flag。编辑 `theme.json` 后，`serve` 会重新读取并刷新已经打开的预览。

```bash
pptwise render deck-dir/
```

`--theme-file` 只注册 id，从不选择主题。裸 IR 还必须带 `--theme <id>`，或已经在 `theme.id` 里点名该 id：

```bash
pptwise render deck.json --theme-file acme.theme.json --theme acme
```

项目里的 `theme.json` 加 spec 引用不需要这两个 flag。

装载时会执行对比度下限检查。模板的文字色与背景色太接近时，命令会报出失败 token 和比例。把信息转告用户，请用户决定调整抽取文件的颜色，或改用内置主题。

spec 和 IR 不要写 `branding`，除非每一页内容页都需要品牌页脚。`meta.confidentiality` 为 `confidential` 或 `restricted`，或文件需要机构落款时，写 `branding: "full"`。密级和日期随后出现在封面。其余姿态不出现。
