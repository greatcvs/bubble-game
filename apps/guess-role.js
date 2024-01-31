import plugin from '../../../lib/plugins/plugin.js'
import gsBubbleCfg from '../model/cfg.js'
import GuessRole from '../model/GuessRole.js'

export class guessRole extends plugin {
  constructor () {
    super({
      name: '游戏猜角色:bubble-game',
      dsc: 'bubble-game',
      event: 'message',
      priority: 2000,
      rule: [
        { reg: '^#(星铁|原神)?(普通|困难|地狱)?(模式)?猜(头像|角色)(普通|困难|地狱)?(模式)?$', fnc: 'guessAvatar' },
        { reg: '^#结束猜(头像|角色)$', fnc: 'endGuessAvatar' },
        { reg: '^#?(我猜)?(.*)$', log: false, fnc: 'guessAvatarCheck' },
        { reg: '^#(星铁|原神)?猜(头像|角色)帮助$', fnc: 'guessAvatarHelp' }
      ]
    })
    this.guessRoleCfg = gsBubbleCfg.get('guessRole')
  }

  async init (e) {
    const guess = new GuessRole(e)
    guess.init()
  }

  async guessAvatarHelp (e) {
    const guess = new GuessRole(e)
    return guess.guessAvatarHelp()
  }

  async guessAvatar (e) {
    let msg = e.msg.replace(/#|＃|/g, '')
    e.game = msg.startsWith('星铁') ? 'sr' : 'gs'
    const guess = new GuessRole(e)
    return guess.guessAvatar()
  }

  async guessAvatarCheck (e) {
    const guess = new GuessRole(e)
    return guess.guessAvatarCheck()
  }

  async endGuessAvatar (e) {
    const guess = new GuessRole(e)
    return guess.endGuessAvatar()
  }
}
