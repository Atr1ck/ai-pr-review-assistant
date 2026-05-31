# AI PR Review Assistant

> Demo 视频：待补充

AI PR Review Assistant 是一个可视化、流式、上下文感知的 GitHub Pull Request 代码评审工具。

本项目选择题目：**AI PR Review 助手**。

项目目标不是做一个简单的“输入 PR URL 后让模型总结”的工具，而是把 PR Review 过程设计成一个可视化 AI Review Pipeline：系统会获取真实 PR 上下文，构建 Review Context，再通过受控 AI Review Loop 像工程师一样逐步审查文件、记录风险、生成建议，并通过 SSE 实时展示执行过程。

## 核心功能

- GitHub PR URL 解析
- GitHub PR metadata 获取
- Changed files / patch 获取
- Patch Viewer 基础高亮
- Review Context Builder
- SSE 流式 Review Pipeline
- Right Code 模型调用
- PR Summary 生成
- AI Review Loop
- Risk Detection
- Review Suggestions
- Agent Timeline 可视化
- Review Panel 三栏交互布局

## 技术栈

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- EventSource / SSE

### Backend

- Node.js
- Express
- TypeScript
- GitHub REST API
- Right Code API
- Server-Sent Events

## 项目结构

```txt
.
├── apps/
│   └── web/                 # React + Vite 前端
├── server/
│   ├── src/
│   │   ├── github/          # GitHub API client 和 PR 数据获取
│   │   ├── llm/             # Right Code API 调用封装
│   │   ├── review/          # Review Context / Review Loop / Pipeline
│   │   ├── routes/          # Express routes
│   │   └── index.ts         # Express 服务入口
│   └── package.json
├── README.md
├── package.json
└── package-lock.json
```

## 本地启动

安装依赖：

```bash
npm install
```

启动后端：

```bash
npm run dev:server
```

默认后端地址：

```txt
http://localhost:3001
```

启动前端：

```bash
npm run dev:web
```

默认前端地址：

```txt
http://localhost:5173
```

构建检查：

```bash
npm run build:server
npm run build:web
```

## 环境变量

后端 `server/.env`：

```env
PORT=3001
GITHUB_TOKEN=
RIGHTCODE_API_KEY=
RIGHTCODE_BASE_URL=https://www.right.codes/codex/v1
RIGHTCODE_MODEL=
```

说明：

- `PORT`：后端服务端口，本地默认 `3001`
- `GITHUB_TOKEN`：可选，用于提升 GitHub API rate limit
- `RIGHTCODE_API_KEY`：Right Code API Key
- `RIGHTCODE_BASE_URL`：Right Code API 基础地址
- `RIGHTCODE_MODEL`：Right Code 后台可用模型名称

前端 `apps/web/.env`：

```env
VITE_API_BASE_URL=http://localhost:3001
```

部署到 Vercel 时，`VITE_API_BASE_URL` 需要配置为线上后端地址，例如：

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

## 当前 API

### 健康检查

```txt
GET /api/health
```

### 解析 GitHub PR URL

```txt
POST /api/github/parse-pr-url
```

请求示例：

```json
{
  "url": "https://github.com/facebook/react/pull/31650"
}
```

### 获取 PR Metadata

```txt
GET /api/github/pull-request?owner=facebook&repo=react&pullNumber=31650
```

### 获取 PR Changed Files

```txt
GET /api/github/pull-request/files?owner=facebook&repo=react&pullNumber=31650
```

### 构建 Review Context

```txt
GET /api/review/context?owner=facebook&repo=react&pullNumber=31650
```

### 流式 Review Pipeline

```txt
GET /api/review/stream?owner=facebook&repo=react&pullNumber=31650
```

该接口使用 SSE 推送：

- pipeline step
- heartbeat
- loop action
- final review result
- error

## AI Review Pipeline 设计

整体流程：

```txt
Parse PR URL
Fetch PR metadata
Fetch changed files
Build review context
Generate PR summary
Run AI review loop
Return final review result
```

前端通过 `EventSource` 连接 `/api/review/stream`，后端按阶段推送状态。模型调用耗时较长时，后端会定时发送 heartbeat，前端显示当前审查仍在运行和已耗时，避免用户误以为页面卡死。

## AI Review Loop 设计

本项目没有把风险检测和建议生成做成两个完全独立的模型调用，而是设计为受控 AI Review Loop。

Loop 每轮只能输出一个结构化 action：

- `inspect_files`：选择一批文件进行审查
- `record_risk`：记录一个由 diff 支持的风险
- `record_suggestion`：基于已有 risk 生成 Review 建议
- `finish`：结束审查并输出总结

核心约束：

- 每轮只能返回一个 action
- `inspect_files` 每轮最多检查 5 个文件
- 小 PR 尽量完整检查
- 大 PR 按风险优先级检查重点文件
- 未检查文件不能记录风险
- suggestion 必须引用已有 riskId
- 如果存在 risk 但没有 suggestion，后端不会接受 finish
- 如果首次检查后模型直接以 0 risk 结束，后端会触发一次二次审查 challenge

这种设计让审查过程更接近真实工程师工作流：

```txt
先看文件列表
选择高风险文件
检查 patch
记录风险
给出建议
结束审查
```

前端的 Agent Timeline 会实时展示每一个 loop action，让用户看到 AI 是如何逐步审查 PR 的。

## 模型选择说明

