# dsh-pet（持久插件）

DSH Web 界面里的状态驱动悬浮宠物。兼容 Codex 宠物包格式（v1 + v2），
从 `~/.codex/pets/` 导入，并在 `$DSH_HOME/pets/<id>/` 保存包目录。

## 功能

- 状态驱动动画：空闲 / 思考中 / 执行工具 / 等待审批 / 等待回答 / 子代理工作中 / 出错
- 宠物包：Codex v1/v2 格式解析、PNG/WebP 图集、社区 `animations` 与
  `interactions.click` 扩展
- 导入：从 Codex 宠物目录校验并复制包目录到 DSH 宠物库
- 记忆：选中宠物、唤醒状态、拖拽位置存 `$DSH_HOME/pet-state.json`
- 点击技能：按包声明顺序循环播放
- 设置页：宠物控制入口（唤醒/隐藏、选择、导入、诊断）

## 架构

- 宿主半：`lib/index.mjs`
  - 监听 `agent/status`、`agent/error`、`tools/execute`、`approval/request`、
    `subagent/start|end`
  - 每个会话一个状态机，切页互不串状态
  - 提供 `/pet/rpc/<method>` JSON RPC
- 客户端半：`lib/client.js`
  - `window.__ModuleLoader__` 工厂，由 `window.__DSH_BOOT__` 注入
  - `shell.overlay`：只渲染宠物本体与状态气泡
  - `settings.section`：宠物控制面板
- 纯逻辑：`src/{pet-format,state-machine,animation,base64,image-dims}.js`，
  由 `node:test` 覆盖
- 构建：`scripts/build-client.mjs` 从 `src/client-ui.js` + `src/animation.js`
  生成 `lib/client.js`

## 状态 → 动画映射

优先级：失败 > 等待 > 工作 > 空闲。

| 宠物状态 | 气泡 | 动画行 | 说明 |
|---|---|---|---|
| 空闲 | `空闲` | `idle`（第 1 行） | 回合结束约 5 秒内显示「等待回复」 |
| 思考中 | `思考中` | `running`（第 8 行） | `agent/status=running` |
| 执行工具 | `执行工具 <name>` | `running`（第 8 行） | 工具执行中 |
| 等待审批 | `等待审批` | `waiting`（第 7 行） | 审批挂起 |
| 等待回答 | `等待回答` | `waiting`（第 7 行） | `ask_user_question` 挂起 |
| 子代理工作中 | `子代理工作中` | `running`（第 8 行） | 子代理生命周期内 |
| 出错 | `出错` | `failed`（第 6 行） | 保持到下一次真实活动 |

- 失败状态不会因时间流逝自动回空闲；新回合/工具/审批/子代理到来时清除。
- 唤醒问候：`waving` → `jumping` → `idle` 依可用性回退。
- 点击技能：包声明顺序循环；慢速连点也会按顺序前进。

## 宠物库与导入

- 导入源：`~/.codex/pets/`
- 导入目标：`$DSH_HOME/pets/<id>/`
- `pets` 目录不存在时自动创建
- 导入前校验：
  - `pet.json` 合法（自动去除 BOM）
  - 图集为 PNG 或 WebP（VP8X / VP8 / VP8L）
  - 图集宽为 8 格、宽高按 192×208 整除
- 选择/唤醒/位置状态：`$DSH_HOME/pet-state.json`

## 开发

```sh
cd plugins/pet
npm run build   # 生成 lib/client.js
npm test        # 纯逻辑 + bundle 一致性 + 原型副本同步
```

## 挂载到 DSH Web profile

本包声明了 `dsh.bundle` 和 `dsh.client`。安装为 profile 依赖后，
`dsh plugin` 会自动追加到 `dsh.profile.bundles`：

```sh
dsh plugin --profile web add link:/绝对路径/plugins/pet
dsh web
```

`cordis.patch.yml` 插入一行：

```yaml
- insert:
    - id: pet
      name: 'dsh-pet'
      inject: [webServer]
```

客户端 bundle 经 `window.__DSH_BOOT__` 注入，路由为
`/plugins/dsh-pet/client.js`。

## RPC 契约

客户端 `POST /pet/rpc/<method>`（JSON 请求/响应）：

| 方法 | 用途 |
|---|---|
| `getStatus` | 当前状态、气泡、事件计数、当前会话 |
| `setCurrentSession` | 客户端上报当前页面会话 |
| `loadState` / `saveState` | 读取/保存选中宠物、唤醒、位置 |
| `listPets` | DSH 宠物库列表 |
| `listImportCandidates` | Codex 目录下的导入候选 |
| `importPet` | 校验并复制一个包目录 |
| `getPet` | 标准化模型 + 图集 data URL |

## 边界

- DSH 宠物库保存 Codex 包目录，读取时即时标准化；不反向写入 Codex 目录。
- 宠物控制入口在设置页；会话头部与右下角不设常驻入口。
- 首版不做：养成互动（喂食/抚摸）、`/pet` 命令、菜单删除宠物、多窗口同步。
