'use strict'
// 持久客户端 UI：宠物本体 + 状态浮层 + 头部/悬浮双入口菜单。
// 本文件由 scripts/build-client.mjs 包成 window.__ModuleLoader__.load 工厂；
// 不要在 factory 内使用 ESM import/export。

const React = require('react')

const STATUS_POLL_MS = 500
const ANIM_TICK_MS = 80
const DRAG_THRESHOLD_PX = 6
const PET_RPC_PREFIX = '/pet/rpc/'

async function petCall(method, args = {}) {
  const res = await fetch(PET_RPC_PREFIX + encodeURIComponent(method), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  })
  return res.json()
}

// ===== 样式 =====

const PET_CSS = `
.dsh-pet-root { position: fixed; z-index: 9500; pointer-events: auto; user-select: none; }
.dsh-pet-canvas { position: relative; width: 96px; height: 104px; overflow: hidden; cursor: grab; }
.dsh-pet-frame { position: absolute; left: 0; top: 0; image-rendering: pixelated; pointer-events: none; }
.dsh-pet-bubble { position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  background: rgba(30,30,30,.85); color: #fff; padding: 3px 10px; border-radius: 10px;
  font-size: 12px; white-space: nowrap; pointer-events: none; }
.dsh-pet-hide { position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; border-radius: 50%;
  border: none; background: rgba(40,40,40,.9); color: #fff; font-size: 11px; line-height: 1;
  cursor: pointer; display: none; }
.dsh-pet-root:hover .dsh-pet-hide { display: block; }
.dsh-pet-menu-wrap { position: relative; display: inline-block; pointer-events: auto; }
.dsh-pet-menu-wrap-overlay { position: fixed; right: 16px; bottom: 16px; z-index: 9500; display: block; pointer-events: auto; }
.dsh-pet-wake { position: relative; width: 34px; height: 34px;
  border-radius: 50%; background: rgba(30,30,30,.75); color: #fff; font-size: 16px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.25); }
.dsh-pet-menu-backdrop { position: fixed; inset: 0; z-index: 9580; background: transparent; pointer-events: auto; }
.dsh-pet-menu { position: absolute; top: calc(100% + 6px); right: 0; width: 260px; max-height: 60vh;
  overflow: auto; background: rgba(32,32,32,.97); border: 1px solid rgba(255,255,255,.15);
  border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.35); padding: 8px; z-index: 9600; color: #eee; pointer-events: auto; }
.dsh-pet-menu-overlay { top: auto; bottom: calc(100% + 6px); }
.dsh-pet-menu h4 { margin: 6px 2px; font-size: 12px; color: #aaa; font-weight: 600; }
.dsh-pet-item { display: flex; justify-content: space-between; align-items: center; gap: 6px;
  padding: 5px 8px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.dsh-pet-item:hover { background: rgba(255,255,255,.08); }
.dsh-pet-item.selected { background: rgba(120,160,255,.18); }
.dsh-pet-btn { background: rgba(255,255,255,.12); color: #eee; border: none; border-radius: 6px;
  padding: 3px 8px; font-size: 12px; cursor: pointer; }
.dsh-pet-btn:hover { background: rgba(255,255,255,.2); }
.dsh-pet-muted { color: #999; font-size: 12px; }
`

// ===== 客户端共享状态 =====

const store = {
  inited: false,
  currentSession: null,
  state: { state: 'idle', bubble: '空闲' },
  petId: null,
  pets: [],
  pet: null,
  spriteUrl: null,
  atlasRows: 9,
  wake: true,
  greeting: false,
  clickAnim: null,
  lastClickAnim: null,
  pos: { x: null, y: null },
  importCandidates: [],
  initError: null,
  importError: null,
  petsError: null,
  diag: null,
  listeners: new Set(),
  version: 0,
}

function notify() {
  store.version++
  for (const fn of store.listeners) fn()
}

function useStore() {
  const [, force] = React.useState(0)
  React.useEffect(() => {
    const fn = () => force((v) => v + 1)
    store.listeners.add(fn)
    return () => { store.listeners.delete(fn) }
  }, [])
  return store
}

