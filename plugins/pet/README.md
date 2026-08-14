# dsh-pet（持久插件）

DSH Web 界面里的状态驱动悬浮宠物。本包是原型验证后的持久 Cordis Web 插件：

- 宿主半：`lib/index.mjs` —— 监听 `agent/status`、`agent/error`、`tools/execute`、
  `approval/request`、`subagent/start|end`，驱动状态机；提供宠物库读写与
  `/pet/rpc/<method>` JSON RPC。
- 客户端半：`lib/client.js` —— `window.__ModuleLoader__` 工厂，注入
  `shell.overlay`（宠物本体/悬浮入口）与 `conversation.session.header.actions`
  （头部入口）。
- 纯逻辑：`src/{pet-format,state-machine,animation,base64,image-dims}.js`，
  由 `node:test` 覆盖。

## 开发

```sh
cd plugins/pet
npm run build   # 从 src/client-ui.js + src/animation.js 生成 lib/client.js
npm test        # 纯逻辑 + bundle 一致性 + 原型副本同步
```

## 挂载到 DSH Web profile

本包同时声明了 `dsh.bundle`（单插件补丁层）与 `dsh.client`。安装为 profile
依赖后，`dsh plugin` 会自动把它追加到 `dsh.profile.bundles`：

```sh
dsh plugin --profile web add link:/绝对路径/plugins/pet
dsh web
```

`cordis.patch.yml` 会插入一行 `id: pet, name: dsh-pet, inject: [webServer]`；
客户端模块扫描器据此把 bundle 注入 `window.__DSH_BOOT__`，路由为
`/plugins/dsh-pet/client.js`。

也可以不把本包作为 bundle，而手动在 profile 的 `cordis.patch.yml` 中插入同一行，
并保证 `dsh-pet` 在 profile 的 Node 解析范围内。

## RPC 契约

客户端 `POST /pet/rpc/<method>`（JSON 请求/响应，方法见 `lib/index.mjs`）：

`getStatus` / `setCurrentSession` / `loadState` / `saveState` / `listPets` /
`listImportCandidates` / `importPet` / `getPet`。

## 边界

- 宠物库格式与 Codex 生态兼容，但 DSH 库是 `$DSH_HOME/pet-<id>.json` 扁平文件，
  不反向兼容 Codex 目录格式。
- 首版不做：养成互动、`/pet` 命令、设置页、菜单删除宠物。
