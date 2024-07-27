import gsBubbleCfg from './cfg.js'
import { _paths } from './paths.js'
import lodash from 'lodash'
import sizeOf from 'image-size'
import common from '../../../lib/common/common.js'
import { alias as gsAllAlias } from '../../miao-plugin/resources/meta-gs/character/alias.js'
import { alias as srAllAlias } from '../../miao-plugin/resources/meta-sr/character/alias.js'
import Base from './Base.js'
import fs from 'node:fs'
const _path = process.cwd()
const miaoResPath = (_path + '/plugins/miao-plugin/resources').replace(/\\/g, '/')
const gsImgPath = `${miaoResPath}/meta-gs/character/`
const srImgPath = `${miaoResPath}/meta-sr/character/`

const gameType = {
  gs: '原神',
  sr: '星穹铁道'
}
// 随机背景颜色
const colors = [
  '#F5F5F5',
  '#FFEDED',
  '#F7F0D7',
  '#C0E2F5',
  '#FFCDCA',
  '#D0FFC3',
  '#D9D6FF'
]
const guessConfigMap = new Map()
let gsData = []
let gsAlias = {}
// 已经猜过的
let gsCache = new Set()

let srData = []
let srAlias = {}
// 已经猜过的
let srCache = new Set()

export default class GuessRole extends Base {
  constructor (e) {
    super(e)
    this.e = e || {}
    this.model = 'guessRole'
    this.template = this.model
    this._path = process.cwd().replace(/\\/g, '/')
    this.guessRoleCfg = gsBubbleCfg.get('guessRole')
    this.e.pattern = '普通模式'
    this.guessAvatarStart = segment.button(
      [{ text: '⭕我猜', input: '/我猜' }, { text: '❌放弃', input: '/结束猜角色' }]
    )
    this.e.game = this.e.game || 'gs'
    this.game = this.e.game
    this.guessAvatarEnd = segment.button(
      [{ text: '🎉再来一局', callback: `/${gameType[this.e.game]}猜角色${this.e.pattern}` }, { text: `${this.e.game === 'gs' ? '星铁' : '原神'}猜角色✨`, callback: `/${this.e.game === 'gs' ? '星铁' : '原神'}猜角色${this.e.pattern}模式` }]
    )
    // 不在进行
    this.guessAvatarNot = segment.button(
      [{ text: '🎉原神猜角色', callback: '/原神猜角色' }, { text: '原神猜角色✨', callback: '/星铁猜角色' }]
    )
  }

  async init () {
    if (gsData.length === 0) {
      gsData = await readJSON(`${gsImgPath}data.json`)
      // 过滤掉旅行者
      const roleKey = Object.keys(gsAllAlias).filter(item => item !== '旅行者')
      gsAlias = {}
      roleKey.forEach(item => {
        gsAlias[item] = gsAllAlias[item]
      })
    }
    if (srData.length === 0) {
      srData = await readJSON(`${srImgPath}data.json`)
      srAlias = srAllAlias
    }
  }

  async guessAvatarHelp () {
    const msg = [
      '猜角色帮助',
      '『可选模式』\n普通，困难，地狱（开始游戏命令后面拼接，默认普通）',
      '『可选游戏』\n#：原神 *：星铁',
      '『结束游戏』\n发送#结束猜角色'
    ]
    await this.e.reply(msg, false, { at: true })
    return true
  }

  async guessAvatar () {
    // 判断是否是wx_开头的群
    if (this.isBot.wx) {
      this.e.reply('打咩，微信群暂不支持猜角色游戏哦！')
      return true
    }
    let guessConfig = await this.getGuessConfig()
    if (guessConfig.playing) {
      let tips = ['打咩，猜角色游戏正在进行哦！']
      this.e.reply(tips, false, { at: true })
      return true
    }

    const props = await this.guessAvatarInit()
    this.template = 'question'
    const question = this.screenRenderData
    const promiseDate = Object.assign(props, question)
    promiseDate.saveId = this.e.user_id
    const promise = await this.e.runtime.render(_paths.pluginName, question.tplFile, promiseDate, { retType: 'base64' })
    if (promise) {
      const replMsg = [promise]
      if (this.e.autoStratFlag) {
        const { coolingTime } = this.guessRoleCfg
        const cdTime = coolingTime * 60
        replMsg.unshift(`『当前游戏』：${gameType[this.e.game]}\n『当前模式』：${this.e.pattern}\n『更多命令』：发送” 猜角色帮助 “获取\n下面是『随机角色』的『随机一角』，${cdTime}秒之后揭晓答案！`)
      }

      if (this.isBot.qqBot) {
        replMsg.push(this.guessAvatarStart)
      }
      this.e.reply(replMsg, false, { at: true })
      this.template = 'answer'
      const answer = this.screenRenderData
      const answerDate = { ...props, ...answer }
      answerDate.saveId = this.e.user_id
      guessConfig.answer = await this.e.runtime.render(_paths.pluginName, answerDate.tplFile, answerDate, { retType: 'base64' })
      const { coolingTime } = this.guessRoleCfg
      guessConfig.timer = setTimeout(() => {
        let key = this.e.message_type + this.e[this.e.isGroup ? 'group_id' : 'user_id']
        let guessConfig = guessConfigMap.get(key)
        if (guessConfig?.playing) {
          console.log('没有人答对:', guessConfig.roleName)
          this.replayAnswer(['✨很遗憾，还没有人答对哦\n正确答案是：' + guessConfig.roleName], guessConfig)
        }
      }, coolingTime * 60000)
      await this.setGuessConfig(guessConfig)
    } else {
      await guessConfig.delete()
      this.e.reply('呜~ 图片生成失败了… 请稍后重试 〒▽〒')
    }
    return true
  }

