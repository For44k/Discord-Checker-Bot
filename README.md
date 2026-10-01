# Discord Checker & Intelligence Engine

A high-performance Discord audit, permissions analyzer, and tracking suite built with TypeScript, Discord.js v14, Express, and in-memory indexing.

---

## Architecture Overview

The system is separated into two components:
1. **`api/` (Backend Engine)**: Connects selfbot client pools to index mutual guilds, member hierarchies, dangerous administrative roles, and voice states in memory.
2. **`bot/` (Interface)**: The main Discord bot executing prefix/slash commands, rendering custom Canvas cards, and communicating with the API engine.

```
┌──────────────┐      REST / IPC (/dev/shm)      ┌──────────────────┐
│              │ ◄─────────────────────────────► │                  │
│  Discord Bot │                                 │  Backend API     │
│   (Client)   │ ◄──────── WebSocket ─────────── │  (State Engine)  │
└──────────────┘                                 └──────────────────┘
```

---

## Quick Start

### 1. Requirements
- **Node.js**: `v18+` or `v20+`
- **MongoDB**: `v5.0+`
- **npm** or **pnpm**

---

### 2. Configuration (`.env`)

You do not need to generate a special API key from any external website. **The API key is simply a password you choose yourself** to connect your bot with your API.

Generate any random string (e.g. `openssl rand -hex 16` in terminal, or type any secret phrase like `my_secret_key_123`) and put the exact same value in both files.

Create `.env` in the root directory:

```env
# Discord Bot
DISCORD_TOKEN=your_bot_token_here
OWNER_ID=your_discord_user_id

# Backend API Connection (must match the API key in api/.env)
API_ENDPOINT=http://127.0.0.1:3116
API_KEY=choose_any_secret_password_here

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/checker_db

# Optional Webhooks & Support
ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/...
SUPPORT_SERVER=https://discord.gg/your_server
```

In `api/.env`:

```env
PORT=3116
API_KEY=choose_any_secret_password_here
MONGODB_URI=mongodb://127.0.0.1:27017/checker_db

# Array of Discord selfbot tokens used for guild indexing
DISCORD_USER_TOKENS='[
  "USER_TOKEN_1",
  "USER_TOKEN_2"
]'
```

---

### 3. Installation & Run

```bash
# 1. Install dependencies
npm install
cd api && npm install && cd ..

# 2. Build TypeScript
npm run build
cd api && npm run build && cd ..

# 3. Start API & Bot
# Terminal 1 (API Engine)
cd api && npm start

# Terminal 2 (Discord Bot)
npm start
```

Or using **PM2**:

```bash
pm2 start dist/server.js --name "checker-api" --cwd /path/to/project/api
pm2 start dist/bot/index.js --name "checker-bot" --cwd /path/to/project
```

---

## API Endpoints Reference

All requests must include the header `x-api-key: <API_KEY>`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/server-info/:serverId` | Fetches guild telemetry, owner details, vanity, and member counts. |
| `GET` | `/api/server-admins/:serverId` | Returns list of members holding Administrator permissions. |
| `GET` | `/api/danger-roles/:userId` | Scans mutual servers for dangerous administrative roles held by a user. |
| `GET` | `/api/user-roles/:userId` | Returns all mutual servers and assigned roles for a target user. |
| `GET` | `/api/user-voice/:userId` | Returns total voice time, sessions, and active companion stats. |
| `GET` | `/api/voice-leaderboard` | Top voice activity leaderboard across tracked guilds. |
| `GET` | `/api/social-ship?user1Id=X&user2Id=Y` | Analyzes mutual voice co-occurrence and compatibility. |
| `GET` | `/api/user-presence/:userId` | Live status (mobile, desktop, web, activities). |

---

## Bot Commands

| Command | Aliases | Description |
| :--- | :--- | :--- |
| `+serverinfo [ID]` | `+si` | Display full guild analytics, owner status, and quick admin shortcuts. |
| `+listadmins <serverId>` | `+la`, `+admins` | Paginated list of administrators and role breakdown for a server. |
| `+checkroles <@user \| ID>` | `+cr`, `+roles` | Scans all monitored servers for dangerous permissions. |
| `+fullcheck <@user \| ID>` | `+fc`, `+whois` | Interactive server selector showing all assigned roles per server. |
| `+uservoice <@user \| ID>` | `+uv` | Renders dynamic `@napi-rs/canvas` voice telemetry card. |
| `+ping` | `+p`, `+latency` | Real-time WebSocket, API, and MongoDB latency metrics. |

---

## License

This project is licensed under the [MIT License](LICENSE) — anyone is free to use, modify, and distribute this codebase, provided that the original copyright notice and permission notice remain intact in all copies or substantial portions of the Software.
