# Sui Chat Witness (聊天见证)

> 在区块链上永久保存你的 AI 对话，加密保护隐私，拥有随时解密和分享的权利。

## ✨ 项目功能

### 核心特性
- **对话存档**: 自动捕获 ChatGPT、Claude、Gemini 等 AI 平台的对话内容
- **加密存储**: 使用 Seal 协议端到端加密，只有你能解密
- **链上见证**: 对话哈希存储在 Sui 区块链上，不可篡改
- **分布式存储**: 内容加密后存储到 Walrus 分布式存储网络
- **多语言支持**: 中文 / 英文双语界面

### Chrome 插件功能
- 支持主流 AI 对话平台自动捕获
- 本地 SQLite 数据库存储对话历史
- 一键上传并生成区块链交易凭证
- 支持查看已存档的对话列表
- 支持导出原始对话数据

### 落地页 / Dashboard 功能
- 产品介绍页面和安装指南
- Google 账号登录
- 查看已存档的见证记录列表
- 支持按平台筛选和分页浏览
- 下载加密的原始对话数据
- 连接 Sui 钱包并解密已存档的对话

## 🏗 项目结构

```
sui-chat-witness/
├── chat-witness-chrome-plugin/    # Chrome 浏览器插件
│   ├── src/
│   │   ├── adapters/              # 各平台对话解析适配器
│   │   ├── background/            # 后台服务和任务队列
│   │   ├── content/               # 内容脚本（注入 AI 网站）
│   │   ├── db/                    # 本地数据库 (SQLite + Drizzle ORM)
│   │   ├── hooks/                 # React 自定义 Hooks
│   │   ├── lib/                   # 核心业务逻辑
│   │   │   ├── seal.ts            # Seal 加密协议集成
│   │   │   ├── sui.ts             # Sui 区块链交易
│   │   │   └── walrus.ts          # Walrus 存储上传
│   │   ├── popup/                 # 插件弹窗页面
│   │   ├── signer/                # 签名和交易组件
│   │   ├── utils/                 # 工具函数
│   │   └── wallet-page/           # 钱包连接页面
│   └── manifest.json               # Chrome 插件配置
│
├── landing/                        # Next.js 落地页 / Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/          # 多语言路由 (zh / en)
│   │   │   │   ├── dashboard/     # Dashboard 页面
│   │   │   │   └── page.tsx       # 首页
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── landing-page.tsx   # 落地页组件
│   │   │   ├── dashboard-client.tsx
│   │   │   └── auth-button.tsx
│   │   └── lib/
│   │       ├── config.ts          # 公共配置
│   │       ├── i18n.ts            # 国际化
│   │       ├── supabase.ts        # Supabase 客户端
│   │       ├── storage.ts         # Walrus / Seal 操作
│   │       ├── download.ts        # 文件下载工具
│   │       └── witness-records.ts # 见证记录业务逻辑
│   └── package.json
│
├── sui-contracts/                  # Sui Move 智能合约
│   └── witness/                    # 见证合约包
│       └── sources/
│           └── witness.move       # 核心合约
│
└── docs/                           # 项目文档
```

## ✅ 已实现功能

### Chrome 插件
- [x] 多平台对话捕获适配器
- [x] 本地 SQLite 数据库 + 迁移系统
- [x] Walrus 分布式存储上传
- [x] Seal 端到端加密
- [x] Sui 区块链交易发送
- [x] 后台任务队列处理
- [x] 插件 UI 弹窗页面
- [x] Sui 钱包连接与签名

### 落地页 / Dashboard
- [x] Next.js 15 基础框架
- [x] 中英文国际化路由 (`/zh`, `/en`)
- [x] 产品介绍首页
- [x] Supabase Google OAuth 登录
- [x] Dashboard 见证记录列表
- [x] 记录分页与刷新
- [x] 已存档记录摘要统计
- [x] Sui 钱包连接 (dApp Kit)
- [x] Seal 解密与 Markdown 下载
- [x] Vercel 部署配置

### 智能合约
- [x] Witness 见证对象 Move 合约
- [x] Seal 权限控制集成
- [x] 合约已部署到 Sui Testnet

## 📋 Todo 功能

### 近期
- [ ] 支持更多 AI 平台
- [ ] 对话时间轴浏览功能
- [ ] 接入walrus-mem，不用钱包就能存数据

## 🛠 技术栈

| 模块 | 技术 |
|-----|------|
| 浏览器插件 | React + TypeScript + Vite |
| 落地页 / Dashboard | Next.js 15 + Tailwind CSS |
| 区块链 | Sui + Move 智能合约 |
| 存储 | Walrus 分布式存储网络 |
| 加密 | Mysten Seal 协议 |
| 数据库 | Supabase PostgreSQL |
| 本地存储 | SQLite + Drizzle ORM |
| 钱包 | Mysten dApp Kit |

## 🚀 快速开始

### 开发环境

```bash
# 克隆项目
git clone https://github.com/dpeng575/sui-chat-witness.git
cd sui-chat-witness

# 安装插件依赖
cd chat-witness-chrome-plugin
npm install
npm run dev

# 安装落地页依赖
cd ../landing
npm install
npm run dev
```

### 构建插件

```bash
cd chat-witness-chrome-plugin
npm run build
```

然后在 Chrome 扩展管理页面加载 `dist/` 目录。

### 部署落地页

落地页已配置好 Vercel 部署，直接连接仓库的 `landing/` 目录即可。

## 🔧 环境变量

### 落地页 (`landing/.env.local`)

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的公钥

# Seal 配置
NEXT_PUBLIC_SEAL_PACKAGE_ID=
NEXT_PUBLIC_SEAL_NAMESPACE_PACKAGE_ID=
NEXT_PUBLIC_SEAL_KEY_SERVERS=

# Walrus 配置
NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL=https://upload-relay.testnet.walrus.space

# Sui 网络
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_EXPLORER_BASE_URL=https://suiscan.xyz/testnet

# 插件下载地址
NEXT_PUBLIC_EXTENSION_DOWNLOAD_URL=/downloads/sui-seal-extension.zip
```

### 插件环境

参考 `chat-witness-chrome-plugin/.env.example`

## 📄 许可证

MIT License
