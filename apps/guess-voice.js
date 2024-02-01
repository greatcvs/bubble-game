import plugin from '../../../lib/plugins/plugin.js'
import path from 'path'
import fs from 'fs'
import gsBubbleCfg from '../model/cfg.js'
import gsCfg from '../../genshin/model/gsCfg.js'
import common from '../../../lib/common/common.js'

const _path = process.cwd()
const voicePath = path.join(_path, './plugins/bubble-game/resources/bubble-res-plus/voice')
const settings = {
  // 语音文件存放路径
  path: voicePath,
  // 语音目录的语言名称，因为群文件压缩包里的中文语音目录叫：China，如果你不想修改文件夹名称的话，可以将此处的配置改为China
  keys: ['Chinese', 'English', 'Japanese', 'Korean']
}

const languageConfig = [
  {
    key: settings.keys[0],
    name: '中文',
    alias: ['中', '中文', '汉', '汉语', '中配', settings.keys[0]]
  },
  {
    key: settings.keys[1],
    name: '英语',
    alias: ['英', '英文', '英语', '英配', settings.keys[1]]
  },
  {
    key: settings.keys[2],
    name: '日语',
    alias: ['日', '日文', '日语', '日配', settings.keys[2]]
  },
  {
    key: settings.keys[3],
    name: '韩语',
    alias: ['韩', '韩文', '韩语', '韩配', settings.keys[3]]
  }
]

const guessConfigMap = new Map()

export class guessVoice extends plugin {
  constructor () {
    super({
      name: '游戏猜语音:bubble-game',
      dsc: 'bubble-game',
      event: 'message',
      priority: 2000,
      rule: [
        {
          reg: '^#(?!猜)(?!结束猜)(.*)语音(中|中文|汉|汉语|中配|英|英文|英语|英配|日|日文|日语|日配|韩|韩文|韩语|韩配)?$',
          fnc: 'playVoice'
        },
        {
          reg: '^#结束猜语音$',
          fnc: 'endGuessVoice'
        },
        {
          reg: '^#猜语音(中|中文|汉|汉语|中配|英|英文|英语|英配|日|日文|日语|日配|韩|韩文|韩语|韩配)?$',
          fnc: 'guessVoice'
        },
        {
          reg: '(.*)',
          log: false,
          fnc: 'guessVoiceCheck'
        }
      ]
    })

    this.guessVoiceCfg = gsBubbleCfg.get('guessVoice')
  }

