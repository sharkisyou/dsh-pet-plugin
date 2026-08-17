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
const PET_MARKET_URL = 'https://petdex.dev/zh'
const PET_MARKET_W = 960
const PET_MARKET_H = 720

function openPetMarket() {
  const left = Math.max(0, Math.round((window.screen.width - PET_MARKET_W) / 2))
  const top = Math.max(0, Math.round((window.screen.height - PET_MARKET_H) / 2))
  const features = `width=${PET_MARKET_W},height=${PET_MARKET_H},left=${left},top=${top},popup=yes,resizable=yes,scrollbars=yes`
  window.open(PET_MARKET_URL, 'petdex-market', features)
}

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
  background: var(--dsw-alias-bg-layer-2, rgba(30,30,30,.85)); color: var(--dsw-alias-label-primary, #fff);
  padding: 3px 10px; border-radius: 10px; font-size: 12px; white-space: nowrap; pointer-events: none; }
.dsh-pet-bubble--action { pointer-events: auto; cursor: pointer; border: none; font-family: inherit;
  transition: background .15s ease, box-shadow .15s ease; }
.dsh-pet-bubble--action:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.08));
  box-shadow: 0 2px 10px rgba(0,0,0,.25); }
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
.dsh-pet-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 10px 8px 8px; border-radius: 12px; cursor: pointer; user-select: none;
  background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.03));
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.09));
  transition: background .15s ease, border-color .15s ease, transform .15s ease, box-shadow .15s ease; }
.dsh-pet-card:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.07));
  border-color: var(--dsw-alias-label-dimmed, rgba(255,255,255,.2)); transform: translateY(-1px); }
.dsh-pet-card.selected { background: var(--dsw-alias-interactive-bg-active, rgba(120,160,255,.16));
  border-color: var(--dsw-alias-brand-primary, rgba(120,160,255,.65));
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, rgba(120,160,255,.45)),
    0 0 18px rgba(120,160,255,.28); }
.dsh-pet-card-preview { width: 96px; height: 104px; display: flex; align-items: center; justify-content: center;
  overflow: hidden; border-radius: 8px; background: rgba(0,0,0,.12); }
.dsh-pet-card-canvas { position: relative; width: 96px; height: 104px; overflow: hidden; }
.dsh-pet-card-frame { position: absolute; left: 0; top: 0; image-rendering: pixelated; pointer-events: none; }
.dsh-pet-card-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary, #eee); }
.dsh-pet-divider { height: 1px; background: var(--dsw-alias-border-l1, rgba(255,255,255,.08));
  margin: 10px 2px 4px; }
.dsh-pet-card-delete { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center; padding: 0;
  border-radius: 50%; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.65); font-size: 13px; line-height: 1; cursor: pointer;
  opacity: .55; transition: opacity .15s ease, color .15s ease, background .15s ease, border-color .15s ease; }
.dsh-pet-card-delete:hover { opacity: 1; color: #ff6b6b; background: rgba(220,60,60,.25);
  border-color: rgba(255,80,80,.4); }
.dsh-pet-scale { display: flex; align-items: center; gap: 6px; }
.dsh-pet-scale-btn { min-width: 32px; height: 32px; padding: 0 10px; flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;
  background: var(--dsw-alias-bg-module-platform, rgba(255,255,255,.1));
  color: var(--dsw-alias-label-primary, #eee);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.1));
  font-size: 14px; line-height: 1; cursor: pointer; user-select: none;
  transition: background .15s ease, border-color .15s ease, transform .15s ease; }
.dsh-pet-scale-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.16));
  border-color: var(--dsw-alias-label-dimmed, rgba(255,255,255,.22)); }
.dsh-pet-scale-btn:active:not(:disabled) { transform: translateY(1px); }
.dsh-pet-scale-btn:disabled { opacity: .35; cursor: default; }
.dsh-pet-scale-slider { position: relative; flex: 1 1 auto; min-width: 110px; }
.dsh-pet-scale-range { display: block; width: 100%; height: 18px; margin: 0; padding: 0;
  border: none; background: transparent; -webkit-appearance: none; appearance: none; cursor: pointer; }
