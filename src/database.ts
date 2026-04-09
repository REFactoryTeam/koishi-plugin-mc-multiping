import { Context } from 'koishi'

declare module 'koishi' {
  interface Tables {
    mc_servers: McServer
    mc_lines: McLine
  }
}

export interface McServer {
  id: number
  name: string
  type: 'je' | 'be'
}

export interface McLine {
  id: number
  server_id: number
  host: string
  port: number
  note: string
}

export function registerDatabase(ctx: Context) {
  ctx.model.extend('mc_servers', {
    id: 'unsigned',
    name: 'string',
    type: 'string',
  }, {
    autoInc: true,
    unique: ['name']
  })

  ctx.model.extend('mc_lines', {
    id: 'unsigned',
    server_id: 'unsigned',
    host: 'string',
    port: 'integer',
    note: 'string',
  }, {
    autoInc: true,
  })
}
