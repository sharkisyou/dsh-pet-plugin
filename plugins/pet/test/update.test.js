'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseVersion, compareVersions, checkForUpdate } = require('../src/update.js')

test('parseVersion：普通/带 v 前缀/带后缀', () => {
  assert.deepEqual(parseVersion('1.2.3'), { major: 1, minor: 2, patch: 3 })
  assert.deepEqual(parseVersion('v0.1.1'), { major: 0, minor: 1, patch: 1 })
  assert.deepEqual(parseVersion('2.0.0-beta.1'), { major: 2, minor: 0, patch: 0 })
  assert.equal(parseVersion('abc'), null)
  assert.equal(parseVersion(null), null)
})

test('compareVersions：大小/相等/非法', () => {
  assert.equal(compareVersions('0.2.0', '0.1.9'), 1)
  assert.equal(compareVersions('0.1.9', '0.2.0'), -1)
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0)
  assert.equal(compareVersions('1.0.0', 'not-a-version'), null)
})

function fakeFetch(json, { ok = true, status = 200 } = {}) {
  return async () => ({ ok, status, json: async () => json })
}

test('checkForUpdate：有更新', async () => {
  const res = await checkForUpdate({
    current: '0.1.1',
    packageName: '@yshark/dsh-codex-pet',
    fetchImpl: fakeFetch({ 'dist-tags': { latest: '0.2.0' } }),
  })
  assert.equal(res.ok, true)
  assert.equal(res.hasUpdate, true)
  assert.equal(res.latest, '0.2.0')
})

test('checkForUpdate：已最新', async () => {
  const res = await checkForUpdate({
    current: '0.1.1',
    packageName: '@yshark/dsh-codex-pet',
    fetchImpl: fakeFetch({ 'dist-tags': { latest: '0.1.1' } }),
  })
  assert.equal(res.ok, true)
  assert.equal(res.hasUpdate, false)
})

test('checkForUpdate：网络失败 / 非 200 / 缺 latest', async () => {
  const net = await checkForUpdate({
    current: '0.1.1',
    packageName: 'x',
    fetchImpl: async () => { throw new Error('boom') },
  })
  assert.equal(net.ok, false)

  const bad = await checkForUpdate({
    current: '0.1.1',
    packageName: 'x',
    fetchImpl: fakeFetch({}, { ok: false, status: 404 }),
  })
  assert.equal(bad.ok, false)

  const missing = await checkForUpdate({
    current: '0.1.1',
    packageName: 'x',
    fetchImpl: fakeFetch({}),
  })
  assert.equal(missing.ok, false)
})
