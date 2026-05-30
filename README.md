# AI PR Review Assistant

> Demo 视频：待补充

## 项目简介

AI PR Review Assistant 是一个可视化、流式、上下文感知的 GitHub Pull Request 代码评审工具。

## 核心功能规划

- GitHub PR URL 解析
- PR metadata 获取
- changed files / diff 获取
- Diff 解析
- AI Review Pipeline 流式输出
- PR Summary
- Risk Detection
- Review Suggestions

## 技术栈

- Frontend：React + TypeScript + Vite
- Backend：Node.js + Express
- State Management：Zustand
- Streaming：SSE
- Markdown：react-markdown
- AI：后端封装 LLM 调用

## 项目结构

```txt
apps/web     前端应用
server       后端服务
shared       前后端共享类型
```
## 本地启动

安装依赖:

```bash
npm install
```
启动前端:

```bash
npm run dev:web
```

默认访问： 

http://localhost:5173

后端启动

启动 Express 服务：

```bash
npm run dev:server
```

默认服务地址

http://localhost:3001

如果需要修改后端地址，可以在 apps/web/.env 中配置：

VITE_API_BASE_URL=

构建检查：

```bash
npm run build
```

## 当前API

### 健康检查

```txt
GET /api/health
```

### 解析Github PR URL

```txt
POST /api/github/parse-pr-url
```

### 获取PR Metadata

```txt
GET /api/github/pull-request?owner=facebook&repo=react&pullNumber=123
```
### 获取 PR Changed Files

```txt
GET /api/github/pull-request/files?owner=facebook&repo=react&pullNumber=123
```

### 构建 Review Context

## AI Review Pipeline 设计

```txt
GET /api/review/context?owner=facebook&repo=react&pullNumber=31650
```

计划流程：

1. Parse GitHub PR URL
2. Fetch PR metadata
3. Fetch changed files and diff
4. Parse diff
5. Build review context
6. Generate PR summary
7. Detect risks
8. Generate review suggestions
9. Stream pipeline events to frontend

## 模型选择说明

待后续PR补充

## 上下文获取方式

待后续PR补充

## 误报和漏报控制策略

待后续PR补充

## 未来扩展方向

待后续PR补充