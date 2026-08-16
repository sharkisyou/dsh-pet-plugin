// VSCode/Node 调试入口：加载真实插件宿主半 lib/index.mjs，
// 用最小 mock ctx 运行，方便在 lib/index.mjs 里打断点。
//
// 用法：
//   node --inspect-brk=9229 plugins/pet/scripts/debug-host.mjs
// 或在 VSCode 中选择 “Debug Pet Plugin (mock host)” 配置。

import { mkdtemp, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const pluginUrl = pathToFileURL(join(repoRoot, 'plugins/pet/lib/index.mjs')).href

// 使用临时 DSH_HOME，避免调试时读写真实 ~/.dsh。
if (!process.env.DSH_HOME) {
  process.env.DSH_HOME = await mkdtemp(join(tmpdir(), 'dsh-pet-debug-'))
}
await mkdir(join(process.env.DSH_HOME, 'pets'), { recursive: true })

const plugin = await import(pluginUrl)

// ---- 最小 Cordis mock ----
const handlers = new Map()
const routes = []
const sessions = new Map()
const agents = new Map()

const ctx = {
  get(key) {
    if (key === 'sessions') return { get: (id) => sessions.get(id) ?? null }
    if (key === 'agents') return { get: (id) => agents.get(id) ?? null }
    return undefined
  },
  on(event, handler) {
    if (!handlers.has(event)) handlers.set(event, [])
    handlers.get(event).push(handler)
  },
  effect(fn) {
    return fn()
  },
  logger: console,
  webServer: {
    register(route) {
      routes.push(route)
      return () => {}
    },
  },
}

plugin.apply(ctx)

// ---- 简易事件发射 ----
async function emit(event, ...args) {
  for (const handler of handlers.get(event) ?? []) {
    await handler(...args)
  }
}

// ---- 简易 RPC 调用 ----
async function rpc(method, args = {}) {
  const route = routes[0]
  if (!route) throw new Error('webServer route 未注册')
  const payload = Buffer.from(JSON.stringify(args))
  const req = {
    url: `/pet/rpc/${method}`,
    method: 'POST',
    headers: { 'content-length': String(payload.length) },
    [Symbol.asyncIterator]() {
      let done = false
      return {
        next: async () => {
          if (done) return { done: true }
          done = true
          return { done: false, value: payload }
        },
      }
    },
  }
  let status = 0
  let headers = null
  let body = ''
  const res = {
    writeHead(code, head) {
      status = code
      headers = head
    },
    end(text) {
      body = text
    },
  }
  await route.handler(req, res)
  return { status, headers, body: body ? JSON.parse(body) : null }
}

// ---- 演示：跑一条会命中 lib/index.mjs 的路径 ----
await rpc('setCurrentSession', { sessionId: 's1' })
console.log('initial:', await rpc('getStatus'))

await emit('agent/status', { agent: { id: 's1' }, status: 'running' })
console.log('after running:', await rpc('getStatus'))

await emit(
  'tools/execute',
  { agent: { id: 's1' }, name: 'bash' },
  async () => 'done',
)
console.log('after bash:', await rpc('getStatus'))

await emit('agent/status', { agent: { id: 's1' }, status: 'idle' })
console.log('after idle:', await rpc('getStatus'))

console.log('Debug harness is running. Set breakpoints in plugins/pet/lib/index.mjs and continue.')
setInterval(() => {}, 1000)
