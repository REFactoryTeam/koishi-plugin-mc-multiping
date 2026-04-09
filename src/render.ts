import { Context } from 'koishi'
import {} from 'koishi-plugin-puppeteer'
import { ServerStatus } from './ping'
import { McServer } from './database'

export type TextFn = (path: string, params?: any) => string

export interface ServerResult {
  server: McServer
  statuses: ServerStatus[]
}

// ==================== single server rendering ====================

export function renderToText(t: TextFn, server: McServer, statuses: ServerStatus[], authority: number = 0): string {
  let text = `[${server.type.toUpperCase()}] ${server.name}\n`

  if (!statuses.length) {
    text += `  ${t('mc-multiping.no-lines-short')}\n`
    return text
  }

  // Common info from first online line (output once)
  const onlineLine = statuses.find(s => s.online)
  if (onlineLine) {
    text += `  ${t('mc-multiping.players')}: ${onlineLine.players?.online}/${onlineLine.players?.max} | ${t('mc-multiping.version-label')}: ${onlineLine.version}\n`
    text += `  ${t('mc-multiping.motd-label')}: ${onlineLine.motd?.substring(0, 40)}\n`
  }

  // Per-line: only note + latency
  statuses.forEach((s) => {
    if (s.online) {
      text += `  [${s.note}] ${s.latency}ms\n`
    } else {
      text += `  [${s.note}] ${t('mc-multiping.offline')}\n`
      if (s.error) {
        if (authority >= 3) {
          text += `    ${t('mc-multiping.status-error-detail', { error: s.error })}\n`
        } else {
          text += `    ${t('mc-multiping.status-error-simple')}\n`
        }
      }
    }
  })

  return text.trimEnd()
}

export async function renderToImage(ctx: Context, t: TextFn, server: McServer, statuses: ServerStatus[], authority: number = 0): Promise<string | undefined> {
  return renderAllToImage(ctx, t, [{ server, statuses }], authority)
}

// ==================== multi-server rendering ====================

export function renderAllToText(t: TextFn, results: ServerResult[], authority: number = 0): string {
  if (!results.length) return t('mc-multiping.no-servers')
  return results.map(r => renderToText(t, r.server, r.statuses, authority)).join('\n\n')
}

export async function renderAllToImage(ctx: Context, t: TextFn, results: ServerResult[], authority: number = 0): Promise<string | undefined> {
  const puppeteer = ctx.puppeteer
  if (!puppeteer) return undefined

  let htmlBody = `
    <div style="padding: 24px; font-family: 'Segoe UI', sans-serif; background: #1e1e2e; color: #cdd6f4; border-radius: 12px; min-width: 480px;">
  `

  for (const { server, statuses } of results) {
    const onlineCount = statuses.filter(s => s.online).length
    const totalCount = statuses.length
    const onlineLine = statuses.find(s => s.online)

    htmlBody += `
      <div style="margin-bottom: 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
          <h2 style="margin:0; color: #89b4fa;">[${server.type.toUpperCase()}] ${escapeHtml(server.name)}</h2>
          <span style="color: #a6adc8; font-size: 0.9em;">${escapeHtml(t('mc-multiping.lines-online', { online: onlineCount, total: totalCount }))}</span>
        </div>
    `

    // Common info from first online line (once)
    if (onlineLine) {
      htmlBody += `
        <div style="color:#a6adc8; margin-bottom:8px; font-size:0.85em;">
          ${escapeHtml(t('mc-multiping.players'))}: ${onlineLine.players?.online}/${onlineLine.players?.max}
          · ${escapeHtml(t('mc-multiping.version-label'))}: ${escapeHtml(onlineLine.version ?? '')}
          · ${escapeHtml(t('mc-multiping.motd-label'))}: ${escapeHtml(onlineLine.motd?.substring(0, 50) ?? '')}
        </div>
      `
    }

    htmlBody += `<div style="display:flex; flex-direction:column; gap:6px;">`

    // Per-line: only note + latency
    for (const s of statuses) {
      const bgColor = s.online ? '#a6e3a1' : '#f38ba8'
      const statusText = s.online ? `${s.latency}ms` : escapeHtml(t('mc-multiping.offline'))
      const errorDetail = (!s.online && s.error && authority >= 3)
        ? `<div style="color:#f38ba8;font-size:0.75em;margin-top:4px;word-break:break-all;">${escapeHtml(s.error)}</div>`
        : ''
      htmlBody += `
        <div style="background:#313244; padding: 8px 14px; border-radius: 6px; border-left: 5px solid ${bgColor};">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${escapeHtml(s.note)}</strong>
            <span style="font-weight:bold; color: ${s.online ? '#a6e3a1' : '#f38ba8'};">${statusText}</span>
          </div>
          ${errorDetail}
        </div>
      `
    }

    htmlBody += `
        </div>
      </div>
    `
  }

  htmlBody += `</div>`

  try {
    const page = await puppeteer.page()
    await page.setContent(`<html><body style="margin:0;background:transparent;">${htmlBody}</body></html>`, { waitUntil: 'load' })
    const element = await page.$('div')
    const buffer = await element?.screenshot()
    await page.close()
    if (!buffer) return undefined

    return require('koishi').h.image(buffer, 'image/png').toString()
  } catch (err) {
    ctx.logger('mc-multiping').error('puppeteer error: ', err)
    return undefined
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
