'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

const { imageDims, spriteMime } = require('../src/image-dims.js')

function pngBytes(width, height) {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]) // PNG 签名
  bytes[16] = (width >>> 24) & 0xff
  bytes[17] = (width >>> 16) & 0xff
  bytes[18] = (width >>> 8) & 0xff
  bytes[19] = width & 0xff
  bytes[20] = (height >>> 24) & 0xff
  bytes[21] = (height >>> 16) & 0xff
  bytes[22] = (height >>> 8) & 0xff
  bytes[23] = height & 0xff
  return bytes
}

test('PNG 尺寸从 IHDR 读取（1536×1872）', () => {
  assert.deepEqual(imageDims(pngBytes(1536, 1872)), { width: 1536, height: 1872 })
})

test('WebP VP8X 尺寸：24 位宽高减一存储', () => {
  const bytes = new Uint8Array(30)
  bytes.set([0x52, 0x49, 0x46, 0x46]) // RIFF
  bytes.set([0x57, 0x45, 0x42, 0x50], 8) // WEBP
  bytes.set([0x56, 0x50, 0x38, 0x58], 12) // VP8X
  const w = 1536 - 1
  const h = 2288 - 1
  bytes[24] = w & 0xff
  bytes[25] = (w >>> 8) & 0xff
  bytes[26] = (w >>> 16) & 0xff
  bytes[27] = h & 0xff
  bytes[28] = (h >>> 8) & 0xff
  bytes[29] = (h >>> 16) & 0xff
  assert.deepEqual(imageDims(bytes), { width: 1536, height: 2288 })
})

test('WebP VP8 有损：14 位宽高', () => {
  const bytes = new Uint8Array(30)
  bytes.set([0x52, 0x49, 0x46, 0x46])
  bytes.set([0x57, 0x45, 0x42, 0x50], 8)
  bytes.set([0x56, 0x50, 0x38, 0x20], 12) // 'VP8 '
  bytes.set([0x9d, 0x01, 0x2a], 20) // frame start code
  const w = 1536 & 0x3fff
  const h = 1872 & 0x3fff
  bytes[26] = w & 0xff
  bytes[27] = (w >>> 8) & 0xff
  bytes[28] = h & 0xff
  bytes[29] = (h >>> 8) & 0xff
  assert.deepEqual(imageDims(bytes), { width: 1536, height: 1872 })
})

test('WebP VP8L 无损：位域宽高减一', () => {
  const bytes = new Uint8Array(30)
  bytes.set([0x52, 0x49, 0x46, 0x46])
  bytes.set([0x57, 0x45, 0x42, 0x50], 8)
  bytes.set([0x56, 0x50, 0x38, 0x4c], 12) // 'VP8L'
  bytes[20] = 0x2f
  const w = 1536 - 1
  const h = 1872 - 1
  const bits = (h << 14) | w
  bytes[21] = bits & 0xff
  bytes[22] = (bits >>> 8) & 0xff
  bytes[23] = (bits >>> 16) & 0xff
  bytes[24] = (bits >>> 24) & 0xff
  assert.deepEqual(imageDims(bytes), { width: 1536, height: 1872 })
})

test('非图片字节返回 null', () => {
  assert.equal(imageDims(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), null)
})

test('spriteMime 按扩展名选择 png/webp，未知回退 png', () => {
  assert.equal(spriteMime('spritesheet.png'), 'image/png')
  assert.equal(spriteMime('spritesheet.webp'), 'image/webp')
  assert.equal(spriteMime('spritesheet.PNG'), 'image/png')
  assert.equal(spriteMime('spritesheet.gif'), 'image/png')
})
