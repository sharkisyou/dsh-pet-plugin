'use strict'
// 宿主半多会话集成测试：用最小 mock ctx 加载真实 lib/index.mjs，
// 模拟多会话事件流，断言 getStatus().activities 的聚合结果。
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const fsp = require('node:fs/promises')

const ROOT = path.resolve(__dirname, '..')
const PLUGIN_URL = pathToFileURL(path.join(ROOT, 'lib', 'index.mjs')).href

async function createHarness() {
  const plugin = await import(PLUGIN_URL)
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

  // 使用临时 DSH_HOME，避免污染真实 ~/.dsh
  const dshHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'dsh-pet-test-'))
  process.env.DSH_HOME = dshHome
  await fsp.mkdir(path.join(dshHome, 'pets'), { recursive: true })

  plugin.apply(ctx)

  async function emit(event, ...args) {
    for (const handler of handlers.get(event) ?? []) {
      await handler(...args)
    }
  }

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
    let body = ''
    const res = {
      writeHead(code) {
        status = code
      },
      end(text) {
        body = text
      },
    }
    await route.handler(req, res)
    return { status, body: body ? JSON.parse(body) : null }
  }

  return { ctx, sessions, agents, emit, rpc, cleanup: () => fsp.rm(dshHome, { recursive: true, force: true }) }
}

test('getStatus.activities 汇总多个顶层会话状态，并按等待/失败/工作聚合', async () => {
  const h = await createHarness()
  try {
    await h.rpc('syncSessions', { ids: ['s1', 's2'] })
    await h.rpc('setCurrentSession', { sessionId: 's1' })

    await h.emit('agent/status', { agent: { id: 's1' }, status: 'running' })
    await h.emit('agent/status', { agent: { id: 's2' }, status: 'running' })

    let res = await h.rpc('getStatus')
    assert.equal(res.body.ok, true)
    assert.deepEqual(
      res.body.activities.map((a) => [a.sessionId, a.state]).sort(),
      [['s1', 'working'], ['s2', 'working']].sort(),
    )

    // s2 进入等待审批：让 next() 挂起，模拟审批尚未被处理
    let resolveApproval
    const approvalDone = new Promise((resolve) => { resolveApproval = resolve })
    const approvalEmit = h.emit(
      'approval/request',
      { agent: { id: 's2' } },
      () => approvalDone,
    )
    res = await h.rpc('getStatus')
    const s2 = res.body.activities.find((a) => a.sessionId === 's2')
    assert.equal(s2.state, 'waiting')
    assert.equal(s2.pendingKind, 'approval')
    resolveApproval('ok')
    await approvalEmit

    // s1 出错
    await h.emit('agent/error', { agent: { id: 's1' } })
    res = await h.rpc('getStatus')
    const s1 = res.body.activities.find((a) => a.sessionId === 's1')
    assert.equal(s1.state, 'failed')
    assert.equal(s1.bubbleKey, 'failed')
  } finally {
    await h.cleanup()
  }
})

test('Blocked 打开后标记 acknowledged，新活动清除 acknowledged', async () => {
  const h = await createHarness()
  try {
    await h.rpc('syncSessions', { ids: ['s1', 's2'] })
    await h.rpc('setCurrentSession', { sessionId: 's1' })

    await h.emit('agent/error', { agent: { id: 's2' } })
    let res = await h.rpc('getStatus')
    let s2 = res.body.activities.find((a) => a.sessionId === 's2')
    assert.equal(s2.state, 'failed')
    assert.equal(s2.acknowledged, false)

    // 打开 s2 后标记已确认
    await h.rpc('setCurrentSession', { sessionId: 's2' })
    res = await h.rpc('getStatus')
    s2 = res.body.activities.find((a) => a.sessionId === 's2')
    assert.equal(s2.acknowledged, true)

    // 新活动清除已确认
    await h.emit('agent/status', { agent: { id: 's2' }, status: 'running' })
    res = await h.rpc('getStatus')
    s2 = res.body.activities.find((a) => a.sessionId === 's2')
    assert.equal(s2.state, 'working')
    assert.equal(s2.acknowledged, false)
  } finally {
    await h.cleanup()
  }
})

test('未同步会话/未设置当前会话时，带 id 的事件仍被跟踪，避免一直空闲', async () => {
  const h = await createHarness()
  try {
    await h.emit('agent/status', { agent: { id: 's1' }, status: 'running' })
    const res = await h.rpc('getStatus')
    assert.equal(res.body.state, 'working')
    assert.ok(res.body.activities.some((a) => a.sessionId === 's1' && a.state === 'working'))
  } finally {
    await h.cleanup()
  }
})

test('未知会话与缺失 sessionId 的事件被忽略', async () => {
  const h = await createHarness()
  try {
    await h.rpc('syncSessions', { ids: ['s1'] })
    await h.rpc('setCurrentSession', { sessionId: 's1' })

    await h.emit('agent/status', { agent: { id: 's3' }, status: 'running' })
    await h.emit('agent/status', { agent: null, status: 'running' })
    await h.emit('agent/status', { agent: {}, status: 'running' })

    const res = await h.rpc('getStatus')
    assert.deepEqual(res.body.activities, [])
  } finally {
    await h.cleanup()
  }
})

test('子代理 start/end 计入父会话，子代理自身不产生独立活动', async () => {
  const h = await createHarness()
  try {
    await h.rpc('syncSessions', { ids: ['s1'] })
    await h.rpc('setCurrentSession', { sessionId: 's1' })
    h.sessions.set('c1', { header: { parentSession: 's1' } })

    await h.emit('subagent/start', { id: 'c1' })
    let res = await h.rpc('getStatus')
    assert.deepEqual(
      res.body.activities.map((a) => [a.sessionId, a.state, a.bubbleKey]),
      [['s1', 'working', 'subagentWorking']],
    )

    await h.emit('subagent/end', { id: 'c1' })
    res = await h.rpc('getStatus')
    assert.deepEqual(res.body.activities, [])
  } finally {
    await h.cleanup()
  }
})

test('syncSessions 清理已消失会话，resetAcknowledged 清除已确认标记', async () => {
  const h = await createHarness()
  try {
    await h.rpc('syncSessions', { ids: ['s1', 's2'] })
    await h.rpc('setCurrentSession', { sessionId: 's1' })
    await h.emit('agent/status', { agent: { id: 's1' }, status: 'running' })
    await h.emit('agent/status', { agent: { id: 's2' }, status: 'running' })

    let res = await h.rpc('getStatus')
    assert.equal(res.body.activities.length, 2)

    await h.rpc('syncSessions', { ids: ['s1'] })
    res = await h.rpc('getStatus')
    assert.deepEqual(res.body.activities.map((a) => a.sessionId), ['s1'])

    await h.emit('agent/error', { agent: { id: 's1' } })
    await h.rpc('setCurrentSession', { sessionId: 's1' })
    res = await h.rpc('getStatus')
    assert.equal(res.body.activities.find((a) => a.sessionId === 's1').acknowledged, true)

    await h.rpc('resetAcknowledged')
    res = await h.rpc('getStatus')
    assert.equal(res.body.activities.find((a) => a.sessionId === 's1').acknowledged, false)
  } finally {
    await h.cleanup()
  }
})
