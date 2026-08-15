'use strict'
// 持久客户端 UI：宠物本体 + 状态浮层 + 头部/悬浮双入口菜单。
// 本文件由 scripts/build-client.mjs 包成 window.__ModuleLoader__.load 工厂；
// 不要在 factory 内使用 ESM import/export。

const React = require('react')
const ReactDOM = require('react-dom')

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
/* 宠物渲染在独立 portal（挂 document.body），z-index 直接参与根层比较。
   2147482999 = 页面内最顶层：高于一切面板/弹窗（设置弹窗 1000、侧边栏 50、
   其他插件浮层），仅低于 dsh-better-sidebar 的错误提示条（2147483000）。 */
.dsh-pet-root { position: fixed; z-index: 2147482999; pointer-events: auto; user-select: none; }
.dsh-pet-canvas { position: relative; width: 96px; height: 104px; overflow: hidden; cursor: grab; }
.dsh-pet-frame { position: absolute; left: 0; top: 0; image-rendering: pixelated; pointer-events: none; }
.dsh-pet-bubble { position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  background: rgba(30,30,30,.85); color: #fff; padding: 3px 10px; border-radius: 10px;
  font-size: 12px; white-space: nowrap; pointer-events: none; }
.dsh-pet-hide { position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; border-radius: 50%;
  border: none; background: rgba(40,40,40,.9); color: #fff; font-size: 11px; line-height: 1;
  cursor: pointer; display: none; }
.dsh-pet-root:hover .dsh-pet-hide { display: block; }
.dsh-pet-menu { position: static; width: 100%; max-height: none; overflow: visible;
  background: transparent; border: none; box-shadow: none; padding: 0;
  color: inherit; pointer-events: auto; }
.dsh-pet-menu h4 { margin: 14px 2px 8px; font-size: 11px; letter-spacing: .08em;
  text-transform: uppercase; color: var(--dsw-alias-label-tertiary, #999); font-weight: 600; }
.dsh-pet-menu h4:first-child { margin-top: 2px; }
.dsh-pet-item { display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 5px 2px; border-radius: 8px; cursor: pointer; font-size: 13px;
  background: transparent; border: none;
  transition: background .15s ease; }
.dsh-pet-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.06)); }
.dsh-pet-item.selected { background: transparent; }
.dsh-pet-btn { background: var(--dsw-alias-bg-module-platform, rgba(255,255,255,.1));
  color: var(--dsw-alias-label-primary, #eee);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.1));
  border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 500; cursor: pointer;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease; }
.dsh-pet-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.16));
  border-color: var(--dsw-alias-label-dimmed, rgba(255,255,255,.22)); }
.dsh-pet-btn:active { transform: translateY(1px); }
.dsh-pet-muted { color: var(--dsw-alias-label-tertiary, #999); font-size: 12px; }
.dsh-pet-dialog-mask { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; }
.dsh-pet-dialog { background: var(--dsw-alias-bg-layer-2, #1e1e1e); color: var(--dsw-alias-label-primary, #eee);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.1)); border-radius: 16px;
  width: min(560px, calc(100vw - 32px)); max-height: 70vh; display: flex; flex-direction: column;
  padding: 18px; gap: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
.dsh-pet-dialog-title { font-size: 15px; font-weight: 600; }
.dsh-pet-dialog-path { font-size: 12px; color: var(--dsw-alias-label-tertiary, #aaa); word-break: break-all;
  background: var(--dsw-alias-bg-layer-3, rgba(255,255,255,.04)); border-radius: 8px; padding: 6px 10px; }
.dsh-pet-dialog-error { color: #f66; font-size: 12px; }
.dsh-pet-dialog-crumbs { display: flex; flex-wrap: wrap; gap: 4px; font-size: 12px; }
.dsh-pet-dialog-crumb { background: none; border: none; color: var(--dsw-alias-brand-primary, #8ab4f8);
  cursor: pointer; padding: 3px 6px; border-radius: 6px; font-size: 12px; }
.dsh-pet-dialog-crumb:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.08)); }
.dsh-pet-dialog-list { overflow-y: auto; min-height: 160px; max-height: 320px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.1)); border-radius: 10px; padding: 4px; }
.dsh-pet-dialog-row { display: block; width: 100%; text-align: left; background: none; border: none;
  color: var(--dsw-alias-label-primary, #eee); padding: 7px 10px; border-radius: 8px; cursor: pointer;
  font-size: 13px; transition: background .12s ease; }
.dsh-pet-dialog-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.08)); }
.dsh-pet-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
.dsh-pet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px; }
.dsh-pet-card { display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 8px 8px; border-radius: 12px; cursor: pointer; user-select: none;
  background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.03));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.09));
  transition: background .15s ease, border-color .15s ease, transform .15s ease, box-shadow .15s ease; }
