import { createRequire } from 'node:module'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const {
  parsePetJson,
  assessPackageDir,
  stripBom,
} = require('../src/pet-format.js')
const { createPetStateMachine } = require('../src/state-machine.js')
const { imageDims, spriteMime } = require('../src/image-dims.js')

// ===== 常量 =====

const CELL_W = 192
const CELL_H = 208
const SPRITE_MAX = 25 * 1024 * 1024
const RPC_BODY_MAX = 2 * 1024 * 1024
const RPC_PREFIX = '/pet/rpc/'

export const name = 'pet'
export const inject = ['webServer']

// ===== 路径 / 输入安全 =====

function normalizePath(value) {
  return String(value).replace(/\\/g, '/').replace(/\/+$/, '')
}

function joinPath(base, ...parts) {
  return [normalizePath(base), ...parts.map((part) => String(part))].join('/')
}

function safeLibraryId(value) {
  if (typeof value !== 'string' || value === '') return null
  if (value === '.' || value === '..') return null
  if (/[/\\]/.test(value)) return null
  return value
}

function safeSpriteName(value) {
  if (typeof value !== 'string' || value === '') return null
  if (value === '.' || value === '..') return null
  if (/[/\\]/.test(value)) return null
  return value
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error)
}

async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function readText(path) {
  return stripBom(await readFile(path, 'utf8'))
}

async function readJson(path) {
  return JSON.parse(await readText(path))
}

async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value), 'utf8')
}

// ===== 事件 → 状态机（当前会话过滤）=====

function agentIdOf(agent) {
  if (agent === null || typeof agent !== 'object') return null
  if (typeof agent.id === 'string') return agent.id
  if (typeof agent.sessionId === 'string') return agent.sessionId
  return null
}

function relevantToCurrent(agent, currentSession) {
  // 无法确定当前会话时跟随一切活动，避免头部入口不可见的页面永远显示空闲。
  if (currentSession === null) return true
  const id = agentIdOf(agent)
  if (id === null) return true
  return id === currentSession
}

function childIdOf(info) {
  if (info === null || typeof info !== 'object') return null
  if (typeof info.id === 'string') return info.id
  if (typeof info.sessionId === 'string') return info.sessionId
  return null
}

function parentIdOfChildSession(ctx, childId) {
  const sessions = ctx.get('sessions')
  if (sessions !== undefined && typeof sessions.get === 'function') {
    const session = sessions.get(childId)
    const parent = session !== null && typeof session === 'object' && session.header !== null &&
      typeof session.header === 'object' ? session.header.parentSession : undefined
    if (typeof parent === 'string') return parent
  }
  const agents = ctx.get('agents')
  if (agents !== undefined && typeof agents.get === 'function') {
    const agent = agents.get(childId)
    const session = agent !== null && typeof agent === 'object' ? agent.session : undefined
    const parent = session !== null && typeof session === 'object' && session.header !== null &&
      typeof session.header === 'object' ? session.header.parentSession : undefined
    if (typeof parent === 'string') return parent
  }
  return null
}

function toolNameOf(exec) {
  if (exec === null || typeof exec !== 'object') return '工具'
  if (typeof exec.name === 'string' && exec.name !== '') return exec.name
  if (exec.tool !== null && typeof exec.tool === 'object' && typeof exec.tool.name === 'string') {
    return exec.tool.name
  }
  return '工具'
}

// ===== 主目录发现 =====

function userHomeFromEnv() {
  for (const key of ['USERPROFILE', 'HOME']) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim() !== '') return normalizePath(value.trim())
  }
  return null
}

function explicitHarnessHome() {
  const value = process.env.DSH_HOME
  if (typeof value !== 'string' || value.trim() === '') return null
  let text = value.trim()
  const userHome = userHomeFromEnv()
  if (text === '~') {
    if (userHome === null) return null
    return userHome
  }
  if (text.startsWith('~/') || text.startsWith('~\\')) {
    if (userHome === null) return null
    return joinPath(userHome, text.slice(2).replace(/\\/g, '/'))
  }
  return normalizePath(text)
}

