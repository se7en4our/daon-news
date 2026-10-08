// Subscriptions to the daily briefing: a Telegram channel post and confirmed email subscribers, both sent
// once today's issue is out (backend/deliver.ts).
import type { FastifyReply } from "fastify";
import { defineServerModule } from "@aihot/backend/modules";
import { smtpConfig, telegramChannelUrl, telegramConfig } from "./backend/config.ts";
import { deliverDaily, failedToday } from "./backend/deliver.ts";
import { confirm, signUp, SubscribeRejected, subscribeRetention, unsubscribe } from "./backend/subscribers.ts";

const problem = (reply: FastifyReply, status: number, code: string, detail: string, retryAfter?: number) => {
  if (retryAfter) reply.header("Retry-After", String(retryAfter));
  return reply.code(status).header("Cache-Control", "no-store").type("application/problem+json").send({ status, code, detail });
};

const tokenOf = (body: unknown, query: unknown) =>
  String((body as { token?: unknown } | null)?.token ?? (query as { token?: unknown } | null)?.token ?? "").slice(0, 100);

export default defineServerModule({
  name: "subscribe",
  http(app) {
    void app.register(async (scope) => {
      // One-click unsubscribe (RFC 8058) posts "List-Unsubscribe=One-Click" as a form.
      scope.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string", bodyLimit: 4096 }, (_req, body, done) =>
        done(null, Object.fromEntries(new URLSearchParams(String(body)))),
      );

      scope.get("/api/subscribe/info", async (_req, reply) =>
        reply.header("Cache-Control", "public, max-age=300").send({ telegramUrl: telegramChannelUrl(), email: smtpConfig() !== null }),
      );

      scope.post("/api/subscribe", { bodyLimit: 4096 }, async (req, reply) => {
        const b = (req.body ?? {}) as Record<string, unknown>;
        try {
          const result = await signUp({
            email: String(b.email ?? ""),
            consent: b.consent === true || b.consent === "true",
            trap: String(b.website ?? ""),
            ip: String(req.headers["x-real-ip"] ?? req.ip ?? ""),
            userAgent: String(req.headers["user-agent"] ?? ""),
          });
          return reply.header("Cache-Control", "no-store").code(202).send(result);
        } catch (error) {
          if (error instanceof SubscribeRejected) return problem(reply, error.status, error.code, error.message, error.retryAfter);
          req.log.error({ err: error }, "subscribe failed");
          return problem(reply, 503, "temporarily_unavailable", "지금은 신청할 수 없습니다. 잠시 후 다시 시도하세요.", 60);
        }
      });

      scope.post("/api/subscribe/confirm", { bodyLimit: 4096 }, async (req, reply) =>
        (await confirm(tokenOf(req.body, req.query)))
          ? reply.header("Cache-Control", "no-store").send({ status: "active" })
          : problem(reply, 404, "not_found", "확인 링크가 올바르지 않거나 만료되었습니다. 다시 신청해 주세요."),
      );

      // Answers the same whether or not the token was known: unsubscribing twice is fine.
      scope.post("/api/subscribe/unsubscribe", { bodyLimit: 4096 }, async (req, reply) => {
        await unsubscribe(tokenOf(req.body, req.query));
        return reply.header("Cache-Control", "no-store").send({ status: "unsubscribed" });
      });
    });
  },
  schedules: [
    {
      name: "subscribe.deliver",
      cron: "*/10 * * * *",
      run: () => deliverDaily(),
      when: () => telegramConfig() !== null || smtpConfig() !== null,
    },
  ],
  retention: subscribeRetention,
  async alerts(now) {
    return (await failedToday(new Date(now))).map((f) => ({
      key: `subscribe.failed.${f.channel}`,
      level: "today" as const,
      title: f.channel === "telegram" ? "오늘 데일리 브리핑을 텔레그램 채널에 올리지 못했습니다" : `오늘 데일리 브리핑 이메일 ${f.n}건을 보내지 못했습니다`,
      impact: "구독자가 오늘 브리핑을 받지 못했습니다.",
      action: f.channel === "telegram" ? "봇 토큰과 채널 관리자 권한을 확인하세요." : "SMTP 설정과 발신 도메인 인증을 확인하세요.",
      detail: f.error ?? undefined,
    }));
  },
});
