# 产品需求文档 (PRD): Sui-Seal v2.1

## 1. 产品定位

**Sui-Seal: AI 工作流的通用中间件。**

不是一个单纯的区块链存证工具，而是所有 AI 对话平台的增强层。

**核心价值主张：**
- 90% 的用户为「便利功能」而来：跨平台对话迁移、统一搜索、导出整理
- 10% 的用户为「存证功能」付费：不可篡改的对话记录、哈希链验证、法律问责

**诚实的信任定位：**
- **个人版（浏览器插件）**：适合自我记录、工作流追踪、团队内部问责。技术能力足够强的用户理论上可在存证前修改数据，这是客户端软件的固有局限。
- **企业版（路线图）**：TEE 可信执行环境远程验证服务。数据捕获在隔离硬件环境中执行，生成加密证明。适合法律合规、审计、高价值知识产权场景。

---

## 2. 目标用户

| 用户分层 | 核心需求 | 付费意愿 |
|---------|---------|---------|
| 高频 AI 创作者 | 跨平台对话迁移、导出备份、搜索 | 低 - 中 |
| 开发者 / 工程师 | 代码对话历史管理、工作流记录 | 中 |
| 律师 / 顾问 / 专业人士 | 问责记录、合规证明、知识产权保护 | 高 |
| 企业客户 | 团队管理、审计日志、API 集成 | 极高 |

---

## 3. 系统架构

```
┌───────────────────────────────────────────────────────────────┐
│                    用户认证层 (Supabase Auth)                   │
│                     Google OAuth 登录 / 注册                    │
└───────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                   前端：Chrome 浏览器插件                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐        │
│  │  站点适配器  │  │ 对话管理器   │  │   一键迁移引擎    │        │
│  │  (Adapter)  │  │ (CRUD + 搜索)│  │ (跨平台粘贴对话)  │        │
│  └─────────────┘  └─────────────┘  └─────────────────┘        │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              存证核心模块 (Core Engine)                  │   │
│  │  • 流式增量哈希  • SHA-256 计算                         │   │
│  │  • Sui zkLogin 签名  • Walrus 存储调度                  │   │
│  └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌───────────────────┐                    ┌──────────────────────────┐
│   Supabase 数据库  │                    │       链上数据层           │
│  • 用户元数据      │                    │  ┌──────────────────┐    │
│  • 订阅状态        │                    │  │   Sui 区块链      │    │
│  • 存证摘要索引    │                    │  │   (哈希上链)       │    │
│  • 使用量统计      │                    │  └──────────────────┘    │
└───────────────────┘                    │  ┌──────────────────┐    │
                                          │  │   Walrus 存储     │    │
                                          │  │ (原始对话数据)    │    │
                                          │  └──────────────────┘    │
                                          └──────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                    网页验证仪表板 + 管理后台                     │
│  • 对话历史查看  • 哈希链验证  • PDF/MD 导出                    │
│  • 跨平台搜索    • 标签文件夹  • 分享链接                       │
│  • 用户增长分析  • 订阅管理    • 使用量统计                     │
└───────────────────────────────────────────────────────────────┘
```

### 3.1 技术栈
- **前端框架**：React + TypeScript + Vite + CRXJS（Chrome 插件构建工具）
- **状态管理**：Jotai（轻量，适合插件场景）
- **样式**：Tailwind CSS
- **用户认证**：Supabase Auth + Google OAuth
- **用户数据**：Supabase PostgreSQL（用户元数据、存证摘要、订阅状态）
- **Sui 交互**：@mysten/sui.js + zkLogin
- **Walrus 交互**：walrus SDK

---

## 4. 核心功能清单

### 4.1 第一优先级（黑客马拉松必须完成）

| 功能 | 用户故事 | 验收标准 |
|-----|---------|---------|
| **Google 账号登录** | 作为用户，我希望用 Google 账号一键登录，不需要记住密码 | 打开插件显示登录按钮，点击后弹出 Google OAuth 窗口，登录成功后显示用户信息 |
| **用户元数据同步** | 作为开发者，我希望知道有多少用户在使用我的产品 | 每个用户的首次登录时间、最后活跃时间、使用平台分布都记录在 Supabase |
| **多站点自动识别** | 作为用户，我进入任何主流 AI 对话网站时，插件能自动识别并激活对应功能 | 支持 ChatGPT、Claude、Gemini、Kimi。进入对应页面后插件图标变亮 |
| **一键导出对话** | 作为用户，我希望一键将当前对话导出为完美格式的 Markdown/PDF | 导出格式正确、代码高亮保留、对话时间戳正确 |
| **跨平台一键迁移** | 作为用户，我希望一键将 ChatGPT 的对话迁移到 Claude 继续讨论 | 点击按钮后自动打开目标网站，自动填入历史对话，用户只需按回车 |
| **一键区块链存证** | 作为用户，我希望点击一次就将当前对话存证到 Sui + Walrus | 点击后显示进度条，完成后显示交易哈希和验证链接，存证摘要同步到 Supabase |
| **极简验证页面** | 作为任何人，我希望输入哈希就能在网页上验证对话的真实性 | 输入哈希即可从 Walrus 加载原始数据，重新计算哈希对比，显示验证结果 |

