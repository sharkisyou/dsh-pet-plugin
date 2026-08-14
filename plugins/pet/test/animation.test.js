'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

const { frameIndex, cycleNext } = require('../src/animation.js')

function uniformAnim(frameCount, playback) {
  return {
    frameCount,
    timingMs: new Array(frameCount).fill(100),
    playback,
  }
}

test('循环动画：均匀节奏下按 100ms 一帧推进，越过总时长回到第 0 帧', () => {
  const anim = uniformAnim(6, 'loop')
  assert.deepEqual(frameIndex(anim, 0), { frame: 0, finished: false })
  assert.deepEqual(frameIndex(anim, 550), { frame: 5, finished: false })
  assert.deepEqual(frameIndex(anim, 600), { frame: 0, finished: false })
  assert.deepEqual(frameIndex(anim, 350), { frame: 3, finished: false })
})

test('单次动画：播完停在最后一帧并标记 finished', () => {
  const anim = uniformAnim(4, 'once')
  assert.deepEqual(frameIndex(anim, 0), { frame: 0, finished: false })
  assert.deepEqual(frameIndex(anim, 350), { frame: 3, finished: false })
  assert.deepEqual(frameIndex(anim, 401), { frame: 3, finished: true })
})

test('非均匀节奏：每帧时长按 timingMs 累积', () => {
  const anim = { frameCount: 3, timingMs: [240, 180, 180], playback: 'loop' }
  assert.deepEqual(frameIndex(anim, 239), { frame: 0, finished: false })
  assert.deepEqual(frameIndex(anim, 240), { frame: 1, finished: false })
  assert.deepEqual(frameIndex(anim, 419), { frame: 1, finished: false })
  assert.deepEqual(frameIndex(anim, 420), { frame: 2, finished: false })
  assert.deepEqual(frameIndex(anim, 600), { frame: 0, finished: false })
})

test('单帧动画始终是第 0 帧', () => {
  const anim = uniformAnim(1, 'loop')
  assert.deepEqual(frameIndex(anim, 9999), { frame: 0, finished: false })
})

test('cycleNext：循环取下一个技能动画', () => {
  const list = ['amaterasu', 'kirin', 'susanoo']
  assert.equal(cycleNext('amaterasu', list), 'kirin')
  assert.equal(cycleNext('susanoo', list), 'amaterasu')
  assert.equal(cycleNext('not-in-list', list), 'amaterasu')
  assert.equal(cycleNext('x', []), null)
  assert.equal(cycleNext('x', ['only']), 'only')
})

test('loop: false 时即使 playback 为 loop 也按单次播完结束', () => {
  const anim = { frameCount: 3, timingMs: [100, 100, 100], playback: 'loop', loop: false }
  assert.deepEqual(frameIndex(anim, 250), { frame: 2, finished: false })
  assert.deepEqual(frameIndex(anim, 300), { frame: 2, finished: true })
  assert.deepEqual(frameIndex(anim, 999), { frame: 2, finished: true })
})
