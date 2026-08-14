'use strict'
// 内嵌副本同步生成器。用法（仓库根目录）：
//   node .scratch/pet/prototype/sync-inline.js
// 把 plugins/pet/src/*.js 的内容（去掉 'use strict' 与 module.exports 行）
// 写入 prototype/{host,client}.js 的 ==== inline-src: NAME ==== 标记区域内。
// 之后运行 plugins/pet 的测试：sync.test.js 会校验区域内容与 src 一致，漂移即红。
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..', '..', '..')
const SRC = path.join(ROOT, 'plugins', 'pet', 'src')
const PROTO = __dirname

const MAP = {
  'host.js': ['pet-format', 'state-machine', 'base64', 'image-dims'],
  'client.js': ['animation'],
}

function srcBody(name) {
  const text = fs.readFileSync(path.join(SRC, name + '.js'), 'utf8')
  const lines = text.split(/\r?\n/).filter((line) => !/^\s*'use strict'\s*$/.test(line))
  const cut = lines.findIndex((line) => /^module\.exports\s*=/.test(line))
  if (cut < 0) throw new Error(`${name}.js 缺少 module.exports`)
  const after = lines.slice(cut + 1).filter((line) => line.trim() !== '')
  if (after.length > 0) {
    throw new Error(`${name}.js 的 module.exports 必须是文件最后一个非空行（截断语义）`)
  }
  try {
    new Function(lines[cut])
  } catch (err) {
    throw new Error(`${name}.js 的 module.exports 必须是单行`)
  }
  return lines.slice(0, cut).join('\n').replace(/\n+$/, '')
}

for (const [file, modules] of Object.entries(MAP)) {
  const target = path.join(PROTO, file)
  let text = fs.readFileSync(target, 'utf8')
  for (const name of modules) {
    const start = `// ==== inline-src: ${name} ====`
    const end = `// ==== inline-src-end: ${name} ====`
    const i = text.indexOf(start)
    const j = text.indexOf(end)
    if (i < 0 || j <= i) throw new Error(`${file} 缺少 ${name} 标记对`)
    text = text.slice(0, i + start.length + 1) + srcBody(name) + '\n' + text.slice(j)
  }
  fs.writeFileSync(target, text)
  console.log('synced:', file)
}
