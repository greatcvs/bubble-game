import Base from './Base.js'
import { exec } from 'node:child_process'
import Constant from '../constant/Constant.js'
import { _paths } from './paths.js'
let timer
export default class Admin extends Base {
  constructor (e) {
    super(e)
    this.model = 'admin'
  }

  /**
   * updateCopyPlugin
   * @returns {Promise<boolean>}
   */
  async updateBubbleGame () {
    const isForce = this.e.msg.includes('强制')
    let command = 'git pull origin master'
    const that = this
    if (isForce) {
      command = 'git  checkout . && git  pull'
      that.e.reply('正在执行强制更新操作，请稍等')
    } else {
      that.e.reply('正在执行更新操作，请稍等')
    }
    exec(command, { cwd: _paths.pluginRoot }, function (error, stdout, stderr) {
      // console.log(stdout);
      if (/Already up to date/.test(stdout)) {
        that.e.reply('目前已经是最新版了~')
        return true
      }
      if (error) {
        that.e.reply('更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。')
        return true
      }
      that.e.reply('更新成功，尝试重新启动Bot以应用更新...')
      timer && clearTimeout(timer)
      redis.set(`${Constant.REDIS_PREFIX}:restart-msg`, JSON.stringify({
        msg: '重启成功，新版copy-plugin已经生效',
        qq: this.e.user_id
      }), { EX: 30 })

      timer = setTimeout(function () {
        const command = 'npm run restart'
        exec(command, function (error, stdout, stderr) {
          if (error) {
            if (/Yunzai not found/.test(error)) {
              that.e.reply('自动重启失败，请手动重启以应用新版插件。请使用 npm run start 命令启动Yunzai-Bot')
            } else {
              that.e.reply('重启失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。')
            }
            return true
          }
        })
      }, 1000)
    })
    return true
  }
}
