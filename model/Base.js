import Constant from '../constant/Constant.js'
import { _paths } from './paths.js'
export default class base {
  constructor (e = {}) {
    this.e = e
    this.userId = e?.user_id
    this.model = 'BubbleGame'
    this.template = this.model
    this._path = process.cwd().replace(/\\/g, '/')
    this.isBot = {
      wx: e.bot?.adapter?.id === 'WeChat',
      qqBot: e.bot?.adapter?.id === 'QQBot' && !['guild', 'direct'].includes(e?.raw?.message_type),
      // chronocat
      qq: e.bot?.adapter?.id === 'QQ',
      QQGuild: e.bot?.adapter?.id === 'QQGuild'
    }
  }

  get prefix () {
    return `${Constant.REDIS_PREFIX}${this.model}:`
  }

  /**
   * 截图默认数据
   */
  get screenData () {
    return {
      saveId: this.userId,
      tplFile: `${_paths.pluginResources}/html/${this.model}/${this.model}.html`,
      /** 绝对路径 */
      pluResPath: _paths.pluginRoot
    }
  }

  get screenRenderData () {
    return {
      saveId: this.userId,
      tplFile: `/html/${this.model}/${this.template}.html`,
      /** 绝对路径 */
      pluResPath: _paths.pluginRoot
    }
  }
}