  async guessAvatarCheck () {
    const msg = this.e.msg
    if (!msg) { return false }
    // 删除# 我 猜
    // 判断是否有我猜
    const guess = msg.includes('我猜')
    let guessMsg = msg.replace(/#|我猜|猜|/g, '').trim()
    let key = this.e.message_type + this.e[this.e.isGroup ? 'group_id' : 'user_id']
    let config = await guessConfigMap.get(key)
    if (config) {
      let guessConfig = config
      let { playing, roleAlias } = guessConfig
      if (playing && roleAlias && guessMsg) {
        if (roleAlias.includes(guessMsg)) {
          await this.replayAnswer(['🎉恭喜你答对了！'], guessConfig, true)
          return true
        } else if (guess) {
          const replyMsg = ['🔴答案不正确哦！']
          if (this.isBot.qqBot) {
            replyMsg.push(this.guessAvatarStart)
          }
          this.e.reply(replyMsg, true, { at: true })
        }
      }
    } else if (guess) {
      const replyMsg = ['当前猜角色游戏不在进行哦！']
      if (this.isBot.qqBot) {
        replyMsg.push(this.guessAvatarNot)
      }
      this.e.reply(replyMsg, true, { at: true })
    }
    return false
  }

  async endGuessAvatar () {
    let guessConfig = await this.getGuessConfig(this.e)
    let tips = []
    if (guessConfig.playing) {
      await this.replayAnswer(['🎀当前猜角色游戏已结束！'], guessConfig)
    } else {
      tips = ['打咩，当前猜角色游戏不在进行哦！']
      this.e.reply(tips, false, { at: true })
    }

    return true
  }

  async getGuessConfig () {
    let key = this.e.message_type + this.e[this.e.isGroup ? 'group_id' : 'user_id']
    let config = await guessConfigMap.get(key)
    if (config == null) {
      config = {
        // 是否正在游戏中
        playing: false,
        // 当前角色Id
        roleId: '',
        // 当前角色名称
        roleName: '',
        // 角色别名
        roleAlias: '',
        // 计时器timer
        timer: null,
        // 答案图片
        answer: null,
        // 模式
        pattern: null,
        // game
        game: 'gs',
        // 删除自身，等待释放内存
        delete: () => {
          let guessConfig = guessConfigMap.get(key)
          logger.mark('删除的答案:', guessConfig.roleName)
          if (guessConfig.timer) {
            clearTimeout(guessConfig.timer)
          }
          guessConfigMap.delete(key)
        }
      }
      await guessConfigMap.set(key, config)
    }
    return config
  }

  async setGuessConfig (config) {
    let key = this.e.message_type + this.e[this.e.isGroup ? 'group_id' : 'user_id']
    await guessConfigMap.set(key, config)
  }

  async getAllData (game = 'gs') {
    const data = game === 'sr' ? srData : gsData
    const keys = Object.keys(data)
    const cache = game === 'sr' ? srCache : gsCache
    // 过滤已经猜过的
    const filterData = keys.filter(item => !cache.has(item))
    // 如果全部猜过了，清空缓存
    if (filterData.length === 0) {
      cache.clear()
      game === 'sr' ? srCache = cache : gsCache = cache
      return data
    }
    const retData = {}
    filterData.forEach(item => {
      retData[item] = data[item]
    })
    return retData
  }

  async guessAvatarInit () {
    const game = this.e.game || 'gs'
    const data = await this.getAllData(game)
    const alias = game === 'sr' ? srAlias : gsAlias
    const imgPath = game === 'sr' ? srImgPath : gsImgPath
    let guessConfig = await this.getGuessConfig()
    // 模式判断
    let hardMode = this.e.msg.includes('困难')
    let hellMode = this.e.msg.includes('地狱')
    let mode = ''
    // 图片大小
    let size, helpText
    let randomImgPath = lodash.random(0, 100) <= 10 ? 'face.webp' : 'splash.webp'
    const imgGuessSize = {
      min: 20,
      max: 40,
      cool: 2
    }
    if (randomImgPath === 'splash.webp') {
      if (game === 'gs') {
        imgGuessSize.min = 200
        imgGuessSize.max = 400
      } else {
        imgGuessSize.min = 200
        imgGuessSize.max = 400
      }
      imgGuessSize.cool = 3
    }

    if (hardMode) {
      guessConfig.pattern = '困难模式'
      size = lodash.random(imgGuessSize.min, imgGuessSize.max)
      helpText = '%s\n在『困难模式』下，发送的图片将会变成黑白色。'
      mode = 'hardMode'
    } else if (hellMode) {
      guessConfig.pattern = '地狱模式'
      size = lodash.random(imgGuessSize.min, imgGuessSize.max - (imgGuessSize.cool * 10))
      helpText = '%s\n在『地狱模式』下，发送的图片将会变成反色。'
      mode = 'hellMode'
    } else {
      guessConfig.pattern = '普通模式'
      size = lodash.random(imgGuessSize.min, imgGuessSize.max)
      helpText = '%s'
    }
    this.e.pattern = guessConfig.pattern
    const { coolingTime } = this.guessRoleCfg
    const cdTime = coolingTime * 60
    if (!this.e.autoStratFlag) {
      helpText = helpText.replace('%s', `即将发送一张『随机角色』的『随机一角』，${cdTime}秒之后揭晓答案！`)
      helpText = `『当前游戏』：${gameType[game]}\n『当前模式』：${guessConfig.pattern}\n『更多命令』：发送” 猜角色帮助 “获取\n${helpText}`
      // #猜角色困难模式”或者“#猜角色地狱模式
      let tips = [helpText]
      this.e.reply(tips, false, { at: false, recallMsg: 100 })
    }

    // data数组随机
    const randomRole = lodash.sample(data)
    guessConfig.game = this.e.game || 'gs'
    guessConfig.playing = true
    guessConfig.roleId = randomRole.id
    if (game === 'sr') {
      srCache.add(String(randomRole.id))
    } else {
      gsCache.add(String(randomRole.id))
    }
    guessConfig.roleName = randomRole.name
    guessConfig.roleAlias = `${alias[randomRole.name]},${randomRole.name}` || randomRole.name || ''
    logger.mark(this.e.group_id, '猜角色', randomRole.id, randomRole.name)
    // 拼接路径(imgPath, randomRole.name, 'imgs', randomImgPath)
    let imgSrc = `${imgPath}${randomRole.name}/imgs/${randomImgPath}`
    // 减小生成过多空白的可能性
    let minTop = 0; let limitTop = 0; let minLeft = 0; let limitLeft = 0
    if (randomImgPath === 'face.webp') {
      minLeft = 30
      limitLeft = 30
    } else {
      minLeft = 300
      limitLeft = 400
      minTop = 200
      limitTop = 200
    }
    // 算出图片位置
    let imgSize = sizeOf(imgSrc)
    let imgTop = lodash.random(minTop, imgSize.height - size - limitTop)
    let imgLeft = lodash.random(minLeft, imgSize.width - size - limitLeft)
    let imgColor = colors[lodash.random(0, colors.length - 1)]
    let props = {}
    props.src = `file:///${imgSrc}`
    props.size = size
    props.imgTop = imgTop
    props.imgLeft = imgLeft
    props.imgColor = imgColor
    props.imgWidth = imgSize.width
    props.imgHeight = imgSize.height
    props.hardMode = hardMode
    props.hellMode = hellMode
    props.mode = mode
    await this.setGuessConfig(guessConfig)
    return props
  }

  async replayAnswer (message, cfg, isReply = false) {
    clearTimeout(cfg.timer)
    cfg.playing = false
    let answer = await cfg.answer
    if (answer) {
      message.push(answer)
    }
    const replyMsg = [...message]

    if (this.isBot.qqBot && !isReply) {
      replyMsg.push(segment.button(
        [{ text: '🎉再来一局', callback: `/${gameType[cfg.game]}猜角色${cfg.pattern}` }, { text: `${cfg.game === 'gs' ? '星铁' : '原神'}猜角色✨`, callback: `/${cfg.game === 'gs' ? '星铁' : '原神'}猜角色${cfg.pattern}` }]
      ))
    }
    await this.e.reply(replyMsg, true)
    const pattern = cfg.pattern
    await cfg.delete()
    if (isReply) {
      await common.sleep(2500)
      this.e.msg = `#猜角色${pattern}`
      this.e.game = cfg.game
      this.e.pattern = pattern
      this.e.autoStratFlag = true
      await this.guessAvatar(cfg.game)
    }
  }
}
/*
* 读取json
* */
async function readJSON (path) {
  if (fs.existsSync(`${path}`)) {
    try {
      return JSON.parse(fs.readFileSync(`${path}`, 'utf8'))
    } catch (e) {
      console.error(`JSON数据错误: ${path}`)
      console.log(e)
    }
  }
  return {}
}