.dsh-pet-scale-range:focus { outline: none; }
.dsh-pet-scale-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px rgba(120,160,255,.35), 0 1px 4px rgba(0,0,0,.35); }
.dsh-pet-scale-range:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 3px rgba(120,160,255,.35), 0 1px 4px rgba(0,0,0,.35); }
.dsh-pet-scale-range::-webkit-slider-runnable-track { -webkit-appearance: none; appearance: none;
  height: 4px; border-radius: 999px; border: none;
  background: linear-gradient(to right,
    var(--dsw-alias-brand-primary, #8ab4f8) 0,
    var(--dsw-alias-brand-primary, #8ab4f8) var(--dsh-pet-scale-fill, 50%),
    var(--dsw-alias-border-l2, rgba(255,255,255,.18)) var(--dsh-pet-scale-fill, 50%),
    var(--dsw-alias-border-l2, rgba(255,255,255,.18)) 100%); }
.dsh-pet-scale-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none;
  width: 14px; height: 14px; margin-top: -5px; border-radius: 50%;
  background: #fff; border: 2px solid var(--dsw-alias-label-secondary, #999);
  box-shadow: 0 1px 4px rgba(0,0,0,.35);
  transition: transform .15s ease, box-shadow .15s ease; }
.dsh-pet-scale-range:hover::-webkit-slider-thumb { transform: scale(1.08); }
.dsh-pet-scale-range:active::-webkit-slider-thumb { transform: scale(1.18); }
.dsh-pet-scale-range::-moz-range-track { height: 4px; border-radius: 999px;
  background: var(--dsw-alias-border-l2, rgba(255,255,255,.18)); }
.dsh-pet-scale-range::-moz-range-progress { height: 4px; border-radius: 999px;
  background: var(--dsw-alias-brand-primary, #8ab4f8); }
.dsh-pet-scale-range::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%;
  background: #fff; border: 2px solid var(--dsw-alias-label-secondary, #999);
  box-shadow: 0 1px 4px rgba(0,0,0,.35); }
.dsh-pet-scale-value { min-width: 42px; text-align: center; font-size: 12px;
  font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-secondary, #ccc); }
.dsh-pet-tray { position: absolute; width: min(320px, calc(100vw - 32px)); max-width: none; max-height: 240px;
  display: flex; flex-direction: column;
  background: var(--dsw-alias-bg-layer-2, #1e1e1e);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35));
  border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.25); overflow: hidden;
  opacity: 0; transform: translateY(6px); pointer-events: none; }
.dsh-pet-tray-open { opacity: 1; transform: translateY(0); pointer-events: auto;
  animation: dsh-pet-tray-in .16s ease; }
.dsh-pet-tray-closing { opacity: 0; transform: translateY(6px); pointer-events: none;
  transition: opacity .16s ease, transform .16s ease; }
@keyframes dsh-pet-tray-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.dsh-pet-tray-header { display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, #888); border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.2)); }
.dsh-pet-tray-close { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
  background: none; border: none; border-radius: 6px; color: var(--dsw-alias-label-tertiary, #888);
  cursor: pointer; font-size: 16px; line-height: 1; padding: 0; }
.dsh-pet-tray-close:hover { color: var(--dsw-alias-label-primary, #222); background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.dsh-pet-tray-list { overflow-y: auto; max-height: 200px; padding: 4px; }
.dsh-pet-tray-item { display: flex; flex-direction: column; gap: 3px; width: 100%; text-align: left;
  background: none; border: none; border-radius: 8px; padding: 7px 8px; cursor: pointer;
  color: var(--dsw-alias-label-primary, #222); }
.dsh-pet-tray-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.dsh-pet-tray-item.current { background: var(--dsw-alias-interactive-bg-active, rgba(120,160,255,.16));
  box-shadow: inset 2px 0 0 var(--dsw-alias-brand-primary, rgba(120,160,255,.6)); }
.dsh-pet-tray-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-pet-tray-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.dsh-pet-tray-dot--working { animation: dsh-pet-dot-pulse 1.6s ease-in-out infinite; }
@keyframes dsh-pet-dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(77,163,255,.45); }
  50% { box-shadow: 0 0 0 4px rgba(77,163,255,0); }
}
.dsh-pet-tray-title { flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-pet-tray-meta { display: flex; align-items: center; gap: 8px; padding-left: 14px;
  font-size: 11px; color: var(--dsw-alias-label-tertiary, #888); }
.dsh-pet-tray-state { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-pet-tray-time { margin-left: auto; flex: 0 0 auto; }
`

// ===== 客户端共享状态 =====

let clientCtx = null

const store = {
  inited: false,
  currentSession: null,
  state: { state: 'idle', bubble: '空闲' },
  hostState: 'idle',
  hostBubble: '空闲',
  activities: [],
  trayItems: [],
  activeSessionIds: [],
  trayOpen: false,
  trayManualOpen: false,
  traySuppressed: false,
  suppressedSnapshot: null,
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
  scale: 1,
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
      scale: store.scale,
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
        if (typeof st.state.scale === 'number' && st.state.scale > 0) {
          store.scale = Math.min(2, Math.max(0.5, st.state.scale))
        }
      } else if (st !== null && typeof st === 'object' && st.ok === false) {
        store.initError = '状态读取失败: ' + (typeof st.error === 'string' ? st.error : '未知')
      }
      petCall('resetAcknowledged', {}).catch(() => {})
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

async function deletePet(id) {
  try {
    const res = await petCall('deletePet', { id })
    if (res !== null && typeof res === 'object' && res.ok) {
      if (store.petId === id) {
        store.petId = null
        store.pet = null
        store.spriteUrl = null
        store.greeting = false
        store.clickAnim = null
        store.lastClickAnim = null
        await persist()
      }
      await refreshPets()
      return null
    }
    return res !== null && typeof res === 'object' && typeof res.error === 'string' ? res.error : '删除失败'
  } catch (err) {
    return '删除异常: ' + String(err)
  }
}

function setWake(next) {
  store.wake = next
  if (next) store.greeting = true
  notify()
  persist()
}

function setScale(next) {
  const scale = Math.min(2, Math.max(0.5, Number(next) || 1))
  if (store.scale === scale) return
  store.scale = scale
  notify()
  persist()
}

// 宠物状态 → 动画行名
const STATE_ROW = { idle: 'idle', working: 'running', waiting: 'waiting', failed: 'failed', ready: 'review' }

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

// ===== 多会话辅助（纯逻辑在 src/multi-session.js 内嵌）=====

function topLevelSessionsOf(list) {
  if (list === null || typeof list !== 'object') return []
  if (Array.isArray(list)) return list.filter(isTopLevelSession)
  const byId = list.byId
  if (byId === null || typeof byId !== 'object') return []
  const ids = Array.isArray(list.ids) ? list.ids : Object.keys(byId)
  const out = []
  for (const id of ids) {
    const entry = byId[id]
    if (isTopLevelSession(entry)) out.push(entry)
  }
  return out
}

function activeIdsOf(items) {
  return (Array.isArray(items) ? items : []).map((x) => x.sessionId).sort()
}

function sameIdSet(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function highPriorityKey(item) {
  if (item.state === 'failed') return `${item.sessionId}:failed`
  if (item.state === 'waiting') return `${item.sessionId}:waiting:${item.pendingKind || ''}`
  return null
}

function formatActivityTime(ts) {
  if (typeof ts !== 'number' || ts <= 0) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `${hh}:${mm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}

function openTrayManually() {
  store.trayManualOpen = true
  store.trayOpen = true
  store.traySuppressed = false
  store.suppressedSnapshot = null
  notify()
}

function closeTrayManually() {
  const currentItems = Array.isArray(store.trayItems) ? store.trayItems : []
  store.trayManualOpen = false
  store.trayOpen = false
  store.traySuppressed = true
  store.suppressedSnapshot = {
    ids: Array.isArray(store.activeSessionIds) ? store.activeSessionIds.slice() : activeIdsOf(currentItems),
    high: currentItems.map(highPriorityKey).filter(Boolean),
  }
  notify()
}

// ===== 活动托盘 =====

function clampPetPosition(x, y, cellW, cellH) {
  if (typeof window === 'undefined') return { x, y }
  const visible = 48
  const minX = Math.min(-cellW + visible, 0)
  const maxX = Math.max(window.innerWidth - visible, minX)
  const minY = Math.min(-cellH + visible, 0)
  const maxY = Math.max(window.innerHeight - visible, minY)
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  }
}

function trayStatusColor(state) {
  switch (state) {
    case 'working': return '#4da3ff'
    case 'waiting': return '#f0c543'
    case 'failed': return '#f0655a'
    case 'ready': return '#3fb27f'
    default: return '#8a8a8f'
  }
}

function ActivityTray({ closing = false }) {
  const s = useStore()
  const items = Array.isArray(s.trayItems) ? s.trayItems : []
  const scale = typeof s.scale === 'number' && s.scale > 0 ? s.scale : 1
  const cellW = 96 * scale
  const cellH = 104 * scale
  const TRAY_W = 320
  const TRAY_H = 240
  const GAP = 10
  const MARGIN = 8
  let placementStyle = {}

  if (typeof window !== 'undefined') {
    const rootX = s.pos && s.pos.x !== null ? s.pos.x : window.innerWidth - 16 - cellW
    const rootY = s.pos && s.pos.y !== null ? s.pos.y : window.innerHeight - 16 - cellH
    const trayW = Math.min(TRAY_W, window.innerWidth - 32)
    const aboveSpace = rootY - GAP - MARGIN
    const rightSpace = window.innerWidth - (rootX + cellW) - GAP - MARGIN
    const leftSpace = rootX - GAP - MARGIN
    let placement = 'above'
    if (aboveSpace < TRAY_H && rightSpace >= trayW) placement = 'right'
    else if (aboveSpace < TRAY_H && leftSpace >= trayW) placement = 'left'

    if (placement === 'above') {
      const left = Math.max(MARGIN, Math.min(rootX + cellW / 2 - trayW / 2, window.innerWidth - trayW - MARGIN))
      placementStyle = { bottom: `calc(100% + ${GAP}px)`, left: left - rootX }
    } else if (placement === 'right') {
      const top = Math.max(MARGIN, Math.min(rootY + cellH / 2 - TRAY_H / 2, window.innerHeight - TRAY_H - MARGIN))
      placementStyle = { left: `calc(100% + ${GAP}px)`, top: top - rootY }
    } else {
      const top = Math.max(MARGIN, Math.min(rootY + cellH / 2 - TRAY_H / 2, window.innerHeight - TRAY_H - MARGIN))
      placementStyle = { right: `calc(100% + ${GAP}px)`, top: top - rootY }
    }
  } else {
    placementStyle = { bottom: 'calc(100% + 10px)', left: 0 }
  }

  function onTrayHeaderPointerDown(e) {
    if (e.target.closest('button')) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const rootEl = e.currentTarget.closest('.dsh-pet-root')
    if (!rootEl) return
    const rect = rootEl.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const baseX = rect.left
    const baseY = rect.top
    let moved = false
    const onMove = (ev) => {
      if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > DRAG_THRESHOLD_PX) {
        moved = true
      }
      if (moved) {
        store.pos = clampPetPosition(baseX + (ev.clientX - startX), baseY + (ev.clientY - startY), cellW, cellH)
        notify()
      }
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      if (moved) persist()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  const rows = items.map((item) => {
    const text = statusTextFor(item.state, item.bubble, item.pendingKind)
    const time = formatActivityTime(item.lastEventAt)
    return React.createElement(
      'button',
      {
        key: item.sessionId,
        className: 'dsh-pet-tray-item' + (item.current ? ' current' : ''),
        onClick: () => {
          if (item.current) return
          console.debug('[pet] tray open session', { sessionId: item.sessionId, current: store.currentSession })
          store.trayManualOpen = false
          if (clientCtx !== null && clientCtx.sessions && typeof clientCtx.sessions.open === 'function') {
            clientCtx.sessions.open(item.sessionId)
          }
        },
      },
      React.createElement(
        'div',
        { className: 'dsh-pet-tray-line' },
        React.createElement('span', {
          className: 'dsh-pet-tray-dot' + (item.state === 'working' ? ' dsh-pet-tray-dot--working' : ''),
          style: { background: trayStatusColor(item.state) },
          'aria-hidden': true,
        }),
        React.createElement('div', { className: 'dsh-pet-tray-title' }, item.title),
      ),
      React.createElement(
        'div',
        { className: 'dsh-pet-tray-meta' },
        React.createElement('span', { className: 'dsh-pet-tray-state' }, text),
        time !== '' ? React.createElement('span', { className: 'dsh-pet-tray-time' }, time) : null,
      ),
    )
  })

  return React.createElement(
    'div',
    {
      className: 'dsh-pet-tray' + (closing ? ' dsh-pet-tray-closing' : ' dsh-pet-tray-open'),
      style: placementStyle,
      role: 'dialog',
      'aria-label': '活动列表',
    },
    React.createElement(
      'div',
      { className: 'dsh-pet-tray-header', onPointerDown: onTrayHeaderPointerDown, title: '拖动可移动宠物', style: { cursor: 'move' } },
      React.createElement('span', null, '活动'),
      React.createElement('button', {
        className: 'dsh-pet-tray-close',
        onClick: closeTrayManually,
        title: '关闭托盘',
        'aria-label': '关闭活动托盘',
      }, '×'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-tray-list' },
      rows.length > 0 ? rows : React.createElement('div', { className: 'dsh-pet-muted', style: { padding: '8px' } }, '暂无活动'),
    ),
  )
}

// ===== 宠物本体 =====

function PetView() {
  const s = useStore()
  const [, setTick] = React.useState(0)
  const dragRef = React.useRef({ moved: false })
  const [trayClosing, setTrayClosing] = React.useState(false)
  const trayWasOpenRef = React.useRef(false)

  React.useLayoutEffect(() => {
    if (s.trayOpen) {
      trayWasOpenRef.current = true
      setTrayClosing(false)
      return undefined
    }
    if (trayWasOpenRef.current) {
      setTrayClosing(true)
      const t = setTimeout(() => {
        trayWasOpenRef.current = false
        setTrayClosing(false)
      }, 160)
      return () => clearTimeout(t)
    }
    return undefined
  }, [s.trayOpen])

  React.useEffect(() => {
    let alive = true
    const fetchStatus = async () => {
      try {
        const res = await petCall('getStatus', {})
        if (!alive || res === null || typeof res !== 'object') return
        if (typeof res.state === 'string') {
          store.hostState = res.state
          store.hostBubble = typeof res.bubble === 'string' ? res.bubble : '空闲'
        }
        if (Array.isArray(res.activities)) {
          store.activities = res.activities
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

  const scale = typeof s.scale === 'number' && s.scale > 0 ? s.scale : 1
  const cellW = 96 * scale
  const cellH = 104 * scale
  const frameStyle = {
    width: cellW * 8,
    height: cellH * s.atlasRows,
    transform: `translate(${-cellW * frame}px, ${-cellH * anim.row}px)`,
  }

  React.useEffect(() => {
    if (typeof window === 'undefined' || s.pos.x === null) return
    const next = clampPetPosition(s.pos.x, s.pos.y, cellW, cellH)
    if (next.x !== s.pos.x || next.y !== s.pos.y) {
      store.pos = next
      notify()
      persist()
    }
  }, [s.pos, cellW, cellH])

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
        store.pos = clampPetPosition(baseX + (ev.clientX - startX), baseY + (ev.clientY - startY), cellW, cellH)
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

  const showTray = s.trayOpen || trayClosing || trayWasOpenRef.current
  const children = []
  if (!showTray) {
    if (s.trayItems.length > 0) {
      children.push(React.createElement(
        'button',
        {
          className: 'dsh-pet-bubble dsh-pet-bubble--action',
          onClick: (e) => { e.stopPropagation(); openTrayManually() },
          title: '打开活动托盘',
          'aria-label': '打开活动托盘',
        },
        `${s.state.bubble} ▾`,
      ))
    } else {
      children.push(React.createElement('div', { className: 'dsh-pet-bubble' }, s.state.bubble))
    }
  }
  if (showTray) {
    children.push(React.createElement(ActivityTray, { closing: !s.trayOpen && trayClosing }))
  }
  children.push(
    React.createElement(
      'div',
      { className: 'dsh-pet-canvas', style: { width: cellW, height: cellH }, onPointerDown: onPointerDown, onClick: onClickPet },
      React.createElement('img', { className: 'dsh-pet-frame', src: s.spriteUrl, style: frameStyle, alt: '' }),
    ),
    React.createElement('button', { className: 'dsh-pet-hide', onClick: onHide, title: '隐藏' }, '×'),
  )

  return React.createElement(
    'div',
    { className: 'dsh-pet-root', style: rootStyle },
    ...children,
  )
}

function PetRoot(props) {
  const s = useStore()
  React.useEffect(() => { ensureInit() }, [])

  const useSessions = props !== null && typeof props === 'object' ? props.useSessions : undefined
  const sessionsList = typeof useSessions === 'function' ? useSessions(selectAll) : null
  const sessions = React.useMemo(() => topLevelSessionsOf(sessionsList), [sessionsList])
  const trayItems = React.useMemo(
    () => buildTray({ sessions, activities: s.activities, currentSession: s.currentSession }),
    [sessions, s.activities, s.currentSession],
  )
  const allActiveItems = React.useMemo(
    () => buildAllActive({ sessions, activities: s.activities }),
    [sessions, s.activities],
  )
  const autoOpen = React.useMemo(() => shouldAutoOpen(trayItems, s.currentSession), [trayItems, s.currentSession])
  const top = React.useMemo(() => pickTop(trayItems), [trayItems])

  React.useEffect(() => {
    if (sessionsList === null || typeof sessionsList !== 'object') return
    const id = extractCurrentSessionId(sessionsList)
    if (id !== store.currentSession) {
      const prev = store.currentSession
      store.currentSession = id
      console.debug('[pet] currentSession', { from: prev, to: id })
      notify()
      petCall('setCurrentSession', { sessionId: id }).catch(() => {})
    }
  }, [sessionsList])

  React.useEffect(() => {
    if (sessionsList === null || typeof sessionsList !== 'object') return
    const ids = sessions.map(entryIdOf).filter((id) => id !== null)
    console.debug('[pet] syncSessions', { ids })
    petCall('syncSessions', { ids }).catch(() => {})
  }, [sessionsList, sessions])

  React.useEffect(() => {
    const same = store.trayItems.length === trayItems.length &&
      store.trayItems.every((item, i) => item.sessionId === trayItems[i].sessionId &&
        item.state === trayItems[i].state && item.title === trayItems[i].title &&
        item.current === trayItems[i].current && item.lastEventAt === trayItems[i].lastEventAt)
    if (!same) {
      store.trayItems = trayItems
      notify()
    }
  }, [trayItems])

  React.useEffect(() => {
    const ids = activeIdsOf(allActiveItems)
    const same = store.activeSessionIds.length === ids.length &&
      store.activeSessionIds.every((id, i) => id === ids[i])
    if (!same) {
      store.activeSessionIds = ids
      notify()
    }
  }, [allActiveItems])

  React.useEffect(() => {
    const next = top
      ? { state: top.state, bubble: top.bubble || statusTextFor(top.state, top.bubble, top.pendingKind) }
      : (store.hostState && store.hostState !== 'idle')
        ? { state: store.hostState, bubble: store.hostBubble || '空闲' }
        : { state: 'idle', bubble: '空闲' }
    if (store.state.state !== next.state || store.state.bubble !== next.bubble) {
      console.debug('[pet] state ->', next)
      store.state = next
      notify()
    }
  }, [top, store.hostState, store.hostBubble])

  React.useEffect(() => {
    if (store.trayManualOpen) return
    const currentIds = Array.isArray(store.activeSessionIds) ? store.activeSessionIds : activeIdsOf(trayItems)
    if (store.traySuppressed) {
      const rawSnap = store.suppressedSnapshot
      const snapIds = Array.isArray(rawSnap) ? rawSnap : (rawSnap && Array.isArray(rawSnap.ids) ? rawSnap.ids : [])
      const snapHigh = !Array.isArray(rawSnap) && rawSnap && Array.isArray(rawSnap.high) ? rawSnap.high : []
      const currentHigh = (Array.isArray(trayItems) ? trayItems : []).map(highPriorityKey).filter(Boolean)
      const hasNewHigh = currentHigh.some((key) => !snapHigh.includes(key))
      if (!sameIdSet(currentIds, snapIds) || hasNewHigh) {
        store.traySuppressed = false
        store.suppressedSnapshot = null
        store.trayOpen = hasNewHigh ? true : autoOpen
        notify()
      }
      return
    }
    if (store.trayOpen !== autoOpen) {
      store.trayOpen = autoOpen
      notify()
    }
  }, [autoOpen, trayItems, store.activeSessionIds, store.trayManualOpen, store.traySuppressed, store.suppressedSnapshot])

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

function PetPreviewCard({ pet, selected, onSelect, onDelete }) {
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
      React.createElement('button', {
        className: 'dsh-pet-card-delete',
        onClick: (e) => { e.stopPropagation(); onDelete(pet.id) },
        title: '删除宠物',
        'aria-label': `删除宠物 ${pet.displayName}`,
      }, '🗑'),
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
    React.createElement('button', {
      className: 'dsh-pet-card-delete',
      onClick: (e) => { e.stopPropagation(); onDelete(pet.id) },
      title: '删除宠物',
      'aria-label': `删除宠物 ${pet.displayName}`,
    }, '🗑'),
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

// ===== 缩放控件 =====

function ScaleControl() {
  const s = useStore()
  const sliderRef = React.useRef(null)
  const repeatRef = React.useRef({ timer: null, delay: null, step: 0.1, count: 0, dir: null })
  const suppressClickRef = React.useRef(false)

  const scale = typeof s.scale === 'number' && s.scale > 0 ? s.scale : 1
  const percent = Math.round(scale * 100)
  const sliderPos = scale <= 1 ? Math.round((scale - 0.5) * 200) : Math.round(scale * 100)
  const fillPct = Math.round((sliderPos / 200) * 100)

  const clearRepeat = React.useCallback(() => {
    const r = repeatRef.current
    if (r.delay !== null) { clearTimeout(r.delay); r.delay = null }
    if (r.timer !== null) { clearInterval(r.timer); r.timer = null }
    r.dir = null
  }, [])

  React.useEffect(() => () => clearRepeat(), [clearRepeat])

  const stepBy = React.useCallback((delta) => {
    setScale(store.scale + delta)
  }, [])

  const startRepeat = React.useCallback((dir) => {
    clearRepeat()
    const r = repeatRef.current
    r.dir = dir
    r.step = 0.1
    r.count = 0
    stepBy(dir === 'plus' ? 0.1 : -0.1)
    r.delay = setTimeout(() => {
      r.timer = setInterval(() => {
        r.count++
        if (r.count % 5 === 0) {
          r.step = Math.min(0.5, r.step + 0.1)
        }
        stepBy(dir === 'plus' ? r.step : -r.step)
      }, 80)
    }, 350)
  }, [clearRepeat, stepBy])

  const stopRepeat = React.useCallback(() => {
    clearRepeat()
  }, [clearRepeat])

  React.useEffect(() => {
    const el = sliderRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      setScale(store.scale + delta)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function handlePointerDown(dir) {
    return (e) => {
      e.preventDefault()
      suppressClickRef.current = true
      startRepeat(dir)
    }
  }

  function handleClick(dir) {
    return () => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      stepBy(dir === 'plus' ? 0.1 : -0.1)
    }
  }

  function finishPointer() {
    stopRepeat()
    setTimeout(() => { suppressClickRef.current = false }, 0)
  }

  function handleSliderChange(e) {
    const pos = Number(e.target.value)
    const next = pos <= 100 ? 0.5 + pos / 200 : pos / 100
    setScale(next)
  }

  const commonButtonProps = {
    type: 'button',
    className: 'dsh-pet-scale-btn',
  }

  return React.createElement(
    'div',
    { className: 'dsh-pet-scale' },
    React.createElement('button', {
      ...commonButtonProps,
      onPointerDown: handlePointerDown('minus'),
      onPointerUp: finishPointer,
      onPointerLeave: finishPointer,
      onPointerCancel: finishPointer,
      onClick: handleClick('minus'),
      disabled: scale <= 0.5,
      title: '缩小',
      'aria-label': '缩小宠物',
    }, '−'),
    React.createElement(
      'div',
      { className: 'dsh-pet-scale-slider' },
      React.createElement('input', {
        ref: sliderRef,
        type: 'range',
        className: 'dsh-pet-scale-range',
        min: 0,
        max: 200,
        step: 5,
        value: sliderPos,
        onChange: handleSliderChange,
        style: { '--dsh-pet-scale-fill': `${fillPct}%` },
        'aria-label': '宠物缩放',
        'aria-valuetext': `${percent}%`,
      }),
    ),
    React.createElement('button', {
      ...commonButtonProps,
      onPointerDown: handlePointerDown('plus'),
      onPointerUp: finishPointer,
      onPointerLeave: finishPointer,
      onPointerCancel: finishPointer,
      onClick: handleClick('plus'),
      disabled: scale >= 2,
      title: '放大',
      'aria-label': '放大宠物',
    }, '+'),
    React.createElement('span', { className: 'dsh-pet-scale-value' }, `${percent}%`),
    React.createElement('button', {
      ...commonButtonProps,
      onClick: () => setScale(1),
      disabled: percent === 100,
      title: '重置为 100%',
      'aria-label': '重置为 100%',
    }, '重置'),
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

  async function handleDeletePet(id) {
    const pet = s.pets.find((p) => p.id === id)
    const name = pet !== undefined && pet.displayName ? pet.displayName : id
    if (!window.confirm(`确定删除宠物「${name}」吗？`)) return
    const err = await deletePet(id)
    if (err !== null) window.alert(err)
  }

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
      React.createElement('span', null, '缩放'),
      React.createElement(ScaleControl),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, '宠物市场'),
      React.createElement('button', {
        className: 'dsh-pet-btn',
        onClick: openPetMarket,
      }, '打开市场'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, '导入宠物'),
      React.createElement('button', { className: 'dsh-pet-btn', onClick: openBrowser }, '选择路径…'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-muted', style: { fontSize: 12 } },
      '在画廊下载宠物包后，回到这里用「选择路径…」导入。',
    ),
    React.createElement('div', { className: 'dsh-pet-divider' }),
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
            onDelete: handleDeletePet,
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

const inject = ['slots', 'workspaces', 'sessions']

function apply(ctx) {
  clientCtx = ctx
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
