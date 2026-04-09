[English](./README.md)

# koishi-plugin-mc-multiping

[![npm version](https://img.shields.io/npm/v/koishi-plugin-mc-multiping.svg?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-mc-multiping)

基于 [Koishi](https://koishi.chat/) 的 Minecraft 服务器多线路状态查询插件。支持 Java Edition (JE) 与 Bedrock Edition (BE)，适用于拥有多条连接线路（电信/联通/移动/BGP 等）的服务器，一次查询即可并发检测所有线路的连通性与延迟。

### 特性

- **多线路并发查询**：为一个逻辑服务器绑定多条地址，查询时并发 ping 所有线路，快速展示各节点延迟与在线状态
- **JE / BE 双端支持**：独立声明 Java 版或基岩版服务器，自动使用对应协议
- **SRV 记录自动解析**：JE 服务器使用默认端口 (25565) 时自动查询 `_minecraft._tcp` SRV 记录
- **文本 / 图片输出**：可在配置中选择纯文本响应或图片渲染（图片模式需安装 `koishi-plugin-puppeteer`）
- **权限隔离**：服务器与线路的增删改操作需要 Koishi authority ≥ 3，查询操作全员可用
- **多语言支持**：内置中文 (zh-CN) 与英文 (en-US) 本地化

### 安装

通过 Koishi 控制台插件市场搜索 `mc-multiping` 安装，或手动安装：

```sh
npm install koishi-plugin-mc-multiping
```

### 配置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `outputMode` | `'text' \| 'image'` | `'text'` | 输出模式。使用 `image` 需安装并启用 `koishi-plugin-puppeteer` |
| `timeout` | `number` | `5000` | 单次 ping 超时时间（毫秒） |

### 指令一览

| 指令 | 说明 | 权限 |
|---|---|---|
| `mcm [name]` | 查询所有或指定服务器状态 | 全员 |
| `mcm.list` | 列出所有已配置的服务器 | 全员 |
| `mcm.info <name>` | 查看服务器详细信息 | 全员 |
| `mcm.add <name> <je\|be>` | 添加服务器 | ≥ 3 |
| `mcm.remove <name>` | 删除服务器及其所有线路 | ≥ 3 |
| `mcm.edit <name> <prop> <value>` | 修改服务器属性 (`name` / `type`) | ≥ 3 |
| `lines <server>` | 列出服务器的所有线路 | 全员 |
| `lines.add <server> <address> [note]` | 为服务器添加线路 | ≥ 3 |
| `lines.rm <server> <note>` | 删除指定备注的线路 | ≥ 3 |
| `lines.edit <server> <note> <prop> <value>` | 修改线路属性 (`address` / `note`) | ≥ 3 |

### 快速上手

```
mcm.add MyServer je                          # 添加一个 JE 服务器
lines.add MyServer play.dx.com 电信         # 添加电信线路
lines.add MyServer play.lt.com 联通         # 添加联通线路
mcm MyServer                                # 查询该服务器所有线路状态
mcm                                         # 查询所有服务器
```

---

## 致谢

- [Koishi](https://koishi.chat/)
- [minecraft-server-util](https://github.com/PassTheMayo/minecraft-server-util)

## 许可证

[MIT](LICENSE)
