# @yshark/dsh-codex-pet 打包与发布指南

本文说明如何把本插件打包并发布到 npm，让其他用户可以通过 DSH CLI 一键安装。

## 1. 包信息

- npm 包名：`@yshark/dsh-codex-pet`
- 插件入口：`lib/index.mjs`
- 客户端 bundle：`lib/client.js`
- 组合包 patch：`cordis.patch.yml`
- 运行依赖：`react`（peer dependency）

## 2. 本地安装（开发/调试）

```sh
cd /path/to/dsh-pet-plugin/plugins/pet
npm run build
npm test
```

安装到当前 DSH Web profile：

```sh
dsh plugin --profile web add link:/绝对路径/dsh-pet-plugin/plugins/pet
dsh web
```

## 3. 发布前检查

```sh
cd plugins/pet

# 1. 构建最新客户端 bundle
npm run build

# 2. 运行测试
npm test

# 3. 预览即将发布的文件
npm pack --dry-run
```

`npm pack --dry-run` 会列出 tarball 内容，确认包含：

- `lib/index.mjs`
- `lib/client.js`
- `cordis.patch.yml`
- `package.json`
- `src/pet-format.js`
- `src/state-machine.js`
- `src/image-dims.js`

## 4. 发布到 npm

```sh
cd plugins/pet

# 登录 npm（只需一次）
npm login

# 发布
npm publish
```

发布成功后，其他用户即可安装：

```sh
dsh plugin --profile web add @yshark/dsh-codex-pet
```

或：

```sh
dsh plugin add @yshark/dsh-codex-pet
```

## 5. 更新版本

修改 `package.json` 中的 `version`，然后重新发布：

```sh
npm version patch   # 0.1.0 -> 0.1.1
npm publish
```

## 6. 注意事项

- 包名 `@yshark/dsh-codex-pet` 会作为插件 id 和客户端路由：
  - 路由：`/plugins/@yshark/dsh-codex-pet/client.js`
- 发布前必须运行 `npm run build`，确保 `lib/client.js` 是最新构建产物。
- 宿主端 `lib/index.mjs` 在 DSH 进程启动时加载，用户安装/更新后需要重启 DSH Web。
- 不要随意修改包名，否则旧缓存和旧路由可能残留。
- 如果新增了运行时依赖的 `src/*.js`，记得加入 `package.json` 的 `files` 白名单。
