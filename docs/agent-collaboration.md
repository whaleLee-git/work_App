# Sub-Agent Collaboration Guide

## 1. Purpose
这份指南定义了 `projectOne` 的常见研发团队拆分方式，以及跨 agent 的交接标准。

## 2. Team Topology
- PM Agent
- Tech Lead Agent
- Backend Agent
- Frontend Agent
- QA Agent
- DevOps Agent
- Security Agent
- Docs Agent

## 3. Standard Lifecycle
`PM -> Tech Lead -> Backend/Frontend -> QA -> DevOps -> Security -> Docs`

说明：
- Backend 与 Frontend 可并行。
- QA 发现问题后回流到 Backend/Frontend 修复。
- Security 可在 DevOps 前置扫描，也可在发布前做 Gate。

## 4. Handoff Contract
每次交接必须包含以下 5 段：

1. `Context`: 背景与目标
2. `Input`: 输入资料
3. `Output`: 本次产出
4. `Risks`: 当前风险
5. `Next`: 下一位 agent 的 3 个动作

示例：

```md
## Handoff: tech_lead -> backend
Context: 已冻结 v1 API，目标是完成用户登录主流程。
Input: docs/prd.md, docs/architecture.md, docs/api.yaml
Output: docs/adr.md（完成认证方案决策）
Risks: 第三方短信服务供应商还未确定。
Next:
1) 搭建 auth 基础模块
2) 实现 /login 与 /refresh
3) 补充单元测试与错误码
```

## 5. Definition of Done
- 所有 P0 需求具备测试证据。
- 所有关键路径有日志和错误码。
- 变更有文档和发布记录。

## 6. Recommended Cadence
- 每日：15 分钟同步 blocker。
- 每周：一次架构/质量回顾。
- 每次发布：执行回滚演练检查项。
