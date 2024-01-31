import fs from 'node:fs'
import path from 'node:path'
import lodash from 'lodash'
import YamlReader from '../components/YamlReader.js'
import { _paths } from './paths.js'
import YAML from 'yaml'
import chokidar from 'chokidar'

/** 配置文件 */
class GreatConfig {
  constructor () {
    /** 默认设置 */
    this.defSet = {
      path: path.join(_paths.pluginRoot, 'defSet/config/config_default.yaml'),
      reader: null
    }

    this.watcher = { config: {}, defSet: {} }
    /** 用户设置 */
    this.config = {
      path: path.join(_paths.pluginRoot, '/config/config.yaml'),
      reader: null
    }

    this.pluResPath = _paths.pluginResources
    this.initConfig()
  }

  /** 初始化用户配置文件 */
  initConfig () {
    if (!fs.existsSync(this.config.path)) {
      let configDir = path.dirname(this.config.path)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir)
      }
      fs.copyFileSync(this.defSet.path, this.config.path)
    }
    try {
      this.defSet.reader = new YamlReader(this.defSet.path, false)
      this.config.reader = new YamlReader(this.config.path, true)
    } catch (error) {
      logger.error('[copy-plugin] 配置文件格式错误! ', error)
      throw error
    }

    this.config.reader.watcher.on('change', () => {
      if (!this.config.reader.isSave) {
        logger.mark('[BubbleGame] 配置文件重载成功~')
      }
    })
  }

  /** 合并默认配置和用户配置 */
  get merged () {
    return lodash.merge({}, this.defSet.reader.jsonData, this.config.reader.jsonData)
  }

  /** 通过配置路径获取值，例如：server.port */
  get (keyPath) {
    return lodash.get(this.merged, keyPath)
  }

  set (keyPath, value) {
    this.config.reader.set(keyPath, value)
  }

  /**
   * 获取DefSet配置yaml
   * @param app 功能
   * @param name 名称
   */
  getDefSet (app, name) {
    return this.getYaml(app, name, 'defSet')
  }

  /**
   * 获取配置yaml
   * @param app 功能
   * @param name 名称
   * @param type 默认跑配置-defSet，用户配置-config
   */
  getYaml (app, name, type) {
    let file = `${_paths.pluginDefSet}/${app}/${name}.yaml`
    let key = `${app}.${name}`

    if (this[type][key]) return this[type][key]

    try {
      this[type][key] = YAML.parse(
        fs.readFileSync(file, 'utf8')
      )
    } catch (error) {
      logger.error(`[${app}][${name}] 格式错误 ${error}`)
      return false
    }

    this.watch(file, app, name, type)

    return this[type][key]
  }

  watch (file, app, name, type = 'defSet') {
    let key = `${app}.${name}`

    if (this.watcher[type][key]) return

    const watcher = chokidar.watch(file)
    watcher.on('change', path => {
      delete this[type][key]
      logger.mark(`[修改配置文件][${type}][${app}][${name}]`)
      if (this[`change_${app}${name}`]) {
        this[`change_${app}${name}`]()
      }
    })

    this.watcher[type][key] = watcher
  }
}

export default new GreatConfig()
