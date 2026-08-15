# 宠物（Pet）功能规格

Status: ready-for-agent

## 目标

在 DSH Web 界面里实现 Codex 风格的悬浮宠物：一个动画角色陪伴会话，通过动画与状态浮层实时反映当前会话的状态。首版先用动态 Cordis 插件在本会话做出可运行原型，验证后沉淀为仓库持久插件。

领域词汇表见 [plugins/pet/CONTEXT.md](../../plugins/pet/CONTEXT.md)。

## 背景事实

- Codex Pets：Codex Desktop 的可选动画伴侣，随代理状态播放动画，社区宠物包生态（pet.json + 图集）。
- 用户本地宠物库 `~/.codex/pets/`：48 个目录中 14 个有效包，图集统一 1536×1872（8×9 网格、单格 192×208）。
- 两种包格式：
  - **v1**：pet.json 带显式 `animations` 表（每动画含 `sourceRow`/`frameCount`/`timingMs[]`/`playback`/`loop`），可选 `interactions.click`（`animations[]` + `mode: cycle`）；例：sasuke-3。
  - **v2**：`spriteVersionNumber=2`，无 animations 元数据，按固定行序约定渲染；例：itachi-2。
- 空目录（clippy、tom、totoro 等）一律忽略。

## 功能范围（首版）

1. 状态驱动动画（空闲/工作/等待/失败 + 唤醒问候 + 点击技能）
2. 宠物包机制：兼容 Codex 宠物包格式（v1 + v2），DSH 宠物库 + 从 Codex 目录导入
3. 状态浮层：宠物旁一行实时状态文本
4. 唤醒/隐藏：会话头部按钮菜单 + 宠物本体隐藏按钮

不做（首版）：养成互动（喂食/抚摸）、`/pet` 命令、设置页、多窗口同步。

## 行为规格

### 宠物库与导入

- 库位置：`~/.dsh/pets/<id>/`，每个宠物一个从 Codex 包复制来的目录（pet.json + 图集）；若 `~/.dsh/pets/` 不存在则创建。UI 状态存 `~/.dsh/pet-state.json`。
- 设置页的宠物面板含"从 Codex 导入"区块：列出 `~/.codex/pets/` 下有效包（忽略空目录与无效 pet.json），可全选/单选。
- 导入 = 读源 pet.json + 图集 → 校验（图集 PNG/WebP、8 列网格）→ 把整个 Codex 包目录复制到 `~/.dsh/pets/<id>/`。
- 首启不自动导入；库为空时宠物不显示，菜单引导导入。
- 无默认宠物；用户导入并选择后显示。默认唤醒。

### 状态 → 动画映射

优先级：失败 > 等待 > 工作 > 空闲。

| 宠物状态 | 动画行 | DSH 信号 | 浮层文本 |
|---|---|---|---|
| 空闲 | idle | 回合结束等输入 / 无活动 | "空闲"（回合结束后约 5 秒内显示"等待回复"） |
| 工作 | running | agent/status=running；工具执行中 | "思考中" / "执行工具 <name>" |
| 等待 | waiting | 审批挂起；用户提问（ask_user_question）挂起 | "等待审批" / "等待回答" |
| 失败 | failed | agent/error | "出错" |
| 问候 | waving → jumping → idle 依可用性回退 | 唤醒瞬间 | — |
| 技能 | interactions.click（cycle） | 点击宠物本体 | — |

- **等待动画仅用于审批/提问挂起**；回合结束等输入时用空闲动画 + 浮层短暂显示"等待回复"（约 5 秒）后切回"空闲"。
- 子代理活动算"工作"（浮层"子代理工作中"）；按父会话过滤。
- 缺某状态行 → 回退 idle；无 `interactions.click` → 点击播问候。
- 失败状态保持到下一次真实活动（新回合/工具/审批/子代理）到来时才清除；不因时间流逝自动回空闲。
- 跟随**当前页面打开的会话**；页面无会话打开时显示空闲。
- 当前会话识别：头部 Slot 的 `sessionId` prop + overlay 的 `useSessions`（防御性字段提取）；**无法识别当前会话时跟随一切活动**（否则头部入口不可见的页面会永远显示空闲）。
- 菜单底部显示事件计数诊断（status/tools/approvals/subagents/errors 与当前会话），便于排查状态联动。

### 控制与记忆

