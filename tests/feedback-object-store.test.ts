// daon-news: with the object store configured, feedback screenshots live there (s3:<name>), not on a volume.
import "./setup.ts";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { eraseFeedback, feedbackScreenshotData } from "@aihot/backend/admin/feedback";
import { submitFeedback } from "@aihot/backend/operations/feedback";
import { dailyRetention } from "@aihot/backend/operations/retention";
import sharp from "sharp";

// A stand-in for the S3-compatible store: path-style, objects kept in memory.
const objects = new Map<string, { body: Buffer; type: string; auth: string }>();
const store = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const key = decodeURIComponent(req.url ?? "");
    if (req.method === "PUT") {
      objects.set(key, { body: Buffer.concat(chunks), type: String(req.headers["content-type"]), auth: String(req.headers.authorization) });
      return res.end();
    }
    if (req.method === "DELETE") {
      objects.delete(key);
      res.statusCode = 204;
      return res.end();
    }
    const hit = objects.get(key);
    res.statusCode = hit ? 200 : 404;
    res.end(hit?.body);
  });
});

before(async () => {
  await new Promise<void>((resolve) => store.listen(0, "127.0.0.1", resolve));
  Object.assign(process.env, {
    DB_BACKUP_STORE_SECRET_ID: "test-access-key", DB_BACKUP_STORE_SECRET_KEY: "test-secret-key",
    DB_BACKUP_STORE_BUCKET: "daon-news", DB_BACKUP_STORE_REGION: "ap-chuncheon-1",
    DB_BACKUP_STORE_DOMAIN: `http://127.0.0.1:${(store.address() as AddressInfo).port}/daon-news`,
    FEISHU_INTERNAL_ENABLED: "false",
  });
});

after(async () => {
  for (const key of Object.keys(process.env)) if (key.startsWith("DB_BACKUP_STORE_")) delete process.env[key];
  store.close();
  await closeDb();
});

const png = () => sharp({ create: { width: 8, height: 8, channels: 3, background: "#336699" } }).png().toBuffer();

test("a screenshot goes to the object store, is served from it, and is deleted on erase", async () => {
  const data = await png();
  const { id } = await submitFeedback({ content: "화면이 깨집니다", screenshot: { mime: "image/png", data }, ip: "9.9.9.1", userAgent: "t" });
  const [row] = await sql<{ screenshot_key: string }[]>`SELECT screenshot_key FROM feedback WHERE id = ${id}`;
  assert.match(row!.screenshot_key, /^s3:[\w-]+\.png$/);
  const key = `/daon-news/feedback-screenshots/${row!.screenshot_key.slice(3)}`;
  assert.deepEqual(objects.get(key)?.body, data);
  assert.equal(objects.get(key)?.type, "image/png");
  assert.match(objects.get(key)!.auth, /^AWS4-HMAC-SHA256 Credential=test-access-key\/\d{8}\/ap-chuncheon-1\/s3\/aws4_request/);

  assert.deepEqual(await feedbackScreenshotData(id), { data, mime: "image/png" });
  await eraseFeedback(id, "요청에 따른 삭제", "test");
  assert.equal(objects.has(key), false);
  assert.equal(await feedbackScreenshotData(id), null);
});

test("year-old feedback takes its stored screenshot with it", async () => {
  const { id } = await submitFeedback({ content: "오래된 피드백", screenshot: { mime: "image/png", data: await png() }, ip: "9.9.9.2", userAgent: "t" });
  const [row] = await sql<{ screenshot_key: string }[]>`SELECT screenshot_key FROM feedback WHERE id = ${id}`;
  const key = `/daon-news/feedback-screenshots/${row!.screenshot_key.slice(3)}`;
  assert.ok(objects.has(key));
  await sql`UPDATE feedback SET created_at = now() - interval '366 days' WHERE id = ${id}`;
  await dailyRetention();
  assert.equal(objects.has(key), false);
});
