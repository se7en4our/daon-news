// Operations alerts. The person reading them is the site owner, not an engineer: each
// message says what readers see, whether it heals by itself and what, if anything, the owner must do.
//   now   — readers are affected and it has not healed: sent at once, repeated hourly, recovery reported.
//   today — money at risk or only the owner can act: sent at once, repeated at most daily, recovery reported.
//   later — other follow-ups: one 09:00 message a day, meant to be handed to the AI.
// A site's responder (modules.ts) filters findings for the owner, preserving repeat and recovery
// tracking for messages it returns and replacing the default digest policy.
// Delivery goes through sendAlert (ops chat, internal-chat fallback; off unless FEISHU_INTERNAL_ENABLED).
import { beijingAt, beijingDate } from "@aihot/contracts/time";
import { ALERTS, EDITION_TIMES } from "@aihot/site";
import { sql } from "../db.ts";
import { beijingDay, beijingStamp, duration, formatAlert, formatRecovery, sendAlert, type Finding, type Level } from "../notify/feishu.ts";
import { stepsOnService } from "../editorial/models.ts";
import { backupConfigured } from "./backup.ts";
import { GROUPING_WARN_AFTER_MS, waitingSelectedNews } from "./grouping.ts";
import { upstreamFindings } from "../media/upstream.ts";
import { responder, serverModules } from "../modules.ts";
import { sourceHealth, sourceHealthList } from "../sources/health.ts";

const REPEAT_MS: Record<Exclude<Level, "later">, number> = { now: 3600_000, today: 24 * 3600_000 };

// Valves default off: read at call time, only an explicit "true" turns them on.
const collecting = () => process.env.COLLECT_ENABLED === "true";
const modelsOn = () => process.env.MODEL_CALLS_ENABLED === "true";
/**
 * How long the site may go without a new article before it counts as stalled (ALERT_QUIET_MINUTES, else
 * the site's own setting; small source lists are quieter). At most a day: the check looks one day back.
 */
const QUIET_MINUTES = Math.min(Number(process.env.ALERT_QUIET_MINUTES || ALERTS.quietMinutes), 1440);

