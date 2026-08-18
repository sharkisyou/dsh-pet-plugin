'use strict'
// 导入性能优化回归测试：
// - 单个导入只复制运行时必需的 pet.json + 图集，不再整目录复制
// - 批量导入能并发处理多个子宠物包并正确聚合结果
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
const os = require('node:os')
const fsp = require('node:fs/promises')

const ROOT = path.resolve(__dirname, '..')
const PLUGIN_URL = pathToFileURL(path.join(ROOT, 'lib', 'index.mjs')).href

async function createHarness() {
  const plugin = await import(PLUGIN_URL)
  const routes = []

  const ctx = {
    get() { return undefined },
    on() {},
    effect(fn) { return fn() },
    logger: console,
    webServer: {
      register(route) {
        routes.push(route)
        return () => {}
      },
    },
  }

  const dshHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'dsh-pet-import-test-'))
  process.env.DSH_HOME = dshHome
  await fsp.mkdir(path.join(dshHome, 'pets'), { recursive: true })

  plugin.apply(ctx)

  async function rpc(method, args = {}) {
    const route = routes[0]
    const payload = Buffer.from(JSON.stringify(args))
    const req = {
      url: `/pet/rpc/${method}`,
      method: 'POST',
      headers: { 'content-length': String(payload.length) },
      [Symbol.asyncIterator]() {
        let done = false
        return {
          next: async () => {
            if (done) return { done: true }
            done = true
            return { done: false, value: payload }
          },
        }
      },
    }
    let status = 0
    let body = ''
    const res = {
      writeHead(code) { status = code },
      end(text) { body = text },
    }
    await route.handler(req, res)
    return { status, body: body ? JSON.parse(body) : null }
  }

  return {
    dshHome,
    rpc,
    cleanup: () => fsp.rm(dshHome, { recursive: true, force: true }),
  }
}

// 构造一个只含合法 PNG 头部（宽高字段）的图集即可通过 imageDims 校验，
// 无需真正解码整张图片 —— 也验证导入不再把整张图集读进内存。
function pngBytes(width, height) {
  const buf = Buffer.alloc(33)
  buf.writeUInt32BE(0x89504e47, 0) // PNG signature
  buf.writeUInt32BE(0x0d0a1a0a, 4)
  buf.writeUInt32BE(13, 8) // IHDR length
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  buf.writeUInt8(8, 24) // bit depth
  buf.writeUInt8(6, 25) // color type
  return buf
}

const CELL_W = 192
const CELL_H = 208
const SPRITE_NAME = 'spritesheet.png'

async function writePackage(dir, id, extraFiles = []) {
  await fsp.mkdir(dir, { recursive: true })
  const width = CELL_W * 8 // 8 列网格
  const height = CELL_H // 1 行
  const petJson = {
    id,
    displayName: id,
    description: 'test pet',
    spritesheetPath: SPRITE_NAME,
  }
  await fsp.writeFile(path.join(dir, 'pet.json'), JSON.stringify(petJson), 'utf8')
  await fsp.writeFile(path.join(dir, SPRITE_NAME), pngBytes(width, height))
  for (const name of extraFiles) {
    await fsp.writeFile(path.join(dir, name), Buffer.alloc(1024 * 64, 0xab))
  }
}

test('单个导入只复制 pet.json 与图集，不复制无关文件', async () => {
  const h = await createHarness()
  try {
    const src = path.join(h.dshHome, 'src-single')
    await writePackage(src, 'single-pet', ['preview.png', 'notes.txt'])

    const res = await h.rpc('importPet', { path: src })
    assert.equal(res.status, 200)
    assert.equal(res.body.ok, true)

    const dest = path.join(h.dshHome, 'pets', 'single-pet')
    const copied = await fsp.readdir(dest)
    assert.deepEqual(copied.sort(), ['pet.json', 'spritesheet.png'].sort())
    assert.equal(await fsp.stat(path.join(dest, 'pet.json')).then((s) => s.isFile()), true)
    assert.equal(await fsp.stat(path.join(dest, 'spritesheet.png')).then((s) => s.isFile()), true)
  } finally {
    await h.cleanup()
  }
})

test('批量导入并发处理多个子宠物包并聚合结果', async () => {
  const h = await createHarness()
  try {
    const src = path.join(h.dshHome, 'src-batch')
    await writePackage(path.join(src, 'pet-a'), 'pet-a')
    await writePackage(path.join(src, 'pet-b'), 'pet-b')
    // 非宠物包子目录应被跳过
    await fsp.mkdir(path.join(src, 'not-a-pet'), { recursive: true })
    await fsp.writeFile(path.join(src, 'not-a-pet', 'readme.txt'), 'x')

    const res = await h.rpc('importPet', { path: src })
    assert.equal(res.status, 200)
    assert.equal(res.body.ok, true)
    assert.equal(res.body.imported, 2)
    assert.equal(res.body.skipped, 0)
    assert.equal(res.body.failed, 0)

    assert.equal(await fsp.stat(path.join(h.dshHome, 'pets', 'pet-a', 'pet.json')).then((s) => s.isFile()), true)
    assert.equal(await fsp.stat(path.join(h.dshHome, 'pets', 'pet-b', 'pet.json')).then((s) => s.isFile()), true)
    // 非宠物目录不应产生同名库目录
    await assert.rejects(fsp.stat(path.join(h.dshHome, 'pets', 'not-a-pet')))
  } finally {
    await h.cleanup()
  }
})

test('批量导入时同名宠物被跳过，不记为失败', async () => {
  const h = await createHarness()
  try {
    const src = path.join(h.dshHome, 'src-dup')
    await writePackage(path.join(src, 'pet-x'), 'pet-x')
    // 先导入一次
    let res = await h.rpc('importPet', { path: path.join(src, 'pet-x') })
    assert.equal(res.body.ok, true)

    // 再次整体导入：pet-x 已存在 → skipped
    res = await h.rpc('importPet', { path: src })
    assert.equal(res.status, 200)
    assert.equal(res.body.ok, true)
    assert.equal(res.body.imported, 0)
    assert.equal(res.body.skipped, 1)
    assert.equal(res.body.failed, 0)
  } finally {
    await h.cleanup()
  }
})
