'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

const {
  statusKeyFor,
  isTopLevelSession,
  entryIdOf,
  mergeSession,
  buildTray,
  buildAllActive,
  shouldAutoOpen,
  pickTop,
} = require('../src/multi-session.js')

test('statusKeyFor 按最终状态与 pendingKind 生成气泡键', () => {
  assert.deepEqual(statusKeyFor('waiting', null, null, 'approval'), { bubbleKey: 'waitingApproval', bubbleParams: null })
  assert.deepEqual(statusKeyFor('waiting', null, null, 'question'), { bubbleKey: 'waitingAnswer', bubbleParams: null })
  assert.deepEqual(statusKeyFor('waiting', null, null, 'plan-review'), { bubbleKey: 'planReview', bubbleParams: null })
  assert.deepEqual(statusKeyFor('waiting', 'waitingInput', null, null), { bubbleKey: 'waitingInput', bubbleParams: null })
  assert.deepEqual(statusKeyFor('failed', null, null, null), { bubbleKey: 'failed', bubbleParams: null })
  assert.deepEqual(statusKeyFor('ready', null, null, null), { bubbleKey: 'ready', bubbleParams: null })
  assert.deepEqual(statusKeyFor('working', 'executingTool', { name: 'read' }, null), { bubbleKey: 'executingTool', bubbleParams: { name: 'read' } })
  assert.deepEqual(statusKeyFor('working', null, null, null), { bubbleKey: 'thinking', bubbleParams: null })
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
    hostActivity: { state: 'working', bubbleKey: 'thinking', bubbleParams: null, lastEventAt: 10, pendingKind: null, acknowledged: false },
    summary: { pendingInteraction: 'plan-review', updatedAt: 20 },
    currentSession: 'current',
  })
  assert.equal(merged.state, 'waiting')
  assert.equal(merged.pendingKind, 'plan-review')
  assert.equal(merged.bubbleKey, 'planReview')
  assert.equal(merged.lastEventAt, 20)
  assert.equal(merged.active, true)
})

test('mergeSession：客户端 running 在没有宿主活动时也生成为运行中', () => {
  const merged = mergeSession({
    sessionId: 's1',
    hostActivity: null,
    summary: { running: true, updatedAt: 15 },
    currentSession: 'other',
  })
  assert.equal(merged.state, 'working')
  assert.equal(merged.bubbleKey, 'thinking')
  assert.equal(merged.active, true)
  assert.equal(merged.lastEventAt, 15)
})

test('mergeSession：客户端 completed 生成为就绪', () => {
  const merged = mergeSession({
    sessionId: 's1',
    hostActivity: null,
    summary: { completed: true, updatedAt: 30 },
    currentSession: 'current',
  })
  assert.equal(merged.state, 'ready')
  assert.equal(merged.bubbleKey, 'ready')
  assert.equal(merged.active, true)
})

test('mergeSession：已确认的非当前 Blocked 不提醒，当前 Blocked 仍提醒', () => {
  const base = { sessionId: 's1', hostActivity: { state: 'failed', bubbleKey: 'failed', bubbleParams: null, lastEventAt: 1, pendingKind: null, acknowledged: true }, summary: null }
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
    { sessionId: 's1', state: 'working', bubbleKey: 'thinking', bubbleParams: null, lastEventAt: 10, pendingKind: null, acknowledged: false },
    { sessionId: 's2', state: 'waiting', bubbleKey: 'waitingApproval', bubbleParams: null, lastEventAt: 5, pendingKind: 'approval', acknowledged: false },
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
    { sessionId: 's1', state: 'failed', bubbleKey: 'failed', bubbleParams: null, lastEventAt: 1, pendingKind: null, acknowledged: true },
    { sessionId: 's2', state: 'failed', bubbleKey: 'failed', bubbleParams: null, lastEventAt: 2, pendingKind: null, acknowledged: true },
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
    { sessionId: 's1', state: 'failed', bubbleKey: 'failed', bubbleParams: null, lastEventAt: 1, pendingKind: null, acknowledged: true },
    { sessionId: 's2', state: 'failed', bubbleKey: 'failed', bubbleParams: null, lastEventAt: 2, pendingKind: null, acknowledged: true },
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
