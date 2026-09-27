---
summary: '客户端视角的内容包：license key、packs sync 与 packs list、包服务器的两个接口、包文件格式、本地安装状态，以及包内主题在主题查找里的位置'
read_when:
  - 设置、查看或清除 license key
  - 运行或排查 `pptwise packs sync`，或读它的 `--json` 报告
  - 某个包被跳过或拒装，或者包内主题解析不到
  - 用 `PPTWISE_PACKS_URL` 把 CLI 指向镜像或测试服务器
  - 制作或检查一个包文件
---

# 内容包

内容包是一份带版本的压缩包，里面是 license key 解锁的额外主题。`pptwise packs sync` 下载 license 覆盖的包，装到 `$PPTWISE_HOME/packs/` 下。之后包里的主题和工作区主题一样按名解析，`pptwise themes --json` 也会列出它们。

CLI 和包服务器之间只约定本文描述的接口，协议版本 1。

## 命令

```bash
pptwise license set <key>
pptwise license status
pptwise license clear
pptwise packs sync [--json]
pptwise packs list [--json]
```

`license set` 校验 key 的形状，写入 `$PPTWISE_HOME/license.json`，内容是 `{"key": "ptw_..."}`，只有本人可读（权限 0600）。key 的形状是 `ptw_` 加 32 个 `a-z` 与 `2-7` 之间的字符，共 36 个字符。key 是否有效由服务器回答，不由 CLI 判断。`license status` 说明是否已配置 key，只显示前 8 个字符。`license clear` 删除这个文件，已装的包保留。

`packs sync` 读取 license，向服务器要目录，把目录里的每个包更新到位：

