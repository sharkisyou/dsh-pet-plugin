import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// 把 src/client-ui.js + src/animation.js + src/multi-session.js 组装成 dsh.client 要求的经典脚本：
//   window.__ModuleLoader__.load({ id, factory: (require) => { ... } })
// 浏览器工厂内的 require 由 dsh-client-modules 注入；React 来自平台种子模块。

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const OUT = join(ROOT, 'lib', 'client.js')

export function sourceBody(file) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/).filter((line) => !/^\s*'use strict'\s*$/.test(line))
  const cut = lines.findIndex((line) => /^module\.exports\s*=/.test(line))
  if (cut < 0) throw new Error(`${file} 缺少 module.exports`)
  const after = lines.slice(cut + 1).filter((line) => line.trim() !== '')
  if (after.length > 0) {
    throw new Error(`${file} 的 module.exports 必须是文件最后一个非空行`)
  }
  new Function(lines[cut])
  return lines.slice(0, cut).join('\n').replace(/\n+$/, '')
}

export function renderClientBundle(packageName, clientBody, animationBody, multiSessionBody) {
  const factory = [
    '\t\tvar module = { exports: {} };',
    '\t\tvar exports = module.exports;',
    "\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });",
    animationBody,
    multiSessionBody,
    clientBody,
    '\t\texports.apply = apply;',
    '\t\texports.inject = inject;',
    '\t\texports.extractCurrentSessionId = extractCurrentSessionId;',
    '\t\treturn module.exports;',
  ].join('\n')
  return `window.__ModuleLoader__.load({\n\tid: ${JSON.stringify(packageName)},\n\tfactory: (require) => {\n${factory}\n\t},\n});\n`
}

export function buildClientBundle() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const clientBody = sourceBody(join(SRC, 'client-ui.js'))
  const animationBody = sourceBody(join(SRC, 'animation.js'))
  const multiSessionBody = sourceBody(join(SRC, 'multi-session.js'))
  const bundle = renderClientBundle(pkg.name, clientBody, animationBody, multiSessionBody)
  writeFileSync(OUT, bundle)
  return OUT
}

if (process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = buildClientBundle()
  console.log(`built: ${out}`)
}