.dsh-pet-card:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.07));
  border-color: var(--dsw-alias-label-dimmed, rgba(255,255,255,.2)); transform: translateY(-1px); }
.dsh-pet-card.selected { background: var(--dsw-alias-interactive-bg-active, rgba(120,160,255,.16));
  border-color: var(--dsw-alias-brand-primary, rgba(120,160,255,.5));
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, rgba(120,160,255,.3)); }
.dsh-pet-card-preview { width: 96px; height: 104px; display: flex; align-items: center; justify-content: center;
  overflow: hidden; border-radius: 8px; background: rgba(0,0,0,.12); }
.dsh-pet-card-canvas { position: relative; width: 96px; height: 104px; overflow: hidden; }
.dsh-pet-card-frame { position: absolute; left: 0; top: 0; image-rendering: pixelated; pointer-events: none; }
.dsh-pet-card-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary, #eee); }
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
  initError: null,
  petsError: null,
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
  // 隐藏或尚未选择宠物时不再占用右下角；控制入口在头部按钮与设置页。
  return null
}

// ===== 独立容器 portal =====
// 渲染在 shell.overlay 槽位里会被其容器（z-index 20）的层级“困住”，任何面板
// （如 dsh-better-sidebar 的 50）都能盖住宠物。改挂到 document.body 的顶层
// 节点，让 .dsh-pet-root 的 z-index 在根层参与比较（见 PET_CSS 注释）。
function PetPortal(props) {
  const [node] = React.useState(() => {
    if (typeof document === 'undefined') return null
    const el = document.createElement('div')
    el.setAttribute('data-dsh-pet-portal', '')
    document.body.appendChild(el)
    return el
  })
  React.useEffect(() => () => { if (node !== null) node.remove() }, [node])
  if (node === null) return null
  return ReactDOM.createPortal(React.createElement(PetRoot, props), node)
}

// ===== 宠物预览卡片 =====

function PetPreviewCard({ pet, selected, onSelect }) {
  const [data, setData] = React.useState(null)
  const [tick, setTick] = React.useState(0)
  const [animIndex, setAnimIndex] = React.useState(0)
  const animRef = React.useRef({ name: null, at: 0 })

  React.useEffect(() => {
    let alive = true
    petCall('getPet', { id: pet.id }).then((res) => {
      if (!alive || res === null || typeof res !== 'object' || res.ok !== true) return
      setData({
        spriteUrl: res.spriteDataUrl,
        pet: res.pet,
        atlasRows: res.atlas !== null && typeof res.atlas === 'object' && res.atlas.rows > 0
          ? res.atlas.rows
          : 9,
      })
    }).catch(() => {})
    return () => { alive = false }
  }, [pet.id])

  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80)
    return () => clearInterval(id)
  }, [])

  if (data === null) {
    return React.createElement(
      'div',
      {
        className: 'dsh-pet-card' + (selected ? ' selected' : ''),
        onClick: () => onSelect(pet.id),
      },
      React.createElement('div', { className: 'dsh-pet-card-preview' }, '加载中…'),
      React.createElement('div', { className: 'dsh-pet-card-name' }, pet.displayName),
    )
  }

  const PREVIEW_ORDER = ['idle', 'waving', 'jumping', 'running', 'waiting', 'failed']
  const animNames = PREVIEW_ORDER.filter((name) => data.pet.states[name] !== undefined)
  const animName = animNames.length > 0
    ? animNames[animIndex % animNames.length]
    : Object.keys(data.pet.states)[0]
  const anim = data.pet.states[animName]
  if (animRef.current.name !== animName) {
    animRef.current = { name: animName, at: Date.now() }
  }
  const { frame } = frameIndex(anim, Date.now() - animRef.current.at)
  const cellW = 96
  const cellH = 104
  const frameStyle = {
    width: cellW * 8,
    height: cellH * data.atlasRows,
    transform: `translate(${-cellW * frame}px, ${-cellH * anim.row}px)`,
  }

  function handleClick() {
    onSelect(pet.id)
    if (animNames.length > 0) {
      setAnimIndex((i) => (i + 1) % animNames.length)
    }
  }

  return React.createElement(
    'div',
    {
      className: 'dsh-pet-card' + (selected ? ' selected' : ''),
      onClick: handleClick,
    },
    React.createElement(
      'div',
      { className: 'dsh-pet-card-preview' },
      React.createElement(
        'div',
        { className: 'dsh-pet-card-canvas' },
        React.createElement('img', { className: 'dsh-pet-card-frame', src: data.spriteUrl, style: frameStyle, alt: '' }),
      ),
    ),
    React.createElement('div', { className: 'dsh-pet-card-name' }, pet.displayName),
  )
}

