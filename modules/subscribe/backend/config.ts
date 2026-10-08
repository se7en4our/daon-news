// What the subscription channels need, read from the environment when they are used (like the engine's
// valves: only "true" turns a channel on, and a channel without its credentials stays off).
import { credential } from "@aihot/backend/config";

export interface TelegramConfig {
  token: string;
  /** "@channelname" or a numeric chat id ("-100…"). */
  chat: string;
  api: string;
}

export function telegramConfig(): TelegramConfig | null {
  if (process.env.TELEGRAM_PUSH_ENABLED !== "true") return null;
  const token = credential("integrations", "TELEGRAM_BOT_TOKEN");
  const chat = credential("integrations", "TELEGRAM_CHANNEL_ID");
  if (!token || !chat) return null;
  return { token, chat, api: process.env.TELEGRAM_API_BASE || "https://api.telegram.org" };
}

/** The public channel's address for readers: from a public "@name" id, else TELEGRAM_CHANNEL_URL. */
export function telegramChannelUrl(): string | null {
  const explicit = process.env.TELEGRAM_CHANNEL_URL?.trim();
  if (explicit) return explicit;
  const chat = process.env.TELEGRAM_CHANNEL_ID?.trim();
  return chat?.startsWith("@") ? `https://t.me/${chat.slice(1)}` : null;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string | null;
  password: string | null;
  /** "DaON News <news@daon.cloud>" */
  from: string;
}

export function smtpConfig(): SmtpConfig | null {
  if (process.env.EMAIL_PUSH_ENABLED !== "true") return null;
  const host = credential("integrations", "SMTP_HOST");
  const from = credential("integrations", "MAIL_FROM");
  if (!host || !from) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    user: credential("integrations", "SMTP_USER"),
    password: credential("integrations", "SMTP_PASSWORD"),
    from,
  };
}

/** Confirmation mails the whole site may send per hour: a cap against the form being used to spam addresses. */
export const CONFIRM_MAILS_PER_HOUR = Number(process.env.SUBSCRIBE_CONFIRM_PER_HOUR || 60);
