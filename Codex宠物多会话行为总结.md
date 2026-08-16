# Codex 宠物多会话行为总结

> 文档日期：2026-08-16
> 范围：聚焦“存在多个会话（对话/任务）时，宠物如何表现”，覆盖桌面 App、网页版、Codex CLI 三种界面。
> 来源：以 OpenAI 官方文档为主，辅以可核实的第三方实测与本地契约/资产核查。结论中会明确标注“官方确认”与“实测/推断”。

---

## 一、宠物是什么（定位）

官方将宠物定义为**可选的动画伙伴（optional animated companions）**：它悬浮在其他应用窗口之上，帮助你在不切换回 Codex/ChatGPT 的情况下跟踪工作活动。

需要特别强调的两个定位边界：

1. **选择宠物只改变外观，不改变 Codex 完成任务的方式**（官方原文：*Choosing a pet changes its appearance, not how ChatGPT completes tasks*）。
2. 宠物**不执行代码、不作为独立 agent 运行、不增加任何编码能力**，它只是状态展示层。

---

## 二、状态体系（官方定义）

宠物通过四种状态反映会话进展，官方定义如下：

| 状态 | 含义 | 用户通常该做什么 |
| --- | --- | --- |
| Running（运行中） | 某个会话正在积极工作 | 可以先去做别的事，不必盯着 |
| Needs input（需要输入） | 会话在等待你的批准、回答或其他决定 | 打开活动项并完成操作 |
| Ready（就绪） | 会话已完成，且有未读的新活动 | 回到会话检查成果 |
| Blocked（受阻） | 会话失败或遇到系统错误 | 打开会话查看错误原因 |

官方原文：

> Running | A chat is actively working.
> Needs input | A chat needs your approval, answer, or another decision.
> Ready | A chat has completed and has unread activity.
> Blocked | A chat failed or encountered a system error.

---

## 三、多会话时的核心表现

### 3.1 总体机制：跨会话跟踪 + 单点展示

在 ChatGPT/Codex 桌面 App 中，宠物可以悬浮在其他应用窗口上方，**帮助你跟踪多个会话的活动**（官方原文：*a pet can float above other app windows and help you follow activity across your chats*）。

实现方式是“**一次展示一个**”：宠物同一时刻呈现的是某个会话的状态，而不是同时罗列所有会话。全部有动静的会话通过**活动托盘（activity tray）**集中管理。

### 3.2 多会话优先级规则（官方确认）

当不止一个会话有活动时，宠物按固定优先级展示，顺序为：

**Needs input（需要输入）> Blocked（受阻）> Ready（就绪）> Running（运行中）**

官方原文：

> When more than one chat has activity, the pet prioritizes chats that need input, followed by blocked, ready, and running chats. Open the activity tray to choose a chat.

含义拆解：

- 只要存在任何一个“需要输入”的会话，它就排在最前面，即使另外有会话已经失败（Blocked）也要让位。
- “受阻”排在“就绪”前面，即失败/系统错误优先于单纯地完成待查看。
- “运行中”永远最后——正在干活但不打扰人的会话不会抢占注意力。

**举例**：会话 A 正在执行任务（Running），会话 B 正在等待你批准（Needs input）。宠物会先展示 B 的状态，提醒你优先处理 B，避免工作卡在原地；而不是展示正在顺利运行的 A。

### 3.3 多个会话同时“需要输入”时的表现

这是用户最关心的场景，分两层说明：

**官方已确认的部分：**

- 只要存在多个“需要输入”的会话，宠物展示的**一定是 Needs input 类别**，不会跑去展示 Blocked/Ready/Running 的会话。
- 所有需要输入的会话都能在**活动托盘**中看到，用户可以逐个打开并处理，不会“丢失”。
- 处理完一个（例如批准或回答了问题），宠物自然让位给下一个需要输入的会话。

**官方未公开的部分：**

- 多个“需要输入”会话之间的**同优先级选择算法没有公开**：文档没有说明是显示最近一个、按时间轮播，还是固定取最早/最晚。这一点不能臆造，文档层面目前查不到。
- 第三方实测（电脑王阿达的教程）观察到的行为是：同时跑多个任务时，宠物**优先显示最需要注意的项目**；官方给出的排序即为 Needs input、Blocked、Ready、Running。这与官方文档的优先级规则一致，但同样没有描述同优先级内的轮播细节。

### 3.4 活动托盘（activity tray）

活动托盘是多会话场景下的核心操作入口：

