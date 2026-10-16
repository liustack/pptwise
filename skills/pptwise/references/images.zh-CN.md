---
summary: 'skills/pptwise/references/images.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/images.md
---

# 配图

何时读：决定哪些页配图，声明图片资产，选择 `photo` 或 `evidence`，搜索图库，或生成图片时。

## 哪些页配图

用户没提也要配图，除非用户说了不要。spec 里至少一张 `photo` 页，素材里有地方、产品、人物或作品可以展示时更多（见 `spec.md`）。每个 `photo` 页都要配图：没有图，这一页就只剩空框。每个出厂主题都画得出它，所以按场合选好的主题不用换。`pptwise inspect deck-dir/ --page <封面 id>` 列出照片配方，或者说封面画在背景图上时，封面也配。封面的图作为页面背景放进去，`"background": { "kind": "asset", "asset_id": "cover" }`，铺满整页，所以搜横幅。封面不提供照片画法的主题，封面就不放图。其他页只在图本身就是要点时才配（一个地方、一件产品、一个人、作为证据的照片），不为填空间加图。用户给了自己的图就先用他的。

一批页面写完、build 之前找图：先在页面里写好 `asset_id`，再取简报、搜图、看图、取图，然后 build。哪个来源都给不了的图就保留缺失：build 会警告，你告诉用户哪一页还缺图。

## 先选择语义动作

图像本身就是主角时用 `kind: "photo"`。一件展品支持一个断言时用 `kind: "evidence"`。已绑定主题的菜单为这个 kind 选择脸。作者不点名图片几何。

封面与章节页可以使用资产背景。渲染器会采用专门的压图处理，并加深色可读性遮罩。内容页与结尾页的资产背景保留主题色调遮罩。内容页和结尾页只有确实需要全画布场景时才使用背景图。

`color` 背景要么明显偏浅，要么明显偏深。`#777777`、`#6B7B8C` 这类中间调上，白字和近黑字都到不了正文需要的 4.5:1。渲染器会把这样的字改成纯黑，能读清，卡片也挑纯黑读得清的一侧加深或提亮，封面左上角的标记按它落在的色带取色。`audit` 仍报 `low-contrast` 时，换一个更浅或更深的颜色。

每张图片只在 `assets.images` 中声明一次，再由 `image`、`image_grid`、`image_compare` 或 `device_mockup` 通过 `asset_id` 引用。逐个检查 key。`validate` 会报告悬空引用，没有解析到来源的资产不能变成真实图片。

`image_side: "left"` 或 `"right"` 是给支持侧图的脸使用的可选偏好。其他脸不需要处理作者几何，因为作者没有提供这类信息。

## 先取简报再找图

为任何缺失资产找图之前，先运行真实渲染器：

```bash
pptwise asset-brief <target>
```

简报会给出实际画框、裁切方式、安全区、建议像素尺寸、主题配色和可直接使用的提示词。素材应匹配它报告的宽高比与色调。简报列出页面里的每个 `image` 组件。`image_grid`、`image_compare`、`device_mockup` 和页面背景不在其中：背景铺满整张 16:9 的页面。它说没有 `image` 组件时，是还没有哪一页放了图，不是主题的原因。

## 图库照片

搜图不需要任何配置。没配 key 时，`images search` 匿名查询 Openverse，一个收录 CC0 和公有领域照片的索引。它每天的额度很小，图的质量参差不齐。配一个免费的 Pexels key 或 Pixabay key，结果更多也更精，配好后优先搜它。配不配 key 由用户决定：Openverse 找不到合适的图或者返回 HTTP 429 时向用户提一句，不要为等 key 卡住 deck。

```bash
pptwise config set pexels.apiKey
pptwise config set pixabay.apiKey
```

使用两到四个词的具体英文查询，例如 `office desk` 或 `wind farm`。查询中不要写情绪词、质量描述或否定关键词。传上简报给出的画幅，再加 `--sheet`：

```bash
pptwise images search "wind farm" --orientation landscape --sheet
```

结果带编号，每条有尺寸、图库自己对这张图的描述、作者和许可。`--sheet` 还会把所有缩略图按同样的编号拼成一张图，在 `contact sheet:` 后面打印路径。先读描述，排除明显不对的，再打开联系表看图。挑那张合页面的编号：主体对、合画框形状、给压在上面的文字留了地方、和主题配色搭。没看过图不要直接拿第一张。都不合适就换个词再搜。有 `pptwise_images` 工具时改用它搜，结果里直接给你看同一张联系表。

按选中的编号对应的 id 取图，存成页面引用的 `asset_id`：

```bash
pptwise images fetch openverse:<id> --deck <dir> --as hero
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

生成器把登录状态和会话放在自己的主目录里（例如 `~/.codex`、`~/.grok`），出图前先往那里写。agent 沙箱把主目录设成只读时，它会报 `Operation not permitted`、`EPERM` 或 `FS_PERMISSION_DENIED` 失败，`images generate` 会点名说明。这时在沙箱外运行这条命令，或请用户在宿主的沙箱设置里允许这个生成器写自己的主目录。绝不把任何登录或凭据文件复制、移动或重定向到可写的地方来绕过这个错误。

目标是 deck 项目时，拉取与生成的图存进这个 deck 自己的 `assets/`，文件名是 `<asset_id>.jpg`，旁边带 `<asset_id>.json` sidecar，deck 换目录图也跟着走。目标是单个 IR 文件时，图存到 `.pptwise/<deck>/assets/`。不要为了重跑某一步而删除这两个目录，因为其中保存了已经选定的资产。validate 警告某个 `asset_id` 没有定义时，会给出这张图该放的路径。没有可用来源时，保留缺失状态并如实汇报。不要虚构照片，也不要抓取未支持的提供方。除非许可或用户要求在页面署名，归属信息默认打印在终端。