async function findDefaultHarnessHome(userHome) {
  if (userHome !== null) return { libraryRoot: joinPath(userHome, '.dsh'), codexRoot: joinPath(userHome, '.codex', 'pets') }
  if (process.platform === 'win32') {
    try {
      const entries = await readdir('C:\\Users', { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const candidate = `C:/Users/${entry.name}`
        if (await pathExists(joinPath(candidate, '.dsh'))) {
          return { libraryRoot: joinPath(candidate, '.dsh'), codexRoot: joinPath(candidate, '.codex', 'pets') }
        }
      }
    } catch {
      // Windows 部署若为受限用户，继续走 sessionPersistence 反推。
    }
  }
  return null
}

async function findHomeFromSessionPersistence(ctx) {
  const sp = ctx.get('sessionPersistence')
  if (sp === undefined) return null
  let metas
  try {
    metas = await sp.list()
  } catch {
    return null
  }
  if (!Array.isArray(metas)) return null
  for (const meta of metas) {
    let loc
    try {
      loc = sp.locate(meta)
    } catch {
      continue
    }
    let text = null
    if (typeof loc === 'string') text = loc
    else if (loc !== null && typeof loc === 'object') {
      text = typeof loc.path === 'string' ? loc.path
        : typeof loc.file === 'string' ? loc.file
        : typeof loc.uri === 'string' ? loc.uri
        : null
    }
    if (text === null) continue
    const normalized = normalizePath(text)
    const idx = normalized.indexOf('/.dsh/')
    if (idx >= 0) return normalized.slice(0, idx) + '/.dsh'
    if (normalized.endsWith('/.dsh')) return normalized
  }
  return null
}

async function findHome(ctx) {
  const reasons = []
  const userHome = userHomeFromEnv()
  const explicit = explicitHarnessHome()
  if (explicit !== null) {
    return { libraryRoot: explicit, codexRoot: userHome === null ? null : joinPath(userHome, '.codex', 'pets') }
  }

  const fromDefault = await findDefaultHarnessHome(userHome)
  if (fromDefault !== null) return fromDefault
  reasons.push(`env: 无 USERPROFILE/HOME (${process.platform})`)

  const fromSessions = await findHomeFromSessionPersistence(ctx)
  if (fromSessions !== null) {
    return { libraryRoot: fromSessions, codexRoot: userHome === null ? null : joinPath(userHome, '.codex', 'pets') }
  }
  reasons.push('sessions: 无法从 sessionPersistence 位置反推')

  return { error: reasons.join(' | ') }
}

// ===== RPC HTTP 载体 =====

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(body)
}

