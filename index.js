import { currentVersion } from './components/Changelog.js'
import fs from 'node:fs'
import chalk from 'chalk'

const files = fs.readdirSync('./plugins/bubble-game/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

if (Bot?.logger?.info) {
  logger.info(chalk.rgb(120, 255, 108)('---------QAQ---------'))
  logger.info(chalk.rgb(120, 255, 108)(`BubbleGame ${currentVersion}初始化~qwq`))
} else {
  console.log(`BubbleGame 插件${currentVersion}初始化~`)
}

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}
if (Bot?.logger?.info) {
  logger.info(chalk.rgb(120, 255, 108)(`加载 BubbleGame 插件${currentVersion}完成~`))
  logger.info(chalk.rgb(120, 255, 108)('---------------------'))
} else {
  console.log(`加载 BubbleGame 插件${currentVersion}完成~`)
}
// let tips = '泡泡插件初始化完成~'
// common.relpyPrivate(cfg.masterQQ[0], tips)
export { apps }
