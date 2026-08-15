'use strict'
// 宠物状态机：DSH 信号事件流 → 宠物状态与浮层文本（纯逻辑，无副作用）。

const FAILED_TIMEOUT_MS = 10000
const REPLY_BUBBLE_MS = 5000

const STATE = { idle: 'idle', working: 'working', waiting: 'waiting', failed: 'failed' }

function createPetStateMachine() {
  let agentRunning = false
  let tool = null // { name, isQuestion }
  let approvals = 0
  let subagents = 0
  let failedAt = null
  let idleSince = null

  function compute(ts) {
    if (failedAt !== null) {
      return { state: STATE.failed, bubble: '出错' }
    }
    if (approvals > 0) {
      return { state: STATE.waiting, bubble: '等待审批' }
    }
    if (tool !== null && tool.isQuestion) {
      return { state: STATE.waiting, bubble: '等待回答' }
    }
    // 子代理优先于父会话的工具执行：前台子代理期间父会话自身就在
    // 执行 `subagent` 工具，若按工具优先则整个子代理周期都会显示
    // 「执行工具 subagent」而不是「子代理工作中」。
    if (subagents > 0) {
      return { state: STATE.working, bubble: '子代理工作中' }
    }
    if (agentRunning || (tool !== null && !tool.isQuestion)) {
      if (tool !== null && !tool.isQuestion) return { state: STATE.working, bubble: `执行工具 ${tool.name}` }
      return { state: STATE.working, bubble: '思考中' }
    }
    if (idleSince !== null && ts - idleSince < REPLY_BUBBLE_MS) {
      return { state: STATE.idle, bubble: '等待回复' }
    }
    return { state: STATE.idle, bubble: '空闲' }
  }

  function enterIdle(ts) {
    if (idleSince === null) idleSince = ts
  }

  function apply(event) {
    const ts = event.ts

    if (event.kind === 'tick') {
      if (failedAt !== null && ts - failedAt >= FAILED_TIMEOUT_MS) {
        failedAt = null
      }
      return compute(ts)
    }

    // 任何真实活动都会清除失败状态
    if (failedAt !== null && event.kind !== 'error') failedAt = null

    switch (event.kind) {
      case 'agent-status':
        if (event.status === 'running') {
          agentRunning = true
        } else {
          agentRunning = false
          // 回合结束：进入空闲后浮层短暂显示"等待回复"
          idleSince = ts
        }
        break
      case 'tool-start':
        tool = { name: event.name, isQuestion: event.isQuestion === true }
        break
      case 'tool-end':
        tool = null
        break
      case 'approval-start':
        approvals++
        break
      case 'approval-end':
        if (approvals > 0) approvals--
        break
      case 'error':
        failedAt = ts
        break
      case 'subagent-start':
        subagents++
        break
      case 'subagent-end':
        if (subagents > 0) subagents--
        break
      default:
        break
    }

    if (failedAt === null && !agentRunning && tool === null && approvals === 0 && subagents === 0) {
      enterIdle(ts)
    }
    return compute(ts)
  }

  return { apply }
}

module.exports = { createPetStateMachine, FAILED_TIMEOUT_MS, REPLY_BUBBLE_MS }