async function persist() {
  try {
    await petCall('saveState', {
      petId: store.petId,
      wake: store.wake,
      pos: store.pos,
    })
  } catch (err) {
    console.error('[pet] saveState 失败', String(err))
  }
}

async function selectPet(id) {
  try {
    const res = await petCall('getPet', { id })
    if (res === null || typeof res !== 'object' || res.ok !== true) {
      console.error('[pet] getPet 失败', res !== null && typeof res === 'object' ? res.error : '无响应')
      return
    }
    store.petId = id
    store.pet = res.pet
    store.spriteUrl = res.spriteDataUrl
    store.atlasRows = res.atlas !== null && typeof res.atlas === 'object' && res.atlas.rows > 0
      ? res.atlas.rows
      : 9
    store.greeting = false
    store.clickAnim = null
    store.lastClickAnim = null
    notify()
    await persist()
  } catch (err) {
    console.error('[pet] selectPet 异常', String(err))
  }
}

let initPromise = null
function ensureInit() {
  if (initPromise !== null) return initPromise
  initPromise = (async () => {
    try {
      const st = await petCall('loadState', {})
      if (st !== null && typeof st === 'object' && st.ok && st.state) {
        store.petId = typeof st.state.petId === 'string' ? st.state.petId : null
        store.wake = st.state.wake !== false
        if (st.state.pos && typeof st.state.pos.x === 'number' && typeof st.state.pos.y === 'number') {
          store.pos = { x: st.state.pos.x, y: st.state.pos.y }
        }
      } else if (st !== null && typeof st === 'object' && st.ok === false) {
        store.initError = '状态读取失败: ' + (typeof st.error === 'string' ? st.error : '未知')
      }
      await refreshPets()
      if (store.petId !== null) await selectPet(store.petId)
    } catch (err) {
      store.initError = '初始化异常: ' + String(err)
      console.error('[pet] init 异常', String(err))
    } finally {
      store.inited = true
      notify()
    }
  })()
  return initPromise
}

async function refreshCandidates() {
  try {
    const res = await petCall('listImportCandidates', {})
    if (res !== null && typeof res === 'object' && res.ok) {
      store.importCandidates = Array.isArray(res.candidates) ? res.candidates : []
      store.importError = null
      notify()
    } else {
      store.importError = '读取导入列表失败: ' +
        (res !== null && typeof res === 'object' && typeof res.error === 'string' ? res.error : '无响应')
      notify()
    }
  } catch (err) {
    store.importError = '读取导入列表异常: ' + String(err)
    console.error('[pet] listImportCandidates 失败', String(err))
  }
}

async function refreshPets() {
  try {
    const list = await petCall('listPets', {})
    if (list !== null && typeof list === 'object' && list.ok) {
      store.pets = Array.isArray(list.pets) ? list.pets : []
      store.petsError = null
      notify()
    } else {
      store.petsError = '读取宠物库失败: ' +
        (list !== null && typeof list === 'object' && typeof list.error === 'string' ? list.error : '无响应')
      notify()
    }
  } catch (err) {
    store.petsError = '读取宠物库异常: ' + String(err)
    console.error('[pet] listPets 失败', String(err))
  }
}

async function importPet(id, overwrite) {
  try {
    const res = await petCall('importPet', { id, overwrite: overwrite === true })
    if (res !== null && typeof res === 'object' && res.ok) {
      await refreshPets()
      await refreshCandidates()
      // 覆盖导入当前选中的宠物时，重载其新模型。
      if (id === store.petId) await selectPet(id)
      return null
    }
    return res !== null && typeof res === 'object' && typeof res.error === 'string'
      ? res.error
      : '导入失败'
  } catch (err) {
    return String(err)
  }
}

function setWake(next) {
  store.wake = next
  if (next) store.greeting = true
  notify()
  persist()
}

// 宠物状态 → 动画行名
const STATE_ROW = { idle: 'idle', working: 'running', waiting: 'waiting', failed: 'failed' }