// ===== 宠物设置面板 =====

function PetMenu(props) {
  const s = useStore()
  const [importMsg, setImportMsg] = React.useState(null)
  const [browser, setBrowser] = React.useState({
    open: false,
    path: null,
    entries: [],
    crumbs: [],
    loading: false,
    error: null,
  })

  React.useEffect(() => {
    refreshPets()
    setImportMsg(null)
  }, [])

  async function importFromPath(path) {
    console.log('[pet] importPet request', { path })
    try {
      const res = await petCall('importPet', { path })
      console.log('[pet] importPet response', res)
      if (res !== null && typeof res === 'object' && res.ok) {
        await refreshPets()
        if (typeof res.imported === 'number') {
          const parts = [`导入成功 ${res.imported} 个`]
          if (res.skipped > 0) parts.push(`跳过 ${res.skipped} 个`)
          if (res.failed > 0) {
            parts.push(`失败 ${res.failed} 个`)
            if (Array.isArray(res.errors) && res.errors.length > 0) {
              parts.push(`详情：${res.errors.join('；')}`)
            }
          }
          const message = parts.join('，')
          if (res.failed > 0) window.alert(message)
          return message
        }
        return null
      }
      const errText = res !== null && typeof res === 'object' && typeof res.error === 'string'
        ? res.error
        : '导入失败'
      console.error('[pet] importPet 失败', errText)
      window.alert('导入失败：' + errText)
      return errText
    } catch (err) {
      console.error('[pet] importPet 异常', err)
      window.alert('导入异常：' + String(err))
      return String(err)
    }
  }

  async function openBrowser() {
    if (typeof props.listDirectory !== 'function') {
      setImportMsg('当前环境不支持目录浏览')
      return
    }
    setBrowser({ open: true, path: null, entries: [], crumbs: [], loading: true, error: null })
    try {
      const listing = await props.listDirectory()
      setBrowser({ open: true, path: listing.path, entries: listing.entries, crumbs: listing.crumbs, loading: false, error: null })
    } catch (err) {
      setBrowser({ open: true, path: null, entries: [], crumbs: [], loading: false, error: String(err && err.message ? err.message : err) })
    }
  }

  async function navigateBrowser(nextPath) {
    setBrowser((b) => ({ ...b, loading: true, error: null }))
    try {
      const listing = await props.listDirectory(nextPath)
      setBrowser({ open: true, path: listing.path, entries: listing.entries, crumbs: listing.crumbs, loading: false, error: null })
    } catch (err) {
      setBrowser((b) => ({ ...b, loading: false, error: String(err && err.message ? err.message : err) }))
    }
  }

  function closeBrowser() {
    setBrowser({ open: false, path: null, entries: [], crumbs: [], loading: false, error: null })
  }

  function chooseBrowserPath() {
    const path = browser.path
    closeBrowser()
    if (path === null) return
    setImportMsg('导入中…')
    importFromPath(path).then((err) => {
      setImportMsg(err === null ? '导入成功' : err)
    })
  }

  return React.createElement(
    'div',
    { className: 'dsh-pet-menu' },
    React.createElement('h4', null, '宠物'),
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, s.wake ? '已唤醒' : '已隐藏'),
      React.createElement('button', { className: 'dsh-pet-btn', onClick: () => setWake(!s.wake) }, s.wake ? '隐藏' : '唤醒'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, '导入宠物'),
      React.createElement('button', { className: 'dsh-pet-btn', onClick: openBrowser }, '选择路径…'),
    ),
    React.createElement('h4', null, '选择宠物'),
    s.pets.length === 0
      ? React.createElement('div', { className: 'dsh-pet-muted' },
          s.petsError !== null ? s.petsError
            : (s.initError !== null ? s.initError : '宠物库为空，请先导入宠物'))
      : React.createElement(
          'div',
          { className: 'dsh-pet-grid' },
          s.pets.map((pet) => React.createElement(PetPreviewCard, {
            key: pet.id,
            pet,
            selected: pet.id === s.petId,
            onSelect: (id) => { selectPet(id) },
          })),
        ),
    importMsg !== null
      ? React.createElement('div', { className: 'dsh-pet-muted' }, importMsg)
      : null,
    browser.open
      ? React.createElement(
          'div',
          { className: 'dsh-pet-dialog-mask', onClick: closeBrowser },
          React.createElement(
            'div',
            { className: 'dsh-pet-dialog', onClick: (e) => e.stopPropagation() },
            React.createElement('div', { className: 'dsh-pet-dialog-title' }, '选择宠物包目录'),
            React.createElement('div', { className: 'dsh-pet-dialog-path' }, browser.path || '加载中…'),
            browser.error !== null
              ? React.createElement('div', { className: 'dsh-pet-dialog-error' }, browser.error)
              : null,
            React.createElement(
              'div',
              { className: 'dsh-pet-dialog-crumbs' },
              browser.crumbs.map((c) => React.createElement(
                'button',
                { key: c.path, className: 'dsh-pet-dialog-crumb', onClick: () => navigateBrowser(c.path) },
                c.name,
              )),
            ),
            React.createElement(
              'div',
              { className: 'dsh-pet-dialog-list' },
              browser.entries.map((entry) => React.createElement(
                'button',
                { key: entry.path, className: 'dsh-pet-dialog-row', onClick: () => navigateBrowser(entry.path) },
                entry.name,
              )),
            ),
            React.createElement(
              'div',
              { className: 'dsh-pet-dialog-actions' },
              React.createElement('button', { className: 'dsh-pet-btn', onClick: closeBrowser }, '取消'),
              React.createElement('button', { className: 'dsh-pet-btn', onClick: chooseBrowserPath, disabled: browser.path === null }, '选择此目录'),
            ),
          ),
        )
      : null,
  )
}