async function readJsonBody(req, maxBytes) {
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > maxBytes) {
    const error = new Error('请求体过大')
    error.statusCode = 413
    throw error
  }
  const chunks = []
  let received = 0
  for await (const chunk of req) {
    received += chunk.length
    if (received > maxBytes) {
      const error = new Error('请求体过大')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  if (received === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch (error) {
    const wrapped = new Error('请求体不是合法 JSON')
    wrapped.statusCode = 400
    wrapped.cause = error
    throw wrapped
  }
}

function rpcMethodOf(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith(RPC_PREFIX)) return null
  const raw = pathname.slice(RPC_PREFIX.length)
  if (raw === '' || raw.includes('/')) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

// ===== 插件主体 =====

export function apply(ctx) {
  const spriteCache = new Map()
  const eventCounters = { status: 0, tools: 0, approvals: 0, subagents: 0, subagentEvents: 0, errors: 0, lastSubagent: null }

  let libraryRoot = null
  let libraryDir = null
  let sourceDir = null
  let currentSession = null
  let initPromise = null
  const now = () => Date.now()
  const trace = (msg, data) => {
    const detail = data === undefined ? '' : ' ' + JSON.stringify(data)
    ctx.logger?.info?.(`[pet] ${msg}${detail}`)
  }

  const petDir = (id) => joinPath(libraryDir, id)
  const stateFile = () => joinPath(libraryRoot, 'pet-state.json')

  // 每个顶层会话一个状态机；多会话时按 sessionId 路由，不再只跟随 currentSession。
  const machines = new Map()
  const knownSessions = new Set()
  const trackedSubagents = new Map() // childSessionId -> 父会话 id
  const lastEventAt = new Map() // sessionId -> 最近真实事件时间
  const pendingKinds = new Map() // sessionId -> 'approval' | 'question'
  const approvalCounts = new Map() // sessionId -> 并发审批数
  const acknowledged = new Set() // 已确认的 Blocked 会话

  const machineFor = (sessionKey) => {
    let machine = machines.get(sessionKey)
    if (machine === undefined) {
      machine = createPetStateMachine()
      machines.set(sessionKey, machine)
    }
    return machine
  }
  const isKnownSession = (sid) => sid !== null && typeof sid === 'string' &&
    (knownSessions.has(sid) || sid === currentSession)
  const clearAck = (sid) => { acknowledged.delete(sid) }
  const touch = (sid) => { lastEventAt.set(sid, now()) }
  const knownMachine = (sid) => {
    if (!isKnownSession(sid)) return null
    touch(sid)
    return machineFor(sid)
  }

  ctx.on('agent/status', (payload) => {
    if (payload === null || typeof payload !== 'object') return
    const sid = agentIdOf(payload.agent)
    if (sid === null || !isKnownSession(sid)) return
    const machine = knownMachine(sid)
    if (machine === null) return
    const before = machine.apply({ kind: 'tick', ts: now() })
    eventCounters.status++
    clearAck(sid)
    machine.apply({ kind: 'agent-status', status: payload.status === 'running' ? 'running' : 'idle', ts: now() })
    const after = machine.apply({ kind: 'tick', ts: now() })
    trace('agent/status', { sid, status: payload.status, before, after })
  })

  ctx.on('agent/error', (payload) => {
    if (payload === null || typeof payload !== 'object') return
    const sid = agentIdOf(payload.agent)
    if (sid === null || !isKnownSession(sid)) return
    const machine = knownMachine(sid)
    if (machine === null) return
    const before = machine.apply({ kind: 'tick', ts: now() })
    eventCounters.errors++
    clearAck(sid)
    machine.apply({ kind: 'error', ts: now() })
    if (sid === currentSession) acknowledged.add(sid)
    const after = machine.apply({ kind: 'tick', ts: now() })
    trace('agent/error', { sid, before, after })
  })

  ctx.on('tools/execute', (exec, next) => {
    const agent = exec !== null && typeof exec === 'object' ? exec.agent : undefined
    const sid = agentIdOf(agent)
    if (sid === null || !isKnownSession(sid)) return next()
    const machine = knownMachine(sid)
    if (machine === null) return next()
    eventCounters.tools++
    clearAck(sid)
    const name = toolNameOf(exec)
    const isQuestion = name === 'ask_user_question'
    if (isQuestion) pendingKinds.set(sid, 'question')
    const before = machine.apply({ kind: 'tick', ts: now() })
    machine.apply({ kind: 'tool-start', name, isQuestion, ts: now() })
    trace('tools/execute start', { sid, name, before, after: machine.apply({ kind: 'tick', ts: now() }) })
    return (async () => {
      try {
        return await next()
      } finally {
        if (isQuestion) pendingKinds.delete(sid)
        touch(sid)
        const beforeEnd = machine.apply({ kind: 'tick', ts: now() })
        machine.apply({ kind: 'tool-end', ts: now() })
        trace('tools/execute end', { sid, name, before: beforeEnd, after: machine.apply({ kind: 'tick', ts: now() }) })
      }
    })()
  })

  ctx.on('approval/request', (req, next) => {
    const agent = req !== null && typeof req === 'object' ? req.agent : undefined
    const sid = agentIdOf(agent)
    if (sid === null || !isKnownSession(sid)) return next()
    const machine = knownMachine(sid)
    if (machine === null) return next()
    eventCounters.approvals++
    clearAck(sid)
    pendingKinds.set(sid, 'approval')
    approvalCounts.set(sid, (approvalCounts.get(sid) || 0) + 1)
    const before = machine.apply({ kind: 'tick', ts: now() })
    machine.apply({ kind: 'approval-start', ts: now() })
    trace('approval/request start', { sid, before, after: machine.apply({ kind: 'tick', ts: now() }) })
    return (async () => {
      try {
        return await next()
      } finally {
        const count = (approvalCounts.get(sid) || 1) - 1
        if (count <= 0) {
          approvalCounts.delete(sid)
          if (pendingKinds.get(sid) === 'approval') pendingKinds.delete(sid)
        } else {
          approvalCounts.set(sid, count)
        }
        touch(sid)
        const beforeEnd = machine.apply({ kind: 'tick', ts: now() })
        machine.apply({ kind: 'approval-end', ts: now() })
        trace('approval/request end', { sid, before: beforeEnd, after: machine.apply({ kind: 'tick', ts: now() }) })
      }
    })()
  })

  ctx.on('subagent/start', (info) => {
    const child = childIdOf(info)
    eventCounters.subagentEvents++
    if (child === null) return
    const parentId = parentIdOfChildSession(ctx, child)
    eventCounters.lastSubagent = { child, parentId }
    const countChild = (machineKey) => {
      if (machineKey === null || !isKnownSession(machineKey)) return
      if (trackedSubagents.has(child)) return
      trackedSubagents.set(child, machineKey)
      eventCounters.subagents++
      clearAck(machineKey)
      const before = knownMachine(machineKey).apply({ kind: 'tick', ts: now() })
      knownMachine(machineKey).apply({ kind: 'subagent-start', ts: now() })
      trace('subagent/start', { child, parent: machineKey, before, after: knownMachine(machineKey).apply({ kind: 'tick', ts: now() }) })
    }
    if (parentId !== null && isKnownSession(parentId)) {
      countChild(parentId)
      return
    }
    // 子会话可能晚一拍才可见：做几次短延迟重试，仍不可识别则跳过。
    for (const delay of [0, 10, 50, 200]) {
      setTimeout(() => {
        if (trackedSubagents.has(child)) return
        const lateParentId = parentIdOfChildSession(ctx, child)
        eventCounters.lastSubagent = { child, parentId: lateParentId, retryDelay: delay }
        if (lateParentId === null || !isKnownSession(lateParentId)) return
        countChild(lateParentId)
      }, delay)
    }
  }, { global: true })

  ctx.on('subagent/end', (info) => {
    const child = childIdOf(info)
    if (child === null || !trackedSubagents.has(child)) return
    const machineKey = trackedSubagents.get(child)
    trackedSubagents.delete(child)
    if (machineKey === null || !isKnownSession(machineKey)) return
    touch(machineKey)
    const before = machineFor(machineKey).apply({ kind: 'tick', ts: now() })
    machineFor(machineKey).apply({ kind: 'subagent-end', ts: now() })
    trace('subagent/end', { child, parent: machineKey, before, after: machineFor(machineKey).apply({ kind: 'tick', ts: now() }) })
  }, { global: true })

  async function ensureInit() {
    if (libraryRoot !== null) return
    if (initPromise === null) {
      initPromise = (async () => {
        const found = await findHome(ctx)
        if (found.error !== undefined) throw new Error(`无法定位用户主目录 [${found.error}]`)
        libraryRoot = found.libraryRoot
        libraryDir = joinPath(libraryRoot, 'pets')
        sourceDir = found.codexRoot
        // 持久插件可以直接建目录：用户要求 Codex 包导入到 dsh/pets 下。
        await mkdir(libraryDir, { recursive: true })
      })().catch((error) => {
        initPromise = null
        throw error
      })
    }
    return initPromise
  }

  // ===== RPC handlers =====

  async function getStatus() {
    const ts = now()
    const activities = []
    for (const [sid, machine] of machines) {
      const result = machine.apply({ kind: 'tick', ts })
      if (result.state === 'idle') continue
      activities.push({
        sessionId: sid,
        state: result.state,
        bubble: result.bubble,
        lastEventAt: lastEventAt.get(sid) || 0,
        pendingKind: result.state === 'waiting' ? (pendingKinds.get(sid) || null) : null,
        acknowledged: acknowledged.has(sid),
      })
    }
    const machine = machines.get(currentSession)
    const current = machine === undefined
      ? { state: 'idle', bubble: '空闲' }
      : machine.apply({ kind: 'tick', ts })
    trace('getStatus', {
      currentSession,
      state: current.state,
      bubble: current.bubble,
      activities: activities.map((a) => ({ sessionId: a.sessionId, state: a.state, bubble: a.bubble, lastEventAt: a.lastEventAt, acknowledged: a.acknowledged })),
    })
    return { ok: true, state: current.state, bubble: current.bubble, activities, seen: { ...eventCounters }, currentSession }
  }

  async function setCurrentSession(args) {
    const sid = args !== null && typeof args === 'object' && typeof args.sessionId === 'string'
      ? args.sessionId
      : null
    const prev = currentSession
    currentSession = sid
    if (sid !== null) {
      knownSessions.add(sid)
      const machine = machines.get(sid)
      if (machine !== undefined) {
        const result = machine.apply({ kind: 'tick', ts: now() })
        if (result.state === 'failed') acknowledged.add(sid)
      }
    }
    trace('setCurrentSession', { from: prev, to: sid })
    return { ok: true }
  }

  async function syncSessions(args) {
    const raw = args !== null && typeof args === 'object' && Array.isArray(args.ids) ? args.ids : []
    const next = new Set(raw.filter((id) => typeof id === 'string'))
    if (currentSession !== null) next.add(currentSession)
    for (const key of machines.keys()) {
      if (!next.has(key)) {
        machines.delete(key)
        lastEventAt.delete(key)
        pendingKinds.delete(key)
        approvalCounts.delete(key)
        acknowledged.delete(key)
        for (const [child, parent] of trackedSubagents) {
          if (parent === key) trackedSubagents.delete(child)
        }
      }
    }
    knownSessions.clear()
    for (const id of next) knownSessions.add(id)
    trace('syncSessions', { ids: raw, known: [...knownSessions] })
    return { ok: true }
  }

  async function resetAcknowledged() {
    acknowledged.clear()
    return { ok: true }
  }

  async function loadState() {
    try {
      await ensureInit()
      if (!(await pathExists(stateFile()))) return { ok: true, state: null }
      return { ok: true, state: await readJson(stateFile()) }
    } catch (error) {
      return { ok: false, error: errorText(error) }
    }
  }

  async function saveState(args) {
    try {
      await ensureInit()
      const state = args !== null && typeof args === 'object' && !Array.isArray(args) ? args : {}
      await writeJson(stateFile(), state)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorText(error) }
    }
  }

  async function listPets() {
    try {
      await ensureInit()
      const entries = (await readdir(libraryDir, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))
      const pets = []
      for (const entry of entries) {
        const id = entry.name
        try {
          const files = (await readdir(petDir(id))).map((file) => file)
          const assessed = assessPackageDir(files)
          if (!assessed.valid) continue
          const json = await readJson(joinPath(petDir(id), 'pet.json'))
          pets.push({
            id,
            displayName: typeof json.displayName === 'string' && json.displayName !== '' ? json.displayName : id,
            description: typeof json.description === 'string' ? json.description : '',
          })
        } catch (error) {
          ctx.logger?.warn?.(`[pet] listPets 读取失败 ${entry.name}: ${errorText(error)}`)
        }
      }
      return { ok: true, pets }
    } catch (error) {
      return { ok: false, error: errorText(error), pets: [] }
    }
  }

  async function listImportCandidates() {
    try {
      await ensureInit()
      if (sourceDir === null) return { ok: false, error: '无法定位 Codex 宠物目录', candidates: [] }
      if (!(await pathExists(sourceDir))) return { ok: true, candidates: [] }
      const entries = await readdir(sourceDir, { withFileTypes: true })
      const candidates = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const name = entry.name
        const srcBase = joinPath(sourceDir, name)
        let files
        try {
          files = (await readdir(srcBase)).map((file) => file)
        } catch {
          continue
        }
        const assessed = assessPackageDir(files)
        let displayName = name
        if (assessed.valid) {
          try {
            const json = await readJson(joinPath(srcBase, 'pet.json'))
            if (typeof json.displayName === 'string') displayName = json.displayName
          } catch {
            // 保留目录名。
          }
        }
        candidates.push({
          id: name,
          displayName,
          valid: assessed.valid,
          reason: assessed.reason,
          existsInLibrary: assessed.valid ? await pathExists(petDir(name)) : false,
        })
      }
      return { ok: true, candidates }
    } catch (error) {
      return { ok: false, error: errorText(error), candidates: [] }
    }
  }

  async function importPet(args) {
    try {
      await ensureInit()
      const rawPath = args !== null && typeof args === 'object' && typeof args.path === 'string' ? args.path : null
      const rawId = args !== null && typeof args === 'object' && typeof args.id === 'string' ? args.id : null
      let srcBase
      let id
      if (rawPath !== null) {
        srcBase = normalizePath(rawPath)
        let srcStat
        try {
          srcStat = await stat(srcBase)
        } catch {
          return { ok: false, error: '路径不存在' }
        }
        if (!srcStat.isDirectory()) return { ok: false, error: '路径不是目录' }
        const directPetJson = joinPath(srcBase, 'pet.json')
        if (!(await pathExists(directPetJson))) {
          // 所选目录不是单个宠物包：尝试批量导入其直接子目录中的宠物包。
          let childEntries
          try {
            childEntries = await readdir(srcBase, { withFileTypes: true })
          } catch {
            return { ok: false, error: '路径不可读' }
          }
          const summary = { imported: 0, skipped: 0, failed: 0, errors: [] }
          for (const child of childEntries) {
            if (!child.isDirectory()) continue
            const childPath = joinPath(srcBase, child.name)
            if (!(await pathExists(joinPath(childPath, 'pet.json')))) continue
            const childResult = await importPet({ path: childPath })
            console.log('[pet] 批量导入子目录', child.name, childResult)
            if (childResult.ok) {
              summary.imported++
            } else if (typeof childResult.error === 'string' && childResult.error.includes('同名宠物已存在')) {
              summary.skipped++
            } else {
              summary.failed++
              summary.errors.push(`${child.name}: ${childResult.error}`)
            }
          }
          if (summary.imported === 0 && summary.skipped === 0 && summary.failed === 0) {
            return { ok: false, error: '所选目录下没有找到宠物包' }
          }
          return { ok: true, ...summary }
        }
        const jsonForId = await readJson(directPetJson).catch(() => null)
        const declaredId = jsonForId !== null && typeof jsonForId === 'object' && typeof jsonForId.id === 'string' ? jsonForId.id : null
        id = safeLibraryId(declaredId)
        if (id === null) return { ok: false, error: '宠物包缺少合法 id' }
      } else {
        id = safeLibraryId(rawId)
        if (id === null) return { ok: false, error: '非法宠物 id' }
        if (sourceDir === null) return { ok: false, error: '无法定位 Codex 宠物目录' }
        srcBase = joinPath(sourceDir, id)
      }
      if (await pathExists(petDir(id))) {
        return { ok: false, error: '同名宠物已存在' }
      }
      const json = await readJson(joinPath(srcBase, 'pet.json'))
      const rawSprite = typeof json.spritesheetPath === 'string' ? json.spritesheetPath : 'spritesheet.png'
      const spriteName = safeSpriteName(rawSprite)
      if (spriteName === null) return { ok: false, error: '非法图集路径' }
      const spritePath = joinPath(srcBase, spriteName)
      if (!(await pathExists(spritePath))) {
        return { ok: false, error: `源图集缺失: ${spriteName}` }
      }
      const spriteInfo = await stat(spritePath)
      if (spriteInfo.size > SPRITE_MAX) return { ok: false, error: '图集超过 25MB 上限' }
      const bytes = await readFile(spritePath)
      if (bytes.length > SPRITE_MAX) return { ok: false, error: '图集超过 25MB 上限' }
      const dims = imageDims(bytes)
      if (dims === null) return { ok: false, error: '图集不是支持的图片格式（PNG/WebP）' }
      if (dims.width % CELL_W !== 0 || dims.height % CELL_H !== 0 || dims.width / CELL_W !== 8) {
        return { ok: false, error: `图集尺寸不支持: ${dims.width}x${dims.height}` }
      }
      const atlasRows = dims.height / CELL_H
      const parsed = parsePetJson(JSON.stringify(json), atlasRows)
      if (!parsed.ok) return { ok: false, error: parsed.errors.join('; ') }

      // 导入 = 把 Codex 包目录复制到 dsh/pets/<id>（不再序列化为扁平 JSON）。
      const destDir = petDir(id)
      await rm(destDir, { recursive: true, force: true })
      await cp(srcBase, destDir, { recursive: true, force: false, errorOnExist: true })
      if (!(await pathExists(joinPath(destDir, 'pet.json')))) {
        return { ok: false, error: '复制后校验失败：缺少 pet.json' }
      }
      spriteCache.delete(id)
      return { ok: true }
    } catch (error) {
      console.error('[pet] importPet 异常', error)
      return { ok: false, error: errorText(error) }
    }
  }

  async function getPet(args) {
    try {
      await ensureInit()
      const rawId = args !== null && typeof args === 'object' && typeof args.id === 'string' ? args.id : null
      const id = safeLibraryId(rawId)
      if (id === null) return { ok: false, error: '非法宠物 id' }
      const cached = spriteCache.get(id)
      if (cached !== undefined) return cached
      const pkgDir = petDir(id)
      const jsonText = await readText(joinPath(pkgDir, 'pet.json'))
      const json = JSON.parse(jsonText)
      const rawSprite = typeof json.spritesheetPath === 'string' ? json.spritesheetPath : 'spritesheet.png'
      const spriteName = safeSpriteName(rawSprite)
      if (spriteName === null) return { ok: false, error: '宠物数据损坏：非法图集路径' }
      const spritePath = joinPath(pkgDir, spriteName)
      if (!(await pathExists(spritePath))) return { ok: false, error: `图集缺失: ${spriteName}` }
      const bytes = await readFile(spritePath)
      if (bytes.length > SPRITE_MAX) return { ok: false, error: '图集超过 25MB 上限' }
      const dims = imageDims(bytes)
      if (dims === null) return { ok: false, error: '图集不是支持的图片格式（PNG/WebP）' }
      if (dims.width % CELL_W !== 0 || dims.height % CELL_H !== 0 || dims.width / CELL_W !== 8) {
        return { ok: false, error: `图集尺寸不支持: ${dims.width}x${dims.height}` }
      }
      const atlasRows = dims.height / CELL_H
      const parsed = parsePetJson(jsonText, atlasRows)
      if (!parsed.ok) return { ok: false, error: parsed.errors.join('; ') }
      const result = {
        ok: true,
        pet: parsed.pet,
        spriteDataUrl: `data:${spriteMime(spriteName)};base64,${bytes.toString('base64')}`,
        atlas: { rows: atlasRows },
      }
      spriteCache.set(id, result)
      return result
    } catch (error) {
      return { ok: false, error: errorText(error) }
    }
  }

  const handlers = {
    'getStatus': getStatus,
    'setCurrentSession': setCurrentSession,
    'syncSessions': syncSessions,
    'resetAcknowledged': resetAcknowledged,
    'loadState': loadState,
    'saveState': saveState,
    'listPets': listPets,
    'listImportCandidates': listImportCandidates,
    'importPet': importPet,
    'getPet': getPet,
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/pet',
    handler: async (req, res) => {
      let pathname
      try {
        pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
      } catch {
        sendJson(res, 400, { ok: false, error: '非法请求路径' })
        return
      }
      const method = rpcMethodOf(pathname)
      if (method === null || handlers[method] === undefined) {
        sendJson(res, 404, { ok: false, error: `未知方法: ${pathname}` })
        return
      }
      if (req.method !== 'POST' && req.method !== 'GET') {
        sendJson(res, 405, { ok: false, error: '仅支持 POST/GET' })
        return
      }
      let args = {}
      try {
        args = await readJsonBody(req, RPC_BODY_MAX)
      } catch (error) {
        sendJson(res, error.statusCode ?? 400, { ok: false, error: errorText(error) })
        return
      }
      try {
        sendJson(res, 200, await handlers[method](args))
      } catch (error) {
        ctx.logger?.warn?.(`[pet] ${method} 异常: ${errorText(error)}`)
        sendJson(res, 500, { ok: false, error: errorText(error) })
      }
    },
  }), 'dsh-pet: /pet RPC 路由')
}
export { rpcMethodOf, safeLibraryId, safeSpriteName }
