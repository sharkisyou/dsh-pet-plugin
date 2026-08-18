return {
  apply(ctx) {
    const fs = ctx.get('fs')
    if (fs === undefined) return

    // ===== 纯逻辑内嵌（由 .scratch/pet/prototype/sync-inline.js 生成，sync.test.js 校验）=====

    // ==== inline-src: pet-format ====
// 宠物包格式解析与标准化（纯逻辑，无副作用）。
// 该文件同时是动态插件宿主半的内嵌副本来源：不要在此引入 require/import。

const ROW_NAMES = [
  'idle', 'running-right', 'running-left', 'waving', 'jumping',
  'failed', 'waiting', 'running', 'review',
]
const ROW_FRAME_COUNTS = [6, 8, 8, 4, 5, 8, 6, 6, 6]
const DEFAULT_FRAME_MS = 140
const IMAGE_EXTS = ['.png', '.webp']

function stripBom(text) {
  if (typeof text === 'string' && text.charCodeAt(0) === 0xfeff) return text.slice(1)
  return text
}

function parsePetJson(text, atlasRows) {
  let json
  try {
    json = JSON.parse(stripBom(text))
  } catch (error) {
    return { ok: false, errors: ['pet.json 不是合法 JSON'] }
  }
  if (json === null || typeof json !== 'object') {
    return { ok: false, errors: ['pet.json 顶层必须是对象'] }
  }
  const errors = []
  for (const key of ['id', 'displayName', 'description', 'spritesheetPath']) {
    if (typeof json[key] !== 'string' || json[key] === '') {
      errors.push(`缺少字段 ${key}`)
    }
  }
  const version = json.spriteVersionNumber === undefined ? 1 : json.spriteVersionNumber
  if (version !== 1 && version !== 2) {
    errors.push('spriteVersionNumber 必须是 1 或 2')
  }
  if (errors.length > 0) return { ok: false, errors }

  const states = {}
  for (let row = 0; row < atlasRows; row++) {
    const name = ROW_NAMES[row] !== undefined ? ROW_NAMES[row] : `row-${row}`
    const frameCount = ROW_FRAME_COUNTS[row] !== undefined ? ROW_FRAME_COUNTS[row] : 8
    const playback = name === 'waving' || name === 'jumping' ? 'once' : 'loop'
    states[name] = {
      row,
      frameCount,
      timingMs: new Array(frameCount).fill(DEFAULT_FRAME_MS),
      playback,
      loop: playback === 'loop',
    }
  }

  // 社区扩展：animations 元数据覆盖标准行
  if (json.animations !== null && typeof json.animations === 'object') {
    for (const [animName, meta] of Object.entries(json.animations)) {
      if (meta === null || typeof meta !== 'object') continue
      const row = resolveRow(meta.sourceRow, atlasRows)
      if (row === -1) continue
      const baseCount = ROW_FRAME_COUNTS[row] !== undefined ? ROW_FRAME_COUNTS[row] : 8
      const frameCount = clampFrameCount(meta.frameCount, baseCount)
      const timingMs = buildTiming(meta.timingMs, frameCount)
      const playback = meta.playback === 'once' ? 'once' : 'loop'
      states[animName] = {
        row,
        frameCount,
        timingMs,
        playback,
        loop: meta.loop === false ? false : playback === 'loop',
      }
    }
  }

  // 社区扩展：点击交互（循环播放技能动画）
  let clickAnimations = []
  if (json.interactions !== null && typeof json.interactions === 'object' &&
      json.interactions.click !== null && typeof json.interactions.click === 'object' &&
      Array.isArray(json.interactions.click.animations)) {
    clickAnimations = json.interactions.click.animations.filter((name) => states[name] !== undefined)
  }

  return {
    ok: true,
    pet: {
      id: json.id,
      displayName: json.displayName,
      description: json.description,
      spritesheetPath: json.spritesheetPath,
      kind: typeof json.kind === 'string' ? json.kind : null,
      spriteVersionNumber: version,
      states,
      clickAnimations,
    },
  }
}

function resolveRow(sourceRow, atlasRows) {
  if (typeof sourceRow === 'number' && Number.isInteger(sourceRow) &&
      sourceRow >= 0 && sourceRow < atlasRows) {
    return sourceRow
  }
  if (typeof sourceRow === 'string') {
    const index = ROW_NAMES.indexOf(sourceRow)
    if (index >= 0) return index
  }
  return -1
}

function clampFrameCount(value, official) {
  // 上限为官方该行已用帧数：社区包常把 frameCount 声明为 8，但标准行
  // 实际只画了 ROW_FRAME_COUNTS 帧（多余格透明），超出的帧渲染成
  // "消失帧"，循环播放时表现为宠物闪烁。
  if (typeof value !== 'number' || !Number.isInteger(value)) return official
  return Math.min(Math.max(value, 1), official)
}

function buildTiming(timingMs, frameCount) {
  const out = new Array(frameCount).fill(DEFAULT_FRAME_MS)
  if (Array.isArray(timingMs)) {
    for (let i = 0; i < frameCount && i < timingMs.length; i++) {
      if (typeof timingMs[i] === 'number' && timingMs[i] > 0) out[i] = timingMs[i]
    }
  }
  return out
}

function assessPackageDir(fileNames) {
  if (!fileNames.includes('pet.json')) {
    return { valid: false, reason: '缺少 pet.json' }
  }
  const hasImage = fileNames.some((name) =>
    IMAGE_EXTS.some((ext) => name.toLowerCase().endsWith(ext)))
  if (!hasImage) {
    return { valid: false, reason: '缺少图集文件（png/webp）' }
  }
  return { valid: true, reason: null }
}
// ==== inline-src-end: pet-format ====

    // ==== inline-src: state-machine ====
// 宠物状态机：DSH 信号事件流 → 宠物状态与浮层文本（纯逻辑，无副作用）。

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
      return { state: STATE.failed, bubbleKey: 'failed', bubbleParams: null }
    }
    if (approvals > 0) {
      return { state: STATE.waiting, bubbleKey: 'waitingApproval', bubbleParams: null }
    }
    if (tool !== null && tool.isQuestion) {
      return { state: STATE.waiting, bubbleKey: 'waitingAnswer', bubbleParams: null }
    }
    // 子代理优先于父会话的工具执行：前台子代理期间父会话自身就在
    // 执行 `subagent` 工具，若按工具优先则整个子代理周期都会显示
    // 「执行工具 subagent」而不是「子代理工作中」。
    if (subagents > 0) {
      return { state: STATE.working, bubbleKey: 'subagentWorking', bubbleParams: null }
    }
    if (agentRunning || (tool !== null && !tool.isQuestion)) {
      if (tool !== null && !tool.isQuestion) {
        return { state: STATE.working, bubbleKey: 'executingTool', bubbleParams: { name: tool.name } }
      }
      return { state: STATE.working, bubbleKey: 'thinking', bubbleParams: null }
    }
    if (idleSince !== null && ts - idleSince < REPLY_BUBBLE_MS) {
      return { state: STATE.idle, bubbleKey: 'awaitingReply', bubbleParams: null }
    }
    return { state: STATE.idle, bubbleKey: 'idle', bubbleParams: null }
  }

  function enterIdle(ts) {
    if (idleSince === null) idleSince = ts
  }

  function apply(event) {
    const ts = event.ts

    if (event.kind === 'tick') {
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
// ==== inline-src-end: state-machine ====

    // ==== inline-src: base64 ====
// 字节 → base64（宿主动态插件的 btoa 按 UTF-8 文本语义工作，不能用于二进制）。

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function bytesToBase64(bytes) {
  let out = ''
  const len = bytes.length
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < len ? bytes[i + 1] : 0
    const b2 = i + 2 < len ? bytes[i + 2] : 0
    out += ALPHABET[b0 >> 2]
    out += ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)]
    out += i + 1 < len ? ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '='
    out += i + 2 < len ? ALPHABET[b2 & 0x3f] : '='
  }
  return out
}
// ==== inline-src-end: base64 ====

    // ==== inline-src: image-dims ====