  async playVoice (e) {
    let msg = e.msg.replace(/#|＃|/g, '')
    let splitArr = msg.split('语音')
    let language = languageConfig[0]
    if (splitArr.length >= 2) {
      language = await this.getLanguage(splitArr[1])
      if (language == null) {
        e.reply(`没有找到语言为“${splitArr[1]}”的语音`)
        return true
      }
    }
    let id = gsCfg.roleNameToID(splitArr[0])
    let name = null
    if (id) {
      name = gsCfg.roleIdToName(id)
    }
    if (!name) {
      e.reply(`没有找到${splitArr[0]}的${language.name}语音哦！`)
      return true
    }
    await this.randomPlayVoice(e, name, language)
    return true
  }

  async endGuessVoice (e) {
    let guessConfig = await this.getGuessConfig(e)
    let tips = []
    if (guessConfig.playing) {
      tips = [segment.at(e.user_id), '猜语音游戏已结束！(*/ω＼*)']
      await guessConfig.delete()
    } else {
      tips = [segment.at(e.user_id), '打咩，当前猜语音游戏不在进行哦！(*/ω＼*)']
    }
    e.reply(tips)
    return true
  }

  async randomPlayVoice (e, name, language) {
    let voiceRandomPath = path.join(settings.path, language.key, name)
    let voiceFiles = []
    console.log(voiceRandomPath)
    if (fs.existsSync(voiceRandomPath)) {
      // 过滤掉data.json
      fs.readdirSync(voiceRandomPath).forEach(fileName => {
        if (fileName !== 'data.json') {
          voiceFiles.push(fileName)
        }
      })
    } else {
      e.reply(`没有找到${name}的${language.name}语音哦！`)
      return false
    }

    if (voiceFiles.length === 0) {
      e.reply(`没有找到${name}的${language.name}语音哦！`)
      return false
    }

    let randomFile = voiceFiles[Math.round(Math.random() * (voiceFiles.length - 1))]
    let finalPath = path.join(settings.path, language.key, name, randomFile)
    let bitMap = fs.readFileSync(finalPath)
    let base64 = Buffer.from(bitMap, 'binary').toString('base64')
    let message = segment.record(`base64://${base64}`)
    e.reply(message)
    return true
  }

  async guessVoice (e) {
    if (!e.isGroup) {
      e.reply('打咩，猜语音游戏只能在群聊中进行哦！(*/ω＼*)')
      return true
    }
    // 判断是否是wx_开头的群
    if (String(e.group_id).startsWith('wx_')) {
      e.reply('打咩，微信群暂不支持猜语音游戏哦！(*/ω＼*)')
      return true
    }
    let guessConfig = await this.getGuessConfig(e)
    if (guessConfig.playing) {
      let tips = [segment.at(e.user_id), '打咩，猜语音游戏正在进行哦！(*/ω＼*)']
      e.reply(tips, true, { at: false, recallMsg: 100 })
      return true
    }
    let splitArr = e.msg.split('语音')
    let language = languageConfig[0]
    if (splitArr.length >= 2) {
      language = await this.getLanguage(splitArr[1])
      if (language == null) {
        e.reply(`没有找到语言为“${splitArr[1]}”的语音`)
        return true
      }
    }
    // 随机角色名
    let langPath = path.join(settings.path, language.key)
    let nameList = []
    fs.readdirSync(langPath).forEach(fileName => nameList.push(fileName))
    let roleName = nameList[Math.round(Math.random() * (nameList.length - 1))]
    let roleId = gsCfg.roleNameToID(roleName)
    const { coolingTime } = this.guessVoiceCfg
    const cdTime = coolingTime * 60
    let tips = [segment.at(e.user_id), `即将发送发送一段语音，将在 ${cdTime} 秒之后揭晓答案`]
    e.reply(tips, true, { at: false, recallMsg: 100 })
    guessConfig.playing = true
    guessConfig.roleName = roleName
    guessConfig.roleId = roleId
    guessConfig.language = language.name
    logger.mark(e.group_id, '猜语音', roleId, roleName)
    let flag = await this.randomPlayVoice(e, roleName, language)
    if (flag) {
      guessConfig.timer = setTimeout(() => {
        let key = e.message_type + e[e.isGroup ? 'group_id' : 'user_id']
        let guessConfig = guessConfigMap.get(key)
        if (guessConfig.playing) {
          console.log('没有人答对:', guessConfig.roleName)
          this.replayAnswer(e, ['很遗憾，还没有人答对哦，正确答案是：' + guessConfig.roleName], guessConfig)
        }
      }, coolingTime * 60000)
    }

    return true
  }

  async guessVoiceCheck (e) {
    let key = e.message_type + e[e.isGroup ? 'group_id' : 'user_id']
    let config = await guessConfigMap.get(key)
    if (config) {
      let { playing, roleId } = config
      let msgRoleId = gsCfg.roleNameToID(e.msg)
      if (msgRoleId === roleId && playing) {
        config.playing = false
        await this.replayAnswer(e, ['恭喜你答对了！'], config, true)
      }
    }
    return false
  }

  async getGuessConfig (e) {
    let key = e.message_type + e[e.isGroup ? 'group_id' : 'user_id']
    let config = guessConfigMap.get(key)
    if (config == null) {
      config = {
        // 是否正在游戏中
        playing: false,
        // 当前角色Id
        roleId: '',
        // 当前角色名称
        roleName: '',
        // 计时器timer
        timer: null,
        // 语言
        language: '',
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
      guessConfigMap.set(key, config)
    }
    return config
  }

  async getLanguage (name) {
    if (name === '' || name == null) {
      return languageConfig[0]
    }
    for (const item of languageConfig) {
      if (item.alias.find(a => a.toLowerCase() === name.toLowerCase())) {
        return item
      }
    }
    return null
  }

  async replayAnswer (e, message, cfg, isReply = false) {
    clearTimeout(cfg.timer)
    cfg.playing = false
    const language = cfg.language
    await cfg.delete()
    await e.reply(message, true)
    if (isReply) {
      await common.sleep(2500)
      e.msg = `#猜语音${language}`
      await this.guessVoice(e)
    }
  }
}
