'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

const { createPetStateMachine } = require('../src/state-machine.js')

function make() {
  return createPetStateMachine()
}

test('初始状态为空闲，浮层显示"空闲"', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 0 }), { state: 'idle', bubble: '空闲' })
})

test('agent 运行 → 工作"思考中"；工具执行 → "执行工具 <name>"', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'agent-status', status: 'running', ts: 100 }), {
    state: 'working', bubble: '思考中',
  })
  assert.deepEqual(sm.apply({ kind: 'tool-start', name: 'read', isQuestion: false, ts: 200 }), {
    state: 'working', bubble: '执行工具 read',
  })
  assert.deepEqual(sm.apply({ kind: 'tool-end', ts: 300 }), {
    state: 'working', bubble: '思考中',
  })
})

test('回合结束进入空闲：前 5 秒浮层显示"等待回复"，之后显示"空闲"', () => {
  const sm = make()
  sm.apply({ kind: 'agent-status', status: 'running', ts: 100 })
  assert.deepEqual(sm.apply({ kind: 'agent-status', status: 'idle', ts: 1000 }), {
    state: 'idle', bubble: '等待回复',
  })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 4000 }), { state: 'idle', bubble: '等待回复' })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 6001 }), { state: 'idle', bubble: '空闲' })
})

test('审批挂起 → 等待"等待审批"，结束后回到之前的状态', () => {
  const sm = make()
  sm.apply({ kind: 'agent-status', status: 'running', ts: 100 })
  assert.deepEqual(sm.apply({ kind: 'approval-start', ts: 200 }), {
    state: 'waiting', bubble: '等待审批',
  })
  assert.deepEqual(sm.apply({ kind: 'approval-end', ts: 300 }), {
    state: 'working', bubble: '思考中',
  })
})

test('用户提问挂起 → 等待"等待回答"', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'tool-start', name: 'ask_user_question', isQuestion: true, ts: 100 }), {
    state: 'waiting', bubble: '等待回答',
  })
  assert.deepEqual(sm.apply({ kind: 'tool-end', ts: 200 }), { state: 'idle', bubble: '等待回复' })
})

test('出错 → 失败"出错"；下一次活动清除失败', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'error', ts: 100 }), { state: 'failed', bubble: '出错' })
  assert.deepEqual(sm.apply({ kind: 'agent-status', status: 'running', ts: 200 }), {
    state: 'working', bubble: '思考中',
  })
})

test('失败若 10 秒无活动自动回空闲', () => {
  const sm = make()
  sm.apply({ kind: 'error', ts: 100 })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 9100 }), { state: 'failed', bubble: '出错' })
  assert.deepEqual(sm.apply({ kind: 'tick', ts: 10101 }), { state: 'idle', bubble: '空闲' })
})

test('优先级：失败 > 等待 > 工作 > 空闲', () => {
  const sm = make()
  sm.apply({ kind: 'agent-status', status: 'running', ts: 100 })
  sm.apply({ kind: 'approval-start', ts: 200 })
  assert.deepEqual(sm.apply({ kind: 'error', ts: 300 }), { state: 'failed', bubble: '出错' })
  sm.apply({ kind: 'agent-status', status: 'running', ts: 400 })
  assert.deepEqual(sm.apply({ kind: 'approval-start', ts: 500 }), { state: 'waiting', bubble: '等待审批' })
})

test('子代理工作算"工作"，浮层显示"子代理工作中"', () => {
  const sm = make()
  assert.deepEqual(sm.apply({ kind: 'subagent-start', ts: 100 }), {
    state: 'working', bubble: '子代理工作中',
  })
  assert.deepEqual(sm.apply({ kind: 'subagent-end', ts: 200 }), {
    state: 'idle', bubble: '等待回复',
  })
})