// 图集图片尺寸解析与 mime 选择（纯逻辑）：支持 PNG 与 WebP（VP8X / VP8 / VP8L）。

function imageDims(bytes) {
  if (bytes === null || typeof bytes !== 'object' || bytes.length < 24) return null
  // PNG
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
    const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
    return { width, height }
  }
  // WebP：RIFF....WEBP + chunk fourcc
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    const fourcc = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
    if (fourcc === 'VP8X' && bytes.length >= 30) {
      const width = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1
      const height = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1
      return { width, height }
    }
    if (fourcc === 'VP8 ' && bytes.length >= 30 &&
        bytes[20] === 0x9d && bytes[21] === 0x01 && bytes[22] === 0x2a) {
      const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff
      const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff
      return { width, height }
    }
    if (fourcc === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)
      const width = (bits & 0x3fff) + 1
      const height = ((bits >>> 14) & 0x3fff) + 1
      return { width, height }
    }
  }
  return null
}

function spriteMime(name) {
  const lower = String(name).toLowerCase()
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/png'
}
// ==== inline-src-end: image-dims ====

    // ===== 运行时状态 =====

    const CELL_W = 192
    const CELL_H = 208
    const SPRITE_MAX = 25 * 1024 * 1024
    const now = () => Date.now()

    let home = null
    let sourceDir = null
    let currentSession = null
    const sm = createPetStateMachine()
    const spriteCache = new Map()
    const trackedSubagents = new Set()

    function petFile(id) {
      return home + '/.dsh/pet-' + id + '.json'
    }

    function stateFile() {
      return home + '/.dsh/pet-state.json'
    }

    function entryName(entry) {
      if (typeof entry === 'string') return entry
      if (entry === null || typeof entry !== 'object') return null
      if (typeof entry.name === 'string') return entry.name
      if (typeof entry.basename === 'string') return entry.basename
      if (typeof entry.path === 'string') {
        const parts = entry.path.split(/[\\/]/)
        return parts[parts.length - 1]
      }
      return null
    }

    function agentIdOf(agent) {
      if (agent === null || typeof agent !== 'object') return null
      if (typeof agent.id === 'string') return agent.id
      if (typeof agent.sessionId === 'string') return agent.sessionId
      return null
    }

    function sessionIdOf(req) {
      if (req === null || typeof req !== 'object') return null
      if (typeof req.sessionId === 'string') return req.sessionId
      if (typeof req.session === 'string') return req.session
      if (req.session !== null && typeof req.session === 'object' && typeof req.session.id === 'string') {
        return req.session.id
      }
      return null
    }

    function parentIdOf(info) {
      if (info === null || typeof info !== 'object') return null
      if (typeof info.parentSessionId === 'string') return info.parentSessionId
      if (typeof info.parentId === 'string') return info.parentId
      if (typeof info.owner === 'string') return info.owner
      if (info.parent !== null && typeof info.parent === 'object' && typeof info.parent.id === 'string') {
        return info.parent.id
      }
      return null
    }

    function childIdOf(info) {
      if (info === null || typeof info !== 'object') return null
      if (typeof info.id === 'string') return info.id
      if (typeof info.sessionId === 'string') return info.sessionId
      return null
    }

    function relevantToCurrent(agent) {
      // 无法确定当前会话时跟随一切活动，避免永远显示空闲
      if (currentSession === null) return true
      const id = agentIdOf(agent)
      if (id === null) return true
      return id === currentSession
    }

    const eventCounters = { status: 0, tools: 0, approvals: 0, subagents: 0, errors: 0 }

    // ===== 事件 → 状态机 =====

    ctx.on('agent/status', (payload) => {
      if (payload === null || typeof payload !== 'object') return
      if (!relevantToCurrent(payload.agent)) return
      eventCounters.status++
      sm.apply({
        kind: 'agent-status',
        status: payload.status === 'running' ? 'running' : 'idle',
        ts: now(),
      })
    })

    ctx.on('agent/error', (payload) => {
      if (payload === null || typeof payload !== 'object') return
      if (!relevantToCurrent(payload.agent)) return
      eventCounters.errors++
      sm.apply({ kind: 'error', ts: now() })
    })

    ctx.on('tools/execute', (exec, next) => {
      const belongsToCurrent = exec !== null && typeof exec === 'object' &&
        relevantToCurrent(exec.agent !== undefined ? exec.agent : exec.caller)
      if (!belongsToCurrent) return next()
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
      let belongsToCurrent = true
      if (currentSession !== null && req !== null && typeof req === 'object') {
        const sid = sessionIdOf(req)
        if (sid !== null && sid !== currentSession) belongsToCurrent = false
      }
      if (!belongsToCurrent) return next()
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

    ctx.on('subagent/start', (info) => {
      const parent = parentIdOf(info)
      if (currentSession !== null && parent !== null && parent !== currentSession) return
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

    function toolNameOf(exec) {
      if (exec === null || typeof exec !== 'object') return '工具'
      if (typeof exec.name === 'string' && exec.name !== '') return exec.name
      if (exec.tool !== null && typeof exec.tool === 'object' && typeof exec.tool.name === 'string') {
        return exec.tool.name
      }
      return '工具'
    }

    // ===== 主目录发现（免 shell、免 process.env）=====

    async function findHome() {
      const reasons = []

      if (typeof process !== 'undefined' && process !== null && process.env) {
        for (const key of ['DSH_HOME', 'USERPROFILE', 'HOME']) {
          const value = process.env[key]
          if (typeof value === 'string' && value !== '') {
            return { home: value.replace(/[\\/]+$/, '') }
          }
        }
        reasons.push('env: 无 USERPROFILE/HOME/DSH_HOME')
      } else {
        reasons.push('env: process.env 不可用')
      }

      try {
        const usersDir = await fs.resolve('C:\\Users')
        const entries = await fs.listDir(usersDir)
        for (const entry of entries || []) {
          const name = entryName(entry)
          if (name === null || name === '' || name.startsWith('.')) continue
          const candidate = 'C:/Users/' + name
          const dsh = await fs.resolve(candidate + '/.dsh')
          if (await fs.stat(dsh)) return { home: candidate }
        }
        reasons.push('enum: 未找到含 .dsh 的用户目录')
      } catch (err) {
        reasons.push('enum 错误: ' + String(err))
      }

      const sp = ctx.get('sessionPersistence')
      if (sp !== undefined) {
        try {
          const headers = await sp.list()
          for (const meta of headers || []) {
            let loc = null
            try { loc = sp.locate(meta) } catch (err) { continue }
            if (loc === undefined || loc === null) continue
            let text = null
            if (typeof loc === 'string') text = loc
            else if (typeof loc === 'object') {
              if (typeof loc.path === 'string') text = loc.path
              else if (typeof loc.file === 'string') text = loc.file
              else if (typeof loc.uri === 'string') text = loc.uri
            }
            if (text === null) continue
            const normalized = text.replace(/\\/g, '/')
            const idx = normalized.indexOf('/.dsh/')
            if (idx >= 0) return { home: normalized.slice(0, idx) }
            if (normalized.endsWith('/.dsh')) return { home: normalized.slice(0, -5) }
          }
          reasons.push('sessions: 未解析出主目录')
        } catch (err) {
          reasons.push('sessions 错误: ' + String(err))
        }
      } else {
        reasons.push('sessions: 服务不可用')
      }

      return { error: reasons.join(' | ') }
    }

    let initPromise = null
    function ensureInit() {
      if (initPromise === null) {
        initPromise = (async () => {
          const found = await findHome()
          if (found.error !== undefined) {
            throw new Error('无法定位用户主目录 [' + found.error + ']')
          }
          home = found.home
          sourceDir = home + '/.codex/pets'
          console.log('[pet] home=' + home + ' src=' + sourceDir)
        })()
      }
      return initPromise
    }

    async function statPath(path) {
      try {
        const target = await fs.resolve(path)
        const info = await fs.stat(target)
        return info !== undefined
      } catch (err) {
        return false
      }
    }

    async function readTextPath(path) {
      const target = await fs.resolve(path)
      return fs.readText(target)
    }

    async function listDirNames(path) {
      const target = await fs.resolve(path)
      const entries = await fs.listDir(target)
      const names = []
      for (const entry of entries || []) {
        const name = entryName(entry)
        if (name !== null && name !== '') names.push(name)
      }
      return names
    }

    // ===== RPC =====

    harness.handle('pet/getStatus', async () => {
      const { state, bubble } = sm.apply({ kind: 'tick', ts: now() })
      return { state, bubble, seen: { ...eventCounters }, currentSession }
    })

    harness.handle('pet/setCurrentSession', async (args) => {
      const sid = args !== null && typeof args === 'object' && typeof args.sessionId === 'string'
        ? args.sessionId
        : null
      currentSession = sid
      return { ok: true }
    })

    harness.handle('pet/loadState', async () => {
      try {
        await ensureInit()
        if (!(await statPath(stateFile()))) return { ok: true, state: null }
        const text = await readTextPath(stateFile())
        const parsed = JSON.parse(stripBom(text))
        return { ok: true, state: parsed }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    })

    harness.handle('pet/saveState', async (args) => {
      try {
        await ensureInit()
        const state = args !== null && typeof args === 'object' ? args : {}
        const target = await fs.resolve(stateFile())
        await fs.writeText(target, JSON.stringify(state))
        return { ok: true }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    })

    harness.handle('pet/listPets', async () => {
      try {
        await ensureInit()
        const homeDir = home + '/.dsh'
        if (!(await statPath(homeDir))) return { ok: true, pets: [] }
        const names = await listDirNames(homeDir)
        const pets = []
        for (const name of names) {
          if (!name.startsWith('pet-') || !name.endsWith('.json') || name === 'pet-state.json') continue
          const id = name.slice(4, -5)
          try {
            const payload = JSON.parse(stripBom(await readTextPath(petFile(id))))
            const pet = payload !== null && typeof payload === 'object' ? payload.pet : null
            if (pet === null || typeof pet !== 'object') continue
            pets.push({
              id: typeof pet.id === 'string' ? pet.id : id,
              displayName: typeof pet.displayName === 'string' ? pet.displayName : id,
              description: typeof pet.description === 'string' ? pet.description : '',
            })
          } catch (err) {
            console.error('[pet] listPets 读取失败 ' + name + ': ' + String(err))
          }
        }
        return { ok: true, pets }
      } catch (err) {
        return { ok: false, error: String(err), pets: [] }
      }
    })

    harness.handle('pet/listImportCandidates', async () => {
      try {
        await ensureInit()
        if (!(await statPath(sourceDir))) return { ok: true, candidates: [] }
        const names = await listDirNames(sourceDir)
        const candidates = []
        for (const name of names) {
          const srcBase = sourceDir + '/' + name
          const files = await listDirNames(srcBase)
          const assessed = assessPackageDir(files)
          let displayName = name
          if (assessed.valid) {
            try {
              const json = JSON.parse(stripBom(await readTextPath(srcBase + '/pet.json')))
              if (typeof json.displayName === 'string') displayName = json.displayName
            } catch (err) { /* 保留目录名 */ }
          }
          candidates.push({
            id: name,
            displayName,
            valid: assessed.valid,
            reason: assessed.reason,
            existsInLibrary: assessed.valid ? await statPath(petFile(name)) : false,
          })
        }
        return { ok: true, candidates }
      } catch (err) {
        return { ok: false, error: String(err), candidates: [] }
      }
    })

    harness.handle('pet/importPet', async (args) => {
      try {
        await ensureInit()
        const id = args !== null && typeof args === 'object' && typeof args.id === 'string' ? args.id : null
        const overwrite = args !== null && typeof args === 'object' && args.overwrite === true
        if (id === null) return { ok: false, error: '缺少宠物 id' }
        if (await statPath(petFile(id)) && !overwrite) {
          return { ok: false, error: '同名宠物已存在，请先覆盖' }
        }
        const srcBase = sourceDir + '/' + id
        const jsonText = await readTextPath(srcBase + '/pet.json')
        const json = JSON.parse(stripBom(jsonText))
        const spriteName = typeof json.spritesheetPath === 'string' ? json.spritesheetPath : 'spritesheet.png'
        const spriteSrc = srcBase + '/' + spriteName
        if (!(await statPath(spriteSrc))) {
          return { ok: false, error: '源图集缺失: ' + spriteName }
        }
        const spriteTarget = await fs.resolve(spriteSrc)
        const bytes = await fs.readBytes(spriteTarget, undefined, SPRITE_MAX)
        const dims = imageDims(bytes)
        if (dims === null) return { ok: false, error: '图集不是支持的图片格式（PNG/WebP）' }
        if (dims.width % CELL_W !== 0 || dims.height % CELL_H !== 0 || dims.width / CELL_W !== 8) {
          return { ok: false, error: '图集尺寸不支持: ' + dims.width + 'x' + dims.height }
        }
        const atlasRows = dims.height / CELL_H
        const parsed = parsePetJson(jsonText, atlasRows)
        if (!parsed.ok) return { ok: false, error: parsed.errors.join('; ') }
        const payload = {
          pet: parsed.pet,
          spriteB64: bytesToBase64(bytes),
          mime: spriteMime(spriteName),
          atlasRows,
        }
        const target = await fs.resolve(petFile(id))
        await fs.writeText(target, JSON.stringify(payload))
        const ok = await statPath(petFile(id))
        if (!ok) return { ok: false, error: '写入后校验失败' }
        spriteCache.delete(id)
        return { ok: true }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    })

    harness.handle('pet/getPet', async (args) => {
      try {
        await ensureInit()
        const id = args !== null && typeof args === 'object' && typeof args.id === 'string' ? args.id : null
        if (id === null) return { ok: false, error: '缺少宠物 id' }
        const cached = spriteCache.get(id)
        if (cached !== undefined) return cached
        const payload = JSON.parse(stripBom(await readTextPath(petFile(id))))
        if (payload === null || typeof payload !== 'object' || payload.pet === undefined) {
          return { ok: false, error: '宠物数据损坏' }
        }
        const result = {
          ok: true,
          pet: payload.pet,
          spriteDataUrl: 'data:' + (typeof payload.mime === 'string' ? payload.mime : 'image/png') +
            ';base64,' + payload.spriteB64,
          atlas: { rows: typeof payload.atlasRows === 'number' ? payload.atlasRows : 9 },
        }
        spriteCache.set(id, result)
        return result
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    })

    console.log('[pet] host half 已就绪（免 shell 扁平存储）')
  },
}
