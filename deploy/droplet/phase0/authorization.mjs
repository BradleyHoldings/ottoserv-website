// ─── Phase 0: bot authorization contract ─────────────────────────────────────
// The live bot must pass verified Telegram identity metadata. A free-form display
// name is never authorization. The adapter fails closed unless both the user id
// and chat id are explicitly allowlisted.

function clean(v) { return String(v ?? "").trim(); }
function idList(envName) {
  return clean(process.env[envName]).split(/[,\s]+/).map(clean).filter(Boolean);
}

export const BOT_AUTHORIZATION_CONTRACT = {
  required_actor_fields: ["telegramUserId", "chatId", "verified"],
  bot_must_validate: [
    "identity comes from the Telegram update",
    "allowed Telegram user id",
    "allowed chat id",
    "a pending operation exists",
    "approval scope and expiry are valid",
  ],
};

export function authorizeActor(actor = {}, options = {}) {
  if (!actor || typeof actor !== "object") return { ok: false, reason: "missing_actor" };
  if (actor.verified !== true) return { ok: false, reason: "actor_not_verified" };

  const userId = clean(actor.telegramUserId);
  const chatId = clean(actor.chatId);
  if (!userId) return { ok: false, reason: "missing_telegram_user_id" };
  if (!chatId) return { ok: false, reason: "missing_chat_id" };

  const allowedUsers = options.allowedUserIds || idList("HERMES_ALLOWED_TELEGRAM_USER_IDS");
  const allowedChats = options.allowedChatIds || idList("HERMES_ALLOWED_CHAT_IDS");
  if (allowedUsers.length === 0 || allowedChats.length === 0) {
    return { ok: false, reason: "allowlist_not_configured" };
  }
  if (!allowedUsers.includes(userId)) return { ok: false, reason: "user_not_allowed" };
  if (!allowedChats.includes(chatId)) return { ok: false, reason: "chat_not_allowed" };

  return {
    ok: true,
    reason: "authorized",
    approved_by: clean(actor.displayName) || `tg:${userId}`,
    telegram_user_id: userId,
    chat_id: chatId,
  };
}
