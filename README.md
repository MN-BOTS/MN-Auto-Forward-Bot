# 🔁 MN Auto Forward Bot

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge&logo=node.js"/>
  <img src="https://img.shields.io/badge/Deployed%20On-Vercel-black?style=for-the-badge&logo=vercel"/>
  <img src="https://img.shields.io/badge/Telegram-Bot-blue?style=for-the-badge&logo=telegram"/>
  <img src="https://img.shields.io/github/license/MNTGXO/Auto-Forward-Bot?style=for-the-badge"/>
</p>

A lightweight, serverless Telegram bot that automatically forwards messages between channels — silently, without the "Forwarded From" tag. Deploy in minutes on Vercel with zero server management.

---

## ✨ Features

- 🔁 **Silent Forwarding** — Copies messages without "Forwarded From" header
- 📋 **Multi-Rule Support** — Forward from multiple sources to multiple targets in one config
- 🚫 **Skip Terms** — Filter out messages containing specific words or phrases
- ⚡ **Serverless** — Runs entirely on Vercel, no server required
- 🔒 **Webhook Secret** — Optional security token to protect your webhook endpoint
- 📝 **Edited Posts** — Also forwards edited channel posts
- 🤖 **Bot Commands** — `/start` and `/status` for quick health checks

---

## 🛠 Deployment (Vercel)

### 1. Fork & Clone the Repository

```bash
git clone https://github.com/MNTGXO/Auto-Forward-Bot.git
cd Auto-Forward-Bot
```

### 2. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MNTGXO/Auto-Forward-Bot)

Or via CLI:

```bash
npm i -g vercel
vercel
```

### 3. Set Environment Variables

Go to **Vercel → Project → Settings → Environment Variables** and add:

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ Yes | Your bot token from [@BotFather](https://t.me/BotFather) |
| `FORWARD_RULES` | ✅ Yes | Forwarding rules (see format below) |
| `SKIP_TERMS` | ❌ No | Comma-separated words to skip |
| `WEBHOOK_SECRET` | ❌ No | Optional security token for webhook |

### 4. Register the Webhook

After deploying, open this URL in your browser (replace values):

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<your-vercel-url>/api/webhook
```

You should receive:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

---

## ⚙️ Configuration

### FORWARD_RULES Format

```
SOURCE_ID:TARGET_ID
```

**Multiple targets:**
```
-100111111:-100222222,-100333333
```

**Multiple rules (separated by `;`):**
```
-100111111:-100222222;-100444444:-100555555
```

**Multiple sources to one target:**
```
-100111111,-100222222:-100333333
```

> 💡 To get a channel ID, forward any message from the channel to [@userinfobot](https://t.me/userinfobot)

### SKIP_TERMS Format

Comma or semicolon separated words/phrases. Any message containing these will be skipped:

```
spam,buy now,advertisement
```

---

## 📁 Project Structure

```
Auto-Forward-Bot/
├── api/
│   ├── webhook.js    # Main bot logic & Telegram webhook handler
│   └── index.js      # Root health check endpoint
├── vercel.json        # Vercel routing & function config
├── package.json
└── README.md
```

---

## 🤖 Bot Commands

| Command | Description |
|---|---|
| `/start` | Check if the bot is online |
| `/status` | View rules count, skip terms, and token status |

---

## ❓ FAQ

**Q: Does the bot show "Forwarded From" in the target channel?**
No. It uses Telegram's `copyMessage` API which sends a clean copy with no forward header.

**Q: Can I forward from multiple sources to multiple targets?**
Yes. You can define as many rules as needed, separated by `;` in `FORWARD_RULES`.

**Q: The bot needs to be admin?**
The bot must be an **admin with post permission** in all target channels. For source channels, it only needs to be a **member**.

**Q: What happens if Vercel's function times out?**
The function has a `maxDuration` of 10 seconds. For most messages this is more than enough.

---

## 🆘 Support

Having trouble? Join our support group:

💬 **[@mnbots_support](https://t.me/mnbots_support)**

---

## ⭐ Star the Repo

If this project helped you, please consider leaving a **⭐ star** on GitHub — it really helps!

---

## 📄 License

[MIT License](LICENSE) — Free to use, modify, and distribute.
