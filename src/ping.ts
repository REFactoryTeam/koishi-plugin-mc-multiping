import { status as pingJE, statusBedrock as pingBE } from 'minecraft-server-util'
import { McServer, McLine } from './database'

export const DEFAULT_PORT_JE = 25565
export const DEFAULT_PORT_BE = 19132

export interface ServerStatus {
  lineId: number
  note: string
  online: boolean
  motd?: string
  players?: { online: number; max: number }
  playerList?: string[]
  version?: string
  latency?: number
  error?: string
}

/**
 * Smart address parser. Supports:
 * - Domain only: play.mc.com → { host: 'play.mc.com', port: default }
 * - IP only: 192.168.1.1 → { host: '192.168.1.1', port: default }
 * - Domain:port: play.mc.com:25577 → { host: 'play.mc.com', port: 25577 }
 * - IP:port: 192.168.1.1:25577 → { host: '192.168.1.1', port: 25577 }
 */
export function parseAddress(input: string, type: 'je' | 'be'): { host: string; port: number } {
  const defaultPort = type === 'je' ? DEFAULT_PORT_JE : DEFAULT_PORT_BE
  const trimmed = input.trim()

  // IPv6 bracketed format: [::1]:25565 or [::1]
  if (trimmed.startsWith('[')) {
    const closeBracket = trimmed.indexOf(']')
    if (closeBracket === -1) return { host: trimmed, port: defaultPort }
    const host = trimmed.slice(1, closeBracket)
    const rest = trimmed.slice(closeBracket + 1)
    if (rest.startsWith(':')) {
      const port = parseInt(rest.slice(1), 10)
      return { host, port: isNaN(port) ? defaultPort : port }
    }
    return { host, port: defaultPort }
  }

  // Regular host:port or bare host
  const lastColon = trimmed.lastIndexOf(':')
  if (lastColon === -1) {
    return { host: trimmed, port: defaultPort }
  }

  const possiblePort = trimmed.slice(lastColon + 1)
  const port = parseInt(possiblePort, 10)

  // If not a valid port number, treat as bare host (possibly unbracketed IPv6)
  if (isNaN(port) || port < 1 || port > 65535 || possiblePort !== String(port)) {
    return { host: trimmed, port: defaultPort }
  }

  return { host: trimmed.slice(0, lastColon), port }
}

export async function pingLine(type: 'je' | 'be', host: string, port: number, timeout: number): Promise<Omit<ServerStatus, 'lineId' | 'note'>> {
  const enableSRV = type === 'je' && port === DEFAULT_PORT_JE
  try {
    // SRV lookup only applies to JE with default port (standard Minecraft client behavior)
    const options = { timeout, enableSRV }
    if (type === 'je') {
      const res = await pingJE(host, port, options)
      return {
        online: true,
        motd: res.motd.clean,
        players: res.players,
        playerList: res.players.sample?.map(p => p.name) ?? [],
        version: res.version.name,
        latency: res.roundTripLatency
      }
    } else {
      const res = await pingBE(host, port, options)
      return {
        online: true,
        motd: res.motd?.clean ?? '',
        players: res.players,
        version: res.version?.name ?? '',
        latency: 0
      }
    }
  } catch (e) {
    let reason = 'Unknown error'
    let code = ''
    if (e instanceof Error) {
      reason = e.message
      if ((e as any).code) code = String((e as any).code)
    } else if (typeof e === 'string') {
      reason = e
    }

    const details = [
      `type=${type}`,
      `host=${host}`,
      `port=${port}`,
      `timeout=${timeout}ms`,
      `srv=${enableSRV ? 'on' : 'off'}`,
      code ? `code=${code}` : '',
      `reason=${reason}`,
    ].filter(Boolean).join(', ')

    return { online: false, error: details }
  }
}

export async function queryServerLines(server: McServer, lines: McLine[], timeout: number): Promise<ServerStatus[]> {
  const tasks = lines.map(async line => {
    const res = await pingLine(server.type, line.host, line.port, timeout)
    return { ...res, lineId: line.id, note: line.note }
  })
  return Promise.all(tasks)
}
