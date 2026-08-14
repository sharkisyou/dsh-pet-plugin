'use strict'
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

module.exports = { frameIndex, cycleNext, totalDuration, FALLBACK_FRAME_MS }
