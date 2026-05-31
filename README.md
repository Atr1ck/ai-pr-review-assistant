# AI PR Review Assistant


> Demo 视频：[AI PR Review Assistant](https://www.bilibili.com/video/BV1rQVD62EV5/?spm_id_from=333.1387.homepage.video_card.click&vd_source=87d1ec5d00cd4af86caf6869cd5c82ab)


- ⚠️ 后端部署在Render的免费计划下，长时间不使用会关闭项目，因此第一次解析时可能会卡住需要等待启动
- ⚠️ 前端部署在Vercel上，需要一些神秘魔法
- ⚠️ 模型的API接入走的是RightCode中转站，可能会遇到中转站网络波动
- 提供可复制测试的一些PR URL：
    - `https://github.com/Atr1ck/ai-pr-review-assistant/pull/12`
    - `https://github.com/saadeghi/daisyui/pull/4432`
    - `https://github.com/ant-design/ant-design/pull/58157`
- 项目地址:https://ai-pr-review-assistant-web.vercel.app/

本项目选择题目：**AI PR Review 助手**。

AI PR Review Assistant 是一个可视化、流式、上下文感知的 GitHub Pull Request 代码评审工具。

项目目标不是做一个简单的“输入 PR URL 后让模型总结”的工具，而是把 PR Review 过程设计成一个可视化 AI Review Pipeline：系统会获取真实 PR 上下文，构建 Review Context，再通过受控 **AI Review LLM Loop** 像工程师一样逐步审查文件、记录风险、生成建议，并通过 **SSE** 实时展示执行过程。

## 核心功能

- GitHub PR URL 解析
- GitHub PR metadata 获取
- Changed files / patch 获取
- Patch Viewer 高亮
- Review Context 构建器
- SSE 流式 Review Pipeline
- PR Summary 生成
- AI Review Loop
- 风险检测
- 审查建议生成
- Agent Timeline 可视化

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

## AI Review Loop 设计

本项目没有把风险检测和建议生成做成两个完全独立的模型调用，而是设计为受控 AI Review Loop。

Loop 每轮只能输出一个结构化 action：

- `inspect_files`：选择一批文件进行审查
- `record_risk`：记录一个由 diff 支持的风险
- `record_suggestion`：基于已有 risk 生成 Review 建议
- `finish`：结束审查并输出总结

核心约束：

- 每轮只能返回一个 action
- `inspect_files` 每轮最多检查 7 个文件
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

系统上下文来自 GitHub API

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

这样可以控制上下文长度，并让 AI Review 结果更容易和具体文件变更对应。

## 误报与漏报控制策略

本项目主要通过以下方式控制误报和漏报：

- 只允许模型基于已检查文件记录风险
- suggestion 必须引用已有 riskId
- 模型不能为未检查文件生成风险
- 大 PR 会优先检查高风险文件，并在总结中说明覆盖范围
- 首次 0 risk finish 会触发二次审查，降低漏报
- risk 存在但 suggestion 缺失时，后端会要求模型继续生成 suggestion
- 后端解析并校验模型 action，避免任意自然语言结果直接进入前端

## 依赖说明

主要运行依赖：

- `react`
- `react-dom`
- `tailwindcss`
- `@tailwindcss/vite`
- `express`
- `cors`
- `dotenv`
- `highlight.js`

主要开发依赖：

- `typescript`
- `vite`
- `tsx`
- `eslint`

## 未来扩展方向

- Follow-up Chat：审查完成后继续基于 Review Context 追问
- 支持更细粒度的 patch 行号定位
- Markdown Review Report 导出
- Review History：保存历史分析记录
- 风险等级筛选
- 文件类型过滤配置
- 支持缓存 GitHub PR 数据和 Review Result
- 支持多模型策略：小 PR 使用快速模型，大 PR 使用更强模型


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

