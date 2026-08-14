'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

const { bytesToBase64 } = require('../src/base64.js')

test('标准字节序列与已知向量一致', () => {
  assert.equal(bytesToBase64(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f])), 'aGVsbG8=')
  assert.equal(bytesToBase64(new Uint8Array([0xff, 0xfe])), '//4=')
  assert.equal(bytesToBase64(new Uint8Array([0x00, 0x01, 0x02])), 'AAEC')
})

test('空输入返回空字符串', () => {
  assert.equal(bytesToBase64(new Uint8Array(0)), '')
})

test('覆盖 3 的余数边界：1 字节与 2 字节尾部补位', () => {
  assert.equal(bytesToBase64(new Uint8Array([0x4d])), 'TQ==')
  assert.equal(bytesToBase64(new Uint8Array([0x4d, 0x61])), 'TWE=')
})
