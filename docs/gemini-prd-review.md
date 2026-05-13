# Sui-Seal v2.1 PRD 审核与改进建议 (Gemini Review)

总体而言，这份 PRD 结构清晰，商业逻辑闭环良好，技术栈选择也非常现代（Sui + Walrus + Supabase + React 插件）。但在具体的**前端架构和区块链集成**细节上，存在几个可能在开发（尤其是黑客马拉松期间）导致卡壳的“技术地雷”。

以下是详细的审查结果和改进建议：

## 1. 核心技术风险：DOM MutationObserver 监听流式哈希过于脆弱
**问题（PRD 6.2节）**：试图通过监听 DOM 变化来提取每个 token 并进行增量哈希。现代前端框架（如 Next.js/React，ChatGPT/Claude 所使用的）在渲染时会进行 DOM 批处理，且会频繁插入格式化标签（如光标 span、代码块高亮标签），这会导致提取出的 token 极不稳定，无法保证在不同机器或稍有延迟的情况下计算出一致的哈希。
**改进建议**：
*   **方案 A（网络层拦截，推荐）**：使用 Chrome 插件的 `chrome.webRequest` 或在页面中注入脚本覆盖原生的 `fetch`/`XMLHttpRequest`/`EventSource` 对象，直接拦截大模型的 API 返回流（SSE流）。这样拿到的是纯粹的、结构化的数据，完全不受 DOM 渲染影响，哈希计算绝对精准。
*   **方案 B（最终快照哈希）**：放弃流式增量哈希，只对对话完成后的最终状态进行哈希。如果担心防篡改，可结合网页截图（Canvas/HTML2Canvas）辅助作为存证。

## 2. 身份认证痛点：Supabase Auth 与 zkLogin 的 Nonce 冲突
**问题（PRD 6.4节）**：Sui zkLogin 的核心要求是在请求 Google OAuth 时，必须注入一个经过特定计算的 `nonce`（由前端生成的临时密钥对推导而来）。Supabase 封装了 OAuth 流程，默认情况下很难完美地注入 zkLogin 所需的精确 `nonce`，并且可能不会将 Google 签发的原始 `id_token`（zkLogin 构造交易所必须的凭证）直接暴露给前端。
**改进建议**：
*   **反转认证流程**：不要用 `supabase.auth.signInWithOAuth` 发起登录。
*   **正确做法**：
    1. 通过 Chrome 插件原生的 `chrome.identity.launchWebAuthFlow`（或 Google Identity Services）**手动发起**带有 zkLogin `nonce` 的 Google 登录请求。
    2. 拿到包含正确 `nonce` 的 Google JWT (`id_token`) 后，用这个 `id_token` 去构造 Sui zkLogin 零知识证明。
    3. 同时，使用这个 `id_token` 调用 Supabase 的 `supabase.auth.signInWithIdToken()` 进行数据库身份认证。这样就能确保两边完美复用同一个 Token，真正做到无缝体验。

## 3. 区块链交互缺失环节：Gas 费（手续费）代付机制
**问题**：PRD 未提及 Sui 链上交易和 Walrus 存储的 Gas 费用由谁承担。如果让用户承担，用户需要先拥有 SUI 代币，这完全违背了“无缝用户体验”和“无需管理钱包”的设计初衷。
**改进建议**：
*   **引入赞助交易（Sponsored Transactions）**：在系统架构中加入一个后端中继服务（建议使用 Shinami 的 Gas Station API），由项目方的 Treasury 钱包代付用户的存证 Gas 费。
*   在商业模式中：免费版提供每月 50 次存证（项目方出 Gas），Pro 版的订阅费用则覆盖 Gas 成本。

## 4. Walrus 存储架构：直接上传的权限与速率限制
**问题**：前端直接向 Walrus 上传大文件（对话记录可能包含大量图片、长文本）可能会面临公共 Publisher 节点的速率限制，或者跨域 (CORS) 问题。
**改进建议**：
*   在架构图中明确：黑客马拉松期间，可直接调用 Walrus 的公共测试网 Publisher 节点上传。上传成功拿到 `Blob ID` 后，再发起 Sui 链上交易将 `Blob ID` 写入智能合约。
*   企业版路线图中，应考虑部署私有的 Walrus 聚合节点以保证稳定性。

## 5. Chrome 插件 Manifest V3 的状态管理陷阱
**问题**：技术栈中提到了使用 Jotai 进行状态管理。但在 Manifest V3 中，Service Worker（后台脚本）的生命周期是短暂的，随时会被休眠。如果把核心状态（如用户登录态、临时密钥对）只存在 Jotai 内存中，插件弹窗关闭后状态就会丢失。
**改进建议**：
*   必须将 `chrome.storage.local` 作为唯一的真相来源（Single Source of Truth）。建议使用类似 `jotai-chrome` 的库，或者手动监听 Storage 变化，确保 zkLogin Ephemeral Key 和 Auth Token 在弹窗关闭/后台休眠后依然能被正确恢复。

## 总结与里程碑调整建议
建议在 **Day 1** 的里程碑中，除了基础架构外，**必须优先验证 “带有自定义 Nonce 的 Google OAuth -> zkLogin 证明生成 -> Supabase Auth 登录” 这一条链路**。这是整个项目逻辑最复杂、最容易踩坑的关键路径，排雷优先级应当最高。
