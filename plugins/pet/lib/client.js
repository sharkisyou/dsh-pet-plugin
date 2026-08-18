window.__ModuleLoader__.load({
	id: "@yshark/dsh-codex-pet",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
// 插件中英文字典与翻译纯逻辑（无副作用）。
// 本文件同时作为客户端 bundle 的内嵌副本来源，不要引入 require/import。
// 客户端通过 DSH 的 ctx.locale 注册本字典；translate() 供测试与回退使用。

const PET_NS = 'pet'

const zh = {
  idle: '空闲',
  thinking: '思考中',
  executingTool: '执行工具 {name}',
  waitingApproval: '等待审批',
  waitingAnswer: '等待回答',
  awaitingReply: '等待回复',
  subagentWorking: '子代理工作中',
  failed: '出错',
  planReview: '计划审查',
  waitingInput: '等待输入',
  ready: '待查看',
  petTitle: '宠物',
  awake: '已唤醒',
  hidden: '已隐藏',
  hideBtn: '隐藏',
  wakeBtn: '唤醒',
  scale: '缩放',
  market: '宠物市场',
  openMarket: '打开市场',
  pluginVersion: '插件版本',
  checking: '检查中…',
  checkUpdate: '检查更新',
  importPet: '导入宠物',
  choosePath: '选择路径…',
  marketHint: '在画廊下载宠物包后，回到这里用「选择路径…」导入。',
  selectPet: '选择宠物',
  libraryEmpty: '宠物库为空，请先导入宠物',
  importing: '导入中…',
  importOk: '导入成功',
  importSuccess: '导入成功 {count} 个',
  importSkipped: '跳过 {count} 个',
  importFailed: '失败 {count} 个',
  importDetail: '详情：{detail}',
  importFail: '导入失败：{error}',
  importError: '导入异常：{error}',
  deleteConfirm: '确定删除宠物「{name}」吗？',
  deletePet: '删除宠物',
  chooseDirTitle: '选择宠物包目录',
  editPath: '编辑路径',
  editPathHint: '输入路径后回车跳转',
  emptyDir: '空目录',
  showHidden: '显示隐藏文件',
  cancel: '取消',
  chooseThisDir: '选择此目录',
  noDirSupport: '当前环境不支持目录浏览',
  noActivity: '暂无活动',
  activityList: '活动列表',
  dragHint: '拖动可移动宠物',
  activity: '活动',
  closeTray: '关闭托盘',
  closeActivityTray: '关闭活动托盘',
  openTray: '打开活动托盘',
  hide: '隐藏',
  zoomOut: '缩小',
  zoomOutAria: '缩小宠物',
  petScale: '宠物缩放',
  zoomIn: '放大',
  zoomInAria: '放大宠物',
  resetTo100: '重置为 100%',
  resetAria: '重置为 100%',
  reset: '重置',
  home: '主目录',
  loading: '加载中…',
  updateNew: '发现新版本 v{latest}（当前 v{current}），请手动更新插件',
  updateCannotCompare: '无法比较版本（当前 {current}，最新 v{latest}）',
  updateUpToDate: '已是最新版本 v{latest}',
  updateFailed: '检查更新失败：{error}',
  updateError: '检查更新异常：{error}',
  unknownError: '未知错误',
  statusReadFailed: '状态读取失败: {error}',
  initError: '初始化异常: {error}',
  readPetsFailed: '读取宠物库失败: {error}',
  readPetsError: '读取宠物库异常: {error}',
  deleteFailed: '删除失败',
  deleteError: '删除异常: {error}',
}

const en = {
  idle: 'Idle',
  thinking: 'Thinking',
  executingTool: 'Running tool {name}',
  waitingApproval: 'Awaiting approval',
  waitingAnswer: 'Awaiting your answer',
  awaitingReply: 'Awaiting reply',
  subagentWorking: 'Subagent working',
  failed: 'Error',
  planReview: 'Reviewing plan',
  waitingInput: 'Waiting for input',
  ready: 'Ready to review',
  petTitle: 'Pet',
  awake: 'Awake',
  hidden: 'Hidden',
  hideBtn: 'Hide',
  wakeBtn: 'Wake',
  scale: 'Scale',
  market: 'Pet Market',
  openMarket: 'Open Market',
  pluginVersion: 'Plugin Version',
  checking: 'Checking…',
  checkUpdate: 'Check Update',
  importPet: 'Import Pet',
  choosePath: 'Choose Path…',
  marketHint: 'After downloading a pet package from the gallery, come back and use "Choose Path…" to import.',
  selectPet: 'Select Pet',
  libraryEmpty: 'Pet library is empty. Please import a pet first.',
  importing: 'Importing…',
  importOk: 'Import successful',
  importSuccess: 'Imported {count}',
  importSkipped: 'Skipped {count}',
  importFailed: 'Failed {count}',
  importDetail: 'Details: {detail}',
  importFail: 'Import failed: {error}',
  importError: 'Import error: {error}',
  deleteConfirm: 'Delete pet "{name}"?',
  deletePet: 'Delete pet',
  chooseDirTitle: 'Select Pet Package Directory',
  editPath: 'Edit path',
  editPathHint: 'Type a path and press Enter to jump',
  emptyDir: 'Empty directory',
  showHidden: 'Show hidden files',
  cancel: 'Cancel',
  chooseThisDir: 'Select This Directory',
  noDirSupport: 'Directory browsing is not supported in this environment',
  noActivity: 'No activity',
  activityList: 'Activity list',
  dragHint: 'Drag to move the pet',
  activity: 'Activity',
  closeTray: 'Close tray',
  closeActivityTray: 'Close activity tray',
  openTray: 'Open activity tray',
  hide: 'Hide',
  zoomOut: 'Shrink',
  zoomOutAria: 'Shrink pet',
  petScale: 'Pet scale',
  zoomIn: 'Enlarge',
  zoomInAria: 'Enlarge pet',
  resetTo100: 'Reset to 100%',
  resetAria: 'Reset to 100%',
  reset: 'Reset',
  home: 'Home',
  loading: 'Loading…',
  updateNew: 'New version v{latest} available (current v{current}). Please update the plugin manually.',
  updateCannotCompare: 'Cannot compare versions (current {current}, latest v{latest}).',
  updateUpToDate: 'You are up to date (v{latest}).',
  updateFailed: 'Update check failed: {error}',
  updateError: 'Update check error: {error}',
  unknownError: 'Unknown error',
  statusReadFailed: 'Failed to read state: {error}',
  initError: 'Initialization error: {error}',
  readPetsFailed: 'Failed to read pet library: {error}',
  readPetsError: 'Pet library read error: {error}',
  deleteFailed: 'Delete failed',
  deleteError: 'Delete error: {error}',
}

function localeFromTag(tag) {
  if (typeof tag !== 'string') return 'zh'
  const primary = tag.toLowerCase().split('-')[0]
  return primary === 'en' ? 'en' : 'zh'
}

function translate(locale, key, params) {
  const dict = locale === 'en' ? en : zh
  let text = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key
  if (params !== null && typeof params === 'object') {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}
// 动画帧选择：给定动画定义与已播放时长，返回当前帧与是否播完（纯逻辑）。

const FALLBACK_FRAME_MS = 140

function frameIndex(anim, elapsedMs) {
  const count = anim.frameCount
  if (count <= 1) return { frame: 0, finished: false }
  const timing = anim.timingMs
  const total = totalDuration(timing, count)
  const t = elapsedMs < 0 ? 0 : elapsedMs
  const once = anim.playback === 'once' || anim.loop === false
  if (once && t >= total) {
    return { frame: count - 1, finished: true }
  }
  const pos = t % total
  let acc = 0
  for (let i = 0; i < count; i++) {
    acc += timing[i] !== undefined ? timing[i] : FALLBACK_FRAME_MS
    if (pos < acc) return { frame: i, finished: false }
  }
  return { frame: count - 1, finished: false }
}

function totalDuration(timing, count) {
  let total = 0
  for (let i = 0; i < count; i++) {
    total += timing[i] !== undefined ? timing[i] : FALLBACK_FRAME_MS
  }
  return total
}

function cycleNext(current, list) {
  if (!Array.isArray(list) || list.length === 0) return null
  const index = list.indexOf(current)
  if (index < 0) return list[0]
  return list[(index + 1) % list.length]
}
// 多会话聚合纯逻辑：宿主 activities 与客户端 useSessions 合并成宠物展示/活动托盘。
// 该文件同时作为客户端 bundle 的内嵌副本来源，不要引入 require/import。

const STATE_PRIORITY = { waiting: 0, failed: 1, ready: 2, working: 3, idle: 4 }

function statusKeyFor(state, hostKey, hostParams, pendingKind) {
  switch (state) {
    case 'waiting':
      if (pendingKind === 'approval') return { bubbleKey: 'waitingApproval', bubbleParams: null }
      if (pendingKind === 'question') return { bubbleKey: 'waitingAnswer', bubbleParams: null }
      if (pendingKind === 'plan-review') return { bubbleKey: 'planReview', bubbleParams: null }
      return { bubbleKey: hostKey || 'waitingInput', bubbleParams: hostParams || null }
    case 'failed':
      return { bubbleKey: 'failed', bubbleParams: null }
    case 'ready':
      return { bubbleKey: 'ready', bubbleParams: null }
    case 'working':
      return { bubbleKey: hostKey || 'thinking', bubbleParams: hostParams || null }
    case 'idle':
    default:
      return { bubbleKey: hostKey || 'idle', bubbleParams: hostParams || null }
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
  let bubbleKey = host ? host.bubbleKey : null
  let bubbleParams = host ? host.bubbleParams : null
  let pendingKind = host && host.pendingKind ? host.pendingKind : null
  let lastEventAt = host && typeof host.lastEventAt === 'number' ? host.lastEventAt : 0
  let acknowledged = host ? host.acknowledged === true : false

  if (summary !== null && typeof summary === 'object') {
    if (summary.pendingInteraction) {
      state = 'waiting'
      pendingKind = summary.pendingInteraction
      const keyed = statusKeyFor('waiting', null, null, pendingKind)
      bubbleKey = keyed.bubbleKey
      bubbleParams = keyed.bubbleParams
    }
    if (summary.completed === true && state !== 'waiting' && state !== 'failed') {
      state = 'ready'
      bubbleKey = 'ready'
      bubbleParams = null
    }
    if (summary.running === true && state !== 'waiting' && state !== 'failed') {
      state = 'working'
      if (host && host.bubbleKey) {
        bubbleKey = host.bubbleKey
        bubbleParams = host.bubbleParams || null
      } else {
        bubbleKey = 'thinking'
        bubbleParams = null
      }
    }
    if (typeof summary.updatedAt === 'number') {
      lastEventAt = Math.max(lastEventAt, summary.updatedAt)
    }
  }

  const active = state !== 'idle'
  const reminder = !(state === 'failed' && acknowledged && sessionId !== currentSession)
  return { sessionId, state, bubbleKey, bubbleParams, pendingKind, lastEventAt, acknowledged, active, reminder }
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

function openPetMarket() {
  // 用普通新标签页打开，保留浏览器完整界面（前进/后退/地址栏）：
  // 若带 popup=yes 或尺寸参数，浏览器会按弹窗处理并隐藏导航栏。
  window.open(PET_MARKET_URL, '_blank', 'noopener')
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
.dsh-pet-dialog { background: var(--dsw-alias-bg-layer-2, #fff); color: var(--dsw-alias-label-primary, #1f1f1f);
  border: 1px solid var(--dsw-alias-border-l3, rgba(0,0,0,.1)); border-radius: 12px;
  box-shadow: 0 18px 50px rgba(0,0,0,.35);
  width: min(680px, calc(100vw - 32px)); height: min(500px, calc(100dvh - 32px));
  display: flex; flex-direction: column; padding: 0; gap: 0; overflow: hidden; }
.dsh-pet-dialog-header { border-bottom: 1px solid var(--dsw-alias-border-l3, rgba(0,0,0,.1));
  flex-direction: column; flex: none; gap: 8px; padding: 16px 14px 8px 24px; display: flex; }
.dsh-pet-dialog-title { min-height: 28px; color: var(--dsw-alias-label-primary, #1f1f1f); margin: 0;
  font-size: 16px; font-weight: 600; line-height: 24px; display: flex; align-items: flex-end; }
.dsh-pet-dialog-nav { box-sizing: border-box; border: 1px solid transparent; border-radius: 8px;
  align-items: center; gap: 4px; min-height: 24px; padding: 0 8px; display: flex; }
.dsh-pet-dialog-nav:focus-within, .dsh-pet-dialog-nav:hover { border-color: var(--dsw-alias-border-l2, rgba(0,0,0,.15)); }
.dsh-pet-dialog-crumb-trail { align-items: center; gap: 4px; min-width: 0; display: flex; overflow-x: auto; }
.dsh-pet-dialog-crumb { color: var(--dsw-alias-label-tertiary, #888); cursor: pointer; background: none;
  border: none; padding: 0; font-size: 13px; font-weight: 500; line-height: 20px; white-space: nowrap; }
.dsh-pet-dialog-crumb:hover { color: var(--dsw-alias-label-primary, #1f1f1f); }
.dsh-pet-dialog-crumb.current { color: var(--dsw-alias-label-primary, #1f1f1f); font-weight: 700; }
.dsh-pet-dialog-nav-sep { color: var(--dsw-alias-label-tertiary, #888); flex: none; margin: 0 2px; font-size: 12px; }
.dsh-pet-dialog-edit { cursor: text; background: none; border: none; outline: none; flex: 1 0 34px;
  justify-content: flex-end; align-items: center; min-width: 34px; height: 22px; padding: 0; display: flex;
  color: var(--dsw-alias-label-tertiary, #888); font-size: 14px; }
.dsh-pet-dialog-edit:hover { color: var(--dsw-alias-label-primary, #1f1f1f); }
.dsh-pet-dialog-path-input { box-sizing: border-box; min-width: 0; height: 22px; flex: 1 1 0;
  color: var(--dsw-alias-label-primary, #1f1f1f); background: none; border: none; outline: none;
  padding: 0; font-size: 13px; line-height: 20px; }
.dsh-pet-dialog-content { flex-direction: column; flex: 1 1 0; min-height: 0;
  padding: 16px 16px 16px 24px; display: flex; position: relative; }
.dsh-pet-dialog-miller { align-items: stretch; gap: 12px; min-height: 0; flex: 1 1 0; display: flex;
  overflow-x: auto; }
.dsh-pet-dialog-column { flex-direction: column; flex: 1 1 0; gap: 2px; min-width: 256px;
  padding-right: 8px; display: flex; overflow-y: auto; }
.dsh-pet-dialog-divider { background: var(--dsw-alias-border-l3, rgba(0,0,0,.1)); flex: none; width: 1px; }
.dsh-pet-dialog-row { text-align: left; cursor: pointer; background: none; border: none; border-radius: 6px;
  flex: none; align-items: center; gap: 4px; width: 100%; height: 28px; padding: 4px; display: flex;
  color: var(--dsw-alias-label-primary, #1f1f1f); font-size: 13px; font-weight: 500; }
.dsh-pet-dialog-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.dsh-pet-dialog-row.selected { background: var(--dsw-alias-interactive-bg-active, rgba(24,144,255,.14)); }
.dsh-pet-dialog-row-icon { color: var(--dsw-alias-label-secondary, #666); flex: none; }
.dsh-pet-dialog-row-icon.selected { color: var(--dsw-alias-button-info-fill, #1890ff); }
.dsh-pet-dialog-row-name { text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1 1 0;
  overflow: hidden; }
.dsh-pet-dialog-row-chevron { color: var(--dsw-alias-label-tertiary, #888); flex: none; }
.dsh-pet-dialog-row-hidden { color: var(--dsw-alias-label-tertiary, #888); font-size: 11px; flex: none; }
.dsh-pet-dialog-empty { color: var(--dsw-alias-label-tertiary, #888); text-align: center; padding: 24px 0;
  font-size: 13px; }
.dsh-pet-dialog-status, .dsh-pet-dialog-error { padding: 4px 120px 4px 4px; font-size: 12px; line-height: 18px; }
.dsh-pet-dialog-status { color: var(--dsw-alias-label-secondary, #666); }
.dsh-pet-dialog-error { color: var(--dsw-alias-state-error-primary, #f66); }
.dsh-pet-dialog-loading { background: var(--dsw-alias-bg-layer-2, #fff); padding: 2px 8px; position: absolute;
  bottom: 8px; right: 16px; font-size: 12px; color: var(--dsw-alias-label-secondary, #666); }
.dsh-pet-dialog-create { display: flex; align-items: center; gap: 8px; padding: 8px 0 0; }
.dsh-pet-dialog-create-input { flex: 1; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.15));
  border-radius: 6px; padding: 6px 10px; font-size: 13px; color: var(--dsw-alias-label-primary, #1f1f1f);
  background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.03)); outline: none; }
.dsh-pet-dialog-create-input:focus { border-color: var(--dsw-alias-button-info-fill, #1890ff); }
.dsh-pet-dialog-footer { border-top: 1px solid var(--dsw-alias-border-l3, rgba(0,0,0,.1)); flex-wrap: wrap;
  flex: none; align-items: center; gap: 8px; padding: 16px 24px; display: flex; }
.dsh-pet-dialog-spacer { flex: 1 1 0; }
.dsh-pet-dialog-show-hidden { color: var(--dsw-alias-label-secondary, #666); cursor: pointer; white-space: nowrap;
  background: none; border: none; align-items: center; gap: 4px; padding: 0; font-size: 13px; font-weight: 500;
  line-height: 20px; display: inline-flex; }
.dsh-pet-dialog-show-hidden:hover, .dsh-pet-dialog-show-hidden.active { color: var(--dsw-alias-label-primary, #1f1f1f); }
.dsh-pet-dialog-btn { border-radius: 6px; padding: 7px 16px; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background .15s ease, border-color .15s ease, opacity .15s ease; }
.dsh-pet-dialog-btn.secondary { background: var(--dsw-alias-bg-module-platform, rgba(128,128,128,.08));
  color: var(--dsw-alias-label-primary, #1f1f1f); border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.15)); }
.dsh-pet-dialog-btn.secondary:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.dsh-pet-dialog-btn.primary { background: var(--dsw-alias-button-primary-fill, #000);
  color: var(--dsw-alias-label-inverse, #fff); border: 1px solid transparent; }
.dsh-pet-dialog-btn.primary:hover { filter: brightness(1.12); }
.dsh-pet-dialog-btn:disabled { opacity: .45; cursor: not-allowed; }
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
.dsh-pet-card-delete { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; z-index: 2;
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
let clientLocale = 'zh'
let clientT = (key, params) => (params !== null && typeof params === 'object' ? key : key)

function t(key, params) {
  return clientT(key, params)
}

const store = {
  inited: false,
  currentSession: null,
  state: { state: 'idle', bubbleKey: 'idle', bubbleParams: null },
  hostState: 'idle',
  hostBubbleKey: 'idle',
  hostBubbleParams: null,
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
    store.spriteUrl = res.spriteUrl
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
        store.initError = t('statusReadFailed', { error: typeof st.error === 'string' ? st.error : t('unknownError') })
      }
      petCall('resetAcknowledged', {}).catch(() => {})
      await refreshPets()
      if (store.petId !== null) await selectPet(store.petId)
    } catch (err) {
      store.initError = t('initError', { error: String(err) })
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
      store.petsError = t('readPetsFailed', {
        error: list !== null && typeof list === 'object' && typeof list.error === 'string' ? list.error : t('unknownError'),
      })
      notify()
    }
  } catch (err) {
    store.petsError = t('readPetsError', { error: String(err) })
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
    return res !== null && typeof res === 'object' && typeof res.error === 'string' ? res.error : t('deleteFailed')
  } catch (err) {
    return t('deleteError', { error: String(err) })
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
    const text = t(item.bubbleKey || 'idle', item.bubbleParams || undefined)
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
      'aria-label': t('activityList'),
    },
    React.createElement(
      'div',
      { className: 'dsh-pet-tray-header', onPointerDown: onTrayHeaderPointerDown, title: t('dragHint'), style: { cursor: 'move' } },
      React.createElement('span', null, t('activity')),
      React.createElement('button', {
        className: 'dsh-pet-tray-close',
        onClick: closeTrayManually,
        title: t('closeTray'),
        'aria-label': t('closeActivityTray'),
      }, '×'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-tray-list' },
      rows.length > 0 ? rows : React.createElement('div', { className: 'dsh-pet-muted', style: { padding: '8px' } }, t('noActivity')),
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
          store.hostBubbleKey = typeof res.bubbleKey === 'string' ? res.bubbleKey : 'idle'
          store.hostBubbleParams = res.bubbleParams !== null && typeof res.bubbleParams === 'object' ? res.bubbleParams : null
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
          title: t('openTray'),
          'aria-label': t('openTray'),
        },
        `${t(s.state.bubbleKey, s.state.bubbleParams || undefined)} ▾`,
      ))
    } else {
      children.push(React.createElement('div', { className: 'dsh-pet-bubble' }, t(s.state.bubbleKey, s.state.bubbleParams || undefined)))
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
    React.createElement('button', { className: 'dsh-pet-hide', onClick: onHide, title: t('hide') }, '×'),
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
      ? { state: top.state, bubbleKey: top.bubbleKey || 'idle', bubbleParams: top.bubbleParams || null }
      : (store.hostState && store.hostState !== 'idle')
        ? { state: store.hostState, bubbleKey: store.hostBubbleKey || 'idle', bubbleParams: store.hostBubbleParams || null }
        : { state: 'idle', bubbleKey: 'idle', bubbleParams: null }
    if (store.state.state !== next.state || store.state.bubbleKey !== next.bubbleKey) {
      console.debug('[pet] state ->', next)
      store.state = next
      notify()
    }
  }, [top, store.hostState, store.hostBubbleKey, store.hostBubbleParams])

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
        spriteUrl: res.spriteUrl,
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
        title: t('deletePet'),
        'aria-label': t('deletePet') + ' ' + pet.displayName,
      }, '🗑'),
      React.createElement('div', { className: 'dsh-pet-card-preview' }, t('loading')),
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
      title: t('deletePet'),
      'aria-label': t('deletePet') + ' ' + pet.displayName,
    }, '🗑'),
    React.createElement(
      'div',
      { className: 'dsh-pet-card-preview' },
      React.createElement(
        'div',
        { className: 'dsh-pet-card-canvas' },
        React.createElement('img', {
          className: 'dsh-pet-card-frame',
          src: data.spriteUrl,
          style: frameStyle,
          alt: '',
          decoding: 'async',
        }),
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
      title: t('zoomOut'),
      'aria-label': t('zoomOutAria'),
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
        'aria-label': t('petScale'),
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
      title: t('zoomIn'),
      'aria-label': t('zoomInAria'),
    }, '+'),
    React.createElement('span', { className: 'dsh-pet-scale-value' }, `${percent}%`),
    React.createElement('button', {
      ...commonButtonProps,
      onClick: () => setScale(1),
      disabled: percent === 100,
      title: t('resetTo100'),
      'aria-label': t('resetAria'),
    }, t('reset')),
  )
}

// ===== 目录选择器小图标（原生风格：灰线文件夹 + chevron） =====

// 把面包屑里的用户主目录替换成「主目录」标签，只保留主目录开始的相对路径
function displayCrumbs(crumbs, home) {
  if (!home || !Array.isArray(crumbs)) return crumbs || []
  const idx = crumbs.findIndex((c) => c !== null && typeof c === 'object' && c.path === home)
  if (idx < 0) return crumbs
  return [{ name: t('home'), path: home, hidden: false }, ...crumbs.slice(idx + 1)]
}

function FolderGlyph({ open, selected }) {
  return React.createElement('svg', {
    width: 16, height: 16, viewBox: '0 0 16 16',
    className: 'dsh-pet-dialog-row-icon' + (selected ? ' selected' : ''),
    fill: 'currentColor', 'aria-hidden': true,
  },
    React.createElement('path', { d: 'M1.5 2.5h4.2l1.6 2.1h7.2a.5.5 0 0 1 .5.5v7.4a.5.5 0 0 1-.5.5H1.5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z' }),
  )
}

function ChevronGlyph() {
  return React.createElement('svg', {
    width: 12, height: 12, viewBox: '0 0 16 16',
    className: 'dsh-pet-dialog-row-chevron',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
    strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
  },
    React.createElement('path', { d: 'M6 4l4 4-4 4' }),
  )
}

// ===== 宠物设置面板 =====

function PetMenu(props) {
  const s = useStore()
  const [importMsg, setImportMsg] = React.useState(null)
  const [pluginVersion, setPluginVersion] = React.useState(null)
  const [updateState, setUpdateState] = React.useState({ checking: false, msg: null, hasUpdate: false, latest: null })
  const [browser, setBrowser] = React.useState({
    open: false,
    path: null,
    entries: [],
    crumbs: [],
    home: null,
    loading: false,
    error: null,
    showHidden: true,
    selected: null,
    selectedPath: null,
    editing: false,
    pathDraft: '',
  })

  React.useEffect(() => {
    refreshPets()
    setImportMsg(null)
    petCall('getPluginVersion', {}).then((res) => {
      if (res !== null && typeof res === 'object' && res.ok && typeof res.version === 'string') {
        setPluginVersion(res.version)
      }
    }).catch(() => {})
  }, [])

  async function handleDeletePet(id) {
    const pet = s.pets.find((p) => p.id === id)
    const name = pet !== undefined && pet.displayName ? pet.displayName : id
    if (!window.confirm(t('deleteConfirm', { name }))) return
    const err = await deletePet(id)
    if (err !== null) window.alert(err)
  }

  async function checkPluginUpdate() {
    setUpdateState((u) => ({ ...u, checking: true, msg: null }))
    try {
      const res = await petCall('checkUpdate', {})
      if (res !== null && typeof res === 'object' && res.ok) {
        if (res.hasUpdate) {
          setUpdateState({ checking: false, hasUpdate: true, latest: res.latest, msg: t('updateNew', { latest: res.latest, current: res.current }) })
        } else if (res.invalidCurrent) {
          setUpdateState({ checking: false, hasUpdate: false, latest: res.latest, msg: t('updateCannotCompare', { current: res.current, latest: res.latest }) })
        } else {
          setUpdateState({ checking: false, hasUpdate: false, latest: res.latest, msg: t('updateUpToDate', { latest: res.latest }) })
        }
      } else {
        const err = res !== null && typeof res === 'object' && typeof res.error === 'string' ? res.error : t('unknownError')
        setUpdateState({ checking: false, hasUpdate: false, latest: null, msg: t('updateFailed', { error: err }) })
      }
    } catch (err) {
      setUpdateState({ checking: false, hasUpdate: false, latest: null, msg: t('updateError', { error: String(err) }) })
    }
  }

  async function importFromPath(path) {
    console.log('[pet] importPet request', { path })
    try {
      const res = await petCall('importPet', { path })
      console.log('[pet] importPet response', res)
      if (res !== null && typeof res === 'object' && res.ok) {
        await refreshPets()
        if (typeof res.imported === 'number') {
          const parts = [t('importSuccess', { count: res.imported })]
          if (res.skipped > 0) parts.push(t('importSkipped', { count: res.skipped }))
          if (res.failed > 0) {
            parts.push(t('importFailed', { count: res.failed }))
            if (Array.isArray(res.errors) && res.errors.length > 0) {
              parts.push(t('importDetail', { detail: res.errors.join('；') }))
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
        : t('importFail', { error: t('unknownError') })
      console.error('[pet] importPet 失败', errText)
      window.alert(t('importFail', { error: errText }))
      return errText
    } catch (err) {
      console.error('[pet] importPet 异常', err)
      window.alert(t('importError', { error: String(err) }))
      return String(err)
    }
  }

  async function openBrowser() {
    if (typeof props.listDirectory !== 'function') {
      setImportMsg(t('noDirSupport'))
      return
    }
    setBrowser({
      open: true, path: null, entries: [], crumbs: [], home: null, loading: true, error: null,
      showHidden: true, selected: null, selectedPath: null, editing: false, pathDraft: '',
    })
    try {
      const listing = await props.listDirectory()
      setBrowser({
        open: true, path: listing.path, entries: listing.entries, crumbs: listing.crumbs, home: listing.home, loading: false, error: null,
        showHidden: true, selected: null, selectedPath: null, editing: false, pathDraft: '',
      })
    } catch (err) {
      setBrowser({
        open: true, path: null, entries: [], crumbs: [], home: null, loading: false,
        error: String(err && err.message ? err.message : err),
        showHidden: true, selected: null, selectedPath: null, editing: false, pathDraft: '',
      })
    }
  }

  async function navigateBrowser(nextPath) {
    setBrowser((b) => ({ ...b, loading: true, error: null, editing: false }))
    try {
      const listing = await props.listDirectory(nextPath)
      setBrowser((b) => ({
        ...b,
        open: true,
        path: listing.path,
        entries: listing.entries,
        crumbs: listing.crumbs,
        home: listing.home,
        loading: false,
        error: null,
        selected: null,
        selectedPath: null,
        editing: false,
        pathDraft: '',
      }))
    } catch (err) {
      setBrowser((b) => ({ ...b, loading: false, error: String(err && err.message ? err.message : err) }))
    }
  }

  // Miller 左栏：选中一个文件夹，加载其子项到右栏
  async function selectEntry(entry) {
    if (typeof props.listDirectory !== 'function') return
    setBrowser((b) => ({ ...b, loading: true, error: null }))
    try {
      const listing = await props.listDirectory(entry.path)
      setBrowser((b) => ({
        ...b,
        loading: false,
        selectedPath: entry.path,
        selected: { path: listing.path, entries: listing.entries, crumbs: listing.crumbs, home: listing.home },
      }))
    } catch (err) {
      setBrowser((b) => ({ ...b, loading: false, error: String(err && err.message ? err.message : err), selected: null, selectedPath: null }))
    }
  }

  // Miller 右栏：点某个子项 -> 进入该目录（变成新的左栏层级）
  function pickRight(entry) {
    navigateBrowser(entry.path)
  }

  function startEdit() {
    const base = browser.path || ''
    setBrowser((b) => ({ ...b, editing: true, pathDraft: base + (base.endsWith('/') ? '' : '/') }))
  }

  function cancelEdit() {
    setBrowser((b) => ({ ...b, editing: false, pathDraft: '' }))
  }

  function commitEdit() {
    const draft = (browser.pathDraft || '').trim()
    if (draft === '') return
    navigateBrowser(draft)
  }

  function closeBrowser() {
    setBrowser({
      open: false, path: null, entries: [], crumbs: [], home: null, loading: false, error: null,
      showHidden: true, selected: null, selectedPath: null, editing: false, pathDraft: '',
    })
  }

  function chooseBrowserPath() {
    // Open 采用选中的文件夹，没有选中则回退到当前层级
    const path = browser.selected !== null && browser.selected.path ? browser.selected.path : browser.path
    closeBrowser()
    if (path === null) return
    setImportMsg(t('importing'))
    importFromPath(path).then((err) => {
      setImportMsg(err === null ? t('importOk') : err)
    })
  }

  return React.createElement(
    'div',
    { className: 'dsh-pet-menu' },
    React.createElement('h4', null, t('petTitle')),
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, s.wake ? t('awake') : t('hidden')),
      React.createElement('button', { className: 'dsh-pet-btn', onClick: () => setWake(!s.wake) }, s.wake ? t('hideBtn') : t('wakeBtn')),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, t('scale')),
      React.createElement(ScaleControl),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, t('market')),
      React.createElement('button', {
        className: 'dsh-pet-btn',
        onClick: openPetMarket,
      }, t('openMarket')),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, t('pluginVersion')),
      React.createElement('span', { className: 'dsh-pet-muted' }, pluginVersion !== null ? `v${pluginVersion}` : '…'),
      React.createElement('button', {
        className: 'dsh-pet-btn',
        onClick: checkPluginUpdate,
        disabled: updateState.checking,
      }, updateState.checking ? t('checking') : t('checkUpdate')),
    ),
    updateState.msg !== null
      ? React.createElement('div', { className: 'dsh-pet-muted', style: { fontSize: 12 } }, updateState.msg)
      : null,
    React.createElement(
      'div',
      { className: 'dsh-pet-item' },
      React.createElement('span', null, t('importPet')),
      React.createElement('button', { className: 'dsh-pet-btn', onClick: openBrowser }, t('choosePath')),
    ),
    React.createElement(
      'div',
      { className: 'dsh-pet-muted', style: { fontSize: 12 } },
      t('marketHint'),
    ),
    React.createElement('div', { className: 'dsh-pet-divider' }),
    React.createElement('h4', null, t('selectPet')),
    s.pets.length === 0
      ? React.createElement('div', { className: 'dsh-pet-muted' },
          s.petsError !== null ? s.petsError
            : (s.initError !== null ? s.initError : t('libraryEmpty')))
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
            React.createElement(
              'div',
              { className: 'dsh-pet-dialog-header' },
              React.createElement('h2', { className: 'dsh-pet-dialog-title' }, t('chooseDirTitle')),
              React.createElement(
                'div',
                { className: 'dsh-pet-dialog-nav' },
                browser.editing
                  ? React.createElement('input', {
                      className: 'dsh-pet-dialog-path-input',
                      value: browser.pathDraft,
                      autoFocus: true,
                      'aria-label': t('editPath'),
                      placeholder: t('editPathHint'),
                      onChange: (e) => setBrowser((b) => ({ ...b, pathDraft: e.target.value })),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') cancelEdit()
                      },
                    })
                  : React.createElement(React.Fragment, null,
                      React.createElement(
                        'div',
                        { className: 'dsh-pet-dialog-crumb-trail' },
                        displayCrumbs(browser.crumbs, browser.home).map((c, i, arr) => React.createElement(
                          React.Fragment,
                          { key: c.path },
                          i > 0 ? React.createElement('span', { className: 'dsh-pet-dialog-nav-sep' }, '›') : null,
                          React.createElement('button', {
                            className: 'dsh-pet-dialog-crumb' + (i === arr.length - 1 ? ' current' : ''),
                            onClick: () => navigateBrowser(c.path),
                          }, c.name),
                        )),
                      ),
                      React.createElement('button', {
                        className: 'dsh-pet-dialog-edit',
                        title: t('editPath'),
                        'aria-label': t('editPath'),
                        onClick: startEdit,
                      }, '✎'),
                    ),
              ),
            ),
            React.createElement(
              'div',
              { className: 'dsh-pet-dialog-content' },
              React.createElement(
                'div',
                { className: 'dsh-pet-dialog-miller' },
                React.createElement(
                  'div',
                  { className: 'dsh-pet-dialog-column' },
                  browser.entries
                    .filter((entry) => browser.showHidden || !entry.hidden)
                    .map((entry) => React.createElement(
                      'button',
                      {
                        key: entry.path,
                        className: 'dsh-pet-dialog-row' + (browser.selectedPath === entry.path ? ' selected' : ''),
                        onClick: () => {
                          if (browser.selectedPath === entry.path) {
                            setBrowser((b) => ({ ...b, selected: null, selectedPath: null }))
                          } else {
                            selectEntry(entry)
                          }
                        },
                      },
                      React.createElement(FolderGlyph, { open: browser.selectedPath === entry.path, selected: browser.selectedPath === entry.path }),
                      React.createElement('span', { className: 'dsh-pet-dialog-row-name' }, entry.name),
                      entry.hidden ? React.createElement('span', { className: 'dsh-pet-dialog-row-hidden' }, t('hidden')) : null,
                      React.createElement(ChevronGlyph, null),
                    )),
                  browser.entries.length === 0
                    ? React.createElement('div', { className: 'dsh-pet-dialog-empty' }, t('emptyDir'))
                    : null,
                ),
                browser.selected !== null
                  ? React.createElement(React.Fragment, null,
                      React.createElement('span', { className: 'dsh-pet-dialog-divider' }),
                      React.createElement(
                        'div',
                        { className: 'dsh-pet-dialog-column' },
                        browser.selected.entries
                          .filter((entry) => browser.showHidden || !entry.hidden)
                          .map((entry) => React.createElement(
                            'button',
                            { key: entry.path, className: 'dsh-pet-dialog-row', onClick: () => pickRight(entry) },
                            React.createElement(FolderGlyph, { open: false, selected: false }),
                            React.createElement('span', { className: 'dsh-pet-dialog-row-name' }, entry.name),
                            entry.hidden ? React.createElement('span', { className: 'dsh-pet-dialog-row-hidden' }, t('hidden')) : null,
                            React.createElement(ChevronGlyph, null),
                          )),
                        browser.selected.entries.length === 0
                          ? React.createElement('div', { className: 'dsh-pet-dialog-empty' }, t('emptyDir'))
                          : null,
                      ),
                    )
                  : null,
              ),
              browser.loading
                ? React.createElement('div', { className: 'dsh-pet-dialog-loading' }, t('loading'))
                : null,
              browser.error !== null
                ? React.createElement('div', { className: 'dsh-pet-dialog-error' }, browser.error)
                : null,
            ),
            React.createElement(
              'div',
              { className: 'dsh-pet-dialog-footer' },
              React.createElement('button', {
                className: 'dsh-pet-dialog-show-hidden' + (browser.showHidden ? ' active' : ''),
                'aria-pressed': browser.showHidden,
                onClick: () => setBrowser((b) => ({ ...b, showHidden: !b.showHidden })),
              }, browser.showHidden ? '✓ ' + t('showHidden') : t('showHidden')),
              React.createElement('span', { className: 'dsh-pet-dialog-spacer' }),
              React.createElement('button', { className: 'dsh-pet-dialog-btn secondary', onClick: closeBrowser }, t('cancel')),
              React.createElement('button', {
                className: 'dsh-pet-dialog-btn primary',
                onClick: chooseBrowserPath,
                disabled: browser.path === null,
              }, t('importPet')),
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

  const NAV_LABEL = () => t('petTitle')
  const PET_GLYPH = '🐼'

  function patchOnce() {
    const buttons = document.querySelectorAll('button')
    for (const btn of buttons) {
      if (btn.dataset.dshPetNav === '1') continue
      const children = Array.from(btn.children)
      if (children.length < 2) continue
      const label = children[children.length - 1]
      if (label.tagName !== 'SPAN' || label.textContent.trim() !== NAV_LABEL()) continue
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

const inject = ['slots', 'workspaces', 'sessions', 'locale']

function apply(ctx) {
  clientCtx = ctx
  if (ctx.locale && typeof ctx.locale.register === 'function' && typeof ctx.locale.bind === 'function') {
    clientLocale = (ctx.locale.getSnapshot().active) || 'zh'
    ctx.effect(() => {
      const offZh = ctx.locale.register(PET_NS, 'zh', zh)
      const offEn = ctx.locale.register(PET_NS, 'en', en)
      const unsub = ctx.locale.subscribe(() => {
        clientLocale = ctx.locale.getSnapshot().active
        clientT = ctx.locale.bind(PET_NS)
        notify()
      })
      clientT = ctx.locale.bind(PET_NS)
      return () => {
        offZh()
        offEn()
        unsub()
      }
    }, 'dsh-pet: locale dictionaries')
  }
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
    { name: 'shell.overlay', id: 'dsh-pet', order: 0, label: () => t('petTitle') },
    (props) => React.createElement(PetPortal, props),
  ))

  ctx.slots.inject('settings.section', () => ctx.slots.register(
    {
      name: 'settings.section',
      id: 'pet',
      order: 30,
      label: () => t('petTitle'),
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
		exports.apply = apply;
		exports.inject = inject;
		exports.extractCurrentSessionId = extractCurrentSessionId;
		return module.exports;
	},
});