// ===== 设置页导航图标修补 =====
// DSH 设置面板的导航图标由宿主根据 section id 硬编码；pet 不在白名单时会回退成通用齿轮。
// 这里在运行时把“宠物”导航项的齿轮替换为 Unicode 熊猫图标，避免出现“齿轮 + 文本”的双图标。
function patchPetNavIcon() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {}

  const NAV_LABEL = '宠物'
  const PET_GLYPH = '🐼'

  function patchOnce() {
    const buttons = document.querySelectorAll('button')
    for (const btn of buttons) {
      if (btn.dataset.dshPetNav === '1') continue
      const children = Array.from(btn.children)
      if (children.length < 2) continue
      const label = children[children.length - 1]
      if (label.tagName !== 'SPAN' || label.textContent.trim() !== NAV_LABEL) continue
      if (!btn.closest('[role="dialog"]')) continue

      btn.dataset.dshPetNav = '1'
      const icon = children[0]
      const glyph = document.createElement('span')
      glyph.textContent = PET_GLYPH
      glyph.setAttribute('aria-hidden', 'true')
      glyph.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;font-size:15px;line-height:1;'
      icon.replaceWith(glyph)
    }
  }

  patchOnce()
  const observer = new MutationObserver(patchOnce)
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}

// ===== 插件注册 =====

const inject = ['slots', 'workspaces']

function apply(ctx) {
  ctx.effect(() => patchPetNavIcon(), 'dsh-pet: 设置页导航图标')

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
    (props) => React.createElement(PetPortal, props),
  ))

  ctx.slots.inject('settings.section', () => ctx.slots.register(
    {
      name: 'settings.section',
      id: 'pet',
      order: 30,
      label: '宠物',
      inject: () => ({
        listDirectory: typeof ctx.workspaces === 'object' && ctx.workspaces !== null
          ? (path) => ctx.workspaces.listDirectory(path)
          : null,
        createDirectory: typeof ctx.workspaces === 'object' && ctx.workspaces !== null
          ? (path, name) => ctx.workspaces.createDirectory(path, name)
          : null,
      }),
    },
    (props) => React.createElement(PetMenu, props),
  ))
}

module.exports = { apply, inject, extractCurrentSessionId }
