'use strict'
// 多会话聚合纯逻辑：宿主 activities 与客户端 useSessions 合并成宠物展示/活动托盘。
// 该文件同时作为客户端 bundle 的内嵌副本来源，不要引入 require/import。

const STATE_PRIORITY = { waiting: 0, failed: 1, ready: 2, working: 3, idle: 4 }

function statusTextFor(state, hostBubble, pendingKind) {
  switch (state) {
    case 'waiting':
      if (pendingKind === 'approval') return '等待审批'
      if (pendingKind === 'question') return '等待回答'
      if (pendingKind === 'plan-review') return '计划审查'
      return hostBubble || '等待输入'
    case 'failed':
      return '出错'
    case 'ready':
      return '待查看'
    case 'working':
      return hostBubble || '思考中'
    case 'idle':
    default:
      return hostBubble || '空闲'
  }
}

function entryIdOf(entry) {
  if (entry === null || typeof entry !== 'object') return null
  if (typeof entry.id === 'string' && entry.id !== '') return entry.id
  if (typeof entry.sessionId === 'string' && entry.sessionId !== '') return entry.sessionId
  return null
}

function isTopLevelSession(entry) {
  return entry !== null && typeof entry === 'object' &&
    !entry.parentId && entry.origin !== 'subagent'
}

function mergeSession({ sessionId, hostActivity, summary, currentSession }) {
  const host = hostActivity !== null && typeof hostActivity === 'object' ? hostActivity : null
  let state = host ? host.state : 'idle'
  let bubble = host ? host.bubble : null
  let pendingKind = host && host.pendingKind ? host.pendingKind : null
  let lastEventAt = host && typeof host.lastEventAt === 'number' ? host.lastEventAt : 0
  let acknowledged = host ? host.acknowledged === true : false

  if (summary !== null && typeof summary === 'object') {
    if (summary.pendingInteraction) {
      state = 'waiting'
      pendingKind = summary.pendingInteraction
      bubble = statusTextFor('waiting', null, pendingKind)
    }
    if (summary.completed === true && state !== 'waiting' && state !== 'failed') {
      state = 'ready'
      bubble = '待查看'
    }
    if (summary.running === true && state !== 'waiting' && state !== 'failed') {
      state = 'working'
      bubble = host && host.bubble ? host.bubble : '思考中'
    }
    if (typeof summary.updatedAt === 'number') {
      lastEventAt = Math.max(lastEventAt, summary.updatedAt)
    }
  }

  const active = state !== 'idle'
  const reminder = !(state === 'failed' && acknowledged && sessionId !== currentSession)
  return { sessionId, state, bubble, pendingKind, lastEventAt, acknowledged, active, reminder }
}

function buildTray({ sessions, activities, currentSession }) {
  const byId = new Map()
  if (Array.isArray(activities)) {
    for (const activity of activities) {
      if (activity !== null && typeof activity === 'object' && typeof activity.sessionId === 'string') {
        byId.set(activity.sessionId, activity)
      }
    }
  }

  const items = []
  if (Array.isArray(sessions)) {
    for (const entry of sessions) {
      if (!isTopLevelSession(entry)) continue
      const id = entryIdOf(entry)
      if (id === null) continue
      const merged = mergeSession({
        sessionId: id,
        hostActivity: byId.get(id) || null,
        summary: entry,
        currentSession,
      })
      if (!merged.active || !merged.reminder) continue
      const title = typeof entry.displayTitle === 'string' && entry.displayTitle !== ''
        ? entry.displayTitle
        : typeof entry.title === 'string' && entry.title !== ''
          ? entry.title
          : id
      items.push({ ...merged, title, current: id === currentSession })
    }
  }

  items.sort((a, b) => {
    const pa = STATE_PRIORITY[a.state] !== undefined ? STATE_PRIORITY[a.state] : STATE_PRIORITY.idle
    const pb = STATE_PRIORITY[b.state] !== undefined ? STATE_PRIORITY[b.state] : STATE_PRIORITY.idle
    if (pa !== pb) return pa - pb
    return (b.lastEventAt || 0) - (a.lastEventAt || 0)
  })
  return items
}

function buildAllActive({ sessions, activities }) {
  const byId = new Map()
  if (Array.isArray(activities)) {
    for (const activity of activities) {
      if (activity !== null && typeof activity === 'object' && typeof activity.sessionId === 'string') {
        byId.set(activity.sessionId, activity)
      }
    }
  }

  const items = []
  if (Array.isArray(sessions)) {
    for (const entry of sessions) {
      if (!isTopLevelSession(entry)) continue
      const id = entryIdOf(entry)
      if (id === null) continue
      const merged = mergeSession({
        sessionId: id,
        hostActivity: byId.get(id) || null,
        summary: entry,
        currentSession: null,
      })
      if (!merged.active) continue
      const title = typeof entry.displayTitle === 'string' && entry.displayTitle !== ''
        ? entry.displayTitle
        : typeof entry.title === 'string' && entry.title !== ''
          ? entry.title
          : id
      items.push({ ...merged, title, current: false })
    }
  }

  items.sort((a, b) => {
    const pa = STATE_PRIORITY[a.state] !== undefined ? STATE_PRIORITY[a.state] : STATE_PRIORITY.idle
    const pb = STATE_PRIORITY[b.state] !== undefined ? STATE_PRIORITY[b.state] : STATE_PRIORITY.idle
    if (pa !== pb) return pa - pb
    return (b.lastEventAt || 0) - (a.lastEventAt || 0)
  })
  return items
}

function shouldAutoOpen(activeItems, currentSession) {
  if (!Array.isArray(activeItems) || activeItems.length === 0) return false
  if (activeItems.length >= 2) return true
  return activeItems[0].sessionId !== currentSession
}

function pickTop(activeItems) {
  return Array.isArray(activeItems) && activeItems.length > 0 ? activeItems[0] : null
}

module.exports = { STATE_PRIORITY, statusTextFor, entryIdOf, isTopLevelSession, mergeSession, buildTray, buildAllActive, shouldAutoOpen, pickTop }