// ===== 当前会话提取（overlay 的 useSessions prop，防御性读取）=====

const selectAll = (s) => s

function extractCurrentSessionId(list) {
  if (list === null || typeof list !== 'object') return null
  for (const k of ['currentId', 'currentSessionId', 'activeId', 'selectedId', 'activeSessionId', 'current', 'currentSession', 'selected', 'active', 'open']) {
    const v = list[k]
    if (typeof v === 'string' && v !== '') return v
    if (v !== null && typeof v === 'object') {
      if (typeof v.id === 'string' && v.id !== '') return v.id
      if (typeof v.sessionId === 'string' && v.sessionId !== '') return v.sessionId
    }
  }
  return null
}

// ===== 宠物本体 =====

function PetView() {
  const s = useStore()
  const [, setTick] = React.useState(0)
  const dragRef = React.useRef({ moved: false })

  React.useEffect(() => {
    let alive = true
    const fetchStatus = async () => {
      try {
        const res = await petCall('getStatus', {})
        if (!alive || res === null || typeof res !== 'object') return
        if (res.state !== s.state.state || res.bubble !== s.state.bubble) {
          store.state = { state: res.state, bubble: res.bubble }
          notify()
        }
      } catch (err) {
        // 轮询失败忽略；下一拍继续。
      }
    }
    const id = setInterval(fetchStatus, STATUS_POLL_MS)
    fetchStatus()
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ANIM_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const pet = s.pet
  if (pet === null) return null

  let animName = null
  if (s.clickAnim !== null) {
    animName = s.clickAnim.name
  } else if (s.greeting) {
    animName = pet.states.waving !== undefined ? 'waving'
      : (pet.states.jumping !== undefined ? 'jumping' : 'idle')
  } else {
    animName = STATE_ROW[s.state.state] || 'idle'
    if (pet.states[animName] === undefined) animName = 'idle'
  }
  if (pet.states[animName] === undefined) animName = 'idle'

  const animRef = React.useRef({ name: null, at: 0 })
  if (animRef.current.name !== animName) {
    animRef.current = { name: animName, at: Date.now() }
  }
  const anim = pet.states[animName]
  const { frame, finished } = frameIndex(anim, Date.now() - animRef.current.at)

  React.useEffect(() => {
    if (!finished) return
    if (s.clickAnim !== null) {
      store.clickAnim = null
      notify()
    }
    if (s.greeting) {
      store.greeting = false
      notify()
    }
  }, [finished])

  const cellW = 96
  const cellH = 104
  const frameStyle = {
    width: cellW * 8,
    height: cellH * s.atlasRows,
    transform: `translate(${-cellW * frame}px, ${-cellH * anim.row}px)`,
  }

  const rootStyle = s.pos.x !== null
    ? { left: s.pos.x, top: s.pos.y }
    : { right: 16, bottom: 16 }

  function onPointerDown(e) {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const baseX = s.pos.x !== null ? s.pos.x : rect.left
    const baseY = s.pos.y !== null ? s.pos.y : rect.top
    let moved = false
    const onMove = (ev) => {
      if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > DRAG_THRESHOLD_PX) {
        moved = true
      }
      if (moved) {
        store.pos = { x: baseX + (ev.clientX - startX), y: baseY + (ev.clientY - startY) }
        notify()
      }
    }
    const onUp = () => {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
      dragRef.current.moved = moved
      if (moved) persist()
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
    try { target.setPointerCapture(e.pointerId) } catch (err) { /* 不支持则退化为元素内拖拽 */ }
  }

  function onClickPet() {
    if (dragRef.current.moved) {
      dragRef.current.moved = false
      return
    }
    if (pet.clickAnimations.length > 0) {
      const next = cycleNext(s.lastClickAnim, pet.clickAnimations)
      if (next !== null) {
        store.lastClickAnim = next
        store.clickAnim = { name: next }
        notify()
      }
    } else {
      store.greeting = true
      notify()
    }
  }

  function onHide(e) {
    e.stopPropagation()
    setWake(false)
  }

  return React.createElement(
    'div',
    { className: 'dsh-pet-root', style: rootStyle },
    React.createElement('div', { className: 'dsh-pet-bubble' }, s.state.bubble),
    React.createElement(
      'div',
      { className: 'dsh-pet-canvas', onPointerDown: onPointerDown, onClick: onClickPet },
      React.createElement('img', { className: 'dsh-pet-frame', src: s.spriteUrl, style: frameStyle, alt: '' }),
    ),
    React.createElement('button', { className: 'dsh-pet-hide', onClick: onHide, title: '隐藏' }, '×'),
  )
}

function PetRoot(props) {
  const s = useStore()
  React.useEffect(() => { ensureInit() }, [])

  const useSessions = props !== null && typeof props === 'object' ? props.useSessions : undefined
  const sessionsList = typeof useSessions === 'function' ? useSessions(selectAll) : null
  React.useEffect(() => {
    if (sessionsList === null || typeof sessionsList !== 'object') return
    const id = extractCurrentSessionId(sessionsList)
    if (id !== store.currentSession) {
      store.currentSession = id
      notify()
      petCall('setCurrentSession', { sessionId: id }).catch(() => {})
    }
  }, [sessionsList])

  if (!s.inited) return null
  if (s.wake && s.pet !== null && s.spriteUrl !== null) {
    return React.createElement(PetView)
  }
  // 隐藏或尚未选择宠物时：右下角悬浮入口（打开菜单）。
  return React.createElement(PetMenu, { variant: 'overlay' })
}

// ===== 宠物菜单（会话头部与悬浮双入口共用）=====

function PetMenu(props) {
  const s = useStore()
  const [open, setOpen] = React.useState(false)
  const [importMsg, setImportMsg] = React.useState(null)
  const variant = props !== null && typeof props === 'object' && props.variant === 'overlay'
    ? 'overlay'
    : 'header'

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      refreshCandidates()
      refreshPets()
      setImportMsg(null)
      petCall('getStatus', {}).then((res) => {
        if (res !== null && typeof res === 'object') {
          store.diag = { seen: res.seen, currentSession: res.currentSession }
          notify()
        }
      }).catch(() => {})
    }
  }

  async function onImport(id, overwrite) {
    setImportMsg('导入中…')
    const err = await importPet(id, overwrite)
    setImportMsg(err === null ? '导入成功' : err)
  }

  async function onImportAll() {
    setImportMsg('导入中…')
    const pending = s.importCandidates.filter((c) => c.valid && !c.existsInLibrary)
    if (pending.length === 0) {
      setImportMsg('没有可导入的宠物')
      return
    }
    let failed = 0
    for (const c of pending) {
      const err = await importPet(c.id, false)
      if (err !== null) failed++
    }
    setImportMsg(failed === 0 ? `已导入 ${pending.length} 只宠物` : `导入完成，${failed} 只失败`)
  }

  const menu = open
    ? React.createElement(
        'div',
        { className: 'dsh-pet-menu-wrap' },
        React.createElement('div', { className: 'dsh-pet-menu-backdrop', onClick: () => setOpen(false) }),
        React.createElement(
          'div',
          {
            className: variant === 'overlay' ? 'dsh-pet-menu dsh-pet-menu-overlay' : 'dsh-pet-menu',
            onClick: (e) => e.stopPropagation(),
          },
          React.createElement('h4', null, '宠物'),
          React.createElement(
            'div',
            { className: 'dsh-pet-item' },
            React.createElement('span', null, s.wake ? '已唤醒' : '已隐藏'),
            React.createElement('button', { className: 'dsh-pet-btn', onClick: () => setWake(!s.wake) }, s.wake ? '隐藏' : '唤醒'),
          ),
          React.createElement('h4', null, '选择宠物'),
          s.pets.length === 0
            ? React.createElement('div', { className: 'dsh-pet-muted' },
                s.petsError !== null ? s.petsError
                  : (s.initError !== null ? s.initError : '宠物库为空，请先从下方导入'))
            : s.pets.map((pet) => React.createElement(
                'div',
                {
                  key: pet.id,
                  className: 'dsh-pet-item' + (pet.id === s.petId ? ' selected' : ''),
                  onClick: () => { selectPet(pet.id); setOpen(false) },
                },
                React.createElement('span', null, pet.displayName + (pet.id === s.petId ? ' ✓' : '')),
              )),
          React.createElement('h4', null, '从 Codex 导入'),
          s.importCandidates.length === 0
            ? React.createElement('div', { className: 'dsh-pet-muted' },
                s.importError !== null ? s.importError : '未发现可导入的宠物包')
            : React.createElement(
                'div',
                null,
                React.createElement(
                  'div',
                  { className: 'dsh-pet-item' },
                  React.createElement('span', null, `共 ${s.importCandidates.filter((c) => c.valid).length} 只可导入`),
                  React.createElement('button', { className: 'dsh-pet-btn', onClick: onImportAll }, '全部导入'),
                ),
                s.importCandidates.filter((c) => c.valid).map((c) => React.createElement(
                  'div',
                  { key: c.id, className: 'dsh-pet-item' },
                  React.createElement('span', null, c.displayName),
                  c.existsInLibrary
                    ? React.createElement('button', { className: 'dsh-pet-btn', onClick: () => onImport(c.id, true) }, '覆盖')
                    : React.createElement('button', { className: 'dsh-pet-btn', onClick: () => onImport(c.id, false) }, '导入'),
                )),
              ),
          importMsg !== null
            ? React.createElement('div', { className: 'dsh-pet-muted' }, importMsg)
            : null,
          s.diag !== null && s.diag.seen !== undefined
            ? React.createElement(
                'div',
                { className: 'dsh-pet-muted' },
                `事件 status=${s.diag.seen.status} tools=${s.diag.seen.tools} approvals=${s.diag.seen.approvals} subagents=${s.diag.seen.subagents} errors=${s.diag.seen.errors} 会话=${s.diag.currentSession === null ? '未知(跟随一切)' : s.diag.currentSession}`,
              )
            : null,
        ),
      )
    : null

  return React.createElement(
    'div',
    { className: variant === 'overlay' ? 'dsh-pet-menu-wrap dsh-pet-menu-wrap-overlay' : 'dsh-pet-menu-wrap' },
    React.createElement('button', {
      className: variant === 'overlay' ? 'dsh-pet-wake' : 'dsh-pet-btn',
      onClick: toggle,
      title: '宠物',
    }, variant === 'overlay' ? '🐾' : '🐾 宠物'),
    menu,
  )
}

