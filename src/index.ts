import { Context, Schema } from 'koishi'
import { registerDatabase } from './database'
import { registerCommands } from './commands'
import { resolve } from 'path'

export const name = 'mc-multiping'
export const inject = ['database']

export interface Config {
  outputMode: 'text' | 'image'
  timeout: number
}

export const Config: Schema<Config> = Schema.object({
  outputMode: Schema.union(['text', 'image']).default('text').description('Output mode, plain text or generate image.'),
  timeout: Schema.number().default(5000).description('Timeout for single query (ms).')
}).description('Base Settings')

export function apply(ctx: Context, config: Config) {
  registerDatabase(ctx)
  ctx.i18n.define('zh-CN', require(resolve(__dirname, '../locales/zh-CN.json')))
  ctx.i18n.define('en-US', require(resolve(__dirname, '../locales/en-US.json')))
  registerCommands(ctx, config)
}
