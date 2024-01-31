import plugin from '../../../lib/plugins/plugin.js'

import Admin from '../model/Admin.js'
import GreatCfg from '../model/cfg.js'

export class admin extends plugin {
  constructor () {
    super({
      /** 功能名称 */
      name: 'bubble-game-Admin',
      dsc: '更新插件',
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: GreatCfg.get('priority'),
      rule: [
        { reg: '^#(bubble|泡泡)(强制)?更新$', fnc: 'updateBubbleGame', permission: 'master' }
      ]
    })
  }

  /**
   * updateCopyPlugin
   * @returns {Promise<boolean>}
   */
  async updateBubbleGame () {
    const admin = new Admin(this.e)
    await admin.updateBubbleGame()
  }
}
