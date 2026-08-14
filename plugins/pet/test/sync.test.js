'use strict'
// 副本同步测试：prototype/{host,client}.js 中标记区域内的纯逻辑内嵌副本
// 必须与 plugins/pet/src/ 的当前内容一致（排除 'use strict' 与 module.exports 行）。
// 漂移时本测试失败 —— 运行 `node .scratch/pet/prototype/sync-inline.js` 重新生成副本。
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..', '..', '..')
const SRC = path.join(ROOT, 'plugins', 'pet', 'src')
const PROTO = path.join(ROOT, '.scratch', 'pet', 'prototype')

function srcBody(name) {
  const text = fs.readFileSync(path.join(SRC, name), 'utf8')
  const lines = text.split(/\r?\n/).filter((line) => !/^\s*'use strict'\s*$/.test(line))
  const cut = lines.findIndex((line) => /^module\.exports\s*=/.test(line))
  assert.ok(cut >= 0, `${name} 缺少 module.exports`)
  // 不变量：出口必须是单行且是文件最后一个非空行，截断语义才安全
  const after = lines.slice(cut + 1).filter((line) => line.trim() !== '')
  assert.deepEqual(after, [], `${name} 的 module.exports 必须是文件最后一个非空行`)
  assert.doesNotThrow(() => new Function(lines[cut]), `${name} 的 module.exports 必须是单行`)
  return lines.slice(0, cut).join('\n').replace(/\n+$/, '')
}

function inlineRegion(file, module) {
  const text = fs.readFileSync(path.join(PROTO, file), 'utf8')
  const start = `// ==== inline-src: ${module} ====`
  const end = `// ==== inline-src-end: ${module} ====`
  const i = text.indexOf(start)
  const j = text.indexOf(end)
  assert.ok(i >= 0, `${file} 缺少 ${module} 起始标记`)
  assert.ok(j > i, `${file} 缺少 ${module} 结束标记`)
  return text.slice(i + start.length + 1, j).replace(/\n+$/, '')
}

const expected = {
  'host.js': ['pet-format', 'state-machine', 'base64', 'image-dims'],
  'client.js': ['animation'],
}

for (const [file, modules] of Object.entries(expected)) {
  for (const module of modules) {
    test(`内嵌副本同步：${file} ← src/${module}.js`, () => {
      assert.equal(inlineRegion(file, module), srcBody(module + '.js'))
    })
  }
}

test('prototype 文件整体可作为函数体解析（生成器不得产出语法错误）', () => {
  for (const file of ['host.js', 'client.js']) {
    const body = fs.readFileSync(path.join(PROTO, file), 'utf8')
    assert.doesNotThrow(() => new Function(body), `${file} 语法错误`)
  }
})
