## Agent skills

### Issue tracker

本仓库的 issue 以 markdown 文件形式存放在 `.scratch/<feature>/` 下。参见 `docs/agents/issue-tracker.md`。

### Triage labels

默认词汇表 — 五个标准角色，标签字符串与角色名相同（`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`）。参见 `docs/agents/triage-labels.md`。

### Domain docs

多上下文布局：根目录 `CONTEXT-MAP.md` 指向每个插件各自的 `CONTEXT.md`；根级 `docs/adr/` 存放系统级决策，各插件内可再有自己的 `docs/adr/`。参见 `docs/agents/domain.md`。
