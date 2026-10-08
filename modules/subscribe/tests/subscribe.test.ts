import "../../../tests/setup.ts";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import type { FeedIssue } from "@aihot/backend/publication/reports";
import { beijingAt } from "@aihot/contracts/time";
import { buildApp } from "../../../apps/api/src/app.ts";
import subscribeModule from "../server.ts";
import { deliverDaily } from "../backend/deliver.ts";
import { telegramPost } from "../backend/render.ts";
import { useMailer, type OutgoingMail } from "../backend/send.ts";
import { confirm, signUp, subscribeRetention, unsubscribe } from "../backend/subscribers.ts";

// A stand-in for the Telegram Bot API: records posts, refuses while `refuse` is set.
const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
let refuse = false;
const telegram = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    posts.push({ path: req.url ?? "", body: JSON.parse(raw || "{}") });
    res.setHeader("content-type", "application/json");
    if (refuse) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ ok: false, description: "Forbidden: bot is not a member of the channel chat" }));
    }
    res.end(JSON.stringify({ ok: true, result: { message_id: posts.length } }));
  });
});

const mails: OutgoingMail[] = [];
let mailFails = false;

before(async () => {
  await new Promise<void>((resolve) => telegram.listen(0, "127.0.0.1", resolve));
  Object.assign(process.env, {
    TELEGRAM_PUSH_ENABLED: "true",
    TELEGRAM_BOT_TOKEN: "123:test-token",
    TELEGRAM_CHANNEL_ID: "@daonnews_test",
    TELEGRAM_API_BASE: `http://127.0.0.1:${(telegram.address() as AddressInfo).port}`,
    EMAIL_PUSH_ENABLED: "true",
    SMTP_HOST: "smtp.invalid",
    MAIL_FROM: "DaON News <news@daon.cloud>",
  });
  useMailer(async (m) => {
    if (mailFails) throw new Error("550 mailbox unavailable");
    mails.push(m);
  });
});

beforeEach(async () => {
  posts.length = 0;
  mails.length = 0;
  refuse = false;
  mailFails = false;
  await sql`DELETE FROM subscribe_deliveries`;
  await sql`DELETE FROM subscribe_emails`;
});

after(async () => {
  useMailer(null);
  installModules([]);
  telegram.close();
  await closeDb();
});

const KEY = "2026-10-08";
const morning = beijingAt(KEY, "09:10");
const issue = (over: Partial<FeedIssue> = {}): FeedIssue => ({
  key: KEY,
  generatedAt: beijingAt(KEY, "09:00"),
  headline: "오픈AI, 새 모델 <공개>",
  leadParagraph: "요약 문단 & 설명",
  sections: [{ label: "모델 공개", items: [{ title: "A 모델 출시", link: "https://news.daon.cloud/items/a" }, { title: "B 업데이트", link: "https://news.daon.cloud/items/b" }] }],
  ...over,
});
const load = (i: FeedIssue = issue()) => async () => i;

async function subscriber(email: string) {
  await signUp({ email, consent: true, ip: `10.0.0.${mails.length + 1}`, userAgent: "test" });
  const [row] = await sql<{ token: string }[]>`SELECT token FROM subscribe_emails WHERE email = ${email.toLowerCase()}`;
  return row!.token;
}

