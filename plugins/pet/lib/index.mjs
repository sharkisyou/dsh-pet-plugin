import { createRequire } from 'node:module'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
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
  const sm = createPetStateMachine()
  const spriteCache = new Map()
  const trackedSubagents = new Set()
  const eventCounters = { status: 0, tools: 0, approvals: 0, subagents: 0, errors: 0 }

  let libraryRoot = null
  let sourceDir = null
  let currentSession = null
  let initPromise = null
  const now = () => Date.now()

  const petFile = (id) => joinPath(libraryRoot, `pet-${id}.json`)
  const stateFile = () => joinPath(libraryRoot, 'pet-state.json')

  ctx.on('agent/status', (payload) => {
    if (payload === null || typeof payload !== 'object') return
    if (!relevantToCurrent(payload.agent, currentSession)) return
    eventCounters.status++
    sm.apply({ kind: 'agent-status', status: payload.status === 'running' ? 'running' : 'idle', ts: now() })
  })

  ctx.on('agent/error', (payload) => {
    if (payload === null || typeof payload !== 'object') return
    if (!relevantToCurrent(payload.agent, currentSession)) return
    eventCounters.errors++
    sm.apply({ kind: 'error', ts: now() })
  })

  ctx.on('tools/execute', (exec, next) => {
    const agent = exec !== null && typeof exec === 'object' ? exec.agent : undefined
    if (!relevantToCurrent(agent, currentSession)) return next()
    eventCounters.tools++
    const name = toolNameOf(exec)
    sm.apply({ kind: 'tool-start', name, isQuestion: name === 'ask_user_question', ts: now() })
    return (async () => {
      try {
        return await next()
      } finally {
        sm.apply({ kind: 'tool-end', ts: now() })
      }
    })()
  })

  ctx.on('approval/request', (req, next) => {
    const agent = req !== null && typeof req === 'object' ? req.agent : undefined
    if (!relevantToCurrent(agent, currentSession)) return next()
    eventCounters.approvals++
    sm.apply({ kind: 'approval-start', ts: now() })
    return (async () => {
      try {
        return await next()
      } finally {
        sm.apply({ kind: 'approval-end', ts: now() })
      }
    })()
  })

  ctx.on('subagent/start', (info, parent) => {
    const parentId = agentIdOf(parent)
    // 父会话可识别时严格过滤；未知当前会话则跟随一切活动；父字段不可识别则跳过。
    if (currentSession !== null && parentId !== null && parentId !== currentSession) return
    if (currentSession !== null && parentId === null) return
    const child = childIdOf(info)
    if (child === null) return
    trackedSubagents.add(child)
    eventCounters.subagents++
    sm.apply({ kind: 'subagent-start', ts: now() })
  })

  ctx.on('subagent/end', (info) => {
    const child = childIdOf(info)
    if (child === null || !trackedSubagents.has(child)) return
    trackedSubagents.delete(child)
    sm.apply({ kind: 'subagent-end', ts: now() })
  })

  async function ensureInit() {
    if (libraryRoot !== null) return
    if (initPromise === null) {
      initPromise = (async () => {
        const found = await findHome(ctx)
        if (found.error !== undefined) throw new Error(`无法定位用户主目录 [${found.error}]`)
        libraryRoot = found.libraryRoot
        sourceDir = found.codexRoot
      })().catch((error) => {
        initPromise = null
        throw error
      })
    }
    return initPromise
  }

  // ===== RPC handlers =====

  async function getStatus() {
    const { state, bubble } = sm.apply({ kind: 'tick', ts: now() })
    return { ok: true, state, bubble, seen: { ...eventCounters }, currentSession }
  }

  async function setCurrentSession(args) {
    const sid = args !== null && typeof args === 'object' && typeof args.sessionId === 'string'
      ? args.sessionId
      : null
    currentSession = sid
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
      const libraryDir = libraryRoot
      if (!(await pathExists(libraryDir))) return { ok: true, pets: [] }
      const entries = await readdir(libraryDir, { withFileTypes: true })
      const pets = []
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.startsWith('pet-') || !entry.name.endsWith('.json') ||
            entry.name === 'pet-state.json') continue
        const id = entry.name.slice(4, -5)
        try {
          const payload = await readJson(petFile(id))
          const pet = payload !== null && typeof payload === 'object' ? payload.pet : null
          if (pet === null || typeof pet !== 'object') continue
          pets.push({
            id: typeof pet.id === 'string' ? pet.id : id,
            displayName: typeof pet.displayName === 'string' ? pet.displayName : id,
            description: typeof pet.description === 'string' ? pet.description : '',
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
          existsInLibrary: assessed.valid ? await pathExists(petFile(name)) : false,
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
      const rawId = args !== null && typeof args === 'object' && typeof args.id === 'string' ? args.id : null
      const overwrite = args !== null && typeof args === 'object' && args.overwrite === true
      const id = safeLibraryId(rawId)
      if (id === null) return { ok: false, error: '非法宠物 id' }
      if (sourceDir === null) return { ok: false, error: '无法定位 Codex 宠物目录' }
      if (await pathExists(petFile(id)) && !overwrite) {
        return { ok: false, error: '同名宠物已存在，请先覆盖' }
      }

      const srcBase = joinPath(sourceDir, id)
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
      const payload = {
        pet: parsed.pet,
        spriteB64: bytes.toString('base64'),
        mime: spriteMime(spriteName),
        atlasRows,
      }
      await writeJson(petFile(id), payload)
      if (!(await pathExists(petFile(id)))) return { ok: false, error: '写入后校验失败' }
      spriteCache.delete(id)
      return { ok: true }
    } catch (error) {
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
      const payload = await readJson(petFile(id))
      if (payload === null || typeof payload !== 'object' || payload.pet === undefined ||
          typeof payload.spriteB64 !== 'string') {
        return { ok: false, error: '宠物数据损坏' }
      }
      const result = {
        ok: true,
        pet: payload.pet,
        spriteDataUrl: `data:${typeof payload.mime === 'string' ? payload.mime : 'image/png'};base64,${payload.spriteB64}`,
        atlas: { rows: typeof payload.atlasRows === 'number' ? payload.atlasRows : 9 },
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