- **作用**：列出所有有活动的会话，供你选择。
- **交互**：
  - 点击宠物本身 → 返回 Codex/ChatGPT 主界面；
  - 点击托盘中的某个活动 → 直接打开对应会话。
- **独立性**：活动托盘与系统通知相互独立（官方原文：*The activity tray is separate from system notifications*），不依赖系统通知权限，也不会互相干扰。

### 3.5 宠物如何用动画表达状态

宠物通过固定的一套动画行来“表演”上述状态。Codex 宠物契约规定标准行为为 **9 组**（顺序固定）：

| 行 | 动画 | 对应语义 |
| --- | --- | --- |
| 0 | idle（待机） | 空闲、呼吸/眨眼循环 |
| 1 | running-right（向右跑） | 向右方向移动 |
| 2 | running-left（向左跑） | 向左方向移动 |
| 3 | waving（挥手） | 打招呼/吸引注意 |
| 4 | jumping（跳跃） | 起跳、上升、落地 |
| 5 | failed（失败） | 出错、低落反应 |
| 6 | waiting（等待） | 等待批准/帮助/用户输入 |
| 7 | running（处理中） | 积极工作/思考（非字面跑步） |
| 8 | review（审查） | 专注检查已完成输出 |

与状态体系的对应关系（基于契约语义）：

- Needs input → `waiting`（等待行：期待被处理的姿势）
- Running → `running`（工作行：打字、思考、处理）
- Ready（待审查）→ `review`（审查行：专注检查）
- Blocked → `failed`（失败行：低落下垂）
- 空闲 → `idle`（待机行）

版本差异：

- **v1 宠物**：只有上述 9 行标准动画，贴图为 8 列 × 9 行（1536 × 1872）。
- **v2 宠物**：在 9 行基础上新增第 9、10 行，共 **16 个方向的注视动画**，贴图为 8 列 × 11 行（1536 × 2288）。hatch-pet 技能孵化出的新宠物均为 v2。

自定义动画是**叠加在 9 行之上**的扩展（例如本地实例：sasuke-3 的点击循环忍术复用 running-right/jumping/failed 等行；itachi-3 的悬停天照复用 jumping 行），不会新增标准行为行。

---

## 四、不同界面的多会话能力对比

| 能力 | 桌面 App | 网页版 | Codex CLI |
| --- | --- | --- | --- |
| 悬浮窗口 | 有（浮于其他应用之上） | 无 | 终端内显示（需终端支持图片） |
| 多会话活动托盘 | 有 | 无 | 无 |
| 唤醒/隐藏命令 | `/pet`、Wake Pet、Tuck Away Pet、Cmd+K / Ctrl+K | 无 `/pet` | `/pets`、`/pets <名字>`、`/pets off` |
| 状态范围 | 全部会话（按优先级展示 + 托盘枚举） | 单个会话（仅在受支持的 Work 对话内） | 仅当前终端会话（实测观察） |
| 状态种类 | Running / Needs input / Ready / Blocked | 同一套状态，但**无多会话活动托盘** | 同一套状态 |
| 自定义宠物 | 本地创建（hatch-pet 技能）、设置中 Refresh | 可上传透明背景 PNG/WebP（实测整理：1536 × 1872、≤ 20 MiB） | 选择本机已安装的宠物 |

官方关于非桌面界面的表述（网页版方向）：

> It uses Running, Needs input, Ready, and Blocked states, but it doesn't provide the desktop app's multiple-chat activity tray.

即：网页版宠物同样有四种状态，但**没有桌面版的多会话活动托盘**，因此多会话排队与托盘跳转是桌面版专属能力。

CLI 相关官方说明：

> In an interactive Codex CLI session: Enter /pets or /pet to open the pet picker. Enter /pets <name> to choose a pet directly. Enter /pets off to disable terminal pets.

终端支持要求（第三方整理）：iTerm2 3.6 以上，或支持 Kitty graphics / Sixel 的终端；tmux 与 Zellij 中无法使用。

---

## 五、操作与设置细节

- **唤醒**：输入 `/pet`，或通过命令菜单（Mac 上 Cmd+K、Windows 上 Ctrl+K）选择 Wake Pet；也可在 Settings > Pets（桌面 App 也可在 Settings > Appearance > Pets）中开启。
- **隐藏**：输入 `/pet`，或选择 Tuck Away Pet。
- **位置记忆**：选中的宠物与停靠位置在重启应用后保留（官方确认）。
- **减少动态效果**：宠物遵守操作系统“减少动态效果（Reduce Motion）”设置；开启后宠物显示静止帧，不再播放逐帧动画（官方确认）。
- **Computer Use 联动（macOS）**：Computer Use 的画中画窗口可附着到已唤醒的宠物旁，移动宠物时该窗口跟随移动；宠物本身仍是状态与窗口载体，不负责控制电脑（官方确认）。