### 4.2 第二优先级（赛后一周完成）

| 功能 | 用户故事 | 验收标准 |
|-----|---------|---------|
| **对话历史搜索** | 作为用户，我希望跨所有平台搜索我的 AI 对话历史 | 输入关键词即可搜索所有保存的对话，支持按平台、日期筛选 |
| **标签与文件夹** | 作为用户，我希望给重要的对话打标签、整理到文件夹 | 可以创建、编辑、删除标签，可以给对话添加多个标签 |
| **本地历史备份** | 作为用户，我希望所有存证过的对话都保存在本地，可以离线查看 | 插件内可以查看所有历史记录，即使没有网络 |
| **批量导出** | 作为用户，我希望一次性导出多个或所有对话 | 可以选择多个对话批量导出为 Zip 包 |
| **订阅系统骨架** | 作为开发者，我希望为未来的付费功能做好准备 | 用户表中有订阅状态字段，前端可以根据订阅级别显示/隐藏功能 |

### 4.3 第三优先级（企业版路线图）

| 功能 | 用户故事 | 验收标准 |
|-----|---------|---------|
| **TEE 远程验证服务** | 作为企业用户，我需要不可篡改的证据用于法律场景 | 在 TEE 环境中独立加载对话页面，生成加密证明，用户无法篡改捕获过程 |
| **团队管理面板** | 作为管理员，我希望查看团队成员的所有存证记录 | 团队仪表盘、成员管理、权限控制 |
| **API 访问** | 作为开发者，我希望通过 API 自动化存证流程 | RESTful API，支持集成到内部工作流 |
| **合规审计报告** | 作为合规官，我需要生成符合监管要求的审计报告 | 一键生成 PDF 格式的合规报告，包含完整哈希链 |
| **Stripe 支付集成** | 作为用户，我希望用信用卡订阅 Pro 版功能 | Stripe Checkout 集成，支持月付/年付，订阅状态实时同步 |

---

## 5. 插件交互设计

### 5.1 未登录状态弹窗

```
┌─────────────────────────────┐
│  🦭 Sui-Seal                 │
├─────────────────────────────┤
│                             │
│     欢迎使用 Sui-Seal        │
│   AI 工作流的通用中间件       │
│                             │
│  [ 🔐 使用 Google 账号登录 ]  │
│                             │
│  登录后即可使用所有功能：     │
│  • 一键跨平台对话迁移         │
│  • 永久区块链存证            │
│  • 对话历史搜索与管理        │
│  • 多格式导出               │
│                             │
└─────────────────────────────┘
```

### 5.2 已登录状态弹窗主界面

```
┌─────────────────────────────┐
│  🦭 Sui-Seal              ⚙ │
│  👤 user@example.com         │
├─────────────────────────────┤
│  当前站点：✅ ChatGPT        │
├─────────────────────────────┤
│  [ 🔗 一键迁移到 Claude  ]   │
│  [ 🔗 一键迁移到 Gemini  ]   │
│  [ 🔗 一键迁移到 Kimi    ]   │
├─────────────────────────────┤
│  [ 📄 导出 Markdown     ]   │
│  [ 📄 导出 PDF          ]   │
├─────────────────────────────┤
│  [ 🔐 存证到 Sui 链     ]   │
│     (点击后显示进度条)        │
├─────────────────────────────┤
│  📋 最近 3 条存证记录        │
│  10:32  ChatGPT  #3421      │
│  09:15  Claude   #3420      │
│  昨天   Gemini   #3419      │
├─────────────────────────────┤
│  [ 查看全部历史 ]  [ 账户 ]  │
└─────────────────────────────┘
```

### 5.3 页面内注入按钮

在每个 AI 对话网站的输入框旁边注入一个小巧的 Sui-Seal 按钮：

```
[ 用户输入框                     ] [发送] [🦭 存证]
```

点击后显示微型菜单：
- 快速存证
- 导出 MD
- 迁移到...

---

## 6. 核心技术难点与解决方案

### 6.1 Supabase 用户认证与数据流

