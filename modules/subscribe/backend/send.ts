// Outbound: Telegram Bot API for the channel post, SMTP (Amazon SES, OCI Email Delivery or any other) for mail.
import nodemailer from "nodemailer";
import { smtpConfig, telegramConfig } from "./config.ts";
import type { Mail } from "./render.ts";

export async function sendTelegram(html: string): Promise<void> {
  const cfg = telegramConfig();
  if (!cfg) throw new Error("telegram is not configured");
  const res = await fetch(`${cfg.api}/bot${cfg.token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: cfg.chat, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  // The token is in the URL: never put the URL in the error.
  if (!res.ok || !body?.ok) throw new Error(`telegram ${res.status}: ${body?.description ?? "no answer"}`.slice(0, 300));
}

export interface OutgoingMail extends Mail {
  to: string;
  headers?: Record<string, string>;
}

type Send = (mail: OutgoingMail) => Promise<void>;
let override: Send | null = null;
let transport: { key: string; send: Send } | null = null;

/** Tests capture mail here instead of an SMTP server. */
export function useMailer(send: Send | null): void {
  override = send;
}

export async function sendMail(mail: OutgoingMail): Promise<void> {
  if (override) return override(mail);
  const cfg = smtpConfig();
  if (!cfg) throw new Error("email is not configured");
  const key = JSON.stringify(cfg);
  if (transport?.key !== key) {
    const t = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      requireTLS: cfg.port !== 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.password ?? "" } : undefined,
      connectionTimeout: 15_000,
      socketTimeout: 30_000,
    });
    transport = { key, send: async (m) => void (await t.sendMail({ from: cfg.from, to: m.to, subject: m.subject, text: m.text, html: m.html, headers: m.headers })) };
  }
  return transport.send(mail);
}
