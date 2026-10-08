// Email subscribers: sign-up (double opt-in), confirmation and unsubscribing. Answers never tell whether an
// address is already subscribed, so the form cannot be used to look addresses up.
import { randomBytes } from "node:crypto";
import { sql } from "@aihot/backend/db";
import { siteUrl } from "@aihot/backend/publication/links";
import { feedbackSourceHash } from "@aihot/backend/operations/feedback";
import { CONFIRM_MAILS_PER_HOUR, smtpConfig } from "./config.ts";
import { confirmMail } from "./render.ts";
import { sendMail } from "./send.ts";

export class SubscribeRejected extends Error {
  status: number;
  code: string;
  retryAfter?: number;
  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;
const RESEND_AFTER_MS = 10 * 60_000;

const recent = new Map<string, number[]>();
function rateLimit(source: string, limit = 3, windowMs = 10 * 60_000): void {
  const now = Date.now();
  const list = (recent.get(source) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) throw new SubscribeRejected(429, "rate_limited", "신청이 너무 잦습니다. 잠시 후 다시 시도하세요.", 600);
  list.push(now);
  recent.set(source, list);
  if (recent.size > 5000) for (const [k, v] of recent) if (v.every((t) => now - t > windowMs)) recent.delete(k);
}

export const confirmLink = (token: string) => siteUrl(`/subscribe/confirm?token=${encodeURIComponent(token)}`);
export const unsubscribeLink = (token: string) => siteUrl(`/subscribe/unsubscribe?token=${encodeURIComponent(token)}`);
/** The one-click address in List-Unsubscribe (RFC 8058): a POST to it unsubscribes without a page. */
export const oneClickLink = (token: string) => siteUrl(`/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`);

export interface SignUp {
  email: string;
  consent: boolean;
  /** A field people do not see: bots that fill every field are told it went fine and nothing is sent. */
  trap?: string;
  ip: string;
  userAgent: string;
}

export async function signUp(input: SignUp): Promise<{ ok: true }> {
  if (!smtpConfig()) throw new SubscribeRejected(503, "unavailable", "이메일 구독은 아직 준비 중입니다.");
  const email = input.email.trim().toLowerCase();
  if (email.length > 200 || !EMAIL.test(email)) throw new SubscribeRejected(400, "invalid_request", "이메일 형식이 올바르지 않습니다.");
  if (!input.consent) throw new SubscribeRejected(400, "invalid_request", "개인정보 수집·이용에 동의해 주세요.");
  const source = feedbackSourceHash(input.ip, input.userAgent);
  rateLimit(source);
  if (input.trap) return { ok: true };

  const [row] = await sql<{ id: number; status: string; token: string; confirm_sent_at: Date | null }[]>`
    INSERT INTO subscribe_emails (email, token, source_hash) VALUES (${email}, ${randomBytes(24).toString("base64url")}, ${source})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, status, token, confirm_sent_at`;
  if (row!.status === "active") return { ok: true };
  if (row!.confirm_sent_at && Date.now() - row!.confirm_sent_at.getTime() < RESEND_AFTER_MS) return { ok: true };
  const [{ sent }] = await sql<{ sent: number }[]>`SELECT count(*)::int AS sent FROM subscribe_emails WHERE confirm_sent_at > now() - interval '1 hour'`;
  if (sent >= CONFIRM_MAILS_PER_HOUR) throw new SubscribeRejected(429, "rate_limited", "지금은 신청이 많습니다. 잠시 후 다시 시도하세요.", 900);

  await sql`UPDATE subscribe_emails SET confirm_sent_at = now() WHERE id = ${row!.id}`;
  try {
    await sendMail({ to: email, ...confirmMail(confirmLink(row!.token)) });
  } catch (error) {
    await sql`UPDATE subscribe_emails SET confirm_sent_at = NULL WHERE id = ${row!.id}`;
    throw error;
  }
  return { ok: true };
}

export async function confirm(token: string): Promise<boolean> {
  if (!token) return false;
  const rows = await sql`
    UPDATE subscribe_emails SET status = 'active', confirmed_at = coalesce(confirmed_at, now())
    WHERE token = ${token} RETURNING id`;
  return rows.length > 0;
}

/** Deletes the subscriber: the address is not kept once its owner leaves. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!token) return false;
  const rows = await sql`DELETE FROM subscribe_emails WHERE token = ${token} RETURNING id`;
  return rows.length > 0;
}

/** Retention: unconfirmed sign-ups after 7 days, delivery records after 90. */
export async function subscribeRetention(now: Date) {
  const pending = await sql`DELETE FROM subscribe_emails WHERE status = 'pending' AND created_at < ${new Date(now.getTime() - 7 * 86400_000)}`;
  const deliveries = await sql`DELETE FROM subscribe_deliveries WHERE updated_at < ${new Date(now.getTime() - 90 * 86400_000)}`;
  return { deletedPendingSubscribers: pending.count, deletedSubscribeDeliveries: deliveries.count };
}

export async function activeSubscriberCount(): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM subscribe_emails WHERE status = 'active'`;
  return n;
}
