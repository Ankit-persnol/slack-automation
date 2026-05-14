# Slack Automation Project

A Node.js backend application that integrates with Slack to manage events through slash commands and interactive buttons.

## Features

- 🔍 **Fuzzy Search** - Find events using Fuse.js for intelligent matching
- 🔐 **Secure API** - Slack signature verification for all requests
- 🗑️ **Delete Events** - Interactive YES/NO buttons for confirmation
- 📦 **MongoDB Integration** - Store and retrieve events efficiently

## Project Structure

```
src/
 ├── slack/
 │    ├── slack.controller.ts  - Handle HTTP requests from Slack
 │    ├── slack.service.ts     - Business logic & Slack interactions
 │    └── slack.module.ts      - Module configuration
 │
 ├── events/
 │    ├── events.service.ts    - Event CRUD operations
 │    └── events.schema.ts     - MongoDB event schema
 │
 └── app.js                    - Main application entry point
```

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   - `SLACK_SIGNING_SECRET` - From your Slack app settings
   - `SLACK_BOT_TOKEN` - Your bot user token (xoxb-...)
   - `MONGODB_URI` - MongoDB connection string

3. **Seed the database (optional):**
   ```bash
   npm run seed
   ```

4. **Start the server:**
   ```bash
   # Production
   npm start
   
   # Development with auto-reload
   npm run dev
   ```

## Slack Configuration

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app and select your workspace

### 2. Enable Slash Commands

1. Go to "Slash Commands" in the sidebar
2. Click "Create New Command"
3. Configure:
   - **Command**: `/delete-event`
   - **Request URL**: `https://your-domain.com/api/slack/commands`
   - **Description**: "Delete an event from the database"
   - **Usage Hint**: `[event name]`

### 3. Enable Interactivity

1. Go to "Interactivity & Shortcuts"
2. Enable "Interactivity"
3. Set **Request URL**: `https://your-domain.com/api/slack/interactions`

### 4. Install the App

1. Go to "Install App"
2. Click "Install to Workspace"
3. Copy the **Signing Secret** and **Bot User Token** to your `.env` file

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/slack/commands` | Handle slash commands |
| POST | `/api/slack/interactions` | Handle button clicks |
| GET | `/api/slack/health` | Health check |

## Usage Flow

```
Slack Command (/delete-event react summit)
        ↓
Node.js API (Search with Fuse.js)
        ↓
MongoDB Search
        ↓
Slack Response with YES/NO Buttons
        ↓
User Clicks Button
        ↓
Node.js API (Handle Interaction)
        ↓
MongoDB Delete
        ↓
Slack Success Message
```

## Testing Locally

Use [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Start ngrok
ngrok http 3000

# Update your Slack app URLs to use the ngrok URL
# e.g., https://abc123.ngrok.io/api/slack/commands
```

## Example Search Queries

The fuzzy search can find events even with partial matches:

- `"react summit"` → finds "React India Summit 2026"
- `"node conf"` → finds "Node.js Conference 2025"
- `"aws"` → finds "AWS re:Invent"

## Security

All Slack requests are verified using:
- `x-slack-signature` header
- `x-slack-request-timestamp` header
- HMAC SHA256 signature validation
- Timestamp validation (prevents replay attacks)

## License

ISC
