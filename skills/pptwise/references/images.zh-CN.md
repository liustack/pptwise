---
summary: 'skills/pptwise/references/images.md 的中文阅读镜像'
mirror_of: skills/pptwise/references/images.md
---

# 配图

何时读：决定哪些页配图、图从哪里来，声明图片资产，选择 `photo` 或 `evidence`，搜索图库，从网上取图，或生成图片时。

## 哪些页配图

用户没提也要配图，除非用户说了不要。只有文字的 deck 读起来像草稿。spec 里至少一张 `photo` 页，素材里有地方、产品、人物或作品可以展示时更多（见 `spec.md`）。每个出厂主题都画得出 `photo` 页的图，所以按场合选好的主题不用换。

| 画框 | 什么时候配图 |
| --- | --- |
| `photo` 页 | 一律配：没有图，这一页就只剩空框。 |
| 封面 | `pptwise inspect deck-dir/ --page <封面 id>` 列出照片配方，或者说封面画在背景图上时。图作为页面背景放进去，`"background": { "kind": "asset", "asset_id": "cover" }`。封面不提供照片画法的主题，封面就不放图。 |
| 章节页 | 它的 `inspect` 列出照片配方时：每章一张，点出这一章讲什么，一个地方、一件物品、一个场景。同一份 deck 的章节页要统一：要么都有图，要么都没有。 |
| 正文背景 | 只在这一页需要一整幅场景托住几个字时：一句主张、一段引语、一个数字。密集的页面绝不垫背景图。 |
| `evidence`、`image_grid`、`image_compare`、`device_mockup` | 图本身就是证据时：产品、现场、前后对比、运行中的软件。截图放进 `device_mockup`，绝不生成。 |
| 其他页 | 只在图本身就是要点时配，不为填空间加图。图解、图表、列表页不配。 |

用户给的图先用。一批页面写完、build 之前找图：先在页面里写好 `asset_id`，再取简报、找图、钉进 deck，然后 build。哪个来源都给不了的图就保留缺失：build 会警告，你告诉用户哪一页还缺图。

## 图从哪里来

收集素材时在 `deck-dir/materials.md` 的 `Pictures` 一节里规划好（格式见参考文档 `materials.md`），在用户随大纲认可的配图方向内，按这个顺序取：

1. **用户和项目自己的图。** 用户交来的文件，以及 `pptwise brand scan` 找到的图片和 logo。每张都用 `images add` 钉进来。没有网络时只有这一个来源：用它，其余的保留缺失。
2. **图库搜索。** 即下面的 `images search`。不配 key 也能用。
3. **网上的图**，图库里没有合适的时候：博物馆或档案馆的馆藏、Wikimedia Commons、政府或机构的图库、题材本身的新闻素材页。自己上网找，只取页面写明可以使用的图，再用 `images add` 钉进来。
4. **本地生成器**，用户启用了一个的时候（`pptwise doctor` 会列出）：`images generate`，用于照片拍不到的插画或场景。真实的人、产品、地点、界面绝不生成。

## 先选择语义动作

图像本身就是主角时用 `kind: "photo"`。一件展品支持一个断言时用 `kind: "evidence"`。已绑定主题的菜单为这个 kind 选择脸。作者不点名图片几何。

封面与章节页可以使用资产背景。渲染器会采用专门的压图处理，并加深色可读性遮罩。内容页与结尾页的资产背景保留主题色调遮罩。

`color` 背景要么明显偏浅，要么明显偏深。`#777777`、`#6B7B8C` 这类中间调上，白字和近黑字都到不了正文需要的 4.5:1。渲染器会把这样的字改成纯黑，能读清，卡片也挑纯黑读得清的一侧加深或提亮，封面左上角的标记按它落在的色带取色。`audit` 仍报 `low-contrast` 时，换一个更浅或更深的颜色。

每张图片只在 `assets.images` 中声明一次，再由 `image`、`image_grid`、`image_compare` 或 `device_mockup` 通过 `asset_id` 引用。逐个检查 key。`validate` 会报告悬空引用，没有解析到来源的资产不能变成真实图片。

`image_side: "left"` 或 `"right"` 是给支持侧图的脸使用的可选偏好。其他脸不需要处理作者几何，因为作者没有提供这类信息。

## 先取简报再找图

为任何缺失资产找图之前，先运行真实渲染器：

```bash
pptwise asset-brief <target>
```

简报列出页面里的每一个图框：每个 `image`，`image_grid` 的每一项，`image_compare` 的左右两边，`device_mockup` 的屏幕，以及每页的背景图。每个都给出实际画框、裁切方式、安全区、建议像素尺寸、主题配色和可直接使用的提示词，还有 deck 在图旁边放的说明或标签。素材应匹配它报告的宽高比与色调。画框铺满整页的背景，页面的字压在它上面：挑文字后面有一块安静区域的图。标为没有画出来的画框，是这一页的版式没用上它，例如这张脸不画的背景。它什么都没列时，是还没有哪一页放了图，不是主题的原因。

## 图库照片

搜图不需要任何配置。没配 key 时，`images search` 匿名查询 Openverse，一个收录 CC0 和公有领域照片的索引。它每天的额度很小，图的质量参差不齐。配一个免费的 Pexels key 或 Pixabay key，结果更多也更精，配好后优先搜它。配不配 key 由用户决定：Openverse 找不到合适的图或者返回 HTTP 429 时向用户提一句，不要为等 key 卡住 deck。每个怎么配，见下面的「配置图源」。

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

