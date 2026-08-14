# Issue 追踪器：本地 Markdown

本仓库的 issue 与规格说明（即 PRD）以 markdown 文件形式存放在 `.scratch/` 下。

## 约定

- 每个功能一个目录：`.scratch/<feature-slug>/`
- 规格说明为 `.scratch/<feature-slug>/spec.md`
- 实现类 issue 为每个 ticket 一个文件，位于 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号 —— 绝不使用单一合并的 tickets 文件
- 分流状态记录在每个 issue 文件靠上的 `Status:` 行中（角色字符串参见 `triage-labels.md`）
- 评论与对话历史追加到文件末尾的 `## Comments` 标题之下

## 当技能说"发布到 issue 追踪器"

在 `.scratch/<feature-slug>/` 下新建一个文件（如目录不存在则先创建）。

## 当技能说"获取相关 ticket"

读取指定路径下的文件。用户通常会直接给出路径或 issue 编号。

## 探路（Wayfinding）操作

供 `/wayfinder` 使用。**地图（map）** 是一个文件，每个 ticket 对应一个**子（child）**文件。

- **地图**：`.scratch/<effort>/map.md` —— 承载 Notes / Decisions-so-far / Fog 内容。
- **子 ticket**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 开始编号，正文写入问题。`Type:` 行记录 ticket 类型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行记录 `claimed`/`resolved`。
- **阻塞**：靠上的 `Blocked by: NN, NN` 行。当列表中的每个文件都变为 `resolved` 时，该 ticket 解除阻塞。
- **前沿（Frontier）**：扫描 `.scratch/<effort>/issues/`，找出开放、未阻塞、未被认领的文件；编号最小的优先。
- **认领**：在开始任何工作前，将 `Status: claimed` 写入并保存。
- **解决**：在 `## Answer` 标题下追加答案，将 `Status: resolved` 写入，然后在 `map.md` 的 Decisions-so-far 中追加上下文指针（gist + 链接）。