**用户注册/登录流程：**
1. 用户打开插件，显示 Google 登录按钮
2. 点击后调用 `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. Chrome 插件弹出 OAuth 授权窗口
4. 用户授权后，Supabase 返回 JWT token 和用户信息
5. 插件将 token 存储在 `chrome.storage.local`
6. 异步创建/更新用户记录（如果是新用户则创建，否则更新最后登录时间）

**存证数据流：**
1. 用户点击"存证"按钮
2. 插件提取对话数据，计算哈希
3. 上传原始对话数据到 Walrus，获得 blob ID
4. 将哈希 + Walrus blob ID 写入 Sui 区块链
5. 将存证摘要（不含原始对话内容）写入 Supabase：
   - 用户 ID
   - 平台（ChatGPT/Claude 等）
   - 对话标题
   - Sui 交易哈希
   - Walrus blob ID
   - 存证时间戳
   - 消息数量统计
6. 完成后向用户显示结果

**关键设计决策：原始对话数据只存在 Walrus，不存入 Supabase。** Supabase 只存元数据和摘要，保护用户隐私。

### 6.2 流式增量哈希（防篡改）

**问题**：用户可以在存证前修改 DOM。

**解决方案**：不是等整个回答完成后再哈希，而是**每收到一个 token 就更新一次哈希**。

```typescript
// 伪代码
let currentHash = initialHash;
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (isNewToken(mutation)) {
      const token = extractToken(mutation);
      currentHash = sha256(currentHash + token + timestamp);
      addToHashChain(currentHash, timestamp);
    }
  });
});
```

修改任何一个字都需要重新计算整个哈希链。这不能 100% 阻止篡改，但把门槛提高到 99.9% 的用户无法做到。

### 6.3 站点适配器架构

**问题**：每个 AI 网站的 DOM 结构都不一样。

**解决方案**：适配器模式，每个站点对应一个适配器文件：

```
src/adapters/
  ├── chatgpt.ts
  ├── claude.ts
  ├── gemini.ts
  ├── kimi.ts
  └── interface.ts  // 统一接口
```

每个适配器实现相同的接口：
- `detect(): boolean` - 检测当前页面是否是这个站点
- `extractConversation(): Conversation` - 提取完整对话
- `observeNewTokens(callback)` - 监听新 token 流式输出

### 6.4 zkLogin 无缝用户体验

**问题**：用户不想管理钱包私钥。

**解决方案**：使用 Sui zkLogin 与 Google OAuth 结合：
1. 用户用 Google 账号登录 Supabase Auth
2. 复用同一个 Google OAuth 的 nonce 生成 zkLogin 证明
3. 用户只需要登录一次，同时获得 Supabase 认证和 Sui 签名能力
4. 整个过程对用户透明，不需要安装钱包，不需要记住助记词

---

## 7. 数据结构设计

### 7.1 Supabase 数据库 Schema

```sql
-- 用户表
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIME ZONE 'utc' NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT TIME ZONE 'utc' NOW(),
  subscription_plan TEXT DEFAULT 'free', -- free, pro, team, enterprise
  subscription_start_at TIMESTAMP WITH TIME ZONE,
  subscription_end_at TIMESTAMP WITH TIME ZONE,
  total_witnesses INTEGER DEFAULT 0,
  last_witness_at TIMESTAMP WITH TIME ZONE,
  preferred_platforms TEXT[], -- 常用平台统计
  is_active BOOLEAN DEFAULT true
);

-- 存证摘要表（只存元数据，不存原始对话内容）
CREATE TABLE witness_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  sui_transaction_digest TEXT NOT NULL,
  walrus_blob_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- chatgpt, claude, gemini, kimi
  conversation_title TEXT,
  conversation_url TEXT,
  message_count INTEGER,
  witness_timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIME ZONE 'utc' NOW(),
  client_version TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false, -- 用户可选择是否公开此存证
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIME ZONE 'utc' NOW()
);

-- 用户活跃度统计表（用于产品分析）
CREATE TABLE user_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL, -- login, export, migrate, witness
  platform TEXT,
  metadata JSONB, -- 额外的活动元数据
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIME ZONE 'utc' NOW(),
  UNIQUE(user_id, activity_date, activity_type)
);

-- 开启行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE witness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的数据
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view their own witness records" ON witness_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own witness records" ON witness_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 7.2 对话数据结构（存储在 Walrus）

```typescript
interface ConversationWitness {
  id: string;
  platform: 'chatgpt' | 'claude' | 'gemini' | 'kimi' | string;
  title: string;
  url: string;
  timestamp: number;  // ISO 时间戳
  messages: Message[];
  hashChain: string[];  // 每个 token 的增量哈希链
  clientVersion: string;  // 插件版本号
  userPublicKey: string;
  supabaseUserId: string;  // 关联到 Supabase 用户
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokenHash: string;  // 这个消息结束时的哈希值
}
```

### 7.3 Sui 链上存储结构

只在链上存储**最小必要信息**（原始对话数据太大，存在 Walrus）：