/** Everything wrong right now, with its level. */
export async function collectFindings(now = Date.now()): Promise<Finding[]> {
  const out: Finding[] = [];

  // Readers affected now
  // Content flow, judged by outcome: whatever broke (worker, egress proxy, models, queues), readers see
  // a site that stops changing. Skipped for 20 minutes after the worker starts, and where the valves are off.
  const [hb] = await sql<{ value: { startedAt?: string } }[]>`SELECT value FROM settings WHERE key = 'heartbeat.worker'`;
  const settled = !hb?.value.startedAt || now - Date.parse(hb.value.startedAt) > 20 * 60_000;
  if (settled && collecting()) {
    const [last] = await sql<{ at: Date | null }[]>`SELECT max(a.discovered_at) AS at FROM articles a
      JOIN sources s ON s.id = a.source_id WHERE s.participation_mode = 'editorial' AND a.discovered_at > now() - interval '1 day'`;
    if (!last?.at || now - last.at.getTime() > QUIET_MINUTES * 60_000) {
      // A site without an enabled source has nothing to collect.
      const [anySource] = await sql`SELECT 1 FROM sources WHERE enabled AND participation_mode = 'editorial' LIMIT 1`;
      if (anySource) {
        out.push({
          key: "content.collect",
          level: "now",
          title: "사이트가 새 기사 수집을 멈췄습니다",
          impact: last?.at ? `독자가 새 기사를 볼 수 없습니다: 마지막 수집은 ${beijingStamp(last.at)}` : "독자가 새 기사를 볼 수 없습니다: 하루 동안 수집된 기사가 없습니다",
          heals: ALERTS.usualFlow ? `아니요, ${ALERTS.usualFlow}` : "아니요",
          action: "가능한 한 빨리 유지보수 처리를 한 번 실행하세요",
          detail: `editorial articles.discovered_at 가 ${QUIET_MINUTES}분 넘게 새 값이 없습니다(열기 신호는 별도 평가). sources.schedule, 아웃바운드 프록시, 수집 실패를 확인하세요`,
          since: last?.at ?? undefined,
        });
      }
    }
  }
  if (settled && collecting() && modelsOn()) {
    const waiting = (await waitingSelectedNews()).filter((item) => now - item.since.getTime() >= GROUPING_WARN_AFTER_MS);
    if (waiting.length) {
      const manual = waiting.filter((item) => item.recovery === "manual").length;
      const receipt = waiting.some((item) => item.recovery === "receipt");
      out.push({
        key: "content.grouping",
        level: "now",
        title: "엄선 뉴스가 중복 제거 확인에 막혀 아직 미발행 상태입니다",
        impact: `엄선 조건을 충족한 뉴스 ${waiting.length}건이 10분 넘게 확인을 기다리며 아직 엄선에 들지 못해, 독자가 이 업데이트를 늦게 볼 수 있습니다`,
        heals: manual ? `${manual}건은 수동 처리 후에야 복구됩니다${manual < waiting.length ? ". 나머지는 자동 복구 중입니다" : ""}`
          : receipt ? "자동 복구를 계속 대기 중입니다. 유료 결과가 불확실한 요청은 30분 뒤 한 번 자동으로 통과됩니다" : "자동 재시도되지만 대기가 이미 정상 범위를 넘었습니다",
        action: manual ? "AI 에게 넘겨 처리하세요. 결과가 불확실한 유료 요청은 과금과 결과를 먼저 대조한 뒤 통과 여부를 결정하세요" : "AI 에게 넘겨 대기 원인을 점검해 적체가 계속되지 않도록 하세요",
        detail: waiting.slice(0, 8).map((item) => `${item.articleId}(${duration(now - item.since.getTime())})${item.receiptId ? ` 영수증 #${item.receiptId}` : ""}${item.error ? `: ${item.error.slice(0, 120)}` : ""}`).join(", "),
        since: waiting[0]!.since,
      });
    }
    const [p] = await sql<{ waiting: number; oldest: Date | null; failed: number }[]>`
      SELECT count(*) FILTER (WHERE processing_state = 'new' AND discovered_at < now() - interval '2 hours')::int AS waiting,
             min(discovered_at) FILTER (WHERE processing_state = 'new') AS oldest,
             count(*) FILTER (WHERE processing_state = 'failed' AND discovered_at > now() - interval '3 hours')::int AS failed
      FROM articles WHERE processing_state IN ('new', 'failed') AND discovered_at > now() - interval '2 days'`;
    if (p!.waiting >= 10 || p!.failed >= 20) {
      const errors = await sql<{ error: string; n: number }[]>`
        SELECT left(coalesce(processing_error, '(없음)'), 120) AS error, count(*)::int AS n FROM articles
        WHERE processing_state IN ('new', 'failed') AND discovered_at > now() - interval '3 hours' AND processing_error IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 3`;
      out.push({
        key: "content.process",
        level: "now",
        title: "새 콘텐츠가 막혀 사이트에 올라오지 못합니다",
        impact: [p!.waiting >= 10 && `새 기사 ${p!.waiting}건이 2시간 넘게 처리되지 못했습니다`, p!.failed >= 20 && `최근 3시간 동안 새 기사 ${p!.failed}건이 처리에 실패했습니다`]
          .filter(Boolean)
          .join(", ") + ". 엄선과 핫이슈에 콘텐츠가 비게 됩니다",
        heals: p!.waiting >= 10 ? "서비스가 복구되면 자동으로 밀린 처리를 보충합니다" : "아니요. 복구한 뒤 이 기사들을 다시 처리해야 합니다",
        action: "AI 에게 넘겨 처리하세요",
        detail: errors.map((e) => `${e.error}(${e.n})`).join(", ") || "기록된 오류가 없습니다",
        since: p!.waiting >= 10 && p!.oldest ? p!.oldest : undefined,
      });
    }
    // The daily report is composed from its edition time, and tried again every half hour until it exists:
    // two hours later it is overdue.
    if (now >= beijingAt(beijingDate(now), EDITION_TIMES.daily).getTime() + 2 * 3600_000) {
      const [r] = await sql`SELECT 1 FROM reports WHERE kind = 'daily' AND key = ${beijingDate(now)}`;
      if (!r) {
        out.push({
          key: "report.daily",
          level: "now",
          title: "오늘의 데일리 브리핑이 아직 생성되지 않았습니다",
          impact: "독자가 오늘의 데일리 브리핑을 볼 수 없습니다",
          heals: "시스템이 30분마다 재시도하지만 아직 성공하지 못했습니다",
          action: "가능한 한 빨리 유지보수 처리를 한 번 실행하세요",
          detail: `reports daily ${beijingDate(now)} 가 없습니다. reports.compose 의 실행 기록을 확인하세요`,
        });
      }
    }
  }

  // Money, and things only the owner can do
  out.push(...(await providerFindings()));

  // Content-group pushes the Feishu webhook refused (a removed bot, a changed address); nothing resends them.
  const [refused] = await sql<{ n: number; target: string | null; response: string | null }[]>`
    SELECT count(*)::int AS n, max(t.note) AS target, left(max(d.response), 200) AS response FROM deliveries d JOIN notify_targets t ON t.key = d.target_key
    WHERE d.status = 'failed' AND d.updated_at > now() - interval '1 day'`;
  if (refused!.n > 0) {
    out.push({
      key: "deliveries.failed",
      level: "today",
      title: "Feishu 콘텐츠 그룹에 발송되지 못한 푸시가 있습니다",
      impact: `지난 24시간 동안 알림 ${refused!.n}건이 ${refused!.target ?? "콘텐츠 그룹"}에 들어가지 못했습니다`,
      heals: "자동으로 재발송되지 않습니다",
      action: "AI 에게 넘겨 처리하세요. 푸시 봇이 그룹에서 제외됐다면 다시 추가해야 합니다",
      detail: refused!.response ?? "",
    });
  }

  if (backupConfigured()) {
    const [b] = await sql<{ value: { at: string; uploaded: boolean; filesError?: string } }[]>`SELECT value FROM settings WHERE key = 'backup.last'`;
    // A failed archive updates backup.last too. Reuse the run history so repeated failures cannot
    // reset the age; before the first success, count from the first attempt rather than from now.
    const [runs] = await sql<{ last_ok: Date | null; first_attempt: Date | null }[]>`
      SELECT max(finished_at) FILTER (WHERE status = 'ok') AS last_ok, min(started_at) AS first_attempt
      FROM job_runs WHERE job = 'ops.backup'`;
    const lastOk = Math.max(runs?.last_ok?.getTime() ?? 0, b?.value.uploaded ? Date.parse(b.value.at) : 0);
    const since = lastOk || runs?.first_attempt?.getTime() || now;
    const age = now - since;
    const state = b?.value.filesError ? `데이터베이스는 업로드됐으나 첨부 패키징 실패: ${b.value.filesError}` : b?.value.uploaded === false ? "미업로드" : "";
    if (age > 50 * 3600_000) {
      out.push({
        key: "backup.failed",
        level: "today",
        title: "데이터베이스 백업이 이틀 연속 성공하지 못했습니다",
        impact: lastOk ? `서버에 문제가 생기면 최근 ${duration(age)} 치 데이터가 완전히 복구되지 않을 수 있습니다` : "아직 성공한 전체 백업이 없어, 서버 장애 시 데이터를 복구하지 못할 수 있습니다",
        heals: "아니요",
        action: "AI 에게 넘겨 처리하세요",
        detail: `${lastOk ? "최근 성공" : "최초 백업 시도"} ${beijingStamp(since)}${state ? `. ${state}` : ""}. ops.backup 의 실행 기록을 확인하세요`,
        since: new Date(since),
      });
    } else if (!b || !b.value.uploaded || age > 30 * 3600_000) {
      out.push({ key: "backup.stale", level: "later", title: "데이터베이스 백업이 하루 넘게 성공하지 못했습니다", detail: b ? `최근 ${beijingStamp(b.value.at)}${state ? `(${state})` : ""}. ops.backup 확인` : "아직 성공한 백업 기록이 없습니다" });
    }
  }

  out.push(...(await upstreamFindings(now)));

  // What the site's modules find.
  for (const m of serverModules()) if (m.alerts) out.push(...(await m.alerts(now)));

  // Follow-ups
  if (collecting()) {
    for (const group of await sourceHealth(now)) {
      if (group.failing.length) out.push({
        key: `sources.failing.${group.mode}`, level: "later", title: `${group.name} 소식원 ${group.failing.length}곳이 연속으로 수집에 실패했습니다`,
        detail: sourceHealthList(group.failing, s => `연속 실패 ${s.fail_count}회${s.last_error ? `, ${s.last_error}` : ""}`) + ". AI 에게 넘겨 수집 오류를 점검하세요",
      });
      if (group.unstable.length) out.push({
        key: `sources.unstable.${group.mode}`, level: "later", title: `${group.name} 소식원 ${group.unstable.length}곳이 반복적으로 수집에 실패했습니다`,
        detail: sourceHealthList(group.unstable, s => `최근 7일 ${s.failed}/${s.runs}회 실패`) + ". 최근 성공했더라도 누락이 이어지지 않도록 점검이 필요합니다",
      });
      if (group.silent.length) out.push({
        key: `sources.silent.${group.mode}`, level: "later", title: `${group.name} 소식원 ${group.silent.length}곳이 7일간 새 콘텐츠를 발견하지 못했습니다`,
        detail: sourceHealthList(group.silent, s => `최근 7일 ${s.runs}회 수집, 새 발견 0건`) + ". 원본 사이트와 대조해 저빈도 갱신인지 수집 실패인지 구분해야 합니다",
      });
      if (group.quality.length) out.push({
        key: `sources.quality.${group.mode}`, level: "later", title: `${group.name} 소식원 ${group.quality.length}곳의 기사 품질 확인이 필요합니다`,
        detail: sourceHealthList(group.quality, s => `최근 7일 발행 시각 누락 ${s.undated}건, 반복 수정 ${s.repeated}건`) + ". 시각이 없으면 뉴스를 과거 기사로 처리할 수 있고, 반복 수정은 본문에 변경 내용이 섞였는지 대조가 필요합니다",
      });
      if (group.detailFailures.length) out.push({
        key: `sources.details.${group.mode}`, level: "later", title: `${group.name} 소식원 ${group.detailFailures.length}곳의 상세 보완에 실패했습니다`,
        detail: sourceHealthList(group.detailFailures, s => `최근 7일 ${s.detail_failures}회`) + ". 수집 기록의 상세 주소와 오류를 확인하세요",
      });
    }
  }
  const [r] = await sql<{ receipts: number; services: string | null; deliveries: number }[]>`
    SELECT (SELECT count(*)::int FROM receipts WHERE status = 'unknown') AS receipts,
           (SELECT string_agg(DISTINCT service || '/' || purpose, ', ') FROM receipts WHERE status = 'unknown') AS services,
           (SELECT count(*)::int FROM deliveries WHERE status = 'unknown') AS deliveries`;
  if (r!.receipts > 0) {
    out.push({ key: "receipts.unknown", level: "later", title: `유료 요청 ${r!.receipts}건의 결과가 아직 확인되지 않았습니다`, detail: `${r!.services}. 콘텐츠 처리에 영향을 줄 수 있습니다. 관리자 '실행' 페이지에서 영향을 확인하고, 자동 복구 후에도 불확실한 요청은 대조 후 통과시키세요` });
  }
  if (r!.deliveries > 0) out.push({ key: "deliveries.unknown", level: "later", title: `Feishu 콘텐츠 그룹 푸시 ${r!.deliveries}건의 전달 여부가 불확실합니다`, detail: "관리자 '실행' 페이지에서 그룹에 도착했는지 대조한 뒤 표시하거나 재발송하세요" });

  // Runnable jobs (deferred ones excluded) that have waited more than two hours.
  const queues = await sql<{ name: string; n: number; oldest: Date }[]>`
    SELECT name, count(*)::int AS n, min(start_after) AS oldest FROM pgboss.job
    WHERE state IN ('created', 'retry') AND start_after <= now() AND name NOT LIKE 'cron.%' GROUP BY 1`;
  for (const q of queues) {
    if (now - q.oldest.getTime() > 2 * 3600_000) {
      out.push({ key: `queue.${q.name}`, level: "later", title: `백그라운드 작업이 2시간 넘게 대기 중입니다: ${q.name}`, detail: `${q.n}개 대기, 가장 오래된 것은 ${duration(now - q.oldest.getTime())} 대기` });
    }
  }

  // The site's modules' follow-ups.
  for (const m of serverModules()) if (m.followUps) out.push(...(await m.followUps(now)));
  return out;
}

/** What stops when a model service refuses us: the steps that default to its models, else a pointer to the admin. */
function modelStops(service: string): string {
  const steps = stepsOnService(service);
  return steps.length ? `${steps.join(", ")} 단계가 멈췄습니다` : "이 모델을 쓰는 단계가 멈췄습니다(관리자 '모델과 평가' 확인). 새 콘텐츠가 엄선에 들지 못할 수 있습니다";
}
/** `stops` is for the services that are not models; a model service's follows from the steps that use it. */
const PROVIDERS: Record<string, { name: string; where: string; stops?: string }> = {
  llm: { name: "기본 모델 서비스", where: "모델 서비스 제공사 콘솔" },
  zhipu: { name: "Zhipu", where: "Zhipu 오픈 플랫폼" },
  dashscope: { name: "Alibaba Cloud Bailian", where: "Alibaba Cloud Bailian 콘솔" },
  deepseek: { name: "DeepSeek", where: "DeepSeek 오픈 플랫폼" },
  mimo: { name: "Xiaomi MiMo", where: "Xiaomi MiMo 오픈 플랫폼" },
  socialdata: { name: "SocialData", stops: "X(트위터)의 새 콘텐츠를 받지 못합니다", where: "SocialData 관리자" },
  jina: { name: "Jina", stops: "일부 기사의 본문을 가져오지 못합니다", where: "Jina 관리자" },
  dajiala: { name: "Dajiala", stops: "위챗 공식계정의 새 기사를 받지 못합니다", where: "Dajiala 관리자" },
};
export const providerName = (service: string) => PROVIDERS[service]?.name ?? service;
export const providerStops = (service: string) => {
  const p = PROVIDERS[service];
  return p ? (p.stops ?? modelStops(service)) : "관련 기능이 멈췄습니다";
};
export const providerConsole = (service: string) => PROVIDERS[service]?.where ?? `${service} 관리자`;

/** Paid services that refuse us (no balance, a dead key), and daily budgets used up. */
async function providerFindings(): Promise<Finding[]> {
  const out: Finding[] = [];
  const refused = await sql<{ service: string; n: number; last: string }[]>`
    SELECT service, count(*)::int AS n, (array_agg(left(error, 200) ORDER BY started_at DESC))[1] AS last FROM receipt_attempts
    WHERE status = 'failed' AND started_at > now() - interval '1 hour'
      AND error ~* '(HTTP 40[123]\\M|insufficient|balance|arrear|good standing|欠费|余额)'
    GROUP BY 1 HAVING count(*) >= 3`;
  for (const p of refused) {
    out.push({
      key: `provider.refused.${p.service}`,
      level: "today",
      owner: true,
      title: `${providerName(p.service)} 가 서비스를 거부합니다. 요금 미납이나 계정 비활성화일 수 있습니다`,
      impact: providerStops(p.service),
      heals: "아니요",
      action: `${providerConsole(p.service)}에서 잔액과 계정 상태를 확인하세요. 충전하거나 복구하면 시스템이 자동으로 재개합니다. 둘 다 정상이면 유지보수를 실행해 원인을 확인하세요`,
      detail: `최근 1시간 동안 ${p.n}회 거부됨: ${p.last}`,
    });
  }
  const capped = await sql<{ service: string; per_day: number; used: number }[]>`
    SELECT b.service, b.per_day, count(a.id)::int AS used FROM budgets b
    JOIN receipt_attempts a ON a.service = b.service AND a.origin = 'live' AND a.started_at > now() - interval '1 day'
    WHERE b.per_day > 0 GROUP BY 1, 2 HAVING count(a.id) >= b.per_day`;
  for (const c of capped) {
    out.push({
      key: `budget.day.${c.service}`,
      level: "later",
      title: `${providerName(c.service)} 의 지난 24시간 호출 한도를 소진했습니다`,
      impact: `${providerStops(c.service)}. 한도가 시간에 따라 다시 생길 때까지 지속됩니다`,
      heals: "네, 한도는 24시간 롤링으로 복구됩니다",
      action: "이번에는 처리할 필요가 없습니다. 자주 발생하면 한도 상향을 검토하세요",
      detail: `24시간 내 ${c.used}회, 상한 ${c.per_day}(budgets 테이블)`,
    });
  }
  return out;
}

interface AlertState {
  [key: string]: { title: string; since: string; sentAt: string };
}

/**
 * Every 10 minutes: new problems and recoveries of the now/today levels go out; follow-ups wait for 09:00.
 * With a responder, only what it hands back goes out, and what it still holds is not reported as recovered.
 */
export async function checkAlerts(now = Date.now()) {
  const all = await collectFindings(now);
  const r = responder();
  const { tell, held } = r ? await r.take(all, now) : { tell: all, held: [] as string[] };
  const found = tell.filter((f) => f.level !== "later");
  const [row] = await sql<{ value: AlertState }[]>`SELECT value FROM settings WHERE key = 'alerts.state'`;
  const state: AlertState = { ...(row?.value ?? {}) };
  const sent: string[] = [];
  for (const f of found) {
    const open = state[f.key];
    if (open && now - Date.parse(open.sentAt) <= REPEAT_MS[f.level as Exclude<Level, "later">]) continue;
    const since = open ? new Date(open.since) : (f.since ?? new Date(now));
    const msg = formatAlert(f, since, now, !!open);
    await sendAlert(msg.title, msg.lines);
    state[f.key] = { title: f.title, since: since.toISOString(), sentAt: new Date(now).toISOString() };
    sent.push(f.key);
  }
  for (const [key, open] of Object.entries(state)) {
    if (found.some((f) => f.key === key) || held.includes(key)) continue;
    const msg = formatRecovery(open.title, new Date(open.since), now);
    await sendAlert(msg.title, msg.lines);
    sent.push(`${key}:recovered`);
    delete state[key];
  }
  await sql`INSERT INTO settings (key, value, updated_by) VALUES ('alerts.state', ${sql.json(state as never)}, 'alerts')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  return { open: Object.keys(state), sent };
}

/** 09:00 (without a responder): one message with the follow-ups; nothing when there are none. */
export async function sendDigest(now = Date.now()) {
  const items = (await collectFindings(now)).filter((f) => f.level === "later");
  const lines = items.map((f, i) => `${i + 1}. ${f.title}${f.detail ? `\n   ${f.detail}` : ""}`);
  if (!lines.length) return { items: 0 };
  await sendAlert(`📋 시스템 데일리 브리핑 · ${beijingDay(now)}`, ["아래 사항은 후속 조치가 필요합니다. 구체적 영향은 각 항목 설명을 참고하세요. 항목 전체를 AI 에게 넘겨 처리할 수 있습니다.", ...lines]);
  return { items: lines.length };
}
