const BOT_TOKEN = process.env.BOT_TOKEN;
const FORWARD_RULES_RAW = process.env.FORWARD_RULES || "";
const SKIP_TERMS_RAW = process.env.SKIP_TERMS || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

function splitClean(value, separator = ",") {
  return String(value || "")
    .split(separator)
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeChatId(value) {
  const s = String(value).trim();
  if (/^-?\d+$/.test(s)) return s;
  return s;
}

function parseRules(raw) {
  const rules = [];
  String(raw || "")
    .split(";")
    .map(r => r.trim())
    .filter(Boolean)
    .forEach(rule => {
      const colonIndex = rule.indexOf(":");
      if (colonIndex === -1) return;
      const left = rule.slice(0, colonIndex).trim();
      const right = rule.slice(colonIndex + 1).trim();
      if (!left || !right) return;
      const sources = splitClean(left, ",").map(normalizeChatId);
      const targets = splitClean(right, ",").map(normalizeChatId);
      if (sources.length && targets.length) {
        rules.push({ sources, targets });
      }
    });
  return rules;
}

function parseSkipTerms(raw) {
  return String(raw || "")
    .split(/[,;\n]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

const RULES = parseRules(FORWARD_RULES_RAW);
const SKIP_TERMS = parseSkipTerms(SKIP_TERMS_RAW);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function telegram(method, payload, retries = 3) {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing");
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => null);
    if (resp.ok && data && data.ok) return data.result;
    const retryAfter = data?.parameters?.retry_after ? data.parameters.retry_after * 1000 : null;
    if ((resp.status === 429 || resp.status >= 500) && attempt < retries) {
      await sleep(retryAfter || 500 * (attempt + 1));
      continue;
    }
    const desc = data?.description || resp.statusText || "Unknown error";
    throw new Error(`${method} failed: ${desc}`);
  }
}

function buildSearchBlob(msg) {
  return [
    msg?.text || "",
    msg?.caption || "",
    msg?.document?.file_name || "",
    msg?.audio?.file_name || "",
    msg?.video?.file_name || "",
    msg?.animation?.file_name || "",
  ].join(" ").toLowerCase();
}

function shouldSkipMessage(msg) {
  if (!SKIP_TERMS.length) return false;
  const blob = buildSearchBlob(msg);
  return SKIP_TERMS.some(term => blob.includes(term));
}

function findTargetsForSource(sourceChatId) {
  const targets = new Set();
  for (const rule of RULES) {
    const matched = rule.sources.some(src => String(src) === String(sourceChatId));
    if (!matched) continue;
    for (const target of rule.targets) {
      if (String(target) !== String(sourceChatId)) targets.add(String(target));
    }
  }
  return [...targets];
}

async function handleMessage(update) {
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = msg.text || "";

  if (text === "/start") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text:
        "✅ *Auto Forward Bot is running!*\n\n" +
        "This bot automatically forwards messages between channels based on configured rules.\n\n" +
        "📌 *Status:* Active\n" +
        `📋 *Rules loaded:* ${RULES.length}\n` +
        `🚫 *Skip terms:* ${SKIP_TERMS.length}`,
      parse_mode: "Markdown",
    });
    return;
  }

  if (text === "/status") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text:
        `📊 *Bot Status*\n\n` +
        `✅ Running\n` +
        `📋 Rules: ${RULES.length}\n` +
        `🚫 Skip terms: ${SKIP_TERMS.length}\n` +
        `🔑 Token: ${BOT_TOKEN ? "Set ✅" : "Missing ❌"}`,
      parse_mode: "Markdown",
    });
    return;
  }
}

async function handleChannelPost(update) {
  const post = update.channel_post || update.edited_channel_post;
  if (!post) return { ok: true, ignored: true, reason: "not a channel post" };

  const sourceChatId = String(post.chat.id);
  const targets = findTargetsForSource(sourceChatId);

  if (!targets.length) {
    return { ok: true, ignored: true, reason: "no matching rule" };
  }

  if (shouldSkipMessage(post)) {
    return { ok: true, skipped: true, reason: "skip term matched" };
  }

  const results = [];
  for (const targetChatId of targets) {
    try {
      const result = await telegram("copyMessage", {
        chat_id: targetChatId,
        from_chat_id: sourceChatId,
        message_id: post.message_id,
      });
      results.push({ targetChatId, ok: true, result });
    } catch (err) {
      results.push({ targetChatId, ok: false, error: err.message });
    }
  }

  return { ok: true, forwardedTo: results };
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        service: "telegram-auto-forward-bot",
        rulesLoaded: RULES.length,
        skipTermsLoaded: SKIP_TERMS.length,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    if (WEBHOOK_SECRET) {
      const headerSecret = req.headers["x-telegram-bot-api-secret-token"];
      if (headerSecret !== WEBHOOK_SECRET) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }
    }

    if (!BOT_TOKEN) {
      return res.status(500).json({ ok: false, error: "BOT_TOKEN missing in environment variables" });
    }

    const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Handle private messages and commands (/start, /status)
    if (update.message) {
      await handleMessage(update);
      return res.status(200).json({ ok: true });
    }

    // Handle channel post forwarding
    if (update.channel_post || update.edited_channel_post) {
      const result = await handleChannelPost(update);
      return res.status(200).json(result);
    }

    return res.status(200).json({ ok: true, ignored: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).json({ ok: false, error: err.message });
  }
};
