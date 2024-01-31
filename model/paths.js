/*
* 更改此文件需要重启
*/
import path from 'node:path'
const _path = process.cwd()
export const _paths = initPaths()

function initPaths () {
  let pluginName = 'bubble-game'
  // BotData目录
  let data = path.join(_path, 'data')
  // Bot资源目录
  let resources = path.join(_path, 'resources')
  // 插件根目录
  let pluginRoot = path.join(_path, 'plugins', pluginName)
  // 插件资源目录
  let pluginResources = path.join(pluginRoot, 'resources')

  let pluginDefSet = path.join(pluginRoot, 'defSet')
  return {
    root: _path,
    data,
    resources,
    pluginRoot,
    pluginResources,
    pluginName,
    pluginDefSet
  }
}
