[中文](./README.zh.md)

# koishi-plugin-mc-multiping

[![npm version](https://img.shields.io/npm/v/koishi-plugin-mc-multiping.svg?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-mc-multiping)

A [Koishi](https://koishi.chat/) plugin for querying Minecraft server status across multiple connection lines. Supports both Java Edition (JE) and Bedrock Edition (BE). Designed for servers with multiple routes (ISP lines, BGP, etc.) — one command concurrently pings all lines and reports latency and connectivity.

### Features

- **Multi-line concurrent query**: Bind multiple addresses to one logical server; all lines are pinged in parallel
- **JE / BE dual-edition support**: Declare Java or Bedrock servers independently with the correct protocol
- **Automatic SRV resolution**: JE servers using default port (25565) automatically resolve `_minecraft._tcp` SRV records
- **Text / Image output**: Choose between plain text or rendered image responses (image mode requires `koishi-plugin-puppeteer`)
- **Permission control**: Server and line management requires Koishi authority ≥ 3; queries are available to all users
- **i18n**: Built-in Chinese (zh-CN) and English (en-US) localization

### Installation

Search for `mc-multiping` in the Koishi plugin marketplace, or install manually:

```sh
npm install koishi-plugin-mc-multiping
```

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `outputMode` | `'text' \| 'image'` | `'text'` | Output mode. `image` requires `koishi-plugin-puppeteer` |
| `timeout` | `number` | `5000` | Per-ping timeout in milliseconds |

### Command Reference

| Command | Description | Authority |
|---|---|---|
| `/mcm [name]` | Query all or a specific server | All |
| `/mcm.list` | List all configured servers | All |
| `/mcm.info <name>` | View server details | All |
| `/mcm.add <name> <je\|be>` | Add a server | ≥ 3 |
| `/mcm.remove <name>` | Remove a server and all its lines | ≥ 3 |
| `/mcm.edit <name> <prop> <value>` | Edit server property (`name` / `type`) | ≥ 3 |
| `/lines <server>` | List all lines of a server | All |
| `/lines.add <server> <address> [note]` | Add a line to a server | ≥ 3 |
| `/lines.rm <server> <note>` | Remove a line by note | ≥ 3 |
| `/lines.edit <server> <note> <prop> <value>` | Edit line property (`address` / `note`) | ≥ 3 |

### Quick Start

```
/mcm.add MyServer je                          # Add a JE server
/lines.add MyServer play.us.com US-East       # Add a line
/lines.add MyServer play.eu.com EU-West       # Add another line
/mcm MyServer                                 # Query all lines for this server
/mcm                                          # Query all servers
```

---

## Credits

- [Koishi](https://koishi.chat/)
- [minecraft-server-util](https://github.com/PassTheMayo/minecraft-server-util)

## License

[MIT](LICENSE)
