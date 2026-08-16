# dsh-pet 测试指南

本文档覆盖 `plugins/pet` 的自动化测试与手动功能测试，重点包括新增的多会话跟踪与活动托盘。

## 1. 自动化测试

### 运行全部测试

```sh
cd plugins/pet
npm test
```

当前测试套件覆盖：

| 文件 | 覆盖内容 |
| --- | --- |
| `test/animation.test.js` | 动画帧推进、循环/单次播放、点击技能循环 |
| `test/base64.test.js` | 图集 base64 编码 |
| `test/image-dims.test.js` | PNG / WebP 尺寸解析 |
| `test/pet-format.test.js` | 宠物包 v1/v2 解析、社区扩展、目录校验 |
| `test/state-machine.test.js` | 单会话状态机：空闲/工作/等待/失败/子代理 |
| `test/multi-session.test.js` | 多会话纯逻辑：优先级、排序、Ready、Blocked 已确认过滤、自动打开判断 |
| `test/multi-session-host.test.js` | 宿主集成：`getStatus().activities`、Blocked 已确认、未知事件忽略、子代理归父会话、会话清理 |
| `test/client-build.test.js` | 客户端 bundle 可重复生成、可解析、插件注册 |
| `test/sync.test.js` | 原型内嵌副本与 `src/` 纯逻辑同步 |
| `test/persistent.test.js` | 路径安全、RPC 路由、插件双面契约 |

### 只运行多会话相关测试

```sh
cd plugins/pet
node --test test/multi-session.test.js test/multi-session-host.test.js
```

### 重新生成客户端 bundle

```sh
cd plugins/pet
npm run build
```

> `npm test` 的 `pretest` 会自动重新生成 bundle，通常无需手动执行。

---

## 2. 手动功能测试清单

### 2.1 基础回归

- [ ] 唤醒/隐藏宠物正常
- [ ] 宠物可拖拽，刷新后位置保留
- [ ] 点击宠物播放点击技能或问候动画
- [ ] 设置页可选择/导入宠物
- [ ] 设置页可调整宠物缩放，刷新后缩放比例保留

### 2.2 多会话状态跟踪

- [ ] 会话 A 正在运行，会话 B 等待审批 → 宠物展示 B（Needs input）
- [ ] 会话 A 正在运行，会话 B 出错 → 宠物展示 B（Blocked）
- [ ] 会话 A 出错，会话 B 等待审批 → 宠物展示 B（等待审批优先）
- [ ] 会话完成且有绿点时 → 宠物展示「待查看」+ `review` 动画
- [ ] 多个同优先级活动 → 按最后活动时间最新优先

### 2.3 Blocked 已确认语义

- [ ] 非当前会话出错时，活动托盘出现该 Blocked
- [ ] 打开该会话后，它从“非当前提醒”中消失
- [ ] 当前会话仍可显示 `failed`
- [ ] 该会话之后出现新活动 → 重新提醒
- [ ] 刷新页面后，之前的已确认标记被清除并重新提醒

### 2.4 活动托盘

- [ ] 只有当前会话活动时，不自动弹托盘
- [ ] 存在非当前活动会话时，自动打开托盘
- [ ] 有 ≥2 个活动会话时，自动打开托盘
- [ ] 托盘显示：会话标题 + 状态文字 + 最后活动时间
- [ ] 点击非当前项能切换到对应会话
- [ ] 点击当前项不关闭托盘
- [ ] 切换后如果不再满足自动打开条件，托盘自动关闭
- [ ] 手动关闭后，同一批活动不再反复弹出
- [ ] 出现新的活动会话 id 时，托盘重新自动打开
- [ ] 宠物旁的手动打开按钮可用
- [ ] 手动打开后清除之前的关闭抑制
- [ ] 隐藏宠物时托盘也隐藏；重新唤醒后保留手动关闭抑制

### 2.5 子代理

- [ ] 子代理运行时，父会话显示「子代理工作中」
- [ ] 子代理会话本身不出现在托盘
- [ ] 子代理自身错误不会误报为父会话 Blocked

### 2.6 边界情况

- [ ] 无当前会话时，只要有活动会话就自动打开托盘
- [ ] 活动会话很多时，托盘可滚动（最多同时可见约 5 项）
- [ ] 缺少 sessionId 的事件不会导致状态错乱
- [ ] 会话从列表移除后，宿主状态被清理

---

## 3. 集成测试示例

新增的 `test/multi-session-host.test.js` 使用最小 mock `ctx` 加载真实宿主半，直接验证 RPC 行为：

```js
await h.rpc('syncSessions', { ids: ['s1', 's2'] })
await h.rpc('setCurrentSession', { sessionId: 's1' })

await h.emit('agent/status', { agent: { id: 's1' }, status: 'running' })
await h.emit('agent/status', { agent: { id: 's2' }, status: 'running' })

const res = await h.rpc('getStatus')
// res.body.activities 应包含 s1/s2 的 working 状态
```

如果要模拟“等待审批”等挂起状态，需要让 `next()` 保持 pending，例如：

```js
let resolveApproval
const approvalDone = new Promise((resolve) => { resolveApproval = resolve })
const emit = h.emit('approval/request', { agent: { id: 's2' } }, () => approvalDone)

// 此时 getStatus 中 s2 应为 waiting + pendingKind: 'approval'
const res = await h.rpc('getStatus')

resolveApproval('ok')
await emit
```

---

## 4. 常见问题

- **测试失败提示 bundle 不一致**：运行 `npm run build` 重新生成 `lib/client.js`。
- **测试失败提示内嵌副本漂移**：在仓库根目录运行：
  ```sh
  node .scratch/pet/prototype/sync-inline.js
  ```
  然后重新运行 `npm test`。
- **手动测试时看不到托盘**：确认存在“非当前活动会话”或“活动会话数 ≥ 2”；如果宠物被隐藏，托盘也会隐藏。