本项目通过后端封装 Right Code API 调用模型。

选择 Right Code 的原因：

- 面向代码理解和工程审查场景
- 支持通过 API 接入后端服务
- 适合处理 PR diff、代码上下文和结构化 Review 任务
- 可以通过环境变量切换模型，便于根据速度、成本和质量做权衡

当前模型配置通过环境变量控制：

```env
RIGHTCODE_MODEL=
```

模型使用策略：

- PR Summary 使用一次模型调用生成整体摘要
- AI Review Loop 使用多轮受控 action 进行文件审查
- 对输出要求使用 JSON action 协议，降低前端渲染和后端解析成本
- 对模型输出进行后端校验，避免未检查文件产生风险或 suggestion 脱离 risk

后续可以根据实际效果切换更强模型用于复杂 PR，也可以使用更快模型处理小型 PR。

## 上下文获取方式

系统上下文来自 GitHub API，而不是用户手动粘贴代码。

获取流程：

1. 用户输入 GitHub PR URL
2. 后端解析 `owner / repo / pullNumber`
3. 请求 GitHub PR metadata
4. 请求 PR changed files
5. 读取每个文件的 `patch`
6. 构建 Review Context

Review Context 包含：

- PR 标题
- PR 描述
- 作者
- PR 状态
- base / head 分支
- additions / deletions / changed files
- 文件名
- 文件状态
- 每个文件的 patch
- ignored / truncated 信息
- 大 PR warning

Context Builder 会做以下处理：

- 忽略 lock files、构建产物等低价值文件
- 对过长 patch 做截断
- 标记大 PR
- 统计 included / ignored 文件数量
- 为模型提供结构化输入，而不是直接发送原始 GitHub 响应

这样可以减少噪声、控制上下文长度，并让 AI Review 结果更容易和具体文件变更对应。

## 误报与漏报控制策略

本项目主要通过以下方式控制误报和漏报：

- 只允许模型基于已检查文件记录风险
- suggestion 必须引用已有 riskId
- 模型不能为未检查文件生成风险
- 大 PR 会优先检查高风险文件，并在总结中说明覆盖范围
- 首次 0 risk finish 会触发二次审查，降低漏报
- risk 存在但 suggestion 缺失时，后端会要求模型继续生成 suggestion
- 后端解析并校验模型 action，避免任意自然语言结果直接进入前端

项目倾向于避免无依据的高风险判断，同时允许模型记录有 diff 支持的低风险 Review Finding，例如：

- 输入校验不足
- 错误处理脆弱
- API contract 不清晰
- 行为变更缺少测试
- 状态更新顺序脆弱

## 前端交互设计

页面采用三栏布局：

- 左侧：PR metadata 和 changed files
- 中间：Patch Viewer
- 右侧：AI Review Pipeline、Agent Timeline、Review Result

当前交互：

- changed files 点击后在 Patch Viewer 展示对应 patch
- patch 中新增、删除和 hunk header 有基础高亮
- Agent Timeline 在审查完成后自动收起，并支持手动展开 / 收起
- 卡片支持 hover 上浮和轻微缩放
- 左 / 中 / 右三栏支持点击聚焦展开，同一时间只展开一个区域
- 点击内部按钮、链接、代码块、卡片和文本时不会触发展开，避免影响复制和选择文件

## 部署说明

推荐部署方式：

```txt
Vercel: apps/web 前端
Render / Railway: server 后端
```

原因：

- Vercel 适合部署 Vite 前端
- Express 后端需要独立 Node 服务
- 当前后端使用 SSE 和长时间模型调用，更适合部署到支持常驻 Node 服务的平台

部署后需要在 Vercel 配置：

```env
VITE_API_BASE_URL=https://your-backend-domain
```

Render 后端建议：

```txt
Root Directory: 留空
Build Command: npm install && npm run build:server
Start Command: npm run start -w server
```

## 依赖说明

主要运行依赖：

- `react`
- `react-dom`
- `tailwindcss`
- `@tailwindcss/vite`
- `express`
- `cors`
- `dotenv`

主要开发依赖：

- `typescript`
- `vite`
- `tsx`
- `eslint`

本项目没有使用 Next.js。

## PR 开发记录说明

项目采用小步 PR 开发方式，功能按阶段拆分：

1. 项目结构初始化
2. React + Vite + Tailwind 前端
3. Express 后端
4. GitHub PR URL parser
5. GitHub metadata 获取
6. changed files 获取
7. Patch Viewer
8. Review Context Builder
9. SSE Review Pipeline
10. Right Code Summary
11. AI Review Loop
12. Agent Timeline
13. 前端交互优化
14. README 和部署说明

每个 PR 聚焦一个明确功能，避免一次性提交完整项目。

## 未来扩展方向

- Follow-up Chat：审查完成后继续基于 Review Context 追问
- GitHub inline comment 模拟：将 suggestion 显示为类似 GitHub Review Comment
- Markdown Review Report 导出
- Review History：保存历史分析记录
- 风险等级筛选
- 文件类型过滤配置
- 支持私有仓库 token 配置
- 支持缓存 GitHub PR 数据和 Review Result
- 支持更细粒度的 patch 行号定位
- 支持按模块聚合风险
- 支持多模型策略：小 PR 使用快速模型，大 PR 使用更强模型
- 支持队列化 Review，避免多个大 PR 同时阻塞服务
- 增加测试覆盖，包括 parser、context builder、loop action parser
