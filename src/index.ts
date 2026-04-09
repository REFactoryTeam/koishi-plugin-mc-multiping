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
  outputMode: Schema.union(['text', 'image']).default('text').description('输出模式，纯文本或生成图片。'),
  timeout: Schema.number().default(5000).description('单次查询超时时间（毫秒）。')
}).description('基础设置')

export function apply(ctx: Context, config: Config) {
  registerDatabase(ctx)
  ctx.i18n.define('zh-CN', require(resolve(__dirname, '../locales/zh-CN.yml')))
  ctx.i18n.define('en-US', require(resolve(__dirname, '../locales/en-US.yml')))
  registerCommands(ctx, config)
}
