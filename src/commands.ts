import { Context } from 'koishi'
import { Config } from './index'
import { queryServerLines, parseAddress } from './ping'
import { renderToText, renderToImage, renderAllToText, renderAllToImage, ServerResult, TextFn } from './render'

function t(session: any): TextFn {
  return (path, params?) => session.text(path, params)
}

export function registerCommands(ctx: Context, config: Config) {
  // /mcm [name] — query server status
  const mcm = ctx.command('mcm [name:string]')
    .userFields(['authority'])
    .action(async ({ session }, name) => {
      if (!session) return
      const $ = t(session)
      const authority = session.user?.authority ?? 0

      if (!name) {
        const allServers = await ctx.database.get('mc_servers', {})
        if (!allServers.length) return $('mc-multiping.no-servers-hint')

        session.send($('mc-multiping.querying-all', { count: allServers.length }))

        const results: ServerResult[] = []
        await Promise.all(allServers.map(async server => {
          const lines = await ctx.database.get('mc_lines', { server_id: server.id })
          const statuses = lines.length ? await queryServerLines(server, lines, config.timeout) : []
          results.push({ server, statuses })
        }))

        results.sort((a, b) => a.server.name.localeCompare(b.server.name))

        if (config.outputMode === 'image') {
          const image = await renderAllToImage(ctx, $, results, authority, config)
          if (image) return image
          return $('mc-multiping.image-fallback') + renderAllToText($, results, authority, config)
        }
        return renderAllToText($, results, authority, config)
      }

      const servers = await ctx.database.get('mc_servers', { name })
      if (!servers.length) return $('mc-multiping.server-not-found', { name })

      const server = servers[0]
      const lines = await ctx.database.get('mc_lines', { server_id: server.id })
      if (!lines.length) return $('mc-multiping.no-lines', { name })

      session.send($('mc-multiping.querying'))
      const statuses = await queryServerLines(server, lines, config.timeout)

      if (config.outputMode === 'image') {
        const image = await renderToImage(ctx, $, server, statuses, authority, config)
        if (image) return image
        return $('mc-multiping.image-fallback') + renderToText($, server, statuses, authority, config)
      }
      return renderToText($, server, statuses, authority, config)
    })

  // mcm.list — list all servers
  mcm.subcommand('.list')
    .action(async ({ session }) => {
      if (!session) return
      const $ = t(session)
      const allServers = await ctx.database.get('mc_servers', {})
      if (!allServers.length) return $('mc-multiping.no-servers')

      const allLines = await ctx.database.get('mc_lines', {})
      const lineCountMap = new Map<number, number>()
      for (const line of allLines) {
        lineCountMap.set(line.server_id, (lineCountMap.get(line.server_id) || 0) + 1)
      }

      let text = $('mc-multiping.server-list-header') + '\n'
      allServers.forEach((s, i) => {
        text += $('mc-multiping.server-list-item', {
          idx: i + 1,
          name: s.name,
          type: s.type.toUpperCase(),
          count: lineCountMap.get(s.id) || 0,
        }) + '\n'
      })
      return text.trimEnd()
    })

  // mcm.info <name> — view server details
  mcm.subcommand('.info <name:string>')
    .action(async ({ session }, name) => {
      if (!session) return
      const $ = t(session)
      if (!name) return $('mc-multiping.provide-server-name')

      const servers = await ctx.database.get('mc_servers', { name })
      if (!servers.length) return $('mc-multiping.server-not-found', { name })

      const server = servers[0]
      const lines = await ctx.database.get('mc_lines', { server_id: server.id })

      let text = $('mc-multiping.info-header', { name: server.name }) + '\n'
      text += $('mc-multiping.info-type', { type: server.type.toUpperCase() }) + '\n'
      text += $('mc-multiping.info-line-count', { count: lines.length }) + '\n'

      if (lines.length) {
        text += $('mc-multiping.info-lines-header') + '\n'
        lines.forEach((l, i) => {
          text += $('mc-multiping.info-line-item', {
            idx: i + 1, note: l.note, host: l.host, port: l.port,
          }) + '\n'
        })
      }
      return text.trimEnd()
    })

  // mcm.add <name> <type> — add a server (authority >= 3)
  mcm.subcommand('.add <name:string> <type:string>', { authority: 3 })
    .action(async ({ session }, name, type) => {
      if (!session) return
      const $ = t(session)
      if (!name || !type) return $('mc-multiping.add-usage')

      const tp = type.toLowerCase()
      if (tp !== 'je' && tp !== 'be') return $('mc-multiping.add-type-invalid')

      try {
        await ctx.database.create('mc_servers', { name, type: tp as 'je' | 'be' })
        return $('mc-multiping.add-success', { name, type: tp.toUpperCase() })
      } catch {
        return $('mc-multiping.add-failed')
      }
    })

  // mcm.remove <name> — remove a server (authority >= 3)
  mcm.subcommand('.remove <name:string>', { authority: 3 })
    .action(async ({ session }, name) => {
      if (!session) return
      const $ = t(session)
      if (!name) return $('mc-multiping.provide-server-name')

      const servers = await ctx.database.get('mc_servers', { name })
      if (!servers.length) return $('mc-multiping.server-not-found', { name })

      await ctx.database.remove('mc_lines', { server_id: servers[0].id })
      await ctx.database.remove('mc_servers', { id: servers[0].id })
      return $('mc-multiping.remove-success', { name })
    })

  // mcm.edit <name> <prop> <value> — edit server properties (authority >= 3)
  mcm.subcommand('.edit <name:string> <prop:string> <value:string>', { authority: 3 })
    .action(async ({ session }, name, prop, value) => {
      if (!session) return
      const $ = t(session)
      if (!name || !prop || !value) return $('mc-multiping.edit-usage')

      const servers = await ctx.database.get('mc_servers', { name })
      if (!servers.length) return $('mc-multiping.server-not-found', { name })

      const server = servers[0]
      switch (prop.toLowerCase()) {
        case 'name':
          try {
            await ctx.database.set('mc_servers', server.id, { name: value })
            return $('mc-multiping.edit-name-success', { old: name, new: value })
          } catch {
            return $('mc-multiping.edit-name-failed')
          }
        case 'type': {
          const tp = value.toLowerCase()
          if (tp !== 'je' && tp !== 'be') return $('mc-multiping.add-type-invalid')
          await ctx.database.set('mc_servers', server.id, { type: tp as 'je' | 'be' })
          return $('mc-multiping.edit-type-success', { name, type: tp.toUpperCase() })
        }
        default:
          return $('mc-multiping.edit-unknown-prop')
      }
    })

  // /lines <server> — hierarchical subcommand, accessible as /lines
  const lines = mcm.subcommand('lines <server:string>')
    .action(async ({ session }, serverName) => {
      if (!session) return
      const $ = t(session)
      if (!serverName) return $('mc-multiping.provide-server-name')

      const servers = await ctx.database.get('mc_servers', { name: serverName })
      if (!servers.length) return $('mc-multiping.server-not-found', { name: serverName })

      const lineRecords = await ctx.database.get('mc_lines', { server_id: servers[0].id })
      if (!lineRecords.length) return $('mc-multiping.lines-empty', { name: serverName })

      let text = $('mc-multiping.lines-header', { name: serverName }) + '\n'
      lineRecords.forEach((l, i) => {
        text += $('mc-multiping.lines-item', {
          idx: i + 1, note: l.note, host: l.host, port: l.port,
        }) + '\n'
      })
      return text.trimEnd()
    })

  // lines.add <server> <address> [note] — add a line (authority >= 3)
  lines.subcommand('.add <server:string> <address:string> [note:string]', { authority: 3 })
    .action(async ({ session }, serverName, address, note) => {
      if (!session) return
      const $ = t(session)
      if (!serverName || !address) return $('mc-multiping.addline-usage')

      const servers = await ctx.database.get('mc_servers', { name: serverName })
      if (!servers.length) return $('mc-multiping.server-not-found', { name: serverName })

      const server = servers[0]

      // Auto-number default lines when note is omitted
      if (!note) {
        const baseName = $('mc-multiping.default-line-note')
        const allLines = await ctx.database.get('mc_lines', { server_id: server.id })
        const defaultLines = allLines.filter(l =>
          l.note === baseName || l.note.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d+$`))
        )

        if (defaultLines.length === 0) {
          note = baseName
        } else {
          // Rename the bare base name to "baseName 1" if it exists
          const bare = defaultLines.find(l => l.note === baseName)
          if (bare) {
            await ctx.database.set('mc_lines', bare.id, { note: `${baseName} 1` })
          }
          // Find max existing number
          let maxNum = bare ? 1 : 0
          for (const l of defaultLines) {
            const m = l.note.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`))
            if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
          }
          note = `${baseName} ${maxNum + 1}`
        }
      }

      const { host, port } = parseAddress(address, server.type)

      await ctx.database.create('mc_lines', {
        server_id: server.id,
        host,
        port,
        note,
      })
      return $('mc-multiping.addline-success', { note, host, port })
    })

  // lines.rm <server> <note> — remove a line (authority >= 3)
  lines.subcommand('.rm <server:string> <note:string>', { authority: 3 })
    .action(async ({ session }, serverName, note) => {
      if (!session) return
      const $ = t(session)
      if (!serverName || !note) return $('mc-multiping.rmline-usage')

      const servers = await ctx.database.get('mc_servers', { name: serverName })
      if (!servers.length) return $('mc-multiping.server-not-found', { name: serverName })

      const existing = await ctx.database.get('mc_lines', { server_id: servers[0].id, note })
      if (!existing.length) return $('mc-multiping.line-not-found', { server: serverName, note })

      await ctx.database.remove('mc_lines', { server_id: servers[0].id, note })
      return $('mc-multiping.rmline-success', { server: serverName, note })
    })

  // lines.edit <server> <note> <prop> <value> — edit line properties (authority >= 3)
  lines.subcommand('.edit <server:string> <note:string> <prop:string> <value:string>', { authority: 3 })
    .action(async ({ session }, serverName, note, prop, value) => {
      if (!session) return
      const $ = t(session)
      if (!serverName || !note || !prop || !value) return $('mc-multiping.editline-usage')

      const servers = await ctx.database.get('mc_servers', { name: serverName })
      if (!servers.length) return $('mc-multiping.server-not-found', { name: serverName })

      const server = servers[0]
      const lineRecords = await ctx.database.get('mc_lines', { server_id: server.id, note })
      if (!lineRecords.length) return $('mc-multiping.line-not-found', { server: serverName, note })

      const lineRecord = lineRecords[0]
      switch (prop.toLowerCase()) {
        case 'address': {
          const { host, port } = parseAddress(value, server.type)
          await ctx.database.set('mc_lines', lineRecord.id, { host, port })
          return $('mc-multiping.editline-address-success', { note, host, port })
        }
        case 'note':
          await ctx.database.set('mc_lines', lineRecord.id, { note: value })
          return $('mc-multiping.editline-note-success', { old: note, new: value })
        default:
          return $('mc-multiping.editline-unknown-prop')
      }
    })
}