- 控制入口：设置页 `settings.section` 的宠物面板（空库、隐藏、无会话时也可打开），含唤醒/隐藏、宠物列表（按 displayName）、导入区块；右下角与头部不设常驻入口。
- 宠物本体：默认右下角，可拖拽；本体上有隐藏按钮。
- 记忆（位置 / 所选宠物 / 唤醒状态）：存宿主 `~/.dsh/pet-state.json`（刷新后恢复；多标签页最后写入者生效）。
- 显示尺寸约 96×104（单格 192×208 的 0.5 倍，可调）。

### 图集格式

- 支持 PNG 与 WebP（VP8X / VP8 / VP8L）图集，按实际尺寸推断行数（1536×1872 → 9 行；1536×2288 → 11 行），不依赖 spriteVersionNumber。
- data URL 的 mime 按图集扩展名选择；宿主解析图集头部取得尺寸。
- 标准行（0-8）每行官方已用帧数为 `[6,8,8,4,5,8,6,6,6]`：社区包常在 animations 元数据里把 frameCount 声明为 8，但实际只画了官方帧数、多余格透明——**元数据帧数按官方已用帧数封顶**，否则循环动画尾部出现"消失帧"（宠物闪烁）；非标准行（9-10）不封顶。

## 实现方案（动态 Cordis 插件原型）

### 宿主半

- 监听 `agent/status`、`agent/error`；包装 `approval/request`、`tools/execute` waterfall 记录挂起窗口（审批并发用计数；`ask_user_question` 按工具名识别）；`subagent/start`、`subagent/end` 按可识别的父会话字段过滤并配对计数。
- 按当前会话过滤状态；客户端通过 RPC 上报当前会话 id；页面无会话打开时一律显示空闲。
- 宠物库读写：`fs` 服务读/写扁平 JSON 文件（`~/.dsh/pet-<id>.json` 与 `pet-state.json`）；不依赖 shell。
- 主目录发现：`process.env` → `C:\Users` 枚举 → `sessionPersistence.locate()` 位置反推（本环境实际生效路径），失败时错误原因链返回给客户端展示。
- 图集供给：`getPet` 返回 data URL（base64 RPC）。
- RPC 方法（客户端调用）：`getStatus` / `setCurrentSession` / `listPets` / `listImportCandidates` / `importPet` / `getPet`（返回标准化模型 + 图集 data URL）/ `loadState` / `saveState`。选择宠物在客户端完成（调 `getPet` 后 `saveState`）；唤醒状态并入 `saveState`。

### 纯逻辑与内嵌副本

- 纯逻辑以仓库文件为准：`plugins/pet/src/{pet-format,state-machine,animation,base64,image-dims}.js`，由 `node:test` 覆盖。
- 动态插件不能 import，宿主/客户端半内嵌这些模块的副本；副本由 `.scratch/pet/prototype/sync-inline.js` 生成、`sync.test.js` 校验（区域内容与 src 逐字节一致 + prototype 整体语法可解析），漂移即测试红。

### 客户端半

- `shell.overlay`：宠物本体 + 状态浮层（常显一行文本）；隐藏或未选择时渲染空，不提供悬浮按钮。
- `settings.section`：宠物控制面板（唤醒/隐藏、选择、导入、诊断）。
- 客户端 `timer` 服务约 500ms 轮询 `getStatus`。
- 动画引擎按 `timingMs`/`playback`/`loop`/`interactions.click` 逐帧播放；拖拽用 React 事件实现；样式经 `styles.insert`。

### 编码前待验证（已查证）

- v2 包固定行序：官方 v2 图集为 1536×2288（11 行）、v1 为 1536×1872（9 行）；按图集实际尺寸推断行数，前 9 行标准行名 + 每行官方已用帧数（6,8,8,4,5,8,6,6,6）。
- `subagent/start|end` 按父作用域分发；payload 字段以运行时防御性读取（parentSessionId/parentId/owner/parent.id），不可识别时跳过不计数。
- `webServer` 动态路由契约未公开 → 采用 base64 RPC（已按此实现）。
- 客户端当前会话：`shell.overlay` Slot 的 `useSessions` 提取当前会话。

## 沉淀路线（原型验证后）

按 [reference/client-modules](../../.scratch/pet/docs/subsystems-client-modules.txt) 所述路径沉淀为仓库持久插件（`dsh.client` 声明、`/plugins/<id>/client.js`、`window.__DSH_BOOT__` 图），届时评估 `/pet` 命令（`ctx.commands`）与设置页。

## 参考

- 官方参考：https://deepseek-harness.github.io/deepseek-harness/reference/ （本地缓存见 `.scratch/pet/docs/`）
- Codex 官方宠物说明：https://learn.chatgpt.com/docs/pets
- 社区宠物包样例：https://github.com/KanadeK/feibi-jiubi-codex-pet
