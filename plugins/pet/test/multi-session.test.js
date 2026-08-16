'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

const {
  statusTextFor,
  isTopLevelSession,
  entryIdOf,
  mergeSession,
  buildTray,
  buildAllActive,
  shouldAutoOpen,
  pickTop,
} = require('../src/multi-session.js')

test('statusTextFor 按最终状态与 pendingKind 生成固定文案', () => {
  assert.equal(statusTextFor('waiting', null, 'approval'), '等待审批')
  assert.equal(statusTextFor('waiting', null, 'question'), '等待回答')
  assert.equal(statusTextFor('waiting', null, 'plan-review'), '计划审查')
  assert.equal(statusTextFor('waiting', '等待输入', null), '等待输入')
  assert.equal(statusTextFor('failed'), '出错')
  assert.equal(statusTextFor('ready'), '待查看')
  assert.equal(statusTextFor('working', '执行工具 read'), '执行工具 read')
  assert.equal(statusTextFor('working', null), '思考中')
})

test('isTopLevelSession 排除子代理与带 parentId 的会话', () => {
  assert.equal(isTopLevelSession({ id: 'a' }), true)
  assert.equal(isTopLevelSession({ id: 'a', parentId: 'p' }), false)
  assert.equal(isTopLevelSession({ id: 'a', origin: 'subagent' }), false)
  assert.equal(isTopLevelSession(null), false)
})

test('mergeSession：客户端 pendingInteraction 覆盖为等待输入', () => {
  const merged = mergeSession({
    sessionId: 's1',
    hostActivity: { state: 'working', bubble: '思考中', lastEventAt: 10, pendingKind: null, acknowledged: false },
    summary: { pendingInteraction: 'plan-review', updatedAt: 20 },
    currentSession: 'current',
  })
  assert.equal(merged.state, 'waiting')
  assert.equal(merged.pendingKind, 'plan-review')
  assert.equal(merged.bubble, '计划审查')
  assert.equal(merged.lastEventAt, 20)
  assert.equal(merged.active, true)
})

test('mergeSession：客户端 completed 生成为就绪', () => {
  const merged = mergeSession({
    sessionId: 's1',
    hostActivity: null,
    summary: { completed: true, updatedAt: 30 },
    currentSession: 'current',
  })
  assert.equal(merged.state, 'ready')
  assert.equal(merged.bubble, '待查看')
  assert.equal(merged.active, true)
})

test('mergeSession：已确认的非当前 Blocked 不提醒，当前 Blocked 仍提醒', () => {
  const base = { sessionId: 's1', hostActivity: { state: 'failed', bubble: '出错', lastEventAt: 1, pendingKind: null, acknowledged: true }, summary: null }
  const nonCurrent = mergeSession({ ...base, currentSession: 'other' })
  assert.equal(nonCurrent.active, true)
  assert.equal(nonCurrent.reminder, false)

  const current = mergeSession({ ...base, currentSession: 's1' })
  assert.equal(current.active, true)
  assert.equal(current.reminder, true)
})

test('buildTray：只保留顶层活动项，按优先级分组、组内按最后活动时间倒序', () => {
  const sessions = [
    { id: 's1', displayTitle: '当前运行', running: true, updatedAt: 10 },
    { id: 's2', displayTitle: '等待审批', pendingInteraction: 'approval', updatedAt: 5 },
    { id: 's3', displayTitle: '子代理', parentId: 's1', updatedAt: 1 },
    { id: 's4', displayTitle: '已完成', completed: true, updatedAt: 100 },
  ]
  const activities = [
    { sessionId: 's1', state: 'working', bubble: '思考中', lastEventAt: 10, pendingKind: null, acknowledged: false },
    { sessionId: 's2', state: 'waiting', bubble: '等待审批', lastEventAt: 5, pendingKind: 'approval', acknowledged: false },
  ]
  const items = buildTray({ sessions, activities, currentSession: 's1' })
  assert.deepEqual(items.map((x) => x.sessionId), ['s2', 's4', 's1'])
  assert.equal(items[0].title, '等待审批')
  assert.equal(items[0].current, false)
  assert.equal(items[2].title, '当前运行')
  assert.equal(items[2].current, true)
})

test('buildTray：已确认的非当前 Blocked 被过滤，当前 Blocked 保留', () => {
  const sessions = [
    { id: 's1', displayTitle: '当前错误', updatedAt: 1 },
    { id: 's2', displayTitle: '其他错误', updatedAt: 2 },
  ]
  const activities = [
    { sessionId: 's1', state: 'failed', bubble: '出错', lastEventAt: 1, pendingKind: null, acknowledged: true },
    { sessionId: 's2', state: 'failed', bubble: '出错', lastEventAt: 2, pendingKind: null, acknowledged: true },
  ]
  const items = buildTray({ sessions, activities, currentSession: 's1' })
  assert.deepEqual(items.map((x) => x.sessionId), ['s1'])
})

test('buildAllActive：包含已确认的非当前 Blocked，按完整活动集合排序', () => {
  const sessions = [
    { id: 's1', displayTitle: '当前错误', updatedAt: 1 },
    { id: 's2', displayTitle: '其他错误', updatedAt: 2 },
  ]
  const activities = [
    { sessionId: 's1', state: 'failed', bubble: '出错', lastEventAt: 1, pendingKind: null, acknowledged: true },
    { sessionId: 's2', state: 'failed', bubble: '出错', lastEventAt: 2, pendingKind: null, acknowledged: true },
  ]
  const items = buildAllActive({ sessions, activities })
  assert.deepEqual(items.map((x) => x.sessionId), ['s2', 's1'])
})

test('entryIdOf 兼容 id 与 sessionId', () => {
  assert.equal(entryIdOf({ id: 'a' }), 'a')
  assert.equal(entryIdOf({ sessionId: 'b' }), 'b')
  assert.equal(entryIdOf({}), null)
  assert.equal(entryIdOf(null), null)
})

test('shouldAutoOpen：无活动/仅当前活动不自动开，有非当前活动或≥2个活动自动开', () => {
  assert.equal(shouldAutoOpen([], 's1'), false)
  assert.equal(shouldAutoOpen([{ sessionId: 's1' }], 's1'), false)
  assert.equal(shouldAutoOpen([{ sessionId: 's2' }], 's1'), true)
  assert.equal(shouldAutoOpen([{ sessionId: 's1' }, { sessionId: 's2' }], 's1'), true)
})

test('pickTop 返回排序后的第一项', () => {
  assert.equal(pickTop([]), null)
  const top = pickTop([{ sessionId: 'a' }])
  assert.equal(top.sessionId, 'a')
})
