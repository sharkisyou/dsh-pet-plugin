# dsh-pet（持久插件）

DSH Web 界面里的状态驱动悬浮宠物。兼容 Codex 宠物包格式（v1 + v2），
通过路径选择导入宠物包，并在 `$DSH_HOME/pets/<id>/` 保存包目录。

## 功能

- 状态驱动动画：空闲 / 思考中 / 执行工具 / 等待审批 / 等待回答 / 计划审查 / 子代理工作中 / 出错 / 待查看
- 多会话：跨顶层会话跟踪、按优先级单点展示、活动托盘（点击切换会话）
- 宠物包：Codex v1/v2 格式解析、PNG/WebP 图集、社区 `animations` 与
  `interactions.click` 扩展
- 导入：选择本地宠物包目录，校验并复制到 DSH 宠物库
- 记忆：选中宠物、唤醒状态、拖拽位置存 `$DSH_HOME/pet-state.json`
- 点击技能：按包声明顺序循环播放
- 设置页：宠物控制入口（唤醒/隐藏、选择、导入）

## 架构

- 宿主半：`lib/index.mjs`
  - 监听 `agent/status`、`agent/error`、`tools/execute`、`approval/request`、
    `subagent/start|end`
  - 每个顶层会话一个状态机，按 sessionId 路由，切页互不串状态
  - 提供 `/pet/rpc/<method>` JSON RPC，含 `activities` 与 `syncSessions`
- 客户端半：`lib/client.js`
  - `window.__ModuleLoader__` 工厂，由 `window.__DSH_BOOT__` 注入
  - `shell.overlay`：渲染宠物本体、状态气泡与活动托盘
  - `settings.section`：宠物控制面板
- 纯逻辑：`src/{pet-format,state-machine,animation,base64,image-dims,multi-session}.js`，
  由 `node:test` 覆盖
- 构建：`scripts/build-client.mjs` 从 `src/client-ui.js` + `src/animation.js` +
  `src/multi-session.js` 生成 `lib/client.js`

## 状态 → 动画映射

单会话优先级：失败 > 等待 > 工作 > 空闲。
多会话展示优先级：需要输入 > 受阻 > 就绪 > 运行中。

| 宠物状态 | 气泡 | 动画行 | 说明 |
|---|---|---|---|
| 空闲 | `空闲` | `idle`（第 1 行） | 回合结束约 5 秒内显示「等待回复」 |
| 思考中 | `思考中` | `running`（第 8 行） | `agent/status=running` |
| 执行工具 | `执行工具 <name>` | `running`（第 8 行） | 工具执行中 |
| 等待审批 | `等待审批` | `waiting`（第 7 行） | 审批挂起 |
| 等待回答 | `等待回答` | `waiting`（第 7 行） | `ask_user_question` 挂起 |
| 子代理工作中 | `子代理工作中` | `running`（第 8 行） | 子代理生命周期内 |
| 待查看 | `待查看` | `review`（第 9 行） | 会话完成且有未读活动（绿点） |
| 出错 | `出错` | `failed`（第 6 行） | 保持到下一次真实活动 |

- 失败状态不会因时间流逝自动回空闲；新回合/工具/审批/子代理到来时清除。
- 唤醒问候：`waving` → `jumping` → `idle` 依可用性回退。
- 点击技能：包声明顺序循环；慢速连点也会按顺序前进。

## 宠物库与导入

- 导入源：用户通过目录选择器选择的本地宠物包目录
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

## VSCode 调试

插件宿主半的 main 入口是 `lib/index.mjs`（`package.json` 的 `"main"` 字段），
真正的插件逻辑从该文件导出的 `apply(ctx)` 开始。它不是独立可执行文件，
需要由 DSH/Cordis 加载；因此调试有两种方式：

1. **用仓库自带的 mock host 调试（推荐，不依赖 DSH 环境）**
   - 在 VSCode 打开仓库根目录。
   - 在 `plugins/pet/lib/index.mjs`（或 `src/` 下纯逻辑）里打断点。
   - 运行 “Debug Pet Plugin (mock host)” 调试配置；它会启动
     `plugins/pet/scripts/debug-host.mjs`，用临时 `DSH_HOME` 加载真实插件，
     模拟 `agent/status`、`tools/execute` 和 `/pet/rpc/*`，方便命中宿主半断点。
   - 也可命令行：`cd plugins/pet && npm run debug`（会以 `--inspect-brk=9229` 启动）。

2. **直接启动/Attach 到真实 DSH Web 进程**
   - 如果 DSH 已经用调试模式启动（例如 `NODE_OPTIONS='--inspect-brk=9229' dsh web`），
     在 VSCode 选择 “Attach to DSH Web (9229)” 配置连接即可。
   - 也可以直接在 VSCode 选择 “Launch DSH Web (debug)” 配置，它会自动以
     `NODE_OPTIONS='--inspect=9229' dsh web --port 3081` 方式启动 DSH 并 attach。
   - 插件代码运行在 DSH 主进程内，所以 attach 后需要触发对应事件
     （如开始一个会话、执行工具、发起审批）才会进入断点。
   - 注意：如果已经有一个普通方式启动的 DSH 在运行（默认监听 `127.0.0.1:3080`），
     新的调试实例会因端口被占用而启动失败。仓库自带的 “Launch DSH Web (debug)”
     已使用 `--port 3081` 启动，避免和旧实例冲突；也可以改成其他空闲端口。

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
| `getStatus` | 当前状态、气泡、`activities`、事件计数、当前会话 |
| `setCurrentSession` | 客户端上报当前页面会话；打开 Blocked 会话时标记已确认 |
| `syncSessions` | 客户端上报顶层会话 id 列表，宿主清理已消失会话 |
| `resetAcknowledged` | 页面初始化时清除 Blocked 已确认标记 |
| `loadState` / `saveState` | 读取/保存选中宠物、唤醒、位置 |
| `listPets` | DSH 宠物库列表 |
| `listImportCandidates` | Codex 目录下的导入候选 |
| `importPet` | 校验并复制一个包目录 |
| `getPet` | 标准化模型 + 图集 data URL |

## 边界

- DSH 宠物库保存 Codex 包目录，读取时即时标准化；不反向写入 Codex 目录。
- 宠物控制入口在设置页；会话头部与右下角不设常驻入口。
- 首版不做：养成互动（喂食/抚摸）、`/pet` 命令、菜单删除宠物、多窗口同步。
