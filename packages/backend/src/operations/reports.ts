// The Monday source-health report for the ops chat. It goes through the same gated channel as the
// alerts (off unless FEISHU_INTERNAL_ENABLED).
import { sql } from "../db.ts";
import { sendAlert } from "../notify/feishu.ts";
import { serverModules } from "../modules.ts";
import { sourceHealth, sourceHealthList } from "../sources/health.ts";

/** The change from b to a: "+12%", "—" without a b. Also the modules' reports. */
export const pct = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${(((a - b) / b) * 100).toFixed(0)}%` : "—");
/** A count with thousands separators. */
export const n = (v: number) => v.toLocaleString("en-US");

/** Monday 09:00: how the sources did over the last seven days. */
export async function sourceHealthWeekly(now = Date.now()) {
  const since = new Date(now - 7 * 86400_000);
  const before = new Date(now - 14 * 86400_000);
  const [[counts], [items], groups] = await Promise.all([
    sql<{ enabled: number; failing: number; degraded: number; added: number }[]>`
      SELECT count(*) FILTER (WHERE enabled)::int AS enabled,
             count(*) FILTER (WHERE enabled AND health = 'failing')::int AS failing,
             count(*) FILTER (WHERE enabled AND health = 'degraded')::int AS degraded,
             count(*) FILTER (WHERE created_at >= ${since})::int AS added
      FROM sources`,
    sql<{ week: number; prev: number; selected: number }[]>`
      SELECT count(*) FILTER (WHERE discovered_at >= ${since})::int AS week,
             count(*) FILTER (WHERE discovered_at >= ${before} AND discovered_at < ${since})::int AS prev,
             (SELECT count(*)::int FROM publications p WHERE p.selected AND p.visibility <> 'withdrawn' AND p.discovered_at >= ${since}) AS selected
      FROM articles WHERE discovered_at >= ${before}`,
    sourceHealth(now),
  ]);
  const lines = [
    `이번 주 수집 ${n(items!.week)}건(지난주 ${n(items!.prev)}, ${pct(items!.week, items!.prev)}), 그중 엄선 ${n(items!.selected)}건`,
    `사용 중 소식원 ${counts!.enabled}곳, 이번 주 신규 ${counts!.added}곳. 수집 실패 ${counts!.failing}곳, 불안정 ${counts!.degraded}곳`,
  ];
  // The modules' own collectors, a line each.
  for (const m of serverModules()) if (m.sourceHealth) lines.push(...(await m.sourceHealth(now)));
  for (const group of groups) {
    lines.push("", `${group.name}: 사용 중 소식원 ${group.sources.length}곳. 이번 주 귀속 항목 ${n(group.sources.reduce((sum, s) => sum + s.items, 0))}건. 연속 실패 ${group.failing.length}곳, 반복 실패 ${group.unstable.length}곳, 7일간 새 발견 없음 ${group.silent.length}곳`);
    if (group.failing.length) lines.push(`수집 실패: ${sourceHealthList(group.failing, s => `연속 실패 ${s.fail_count}회${s.last_error ? `(${s.last_error})` : ""}`, Infinity)}`);
    if (group.unstable.length) lines.push(`불안정: ${sourceHealthList(group.unstable, s => `실패 ${s.failed}/${s.runs}회`, Infinity)}`);
    if (group.silent.length) lines.push(`7일간 새 발견 없음(원본 사이트와 대조 필요, 단순 저빈도 갱신일 수 있음): ${sourceHealthList(group.silent, s => `${s.runs}회 수집`, Infinity)}`);
    if (group.quality.length) lines.push(`기사 품질 확인 필요: ${sourceHealthList(group.quality, s => `발행 시각 누락 ${s.undated}건, 반복 수정 ${s.repeated}건`, Infinity)}`);
    if (group.detailFailures.length) lines.push(`상세 보완 실패: ${sourceHealthList(group.detailFailures, s => `${s.detail_failures}회`, Infinity)}`);
  }
  const failing = counts!.failing;
  const silent = groups.reduce((sum, g) => sum + g.silent.length, 0);
  const followUp = counts!.failing > 0 || groups.some(g => g.failing.length || g.unstable.length || g.silent.length || g.quality.length || g.detailFailures.length);
  lines.push("", followUp ? "처리가 필요하면 이 항목을 AI 에게 넘기세요. 자세한 내용은 관리자 '소식원'과 '실행' 페이지에 있습니다." : "처리가 필요한 소식원이 없습니다.");
  await sendAlert("📊 소식원 주간 리포트", lines);
  return { failing, silent };
}
