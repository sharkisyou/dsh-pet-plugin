# 宠物多会话架构与活动托盘

状态：accepted

DSH Web 需要让宠物跨多个顶层会话跟踪活动，并在同一时刻展示优先级最高的会话，同时提供活动托盘让用户切换会话。我们决定采用宿主/客户端混合架构：宿主维护每个顶层会话的细粒度状态机（working / waiting / failed / subagent），客户端用 `useSessions` 补充标题、绿点（Ready）、`pendingInteraction` 和当前会话，并负责最终聚合、排序和托盘交互。

关键取舍：

- 跨会话展示优先级采用 Codex 官方顺序：Needs input > Blocked > Ready > Running。
- 会话指顶层会话；子代理活动归入父会话，子代理自身不进入托盘。
- `getStatus` 返回 `activities`，包含 `sessionId`、`state`、`bubble`、`lastEventAt`、`pendingKind`、`acknowledged`。
- Blocked 会话在用户打开后标记为 `acknowledged`，从非当前提醒中移除；当前会话仍可继续显示 failed，任何新真实活动会清除该标记并重新提醒。
- 活动托盘第一版只显示“会话标题 + 状态文字 + 最后活动时间”，不做真实消息摘要。
- 手动关闭托盘后记住活动 sessionId 集合，只有集合变化才重新自动打开；客户端内存保存，不持久化。

这些决策影响宿主 RPC 契约、状态机清理、客户端托盘交互和后续实现，因此记录为本插件的第一个 ADR。
