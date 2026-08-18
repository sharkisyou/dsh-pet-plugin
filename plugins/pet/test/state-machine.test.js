'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

const { createPetStateMachine } = require('../src/state-machine.js')

function make() {
  return createPetStateMachine()
}

test('初始状态为空闲，气泡键 idle', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 0 }), { state: 'idle', bubbleKey: 'idle', bubbleParams: null })
})

test('agent 运行 → 工作 thinking；工具执行 → executingTool', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'agent-status', status: 'running', ts: 100 }), {
    state: 'working', bubbleKey: 'thinking', bubbleParams: null,
  })
  assert.deepEqual(sm.apply({ kind: 'tool-start', name: 'read', isQuestion: false, ts: 200 }), {
    state: 'working', bubbleKey: 'executingTool', bubbleParams: { name: 'read' },
  })
  assert.deepEqual(sm.apply({ kind: 'tool-end', ts: 300 }), {
    state: 'working', bubbleKey: 'thinking', bubbleParams: null,
  })
})

test('回合结束进入空闲：前 5 秒 awaitingReply，之后 idle', () => {
  const sm = make()
  sm.apply({ kind: 'agent-status', status: 'running', ts: 100 })
  assert.deepEqual(sm.apply({ kind: 'agent-status', status: 'idle', ts: 1000 }), {
    state: 'idle', bubbleKey: 'awaitingReply', bubbleParams: null,
  })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 4000 }), { state: 'idle', bubbleKey: 'awaitingReply', bubbleParams: null })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 6001 }), { state: 'idle', bubbleKey: 'idle', bubbleParams: null })
})

test('审批挂起 → waitingApproval，结束后回到之前的状态', () => {
  const sm = make()
  sm.apply({ kind: 'agent-status', status: 'running', ts: 100 })
  assert.deepEqual(sm.apply({ kind: 'approval-start', ts: 200 }), {
    state: 'waiting', bubbleKey: 'waitingApproval', bubbleParams: null,
  })
  assert.deepEqual(sm.apply({ kind: 'approval-end', ts: 300 }), {
    state: 'working', bubbleKey: 'thinking', bubbleParams: null,
  })
})

test('用户提问挂起 → waitingAnswer', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'tool-start', name: 'ask_user_question', isQuestion: true, ts: 100 }), {
    state: 'waiting', bubbleKey: 'waitingAnswer', bubbleParams: null,
  })
  assert.deepEqual(sm.apply({ kind: 'tool-end', ts: 200 }), { state: 'idle', bubbleKey: 'awaitingReply', bubbleParams: null })
})

test('出错 → failed；下一次活动清除失败', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'error', ts: 100 }), { state: 'failed', bubbleKey: 'failed', bubbleParams: null })
  assert.deepEqual(sm.apply({ kind: 'agent-status', status: 'running', ts: 200 }), {
    state: 'working', bubbleKey: 'thinking', bubbleParams: null,
  })
})

test('失败不会因时间流逝自动清除，只有下一次真实活动才清除', () => {
  const sm = make()
  sm.apply({ kind: 'error', ts: 100 })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 9100 }), { state: 'failed', bubbleKey: 'failed', bubbleParams: null })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 10101 }), { state: 'failed', bubbleKey: 'failed', bubbleParams: null })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 999999 }), { state: 'failed', bubbleKey: 'failed', bubbleParams: null })
  assert.deepEqual(sm.apply({ kind: 'agent-status', status: 'running', ts: 1000000 }), {
    state: 'working', bubbleKey: 'thinking', bubbleParams: null,
  })
})

test('优先级：失败 > 等待 > 工作 > 空闲', () => {
  const sm = make()
  sm.apply({ kind: 'agent-status', status: 'running', ts: 100 })
  sm.apply({ kind: 'approval-start', ts: 200 })
  assert.deepEqual(sm.apply({ kind: 'error', ts: 300 }), { state: 'failed', bubbleKey: 'failed', bubbleParams: null })
  sm.apply({ kind: 'agent-status', status: 'running', ts: 400 })
  assert.deepEqual(sm.apply({ kind: 'approval-start', ts: 500 }), { state: 'waiting', bubbleKey: 'waitingApproval', bubbleParams: null })
})

test('子代理工作算"工作"，气泡键 subagentWorking', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'subagent-start', ts: 100 }), {
    state: 'working', bubbleKey: 'subagentWorking', bubbleParams: null,
  })
  assert.deepEqual(sm.apply({ kind: 'subagent-end', ts: 200 }), {
    state: 'idle', bubbleKey: 'awaitingReply', bubbleParams: null,
  })
})

test('子代理进行中优先于父会话工具执行（前台子代理场景）', () => {
  const sm = make()
  sm.apply({ kind: 'agent-status', status: 'running', ts: 100 })
  // 前台子代理期间，父会话自身正在执行 subagent 工具。
  sm.apply({ kind: 'tool-start', name: 'subagent', isQuestion: false, ts: 200 })
  assert.deepEqual(sm.apply({ kind: 'subagent-start', ts: 300 }), {
    state: 'working', bubbleKey: 'subagentWorking', bubbleParams: null,
  })
  // 子代理结束后回到父会话工具气泡，工具结束后回到 thinking。
  assert.deepEqual(sm.apply({ kind: 'subagent-end', ts: 400 }), {
    state: 'working', bubbleKey: 'executingTool', bubbleParams: { name: 'subagent' },
  })
  assert.deepEqual(sm.apply({ kind: 'tool-end', ts: 500 }), {
    state: 'working', bubbleKey: 'thinking', bubbleParams: null,
  })
})
