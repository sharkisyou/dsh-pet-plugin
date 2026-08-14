'use strict'
// 持久客户端 bundle 构建测试：lib/client.js 必须由 scripts/build-client.mjs
// 从 src/{client-ui,animation}.js 可重复生成，且 factory 能注册并导出插件面。
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const OUT = path.join(ROOT, 'lib', 'client.js')

test('lib/client.js 与生成器输出逐字节一致', async () => {
  const { renderClientBundle, sourceBody, buildClientBundle } =
    await import(pathToFileURL(path.join(ROOT, 'scripts', 'build-client.mjs')).href)
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const expected = renderClientBundle(
    pkg.name,
    sourceBody(path.join(SRC, 'client-ui.js')),
    sourceBody(path.join(SRC, 'animation.js')),
  )
  assert.equal(fs.readFileSync(OUT, 'utf8'), expected)
  // 生成路径与测试路径必须一致，防止测试只读缓存。
  assert.equal(buildClientBundle(), OUT)
})

test('client bundle 可作为经典脚本解析并注册工厂', () => {
  const bundle = fs.readFileSync(OUT, 'utf8')
  assert.doesNotThrow(() => new Function(bundle), 'bundle 语法错误')

  let handoff = null
  const fakeWindow = {
    __ModuleLoader__: { load(value) { handoff = value } },
  }
  new Function('window', bundle)(fakeWindow)
  assert.ok(handoff !== null)
  assert.equal(handoff.id, 'dsh-pet')
  const fakeRequire = (spec) => {
    if (spec === 'react') return {}
    throw new Error(`unexpected require(${spec})`)
  }
  const exportsOf = handoff.factory(fakeRequire)
  assert.equal(typeof exportsOf.apply, 'function')
  assert.equal(typeof exportsOf.extractCurrentSessionId, 'function')
  assert.deepEqual(exportsOf.inject, ['slots'])
  assert.equal(exportsOf.extractCurrentSessionId({ current: 'session-1' }), 'session-1')
  assert.equal(exportsOf.extractCurrentSessionId({ current: undefined }), null)
})
