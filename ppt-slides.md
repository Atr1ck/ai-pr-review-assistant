# AI PR Review Assistant PPT 精简版文案

## 01｜AI PR Review Assistant

面向 GitHub Pull Request 的 AI 代码评审助手

把“读 diff、找风险、写建议”的第一轮 Review，变成可视化、可追踪、可约束的 AI 辅助流程。

React + TypeScript / Node.js / GitHub API / SSE / LLM Review Loop

## 02｜为什么做

PR Review 第一轮成本高、信息碎、容易漏重点。

核心痛点：

1. 变更上下文分散，Reviewer 需要先手动筛重点
2. 大 PR 文件多，关键风险容易被淹没
3. Review 质量依赖个人经验和时间状态
4. AI 直接总结容易黑盒，缺少依据和过程
5. 有价值的 Review 必须给出风险、原因和建议

## 03｜真实需求

开发者需要的不是“AI 总结”，而是“可信的 Review 助手”。

关键需求：

1. 快速理解 PR 范围
2. 优先识别高风险文件
3. 每个风险都要有 diff 依据
4. 建议能转化为 Review comment
5. AI 分析过程可追踪、可复核

## 04｜解决思路

把 AI Review 拆成可控流程。

1. 输入 GitHub PR URL
2. 获取 PR 元数据与 changed files
3. 构建 Review Context
4. AI 多轮选择文件、识别风险、生成建议
5. 前端实时展示 Pipeline 和 Agent Timeline

核心原则：
模型负责分析，系统负责上下文、状态、边界和校验。

## 05｜产品展示

一个 PR URL 触发完整 Review 工作台。

左侧：Pull Request 信息  
标题、作者、分支、状态、增删行、文件列表

中间：Diff Viewer  
按文件查看真实 patch，高亮新增、删除和 hunk

右侧：AI Review  
Pipeline、Agent Timeline、Context 统计、风险和建议

图片位：产品主界面截图

## 06｜AI Review Timeline

让 AI 的判断过程可见。

1. inspect_files  
选择要检查的文件，并说明原因

2. record_risk  
记录风险、等级、类型和依据

3. record_suggestion  
为已有风险生成建议

4. finish  
输出总结和整体风险等级

价值：Reviewer 能看到 AI 看了什么、为什么看、如何得出结论。

图片位：Agent Timeline 截图

## 07｜系统架构

从 PR URL 到 AI Review 的完整链路。

1. Web 前端  
输入、diff 展示、timeline、结果展示

2. Node.js 后端  
GitHub 数据获取、Context 构建、Review Pipeline 编排

3. GitHub API  
PR metadata、changed files、patch

4. LLM Review Loop  
结构化 action 分析

5. SSE  
实时推送阶段、心跳、AI 动作和结果

图片位：系统架构图

## 08｜工程实现

从 PR 数据到 Review 结果。

1. PR URL 解析  
校验 GitHub PR 格式，提取 owner / repo / pullNumber

2. GitHub 数据获取  
获取 title、description、author、branch、增删行、文件列表和 patch

3. Review Context 构建  
整合 PR 信息、文件 diff、统计数据、warnings

4. SSE 流式反馈  
推送 fetch metadata、fetch files、build context、review loop、result

5. 前端工作台  
PR 信息、Diff Viewer、AI Timeline、风险和建议同步展示

## 09｜核心设计：上下文构建

先治理输入，再交给模型。

Context 包含：

1. PR 标题、描述、作者、分支、状态
2. 文件名、状态、增删行、patch
3. totalFiles、includedFiles、ignoredFiles、largeChange
4. truncated / ignored / warning 标记

上下文策略：

1. 过滤 lock、dist、build、minified 文件
2. 单文件 patch 超长截断
3. 大 PR 标记 warning，优先做风险文件筛选

目标：减少噪音、控制 token、保留关键证据。

## 10｜核心设计：受控 Review Loop

每轮只允许模型输出一个 JSON action。

```json
{
  "type": "record_risk",
  "risk": {
    "file": "server/src/review/runReviewLoop.ts",
    "level": "medium",
    "title": "模型输出解析失败会中断评审",
    "reason": "parseReviewLoopAction 抛错后缺少恢复策略"
  }
}
```

四类动作：

1. inspect_files：选择文件
2. record_risk：记录风险
3. record_suggestion：生成建议
4. finish：结束评审

价值：把一次黑盒回答拆成多个可验证步骤。

## 11｜准确性与误报漏报控制

准确性不只靠 prompt，而是靠系统约束。

降低误报：

1. 风险必须来自已 inspect 文件
2. 风险必须由 diff 支撑
3. suggestion 必须绑定已有 risk
4. 忽略低价值文件，减少噪音

降低漏报：

1. 小 PR 尽量检查全部文件
2. 大 PR 优先检查高风险文件
3. 关注安全、鉴权、API 边界、数据模型、异常处理、删除逻辑
4. 0 风险结束前触发二次复查
5. 有风险无建议时强制补充建议

后端限制：
最多 10 轮、6 个风险、6 个建议、单轮 7 个文件。

## 12｜总结与未来扩展

当前已实现：

1. GitHub PR URL 解析
2. PR 元数据与 patch 获取
3. Review Context 构建
4. 多轮 AI Review Loop
5. SSE 实时 Timeline
6. 风险识别与 Review 建议生成

未来扩展：

1. 行级 GitHub 评论写回
2. Follow-up Chat
3. 仓库代码索引与跨文件上下文
4. CI / 测试 / 覆盖率接入
5. 团队 Review Policy
6. 按 PR 大小和风险类型路由模型

收尾：
AI 不替代工程师判断，而是帮助工程师更快找到需要判断的地方。
