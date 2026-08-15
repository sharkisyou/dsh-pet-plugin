# dsh-pet-plugin

DeepSeek Harness Web 插件：状态驱动悬浮宠物（Codex 宠物包兼容）。

## 仓库结构

```
.
├── plugins/pet/          # 持久 Web 插件
│   ├── lib/              # 宿主半与客户端 bundle
│   ├── src/              # 纯逻辑与客户端 UI 源文件
│   ├── scripts/          # 客户端 bundle 构建
│   └── test/             # node:test 测试
├── .scratch/pet/         # 规格、参考文档与动态插件原型
└── docs/agents/          # Agent 技能说明
```

## 快速开始

```sh
cd plugins/pet
npm test        # 运行测试并重新生成客户端 bundle
npm run build   # 仅重新生成客户端 bundle
```

安装到 DSH Web profile：

```sh
dsh plugin --profile web add link:/绝对路径/plugins/pet
dsh web
```

详细文档见 [plugins/pet/README.md](plugins/pet/README.md)。
