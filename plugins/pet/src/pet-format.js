'use strict'
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

function clampFrameCount(value, base) {
  if (typeof value !== 'number' || !Number.isInteger(value)) return base
  return Math.min(Math.max(value, 1), 8)
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

module.exports = { parsePetJson, assessPackageDir, stripBom, ROW_NAMES, ROW_FRAME_COUNTS, DEFAULT_FRAME_MS }