```typescript
// Sui Move 合约中的结构
struct WitnessRecord has key, store {
  id: UID,
  owner: address,
  conversation_hash: vector<u8>,  // 整个对话的最终哈希
  walrus_blob_id: vector<u8>,     // Walrus 中的 blob ID
  platform: vector<u8>,
  timestamp: u64,
  client_version: vector<u8>,
}
```

---

## 8. 商业模式

| 版本 | 价格 | 功能 |
|-----|------|------|
| **免费版** | $0 | 最多 50 条存证、基础导出功能、手动迁移 |
| **Pro 版** | $12/月 或 $99/年 | 无限存证、所有导出格式、一键迁移、高级搜索、标签文件夹、PDF 验证报告 |
| **团队版** | $20/人/月 | Pro 所有功能 + 团队管理面板 + 共享仪表盘 + API 访问 |
| **企业版** | 定制报价 | 所有功能 + TEE 远程验证服务 + 审计日志 + 合规报告模板 + 专属支持 |

### 8.1 订阅系统设计要点

- **Stripe 集成**：使用 Stripe Checkout 处理支付
- **Webhook 同步**：Stripe 付款成功后通过 Webhook 更新 Supabase 中的用户订阅状态
- **使用量限制**：免费版每月 50 条存证，超出后提示升级
- **免费试用**：新用户注册后可获得 14 天 Pro 版试用，无需信用卡
- **计量计费**：未来可引入按存证数量、存储量的阶梯计费

---

## 9. 管理员分析仪表盘

产品运营需要的数据指标：

| 指标类型 | 具体指标 |
|---------|---------|
| **用户增长** | 总注册用户数、日新增用户、7 日活跃、30 日活跃、次日留存、7 日留存 |
| **功能使用** | 总存证次数、日均存证次数、导出次数、迁移次数、各平台使用分布 |
| **转化漏斗** | 安装 → 注册 → 首次存证 → 第 7 天留存 → 付费转化 |
| **订阅数据** | 各版本用户分布、MRR（月经常性收入）、 churn 率、升级转化率 |

---

## 10. 黑客马拉松交付里程碑

### Day 1: 核心框架 + 用户系统
- ✅ Chrome 插件基础架构（Manifest V3 + React + Tailwind）
- ✅ Supabase Auth 集成 + Google OAuth 登录
- ✅ Supabase 数据库 Schema 创建 + RLS 策略
- ✅ ChatGPT 适配器（对话提取）
- ✅ 基础导出功能（Markdown）

### Day 2: 区块链集成
- ✅ Sui zkLogin 集成（与 Google OAuth 复用）
- ✅ Walrus blob 存储
- ✅ 一键存证功能 + Supabase 摘要同步
- ✅ 极简验证页面
- ✅ 用户活动统计埋点

### Day 3: 演示准备
- ✅ 一键迁移功能（ChatGPT → Claude）
- ✅ 产品 Landing Page
- ✅ 管理员分析仪表盘（用户增长、使用数据）
- ✅ 演示视频
- ✅ 演示脚本排练

---

## 11. 关键成功指标

| 指标 | 30 天目标 | 90 天目标 |
|-----|----------|----------|
| 插件安装量 | 1,000 | 10,000 |
| 注册用户数 | 500 | 5,000 |
| 日活跃用户 | 100 | 1,000 |
| 7 日留存率 | 30% | 40% |
| 总存证次数 | 5,000 | 50,000 |
| 付费转化率 | 1% | 3% |
| MRR（月收入） | $500 | $5,000 |
| 支持平台数量 | 4 | 10+ |

---

## 12. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| AI 网站 DOM 变更导致适配器失效 | 高 | 中 | 远程配置服务器，动态更新选择器，无需发版 |
| Chrome 商店审核被拒 | 中 | 高 | 严格遵循 Manifest V3 规范，最小化权限申请 |
| 用户篡改问题被质疑 | 中 | 高 | 诚实说明限制，企业版路线图包含 TEE 解决方案 |
| Walrus/Sui 网络不稳定 | 低 | 中 | 本地缓存，网络恢复后重试机制 |
| Supabase Auth 在插件中兼容性问题 | 中 | 高 | 提前测试 Chrome Manifest V3 环境下的 OAuth 流程，准备备用方案 |
| 用户隐私担忧（数据存入 Supabase） | 中 | 中 | 透明说明：原始对话只存 Walrus，Supabase 只存元数据，开源代码供审计 |

---

## 附录：站点优先级

1. **ChatGPT** - 最高优先级，用户最多
2. **Claude** - 第二优先级，长文档用户多
3. **Gemini** - 第三优先级，多模态用户
4. **Kimi** - 中文用户重点
5. **Perplexity** - 搜索类 AI
6. **Copilot (Bing)** - 微软系用户
7. **Character.AI** - 娱乐类对话
8. **PoE** - 多平台聚合用户
