---
summary: 'skills/pptwise/references/images.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/images.md
---

# 配图

何时读：声明图片资产，选择 `photo` 或 `evidence`，搜索图库，或生成图片时。

## 先选择语义动作

图像本身就是主角时用 `kind: "photo"`。一件展品支持一个断言时用 `kind: "evidence"`。已绑定主题的菜单为这个 kind 选择脸。作者不点名图片几何。

封面与章节页可以使用资产背景。渲染器会采用专门的压图处理，并加深色可读性遮罩。内容页与结尾页的资产背景保留主题色调遮罩。只有页面确实需要全画布场景时才使用背景图。

每张图片只在 `assets.images` 中声明一次，再由 `image`、`image_grid`、`image_compare` 或 `device_mockup` 通过 `asset_id` 引用。逐个检查 key。`validate` 会报告悬空引用，没有解析到来源的资产不能变成真实图片。

`image_side: "left"` 或 `"right"` 是给支持侧图的脸使用的可选偏好。其他脸不需要处理作者几何，因为作者没有提供这类信息。

## 先取简报再找图

为任何缺失资产找图之前，先运行真实渲染器：

```bash
pptwise asset-brief <target>
```

简报会给出实际画框、裁切方式、安全区、建议像素尺寸、主题配色和可直接使用的提示词。素材应匹配它报告的宽高比与色调。

## 图库照片

使用两到四个词的具体英文查询，例如 `office desk` 或 `wind farm`。查询中不要写情绪词、质量描述或否定关键词。搜索顺序是 Pexels，已配置时再查 Pixabay，最后查经过商业用途过滤的 Openverse 来源。

```bash
pptwise config set pexels.apiKey
pptwise images search "office desk" --orientation landscape
```

不要自动选择第一张结果。由人或视觉模型从缩略图中选择，再拉取目标资产。

```bash
pptwise images fetch pexels:123 --deck <dir> --as hero
pptwise images list --deck <dir>
```

## 生成图片

```bash
pptwise images generate --deck <dir> --as <asset_id>
```

本地生成器默认关闭，只有用户启用后才使用：

```bash
pptwise config set images.generators.grok.enabled true
pptwise config set images.generators.codex.enabled true
pptwise config set images.generators.antigravity.enabled true
```

拉取与生成的文件存放在 `.pptwise/<deck>/assets/`，旁边带 sidecar。不要为了重跑某一步而删除整个目录，因为其中保存了已经选定的资产。没有可用来源时，保留缺失状态并如实汇报。不要虚构照片，也不要抓取未支持的提供方。除非许可或用户要求在页面署名，归属信息默认打印在终端。