test("the Telegram post escapes HTML, links each entry and counts what does not fit", () => {
  const text = telegramPost(issue());
  assert.match(text, /오픈AI, 새 모델 &lt;공개&gt;/);
  assert.match(text, /요약 문단 &amp; 설명/);
  assert.match(text, /<a href="https:\/\/news\.daon\.cloud\/items\/a">A 모델 출시<\/a>/);
  assert.match(text, /\/daily\/2026-10-08">전체 브리핑 보기/);
  const many = telegramPost(issue({ sections: [{ label: "많음", items: Array.from({ length: 200 }, (_, n) => ({ title: `긴 제목 ${"가".repeat(40)} ${n}`, link: `https://news.daon.cloud/items/${n}` })) }] }));
  assert.ok(many.length <= 4096, `${many.length}`);
  assert.match(many, /외 \d+건/);
});

test("sign-up needs consent and a valid address, and sends one confirmation mail", async () => {
  await assert.rejects(signUp({ email: "a@example.com", consent: false, ip: "1.1.1.1", userAgent: "t" }), /동의/);
  await assert.rejects(signUp({ email: "not-an-address", consent: true, ip: "1.1.1.2", userAgent: "t" }), /형식/);
  await signUp({ email: "Reader@Example.com", consent: true, ip: "1.1.1.3", userAgent: "t" });
  assert.equal(mails.length, 1);
  assert.equal(mails[0]!.to, "reader@example.com");
  assert.match(mails[0]!.text, /\/subscribe\/confirm\?token=/);
  // Asking again right away sends nothing more, and says the same.
  assert.deepEqual(await signUp({ email: "reader@example.com", consent: true, ip: "1.1.1.4", userAgent: "t" }), { ok: true });
  assert.equal(mails.length, 1);
  // A bot filling the hidden field is told it went fine; nothing is stored or sent.
  await signUp({ email: "bot@example.com", consent: true, trap: "http://spam", ip: "1.1.1.5", userAgent: "t" });
  assert.equal((await sql`SELECT 1 FROM subscribe_emails WHERE email = 'bot@example.com'`).length, 0);
  assert.equal(mails.length, 1);
});

test("one source is limited to three sign-ups in ten minutes", async () => {
  for (const n of [1, 2, 3]) await signUp({ email: `r${n}@example.com`, consent: true, ip: "2.2.2.2", userAgent: "same" });
  await assert.rejects(signUp({ email: "r4@example.com", consent: true, ip: "2.2.2.2", userAgent: "same" }), /너무 잦습니다/);
});

test("only confirmed subscribers get the briefing, once, with one-click unsubscribe", async () => {
  const confirmed = await subscriber("one@example.com");
  await subscriber("pending@example.com");
  assert.equal(await confirm(confirmed), true);
  assert.equal(await confirm("unknown"), false);
  mails.length = 0;

  const first = await deliverDaily(morning, load());
  assert.equal((first as { telegram: string }).telegram, "sent");
  assert.equal(posts.length, 1);
  assert.equal(posts[0]!.path, "/bot123:test-token/sendMessage");
  assert.equal(posts[0]!.body.chat_id, "@daonnews_test");
  assert.equal(posts[0]!.body.parse_mode, "HTML");
  assert.deepEqual(mails.map((m) => m.to), ["one@example.com"]);
  assert.match(mails[0]!.headers!["List-Unsubscribe"]!, /^<https?:\/\/.+\/api\/subscribe\/unsubscribe\?token=.+>$/);
  assert.equal(mails[0]!.headers!["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(mails[0]!.html, /수신거부/);

  await deliverDaily(new Date(morning.getTime() + 10 * 60_000), load());
  assert.equal(posts.length, 1, "the channel gets the issue once");
  assert.equal(mails.length, 1, "each subscriber gets the issue once");

  assert.equal(await unsubscribe(confirmed), true);
  assert.equal((await sql`SELECT 1 FROM subscribe_emails WHERE email = 'one@example.com'`).length, 0, "the address is deleted");
});

test("nothing goes out at night, for an earlier day's issue or for an empty one", async () => {
  assert.deepEqual(await deliverDaily(beijingAt(KEY, "07:50"), load()), { skipped: "quiet hours" });
  assert.deepEqual(await deliverDaily(beijingAt(KEY, "21:10"), load()), { skipped: "quiet hours" });
  assert.deepEqual(await deliverDaily(beijingAt("2026-10-09", "09:10"), load()), { skipped: "no issue today" });
  assert.deepEqual(await deliverDaily(morning, async () => undefined), { skipped: "no issue today" });
  assert.equal((await deliverDaily(morning, load(issue({ sections: [] }))) as { skipped?: string }).skipped, "empty issue");
  assert.equal(posts.length, 0);
});

test("a failed send is retried on the next runs, three attempts in all", async () => {
  refuse = true;
  for (let run = 0; run < 5; run++) await deliverDaily(new Date(morning.getTime() + run * 600_000), load());
  assert.equal(posts.length, 3);
  const [row] = await sql<{ status: string; attempts: number; error: string }[]>`SELECT status, attempts, error FROM subscribe_deliveries WHERE channel = 'telegram'`;
  assert.equal(row!.status, "failed");
  assert.equal(row!.attempts, 3);
  assert.doesNotMatch(row!.error, /test-token/, "the bot token never lands in the error");
  const alerts = await subscribeModule.alerts!(morning.getTime());
  assert.deepEqual(alerts.map((a) => a.key), ["subscribe.failed.telegram"]);
});

test("unconfirmed sign-ups are deleted after seven days", async () => {
  await subscriber("late@example.com");
  await sql`UPDATE subscribe_emails SET created_at = now() - interval '8 days'`;
  const result = await subscribeRetention(new Date());
  assert.equal(result.deletedPendingSubscribers, 1);
});

test("the api answers sign-up, confirmation and RFC 8058 one-click unsubscribe", async () => {
  installModules([subscribeModule]);
  const app = await buildApp();
  try {
    const info = await app.inject({ method: "GET", url: "/api/subscribe/info" });
    assert.deepEqual(info.json(), { telegramUrl: "https://t.me/daonnews_test", email: true });

    const signed = await app.inject({ method: "POST", url: "/api/subscribe", headers: { "x-real-ip": "3.3.3.3" }, payload: { email: "api@example.com", consent: true } });
    assert.equal(signed.statusCode, 202);
    const [row] = await sql<{ token: string }[]>`SELECT token FROM subscribe_emails WHERE email = 'api@example.com'`;
    const refused = await app.inject({ method: "POST", url: "/api/subscribe", headers: { "x-real-ip": "3.3.3.4" }, payload: { email: "x@example.com" } });
    assert.equal(refused.statusCode, 400);

    assert.equal((await app.inject({ method: "POST", url: "/api/subscribe/confirm", payload: { token: "nope" } })).statusCode, 404);
    assert.equal((await app.inject({ method: "POST", url: "/api/subscribe/confirm", payload: { token: row!.token } })).statusCode, 200);

    const oneClick = await app.inject({
      method: "POST",
      url: `/api/subscribe/unsubscribe?token=${encodeURIComponent(row!.token)}`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "List-Unsubscribe=One-Click",
    });
    assert.equal(oneClick.statusCode, 200);
    assert.equal((await sql`SELECT 1 FROM subscribe_emails WHERE email = 'api@example.com'`).length, 0);
  } finally {
    await app.close();
  }
});