---

## 六、已知边界与未公开细节

1. **同优先级选择算法未公开**：多个会话同时“需要输入”时，宠物在它们之间如何取舍（最近优先 / 轮播 / 其他）官方未说明。
2. **多会话跟踪仅桌面端**：网页版无活动托盘、无悬浮窗、无 `/pet`；CLI 只能反映当前终端会话。
3. **宠物是纯状态层**：不执行代码、不审批、不代替用户操作。
4. **自定义宠物本地存储**：桌面端创建的宠物保存在本机（`~/.codex/pets`），不会自动同步到网页版。
5. **版本一致性要求**：manifest 中声明 `spriteVersionNumber: 2` 时，贴图必须是 11 行（1536 × 2288）；若贴图仍是 9 行（1536 × 1872），按契约属于版本不一致，注视方向可能不生效或被拒绝。

---

## 七、信息来源

**官方文档**

- [Pets | ChatGPT Learn](https://learn.chatgpt.com/docs/pets)（状态定义、优先级规则、活动托盘、操作方式、CLI 命令、Reduce Motion、Computer Use 联动）
- [Settings | ChatGPT Learn](https://learn.chatgpt.com/docs/reference/settings)（Pets 入口与浮动层控制）
- [Notifications | ChatGPT Learn](https://learn.chatgpt.com/docs/notifications)（宠物作为跟踪聊天活动的方式）
- [Slash commands | ChatGPT Learn](https://learn.chatgpt.com/docs/reference/slash-commands)（`/pet` 命令定义）
- [Settings – Codex app | OpenAI Developers](https://developers.openai.com/codex/app/settings)（Codex 端 Appearance > Pets 入口）

**第三方实测**

- 电脑王阿达《Codex 宠物功能怎么用》（多任务时宠物优先显示最需要注意的项目；网页版与 CLI 能力差异；终端要求）

**本地契约与资产核查**

- hatch-pet 技能：`references/animation-rows.md`（9 组标准动画行与帧数）、`references/codex-pet-contract.md`（v1/v2 贴图规格）
- 本机 `~/.codex/pets` 下 14 只自定义宠物的 `pet.json` 与贴图尺寸实测

---

## 附录：本机宠物库核查结果（2026-08-16）

本机 `C:\Users\weikang\.codex\pets` 下共 14 只自定义宠物，贴图全部为 **1536 × 1872（9 行 v1 格式）**：

| 宠物 | manifest 版本标记 | 贴图尺寸 | 与契约一致性 |
| --- | --- | --- | --- |
| itachi | 未标（默认 v1） | 1536 × 1872 | 一致（v1） |
| itachi-2 | spriteVersionNumber: 2 | 1536 × 1872 | **不一致**（v2 需 2288 高） |
| itachi-3 | spriteVersionNumber: 2 | 1536 × 1872 | **不一致**（v2 需 2288 高） |
| liudao-ban | 未标 | 1536 × 1872 | 一致（v1） |
| madara | 未标 | 1536 × 1872 | 一致（v1） |
| mini-kurama | 未标 | 1536 × 1872 | 一致（v1） |
| naruto | 未标 | 1536 × 1872 | 一致（v1） |
| obito | 未标 | 1536 × 1872 | 一致（v1） |
| sasuke | 未标 | 1536 × 1872 | 一致（v1） |
| sasuke-2 | 未标 | 1536 × 1872 | 一致（v1） |
| sasuke-3 | 未标（含自定义动画扩展） | 1536 × 1872 | 一致（v1） |
| sasuke-final | spriteVersionNumber: 2 | 1536 × 1872 | **不一致**（v2 需 2288 高） |
| sasuke-sharingan | spriteVersionNumber: 2 | 1536 × 1872 | **不一致**（v2 需 2288 高） |
| sasuke-uchiha | 未标 | 1536 × 1872 | 一致（v1） |

其中 itachi-2、itachi-3、sasuke-final、sasuke-sharingan 声明了 v2 但贴图只有 9 行，实际大概率表现为 v1 行为（16 方向注视不可用），如需修复可另行处理。