- 没有 license 时只打印一行并以 0 退出，所以脚本或 skill 可以无条件调用它。
- 本地已装且版本与目录一致的包不动，不下载任何东西。
- 本地缺失或版本不同的包，下载、校验后安装（见[安装前的检查](#安装前的检查)）。
- `engine` 范围不包含当前 pptwise 版本的包会跳过，并提示更新 pptwise。已装的旧版本保留。
- 某个包校验失败或下载中断时，报告原因且不安装。其他包照常同步。之前装的版本（如有）原样保留。
- 目录读不到时（断网、401、403、503、响应无法解析），磁盘上什么都不变，命令会说明原因。

每个包都已安装、已是最新，或因 engine 范围跳过时，退出码为 0。目录读不到或任一包失败时，退出码为 1。

`--json` 输出报告：

```json
{
  "license": true,
  "ok": true,
  "server": "https://pptwise.com",
  "packs": [
    { "id": "sample", "version": "2026.1.0", "title": "Sample pack", "status": "installed", "themes": ["sample-brief"] }
  ]
}
```

`status` 取值为 `installed`、`updated`（附 `previous`，即被替换的版本）、`current`、`incompatible`（附 `reason`）或 `failed`（附 `reason`）。目录失败时 `ok` 为 `false`，`packs` 为空，原因写在 `error`。没有 license 时报告为 `{"license": false, "ok": true, "packs": []}`。

`packs list` 列出每个已装包的版本、标题和主题 id。`--json` 输出同样内容的数组，附每个包的目录和每个主题的文件路径。

## 服务器

默认地址是 `https://pptwise.com`。`PPTWISE_PACKS_URL` 可以改指镜像或测试服务器，可以带路径前缀。每个请求都带着 license key，所以地址必须是 `https`。明文 `http` 只允许本机回环地址（`localhost`、`127.0.0.1`、`::1`），其他 `http` 地址在发出任何请求之前就会被拒绝。key 放在 `Authorization` 头里：

```text
Authorization: Bearer ptw_...
```

出错时返回 JSON，只有一句人话，`{"error": "..."}`，CLI 原样转述。

### `GET /api/packs/catalog`

`200` 返回完整目录。每个有效 key 看到同一份清单。

```json
{
  "catalog": 1,
  "packs": [
    {
      "id": "sample",
      "version": "2026.1.0",
      "title": "Sample pack",
      "size": 12345,
      "sha256": "<zip 文件的 sha256，小写十六进制>",
      "engine": ">=0.37.0 <1.0.0"
    }
  ]
}
```

包 id 由小写字母、数字和中间的连字符组成（`^[a-z0-9][a-z0-9-]*$`）。版本由字母数字串以 `.` 或 `-` 连接（`^[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*$`，例如 `2026.1.0`）。两者都会进入下载路径和磁盘上的目录名，形状不符的目录条目 CLI 会报为失败。主题 id 在整个目录里唯一，不会有两个包带同一个主题 id。

`engine` 是 npm semver 范围。只有范围包含 CLI 自身版本时才安装。它能读并集（`||`）、比较符、不完整版本与 `x` 通配、`~`、`^` 和连字符范围，读不懂的范围当作不满足。

| 状态 | 含义 |
| --- | --- |
| `401` | 没有带 key，或 key 不存在。 |
| `403` | key 已被吊销。 |
| `503` | 服务器还没有配置好内容包服务。 |

key 被吊销只会挡住新的下载，不做任何远程删除：已经装好的包保留，照常可用。

### `GET /api/packs/<id>/<version>.zip`

`200` 以 `application/zip` 返回压缩包，其字节的哈希等于目录里同一条目的 `sha256`。`401` 和 `403` 的含义与目录接口相同。`404` 表示没有这个包或这个版本。

## 包文件

压缩包根目录必须有 `pack.json`：

```json
{
  "pack": 1,
  "id": "sample",
  "version": "2026.1.0",
  "title": "Sample pack",
  "engine": ">=0.37.0 <1.0.0",
  "themes": ["themes/sample-brief.theme.json"]
}
```

上面每个字段都必填，`themes` 也是。`id`、`version`、`title`、`engine` 与该包在目录里的条目一致。`themes` 的每一项是压缩包内一个完整 v2 主题文件的路径，格式与工作区主题相同（见 [Themes](./themes.zh-CN.md)）。版本 1 的客户端会忽略不认识的字段。`examples`（范例 deck 项目目录）与 `assets`（图库）留给以后的版本。

压缩包里的每个路径，以及 `themes` 里的每个路径，都必须是相对路径，用 `/` 分隔。不允许 `..`、绝对路径、盘符、反斜杠和符号链接。

### 安装前的检查

以下条件全部满足才会安装，任一不满足就拒装，磁盘上什么都不变：

1. 下载内容的 sha256 等于目录里的值。
2. 是可读的 zip，所有条目都符合上面的路径规则。
3. `pack.json` 能解析，其 `id` 和 `version` 与目录条目一致。
4. 其 `engine` 范围包含当前的 pptwise 版本。
5. 列出的每个主题文件都在包里，并且通过所有主题文件都要过的检查：严格的 schema、菜单契约和对比度下限。
6. 没有哪个主题 id 与出厂预设、已退役的主题 id、同一个包里的其他主题，或其他已装包的主题重名。

## 本地状态

```text
$PPTWISE_HOME/                 （缺省为 ~/.pptwise）
  license.json                 {"key": "ptw_..."}，权限 0600
  packs/
    <id>/
      pack.json
      themes/...               解压后的包内容
```

安装时先解到 `packs/<id>/` 旁边的隐藏目录，再整体换入，所以一个包永远是某一个完整版本，不会是两个版本各半。`packs/` 下以 `.` 开头的条目是进行中的安装，永远不会被当成包读取。

`packs/` 下不是可读包的目录（没有 `pack.json`、清单写的是另一个 id、列出的主题文件缺失或没通过主题文件检查、带了与出厂预设或已退役 id 重名的主题，或者带了其他已装包也有的主题 id）会连同路径和修复方法一起报出来。`packs sync` 从不安装这样的包，所以它们只会来自手动修改或复制的包。`themes` 与 `schema --kind` 按同一套检查判定一个包。目录里仍然列出的包，`packs sync` 会重新安装。其他这样的目录请手动删除。在修好之前：

- 查找出厂预设的名字时不读包，因为包不允许带这些 id，所以预设照常可用。
- 查找其他名字会失败，因为这个名字可能就在坏掉的包里。
- `pptwise themes --json` 仍然列出预设和所有可读的包。坏掉的包以一条记录代替它的主题出现，`{"source": "pack", "pack": "<目录名>", "error": "<说明>"}`。普通列表里显示为一行 `(pack <名字>)`。
- `packs list` 失败，并给出坏目录的路径。

## 主题查找

主题名按四级解析，先找到的为准：

1. deck 目录。
2. 工作区的 `themes/` 目录，逐级向上查找。
3. 已装的包，`$PPTWISE_HOME/packs/*/`。
4. 出厂预设。

deck 绑定包内主题的方式和绑定其他主题一样，按名字：在 `deck.spec.json` 里写 `"theme": "sample-brief"`。deck 目录或工作区里同 id 的文件会覆盖包内主题，用户想冻结或修改包内主题就这样做：`pptwise theme new --from sample-brief -o deck-dir/theme.json --id sample-brief`。包内主题不会与预设重名，所以只要 deck 或工作区里没有同名文件，预设名永远指预设，查找时也跳过包这一级。

`pptwise themes --json` 先列出 `"source": "builtin"` 的预设，再列出每个已装包的主题，带 `"source": "pack"` 和 `"pack": "<id>"`，读不了的包显示为带 `error` 字段的一条（见[本地状态](#本地状态)）。名字不存在时会失败，并列出所有找过的位置，包括每个已装包的目录。`pptwise serve` 在它常规的每 2 秒主题检查里，就能发现 sync 安装或更新了当前绑定的包内主题。
