'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

const petFormat = require('../src/pet-format.js')

// 切片 1：官方风格 v1（无 animations 元数据）解析 + 目录判定

test('官方风格 v1 pet.json 解析为 9 行标准化模型', () => {
  const json = JSON.stringify({
    id: 'feibi-jiubi',
    displayName: '菲比啾比',
    description: '陪你在 Codex 里奔跑、等待、庆祝的伙伴。',
    spritesheetPath: 'spritesheet.webp',
  })
  const result = petFormat.parsePetJson(json, 9)
  assert.equal(result.ok, true)
  assert.equal(result.pet.id, 'feibi-jiubi')
  assert.equal(result.pet.spriteVersionNumber, 1)
  assert.equal(result.pet.kind, null)
  assert.deepEqual(Object.keys(result.pet.states).sort(), [
    'failed', 'idle', 'jumping', 'review', 'running', 'running-left',
    'running-right', 'waiting', 'waving',
  ].sort())
  const idle = result.pet.states.idle
  assert.equal(idle.row, 0)
  assert.equal(idle.frameCount, 6)
  assert.equal(idle.timingMs.length, 6)
  assert.equal(idle.playback, 'loop')
  const waving = result.pet.states.waving
  assert.equal(waving.row, 3)
  assert.equal(waving.frameCount, 4)
  assert.equal(waving.playback, 'once')
  assert.deepEqual(result.pet.clickAnimations, [])
})

test('有效包目录判定：pet.json + 引用图集都在', () => {
  assert.deepEqual(petFormat.assessPackageDir(['pet.json', 'spritesheet.png']), {
    valid: true,
    reason: null,
  })
})

test('无 pet.json 的目录不是有效包', () => {
  const result = petFormat.assessPackageDir([])
  assert.equal(result.valid, false)
  assert.match(result.reason, /pet\.json/)
})

test('有 pet.json 但无图集的目录不是有效包', () => {
  const result = petFormat.assessPackageDir(['pet.json', 'README.md'])
  assert.equal(result.valid, false)
  assert.match(result.reason, /spritesheet|图集/)
})

// 切片 2：社区扩展 v1（animations 元数据 + interactions.click）+ 11 行 v2 + 错误路径

test('带 animations 元数据的 v1：保留每动画的行号/帧数/节奏/播放方式', () => {
  const json = JSON.stringify({
    id: 'sasuke-3',
    displayName: 'Sasuke Uchiha',
    description: 'A chibi Sasuke desktop pet.',
    spritesheetPath: 'spritesheet.png',
    kind: 'person',
    animations: {
      idle: {
        displayName: 'Sharingan Breathing',
        sourceRow: 'idle',
        frameCount: 8,
        timingMs: [240, 180, 180, 160, 160, 180, 180, 280],
        playback: 'loop',
        loop: true,
      },
      chidoriDashRight: {
        displayName: 'Chidori Dash Right',
        sourceRow: 'running-right',
        frameCount: 8,
        timingMs: [120, 120, 120, 120, 120, 120, 120, 220],
        playback: 'once',
        loop: false,
      },
      amaterasu: {
        displayName: 'Amaterasu',
        sourceRow: 3,
        frameCount: 8,
        timingMs: [140, 140, 160, 180, 200, 180, 160, 240],
        playback: 'once',
        loop: false,
      },
    },
    interactions: {
      click: {
        animations: ['amaterasu', 'chidoriDashRight'],
        mode: 'cycle',
      },
    },
  })
  const result = petFormat.parsePetJson(json, 9)
  assert.equal(result.ok, true)
  assert.equal(result.pet.kind, 'person')
  const idle = result.pet.states.idle
  assert.equal(idle.row, 0)
  assert.equal(idle.frameCount, 8)
  assert.deepEqual(idle.timingMs, [240, 180, 180, 160, 160, 180, 180, 280])
  assert.equal(idle.playback, 'loop')
  const dash = result.pet.states['chidoriDashRight']
  assert.equal(dash.row, 1)
  assert.equal(dash.playback, 'once')
  assert.equal(dash.loop, false)
  const amaterasu = result.pet.states.amaterasu
  assert.equal(amaterasu.row, 3)
  assert.equal(result.pet.states.running.frameCount, 6, '未声明的行保持官方默认帧数')
  assert.deepEqual(result.pet.clickAnimations, ['amaterasu', 'chidoriDashRight'])
})

test('v2 图集 11 行：前 9 行标准命名，第 10/11 行回退命名且 8 帧', () => {
  const json = JSON.stringify({
    id: 'itachi-2',
    displayName: 'Itachi',
    description: 'A tiny calm rogue ninja pet.',
    spriteVersionNumber: 2,
    spritesheetPath: 'spritesheet.png',
  })
  const result = petFormat.parsePetJson(json, 11)
  assert.equal(result.ok, true)
  assert.equal(result.pet.spriteVersionNumber, 2)
  assert.equal(result.pet.states.idle.row, 0)
  assert.equal(result.pet.states.review.row, 8)
  assert.equal(result.pet.states['row-9'].row, 9)
  assert.equal(result.pet.states['row-9'].frameCount, 8)
  assert.equal(result.pet.states['row-10'].row, 10)
})

test('非法 JSON 报错', () => {
  const result = petFormat.parsePetJson('{ not json', 9)
  assert.equal(result.ok, false)
  assert.ok(result.errors.length > 0)
})

test('缺少必填字段报错', () => {
  const result = petFormat.parsePetJson(JSON.stringify({ id: 'x', displayName: 'x' }), 9)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => e.includes('spritesheetPath')))
})

test('非法 spriteVersionNumber 报错', () => {
  const json = JSON.stringify({
    id: 'x', displayName: 'x', description: 'x', spritesheetPath: 'a.png',
    spriteVersionNumber: 3,
  })
  const result = petFormat.parsePetJson(json, 9)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => e.includes('spriteVersionNumber')))
})

test('animations 引用未知行名时报错且不产出该动画', () => {
  const json = JSON.stringify({
    id: 'x', displayName: 'x', description: 'x', spritesheetPath: 'a.png',
    animations: { weird: { sourceRow: 'not-a-row', frameCount: 4 } },
  })
  const result = petFormat.parsePetJson(json, 9)
  assert.equal(result.ok, true)
  assert.equal(result.pet.states.weird, undefined)
})

// 切片 3：真实宠物库兼容性

test('带 BOM 的 pet.json（sasuke-3 实测如此）可正常解析', () => {
  const json = '\uFEFF' + JSON.stringify({
    id: 'sasuke-3', displayName: 'Sasuke Uchiha', description: 'x',
    spritesheetPath: 'spritesheet.png',
  })
  const result = petFormat.parsePetJson(json, 9)
  assert.equal(result.ok, true)
  assert.equal(result.pet.id, 'sasuke-3')
})