## 项目里和网上的图

`images add` 把一个文件或一张 https 地址上的图钉进 deck，旁边的 sidecar 记下它的来历：

```bash
pptwise images add public/hero.jpg --deck <dir> --as cover
pptwise images add https://upload.wikimedia.org/wikipedia/commons/<path>.jpg --deck <dir> --as river --license pdm --source https://commons.wikimedia.org/wiki/File:<name>.jpg --author "<author>"
```

文件默认是用户自己的，除非你另外说明。网上的图只按它自己页面写明的条件放进来，`--license` 写的就是这个条件：

| `--license` | 来源页写的是 | 署名 |
| --- | --- | --- |
| `cc0` | CC0，不保留任何权利 | 不需要 |
| `pdm` | 公有领域，或公有领域标记 | 不需要 |
| `cc-by`、`cc-by-4.0` | 知识共享署名许可，不带 SA、NC、ND | 作者、许可和来源页 |
| `press` | 题材本身的新闻或媒体素材，供报道使用 | 「Courtesy of」所有者 |
| `own` | 用户或其机构自己的图 | 不需要 |

把展示这张图并写明许可的页面传给 `--source`，页面上写的作者或所有者传给 `--author`（`cc-by` 和 `press` 必填）。这条命令拒绝相同方式共享、非商业、禁止演绎的条件，以及它不认识的条件。没写许可的页面、搜索引擎的图片结果、新闻照片、图库带水印的预览、社交媒体的帖子都不算来源：换一张。新闻素材只用来展示它本身的题材。署名会打印在终端，`images list` 也会列出：交付时告诉用户，只有许可或用户要求时才放到页面上。

PNG 保持 PNG，logo 的透明背景不丢。SVG 格式的 logo 会画成 PNG。在 spec 里写 `"brand": { "logo_asset_id": "logo" }` 设置 deck 的 logo。

## 生成图片

```bash
pptwise images generate --deck <dir> --as <asset_id>
```

它按配置的顺序用第一个启用的生成器出图，没传 `--prompt` 时提示词取自 `asset-brief`。生成器在用户打开之前一直关着（见下文）。绝不自己去启用。

生成器把登录状态和会话放在自己的主目录里（例如 `~/.codex`、`~/.grok`），出图前先往那里写。agent 沙箱把主目录设成只读时，它会报 `Operation not permitted`、`EPERM` 或 `FS_PERMISSION_DENIED` 失败，`images generate` 会点名说明。这时在沙箱外运行这条命令，或请用户在宿主的沙箱设置里允许这个生成器写自己的主目录。绝不把任何登录或凭据文件复制、移动或重定向到可写的地方来绕过这个错误。

## 配置图源

配不配图源由用户决定，在他自己的机器上配一次。把命令告诉他，让他自己运行。`pptwise doctor` 会显示配了什么：每个图库的 key 有没有、从哪来（从不显示 key 本身），每个生成器装没装、开没开。

| 图源 | 配置 | 不配时 |
| --- | --- | --- |
| Openverse | 不用配。配上 client id 和 secret 额度更高：`pptwise config set openverse.clientId`、`pptwise config set openverse.clientSecret` | 匿名查询，每天额度小 |
| Pexels | 一个免费 key：`pptwise config set pexels.apiKey` | 跳过 |
| Pixabay | 一个免费 key：`pptwise config set pixabay.apiKey` | 跳过 |

`config set` 不带值运行时，会用隐藏输入的提示来问 key，所以它不会留在 shell 历史里。key 也可以来自环境变量：`PPTWISE_PEXELS_API_KEY`、`PPTWISE_PIXABAY_API_KEY`、`PPTWISE_OPENVERSE_CLIENT_ID`、`PPTWISE_OPENVERSE_CLIENT_SECRET`。配置文件优先：文件里写了哪个图源，这个图源的 key 就全部从文件取，它的环境变量不再看。

本地生成器是 grok、codex 和 antigravity，也就是同名的命令行 agent。每个都要单独安装并登录。它们默认关闭，因为 pptwise 运行它们时关掉了它们的权限确认（grok `--permission-mode bypassPermissions`，codex `--dangerously-bypass-approvals-and-sandbox`，antigravity `--dangerously-skip-permissions`），它们做事不会问任何人。只有用户能打开：

```bash
pptwise config set images.generators.grok.enabled true
pptwise config set images.generators.codex.enabled true
pptwise config set images.generators.antigravity.enabled true
```

默认按 grok、codex、antigravity 的顺序尝试，每个给 180 秒。`pptwise config set images.generators.order codex,grok` 改顺序（不在顺序里的生成器不会被尝试），`pptwise config set images.generators.timeoutMs 300000` 改每个的时间。

## 钉进来的图放在哪

目标是 deck 项目时，拉取、添加与生成的图存进这个 deck 自己的 `assets/`，文件名是 `<asset_id>.jpg`（或 `.png`），旁边带 `<asset_id>.json` sidecar，deck 换目录图也跟着走。目标是单个 IR 文件时，图存到 `.pptwise/<deck>/assets/`。不要为了重跑某一步而删除这两个目录，因为其中保存了已经选定的资产。validate 警告某个 `asset_id` 没有定义时，会给出这张图该放的路径。没有可用来源时，保留缺失状态并如实汇报。不要虚构照片。
