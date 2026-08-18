'use strict'
// 插件更新检查纯逻辑（无副作用）：查询 npm registry 的 dist-tags.latest 并与当前版本比较。
// fetch 由调用方注入，便于测试；不在此引入 require/import。

const DEFAULT_REGISTRY = 'https://registry.npmjs.org'
const DEFAULT_TIMEOUT_MS = 8000

function parseVersion(value) {
  if (typeof value !== 'string') return null
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim())
  if (m === null) return null
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) }
}

function compareVersions(a, b) {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (pa === null || pb === null) return null
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1
  return 0
}

async function checkForUpdate(options) {
  const {
    current,
    packageName,
    registry = DEFAULT_REGISTRY,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options || {}
  if (typeof current !== 'string' || current === '' ||
      typeof packageName !== 'string' || packageName === '') {
    return { ok: false, error: '参数不完整' }
  }
  const base = String(registry).replace(/\/+$/, '')
  const url = `${base}/${encodeURIComponent(packageName)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetchImpl(url, { signal: controller.signal, headers: { accept: 'application/json' } })
  } catch (error) {
    return { ok: false, error: '网络请求失败: ' + (error && error.message ? error.message : String(error)) }
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) {
    return { ok: false, error: `registry 返回 ${response.status}` }
  }
  let data
  try {
    data = await response.json()
  } catch (error) {
    return { ok: false, error: 'registry 响应不是合法 JSON' }
  }
  const latest = data !== null && typeof data === 'object' && data['dist-tags'] !== null &&
    typeof data['dist-tags'] === 'object'
    ? data['dist-tags'].latest
    : undefined
  if (typeof latest !== 'string' || latest === '') {
    return { ok: false, error: 'registry 响应缺少 dist-tags.latest' }
  }
  const compared = compareVersions(latest, current)
  return {
    ok: true,
    current,
    latest,
    hasUpdate: compared === 1,
    sameVersion: compared === 0,
    invalidCurrent: compared === null,
  }
}

module.exports = { parseVersion, compareVersions, checkForUpdate, DEFAULT_REGISTRY, DEFAULT_TIMEOUT_MS }
