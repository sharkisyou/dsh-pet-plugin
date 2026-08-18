'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { PET_NS, zh, en, localeFromTag, translate } = require('../src/i18n.js')

test('zh/en 字典键集合一致', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
})

test('localeFromTag：zh/en 及区域变体', () => {
  assert.equal(localeFromTag('zh-CN'), 'zh')
  assert.equal(localeFromTag('zh-Hans-CN'), 'zh')
  assert.equal(localeFromTag('en'), 'en')
  assert.equal(localeFromTag('en-GB'), 'en')
  assert.equal(localeFromTag('fr-FR'), 'zh')
  assert.equal(localeFromTag(null), 'zh')
})

test('translate：中文与英文文案、参数插值、缺失回退', () => {
  assert.equal(translate('zh', 'idle'), '空闲')
  assert.equal(translate('en', 'idle'), 'Idle')
  assert.equal(translate('en', 'executingTool', { name: 'read' }), 'Running tool read')
  assert.equal(translate('zh', 'executingTool', { name: 'read' }), '执行工具 read')
  assert.equal(translate('zh', 'noSuchKey'), 'noSuchKey')
})

test('PET_NS 稳定为 pet', () => {
  assert.equal(PET_NS, 'pet')
})
