# Sui Chat Witness

> Permanently archive your AI conversations on the blockchain, encrypted for privacy, with full ownership to decrypt and share whenever you want.

## ✨ Project Features

### Core Features
- **Conversation Archiving**: Automatically capture conversations from ChatGPT, Claude, Gemini, and other AI platforms
- **Encrypted Storage**: End-to-end encryption using the Seal protocol — only you can decrypt
- **On-chain Witness**: Conversation hashes stored on the Sui blockchain, immutable and verifiable
- **Distributed Storage**: Encrypted content stored on the Walrus decentralized storage network
- **Multilingual Support**: Chinese / English bilingual interface

### Chrome Extension Features
- Auto-capture support for major AI conversation platforms
- Local SQLite database for conversation history
- One-click upload with blockchain transaction receipt
- View archived conversation list
- Export raw conversation data

### Landing Page / Dashboard Features
- Product introduction page with installation guide
- Google account login
- View archived witness records
- Platform filtering and pagination
- Download encrypted raw conversation data
- Connect Sui wallet and decrypt archived conversations

## 🏗 Project Structure

```
sui-chat-witness/
├── chat-witness-chrome-plugin/    # Chrome Browser Extension
│   ├── src/
│   │   ├── adapters/              # Platform-specific conversation parsers
│   │   ├── background/            # Background service and task queue
│   │   ├── content/               # Content scripts (injected into AI sites)
│   │   ├── db/                    # Local database (SQLite + Drizzle ORM)
│   │   ├── hooks/                 # React custom hooks
│   │   ├── lib/                   # Core business logic
│   │   │   ├── seal.ts            # Seal encryption protocol integration
│   │   │   ├── sui.ts             # Sui blockchain transactions
│   │   │   └── walrus.ts          # Walrus storage upload
│   │   ├── popup/                 # Extension popup UI
│   │   ├── signer/                # Signature and transaction components
│   │   ├── utils/                 # Utility functions
│   │   └── wallet-page/           # Wallet connection page
│   └── manifest.json               # Chrome extension config
│
├── landing/                        # Next.js Landing Page / Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/          # i18n routes (zh / en)
│   │   │   │   ├── dashboard/     # Dashboard page
│   │   │   │   └── page.tsx       # Home page
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── landing-page.tsx   # Landing page component
│   │   │   ├── dashboard-client.tsx
│   │   │   └── auth-button.tsx
│   │   └── lib/
│   │       ├── config.ts          # Public config
│   │       ├── i18n.ts            # Internationalization
│   │       ├── supabase.ts        # Supabase client
│   │       ├── storage.ts         # Walrus / Seal operations
│   │       ├── download.ts        # File download utilities
│   │       └── witness-records.ts # Witness record business logic
│   └── package.json
│
├── sui-contracts/                  # Sui Move Smart Contracts
│   └── witness/                    # Witness contract package
│       └── sources/
│           └── witness.move       # Core contract
│
└── docs/                           # Project Documentation
```

## ✅ Implemented Features

### Chrome Extension
- [x] Multi-platform conversation capture adapters
- [x] Local SQLite database + migration system
- [x] Walrus decentralized storage upload
- [x] Seal end-to-end encryption
- [x] Sui blockchain transaction submission
- [x] Background task queue processing
- [x] Extension UI popup page
- [x] Sui wallet connection and signing

### Landing Page / Dashboard
- [x] Next.js 15 foundation
- [x] Multilingual i18n routes (`/zh`, `/en`)
- [x] Product introduction homepage
- [x] Supabase Google OAuth login
- [x] Dashboard witness record list
- [x] Record pagination and refresh
- [x] Archived records summary statistics
- [x] Sui wallet connection (dApp Kit)
- [x] Seal decryption and Markdown download
- [x] Vercel deployment configuration

### Smart Contracts
- [x] Witness object Move contract
- [x] Seal access control integration
- [x] Contract deployed to Sui Testnet

## 📋 Todo Features

### Near-term
- [ ] Support more AI platforms (Wenxin Yiyan, Doubao, Kimi)
- [ ] Conversation timeline browsing
- [ ] Integrate walrus-mem, store conversation data without wallet


## 🛠 Tech Stack

| Module | Technology |
|--------|------------|
| Browser Extension | React + TypeScript + Vite |
| Landing / Dashboard | Next.js 15 + Tailwind CSS |
| Blockchain | Sui + Move Smart Contracts |
| Storage | Walrus Decentralized Storage Network |
| Encryption | Mysten Seal Protocol |
| Database | Supabase PostgreSQL |
| Local Storage | SQLite + Drizzle ORM |
| Wallet | Mysten dApp Kit |

## 🚀 Quick Start

### Development Environment

```bash
# Clone the project
git clone https://github.com/dpeng575/sui-chat-witness.git
cd sui-chat-witness

# Install extension dependencies
cd chat-witness-chrome-plugin
npm install
npm run dev

# Install landing page dependencies
cd ../landing
npm install
npm run dev
```

### Build Extension

```bash
cd chat-witness-chrome-plugin
npm run build
```

Then load the `dist/` directory in Chrome extension management page.

### Deploy Landing Page

The landing page is pre-configured for Vercel deployment. Simply connect the repo and set the root directory to `landing/`.

## 🔧 Environment Variables

### Landing Page (`landing/.env.local`)

```bash
# Supabase Config
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-key

# Seal Config
NEXT_PUBLIC_SEAL_PACKAGE_ID=
NEXT_PUBLIC_SEAL_NAMESPACE_PACKAGE_ID=
NEXT_PUBLIC_SEAL_KEY_SERVERS=

# Walrus Config
NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL=https://upload-relay.testnet.walrus.space

# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_EXPLORER_BASE_URL=https://suiscan.xyz/testnet

# Extension Download URL
NEXT_PUBLIC_EXTENSION_DOWNLOAD_URL=/downloads/sui-seal-extension.zip
```

### Extension Environment

Refer to `chat-witness-chrome-plugin/.env.example`

## 📄 License

MIT License
