'use strict'
// 持久插件宿主半的路径安全与 RPC 路由纯逻辑测试。
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const path = require('node:path')

test('宠物 id 与图集文件名拒绝路径穿越', async () => {
  const { safeLibraryId, safeSpriteName } = await import(pathToFileURL(path.join(__dirname, '..', 'lib', 'index.mjs')).href)
  assert.equal(safeLibraryId('itachi-2'), 'itachi-2')
  assert.equal(safeLibraryId('a b'), 'a b')
  for (const bad of ['', '.', '..', '../x', 'a/b', 'a\\b', null, 1]) assert.equal(safeLibraryId(bad), null)
  assert.equal(safeSpriteName('spritesheet.webp'), 'spritesheet.webp')
  for (const bad of ['', '.', '..', '../sprite.png', 'dir/sprite.png', 'a\\b.png', null]) assert.equal(safeSpriteName(bad), null)
})

test('package.json 声明 dsh.bundle 与 dsh.client 双面契约', () => {
  const fs = require('node:fs')
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
  assert.equal(pkg.name, 'dsh-pet')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.equal(pkg.exports['./client'], './lib/client.js')
  assert.equal(pkg.exports['.'], './lib/index.mjs')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'lib', 'client.js')))
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'lib', 'index.mjs')))
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'cordis.patch.yml')))
  const patch = fs.readFileSync(path.join(__dirname, '..', 'cordis.patch.yml'), 'utf8')
  assert.match(patch, /id: pet/)
  assert.match(patch, /name: 'dsh-pet'/)
  assert.match(patch, /webServer/)
})

test('RPC 方法名从 /pet/rpc/<method> 提取', async () => {
  const { rpcMethodOf } = await import(pathToFileURL(path.join(__dirname, '..', 'lib', 'index.mjs')).href)
  assert.equal(rpcMethodOf('/pet/rpc/getStatus'), 'getStatus')
  assert.equal(rpcMethodOf('/pet/rpc/listImportCandidates'), 'listImportCandidates')
  assert.equal(rpcMethodOf('/pet/rpc/%E4%B8%AD%E6%96%87'), '中文')
  assert.equal(rpcMethodOf('/pet/other/getStatus'), null)
  assert.equal(rpcMethodOf('/pet/rpc/'), null)
  assert.equal(rpcMethodOf('/pet/rpc/a/b'), null)
  assert.equal(rpcMethodOf(null), null)
})

test('client bundle apply 注册两个 Slot 入口', () => {
  const fs = require('node:fs')
  const bundle = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8')
  let handoff = null
  new Function('window', bundle)({ __ModuleLoader__: { load(value) { handoff = value } } })
  const plugin = handoff.factory(() => ({}))
  const injected = []
  let styleEffect = null
  const ctx = {
    effect(fn, label) {
      styleEffect = { fn, label }
      return () => {}
    },
    slots: {
      inject(key, callback) {
        injected.push({ key, callback })
        return () => {}
      },
    },
  }
  assert.doesNotThrow(() => plugin.apply(ctx))
  assert.deepEqual(injected.map((x) => x.key), [
    'shell.overlay',
    'settings.section',
  ])
  assert.equal(styleEffect.label, 'dsh-pet: 样式')
  assert.doesNotThrow(() => styleEffect.fn())
})
