// Sends today's daily briefing to the Telegram channel and to every confirmed email subscriber, once each.
// Runs every 10 minutes: whatever is due and not sent yet goes out, a failed send is retried on the next
// runs (3 attempts in all). A send cut off mid-way stays "sending" and is not repeated: at most once.
import { sql } from "@aihot/backend/db";
import { feedIssues, type FeedIssue } from "@aihot/backend/publication/reports";
import { beijingDate, beijingTime } from "@aihot/contracts/time";
import { smtpConfig, telegramConfig } from "./config.ts";
import { dailyMail, telegramPost } from "./render.ts";
import { sendMail, sendTelegram } from "./send.ts";
import { oneClickLink, unsubscribeLink } from "./subscribers.ts";

const MAX_ATTEMPTS = 3;
/** Recipients per run (every 10 minutes): well inside the usual SMTP sending rates. */
const EMAILS_PER_RUN = 300;
/** No sending at night (21:00–08:00 KST), whatever is late. */
const QUIET = { from: "21:00", until: "08:00" };

/** Claims one delivery; false when it was sent, is being sent or has used its attempts. */
async function claim(channel: "telegram" | "email", key: string, recipient: string): Promise<boolean> {
  const rows = await sql`
    INSERT INTO subscribe_deliveries (channel, report_key, recipient, status) VALUES (${channel}, ${key}, ${recipient}, 'sending')
    ON CONFLICT (channel, report_key, recipient) DO UPDATE SET status = 'sending', attempts = subscribe_deliveries.attempts + 1, error = NULL, updated_at = now()
    WHERE subscribe_deliveries.status = 'failed' AND subscribe_deliveries.attempts < ${MAX_ATTEMPTS}
    RETURNING 1`;
  return rows.length > 0;
}

async function settle(channel: string, key: string, recipient: string, error: unknown): Promise<void> {
  const message = error ? String(error instanceof Error ? error.message : error).slice(0, 300) : null;
  await sql`UPDATE subscribe_deliveries SET status = ${message ? "failed" : "sent"}, error = ${message}, updated_at = now()
    WHERE channel = ${channel} AND report_key = ${key} AND recipient = ${recipient}`;
}

async function deliverTelegram(issue: FeedIssue) {
  const cfg = telegramConfig();
  if (!cfg) return "off";
  if (!(await claim("telegram", issue.key, cfg.chat))) return "done";
  try {
    await sendTelegram(telegramPost(issue));
    await settle("telegram", issue.key, cfg.chat, null);
    return "sent";
  } catch (error) {
    await settle("telegram", issue.key, cfg.chat, error);
    return "failed";
  }
}

async function deliverEmail(issue: FeedIssue) {
  if (!smtpConfig()) return { status: "off" };
  const due = await sql<{ id: number; email: string; token: string }[]>`
    SELECT s.id, s.email, s.token FROM subscribe_emails s
    WHERE s.status = 'active' AND NOT EXISTS (
      SELECT 1 FROM subscribe_deliveries d WHERE d.channel = 'email' AND d.report_key = ${issue.key} AND d.recipient = s.id::text
        AND (d.status <> 'failed' OR d.attempts >= ${MAX_ATTEMPTS}))
    ORDER BY s.id LIMIT ${EMAILS_PER_RUN}`;
  let sent = 0;
  let failed = 0;
  for (const s of due) {
    const recipient = String(s.id);
    if (!(await claim("email", issue.key, recipient))) continue;
    try {
      await sendMail({
        to: s.email,
        ...dailyMail(issue, unsubscribeLink(s.token)),
        headers: { "List-Unsubscribe": `<${oneClickLink(s.token)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      await settle("email", issue.key, recipient, null);
      sent++;
    } catch (error) {
      await settle("email", issue.key, recipient, error);
      failed++;
    }
  }
  return { status: "ran", sent, failed, more: due.length === EMAILS_PER_RUN };
}

/** The newest daily issue as the daily RSS feed has it. */
const latestIssue = async () => (await feedIssues("daily", 1))[0];

export async function deliverDaily(now = new Date(), load: () => Promise<FeedIssue | undefined> = latestIssue) {
  const time = beijingTime(now);
  if (time >= QUIET.from || time < QUIET.until) return { skipped: "quiet hours" };
  const issue = await load();
  // Only today's issue: a briefing that came out on an earlier day is not sent late.
  if (!issue || issue.key !== beijingDate(now)) return { skipped: "no issue today" };
  if (!issue.sections.length) return { skipped: "empty issue", key: issue.key };
  return { key: issue.key, telegram: await deliverTelegram(issue), email: await deliverEmail(issue) };
}

/** For the alerts: today's sends that failed for good. */
export async function failedToday(now = new Date()) {
  return sql<{ channel: string; n: number; error: string | null }[]>`
    SELECT channel, count(*)::int AS n, max(error) AS error FROM subscribe_deliveries
    WHERE report_key = ${beijingDate(now)} AND status = 'failed' AND attempts >= ${MAX_ATTEMPTS} GROUP BY channel`;
}