// ===== 头部入口（携带当前会话 id 上报）=====

function PetHeaderButton(props) {
  const sessionId = props !== null && typeof props === 'object' ? props.sessionId : undefined

  React.useEffect(() => {
    const id = typeof sessionId === 'string' ? sessionId : null
    if (id !== store.currentSession) {
      store.currentSession = id
      notify()
      petCall('setCurrentSession', { sessionId: id }).catch((err) => {
        console.error('[pet] setCurrentSession 失败', String(err))
      })
    }
    return () => {
      if (store.currentSession === id) {
        store.currentSession = null
        notify()
        petCall('setCurrentSession', { sessionId: null }).catch(() => {})
      }
    }
  }, [sessionId])

  return React.createElement(PetMenu, { variant: 'header' })
}

// ===== 插件注册 =====

const inject = ['slots']

function apply(ctx) {
  ctx.effect(() => {
    if (typeof document === 'undefined') return
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-pet'
    tag.textContent = PET_CSS
    document.head.append(tag)
    return () => tag.remove()
  }, 'dsh-pet: 样式')

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'dsh-pet', order: 0, label: '宠物' },
    (props) => React.createElement(PetRoot, props),
  ))

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register(
    { name: 'conversation.session.header.actions', id: 'dsh-pet', order: 30, label: '宠物' },
    (props) => React.createElement(PetHeaderButton, props),
  ))
}

module.exports = { apply, inject, extractCurrentSessionId }
