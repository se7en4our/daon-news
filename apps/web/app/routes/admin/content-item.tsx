import { SITE } from "@aihot/site";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import type { Route } from "./+types/content-item";
import type { AdminContentChain } from "@aihot/contracts/admin";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { bj, money } from "../../features/admin/format";
import { KIND_LABEL, MODE_LABEL, VISIBILITY_LABEL } from "../../features/admin/labels";
import { AdminPage, Badge, Button, Card, Empty, Field, Input, Json, KV, ReasonDialog, Select, Textarea } from "../../features/admin/ui";


export async function loader({ request, params }: Route.LoaderArgs) {
  return adminGet<AdminContentChain>(request, `/api/admin/content/${encodeURIComponent(params.id)}`);
}

export const meta: Route.MetaFunction = ({ loaderData }) => [{ title: `${loaderData?.publication?.title ?? loaderData?.article.title ?? "콘텐츠"} · ${SITE.name} 관리자` }];

function Step({ title, meta, children, tone = "accent", last }: { title: ReactNode; meta?: ReactNode; children: ReactNode; tone?: "accent" | "muted" | "bad"; last?: boolean }) {
  const dot = tone === "bad" ? "bg-hot" : tone === "muted" ? "bg-ink-4" : "bg-accent";
  return (
    <li className="relative pl-7">
      {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-line-strong" aria-hidden />}
      <span className={`absolute left-[3px] top-[7px] size-[9px] rounded-full ring-4 ring-bg ${dot}`} aria-hidden />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-[13.5px] font-semibold text-ink">{title}</h3>
        {meta && <div className="text-[12px] text-ink-4">{meta}</div>}
      </div>
      <div className="mt-2 pb-6 text-[13px] text-ink-2">{children}</div>
    </li>
  );
}

type Dialog = null | "visibility" | "seo" | "override" | "analyze" | "extract" | "group" | "detach" | "merge";

export default function ContentItem({ loaderData }: Route.ComponentProps) {
  const c = loaderData;
  const a = c.article;
  const p = c.publication;
  const { run, pending } = useAdminAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [visibility, setVisibility] = useState<string>(p?.visibility ?? "public");
  const [fields, setFields] = useState({ title: "", summary: "", reason: "", category: "", tags: "", selected: "", silent: "" });
  const [mergeInto, setMergeInto] = useState("");
  const version = c.override?.version ?? 0;
  const base = `/api/admin/content/${encodeURIComponent(a.id)}`;
  const story = c.membership[0];
  const title = p?.title ?? a.title;

  const openOverride = () => {
    const f = (c.override?.fields ?? {}) as Record<string, unknown>;
    setFields({
      title: String(f.title ?? ""),
      summary: String(f.summary ?? ""),
      reason: String(f.reason ?? ""),
      category: String(f.category ?? ""),
      tags: Array.isArray(f.tags) ? (f.tags as string[]).join(", ") : "",
      selected: f.selected === undefined ? "" : String(f.selected),
      silent: f.silent === undefined ? "" : String(f.silent),
    });
    setDialog("override");
  };

  return (
    <AdminPage
      title={<span className="line-clamp-2">{title}</span>}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[12px]">{a.id}</span>
          <span>·</span>
          <Link className="hover:text-accent" to={`/admin/sources/${encodeURIComponent(a.source_id)}`}>{a.source_name}</Link>
          <span>·</span>
          <a className="max-w-[420px] truncate hover:text-accent" href={a.url} target="_blank" rel="noreferrer">{a.url}</a>
          {p?.visibility !== "withdrawn" && p && (
            <>
              <span>·</span>
              <a className="text-accent" href={`/items/${a.id}`} target="_blank" rel="noreferrer">공개 페이지</a>
            </>
          )}
        </span>
      }
      actions={
        <>
          <Button onClick={() => setDialog("visibility")}>공개 범위</Button>
          {p && <Button onClick={() => setDialog("seo")}>{p.indexable ? "색인 해제" : "색인 표시"}</Button>}
          <Button onClick={openOverride}>수동 수정</Button>
          <Button onClick={() => setDialog("analyze")}>재평가</Button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap gap-1.5">
        {p ? <Badge tone={p.visibility === "public" ? "ok" : "warn"}>{VISIBILITY_LABEL[p.visibility] ?? p.visibility}</Badge> : <Badge>미공개</Badge>}
        {p?.selected && <Badge tone="accent">엄선</Badge>}
        {p?.eligible === false && <Badge>공개면 제외</Badge>}
        {a.backfill && <Badge tone="warn">과거 소급</Badge>}
        <Badge>처리 {a.processing_state}</Badge>
        {c.override && <Badge tone="info" title={c.override.reason ?? undefined}>수동 설정 v{c.override.version}</Badge>}
      </div>
      {a.processing_error && <div className="mb-5 rounded-card bg-hot-soft px-4 py-3 text-[13px] text-hot ring-1 ring-hot/20">{a.processing_error}</div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card title="처리 경로">
          <ol className="pt-1">
            <Step title="소식원" meta={`${KIND_LABEL[a.source_kind] ?? a.source_kind} · ${String(a.tier).replace("_", ".")} · ${MODE_LABEL[a.participation_mode] ?? a.participation_mode}`}>
              <Link className="text-ink hover:text-accent" to={`/admin/sources/${encodeURIComponent(a.source_id)}`}>{a.source_name}</Link>
              <span className="text-ink-4"> · 사이트 내 전문 {a.site_fulltext ? "허용" : "불허"} · 외부 전문 {a.syndicate_fulltext ? "허용" : "불허"}</span>
            </Step>
            <Step title="발견" meta={`${c.discoveries.length}회`}>
              <ul className="space-y-1">
                {c.discoveries.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="num text-ink-4">{bj(d.discovered_at, true)}</span>
                    <span>{d.via}</span>
                    {d.source_id !== a.source_id && <span className="text-ink-3">경유 {d.source_id}</span>}
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 text-[12px] text-ink-4">
                원문 시간 {a.published_at ? bj(a.published_at, true) : "불명"}{a.published_at_claim && !a.published_at ? `(주장 ${a.published_at_claim}, 미채택)` : ""} · 타임라인 {bj(a.timeline_at, true)}
              </div>
            </Step>
            <Step title="본문 및 수정" meta={`제 ${a.revision}판 · 본문 ${a.body_status} · ${a.body_chars ?? 0}자`}>
              {c.revisions.length ? (
                <ul className="space-y-1">
                  {c.revisions.map((r) => (
                    <li key={r.revision} className="flex gap-2">
                      <span className="num text-ink-4">v{r.revision}</span>
                      <span className="min-w-0 flex-1 truncate">{r.title}</span>
                      <span className="num shrink-0 text-ink-4">{bj(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">초기 버전만 있음</span>
              )}
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => setDialog("extract")}>본문 재추출</Button>
              </div>
            </Step>
            <Step title="모델 판단" meta={`${c.analyses.length}회`} tone={c.analyses.length ? "accent" : "muted"}>
              {c.analyses.length ? (
                <div className="space-y-3">
                  {c.analyses.map((an) => (
                    <div key={an.id} className="rounded-control bg-bg-sunk/60 p-3 ring-1 ring-line">
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        <Badge tone={an.relevance === "pass" ? "ok" : "muted"}>{an.relevance}</Badge>
                        {an.selected && <Badge tone="accent">선정</Badge>}
                        <Badge tone="info">점수 {an.score}</Badge>
                        {an.category && <Badge>{CATEGORY_LABELS[an.category as keyof typeof CATEGORY_LABELS] ?? an.category}</Badge>}
                        <span className="text-ink-4">{an.model} · {an.prompt_version} · 입력 v{an.input_revision} · {an.origin} · {bj(an.created_at)}</span>
                      </div>
                      {an.title_zh && <div className="mt-2 font-medium text-ink">{an.title_zh}</div>}
                      {an.reason_zh && <div className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{an.reason_zh}</div>}
                      {an.receipts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                          {an.receipts.map((r) => (
                            <span key={r.id} className="num rounded bg-surface px-1.5 py-0.5 text-ink-3 ring-1 ring-line">
                              영수증 #{r.id} · {r.status} · {r.model ?? r.service}{r.cost !== null ? ` · ${money(r.cost)}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-ink-4">{a.participation_mode === "editorial" ? "아직 판단 없음(대기열 또는 실패)" : "분위기 소식원은 편집 판단을 하지 않음"}</span>
              )}
            </Step>
            <Step title="공개" tone={p ? (p.visibility === "withdrawn" ? "bad" : "accent") : "muted"} meta={p ? `업데이트 ${bj(p.updated_at, true)}` : undefined}>
              {p ? (
                <KV
                  items={[
                    ["범위", VISIBILITY_LABEL[p.visibility] ?? p.visibility],
                    ["엄선", p.selected ? `예 · 공개 ${p.visible_after ? bj(p.visible_after, true) : "즉시"}` : "아니오"],
                    ["카테고리", p.category ? CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS] ?? p.category : null],
                    ["태그", (p.tags as string[] | null)?.join(", ")],
                    ["요약", p.summary],
                    ["추천 이유", p.reason],
                    [
                      "본문 표시",
                      `${p.body_mode}${p.syndicate ? " · 외부 전문 포함 가능" : ""}${
                        p.indexable ? (p.seo_indexed_at ? " · 색인 가능(수동 표시)" : " · 색인 가능(엄선 자동)") : p.seo_excluded_at ? " · 색인 제외(수동 제외)" : " · 색인 안 함"
                      }`,
                    ],
                  ]}
                />
              ) : (
                <span className="text-ink-4">공개 투영 없음(관련성 미통과 또는 처리 중)</span>
              )}
              {c.override && (
                <div className="mt-3 rounded-control bg-accent-softer p-3 ring-1 ring-accent/15">
                  <div className="text-[12px] text-ink-3">수동 설정 v{c.override.version} · {c.override.updated_by} · {bj(c.override.updated_at, true)}{c.override.reason ? ` · ${c.override.reason}` : ""}</div>
                  <Json value={{ visibility: c.override.visibility, ...c.override.fields }} label="재정의 필드" collapsed={false} />
                </div>
              )}
            </Step>
            <Step title="엄선 동기화 로그" meta={`${c.ledger.length}건`} tone={c.ledger.length ? "accent" : "muted"}>
              {c.ledger.length ? (
                <ul className="space-y-1">
                  {c.ledger.map((l) => (
                    <li key={l.seq} className="flex gap-2">
                      <span className="num text-ink-4">#{l.seq}</span>
                      <Badge tone={l.op === "remove" ? "warn" : "ok"}>{l.op}</Badge>
                      <span className="num text-ink-4">공개 {bj(l.visible_at)} · 기록 {bj(l.changed_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">엄선 동기화 흐름에 들어간 적 없음</span>
              )}
            </Step>
            <Step title="이슈 그룹화" tone={story ? "accent" : "muted"} meta={a.grouped_at ? `그룹화 ${bj(a.grouped_at, true)}` : "미그룹화"}>
              {c.membership.map((m) => (
                <div key={m.fact_id} className="mb-2">
                  <div>
                    사실 <span className="font-mono text-[12px]">#{m.fact_id}</span> {m.fact_title} <Badge>{m.role}</Badge> {m.manual && <Badge tone="info">수동</Badge>}
                  </div>
                  {m.story_public_id && (
                    <div className="mt-0.5">
                      이슈 <a className="text-accent" href={`/story/${m.story_public_id}`} target="_blank" rel="noreferrer">{m.story_title}</a> <span className="font-mono text-[12px] text-ink-4">#{m.story_id}</span>
                    </div>
                  )}
                </div>
              ))}
              {c.decisions.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12.5px]">
                  {c.decisions.map((d, i) => (
                    <li key={i} className="flex flex-wrap gap-2">
                      <span className="num text-ink-4">{bj(d.created_at)}</span>
                      <Badge>{d.verdict}</Badge>
                      {d.fact_id && <span>사실 #{d.fact_id}</span>}
                      {d.receipt_id && <span className="text-ink-4">영수증 #{d.receipt_id}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setDialog("group")}>재그룹화</Button>
                {c.membership.length > 0 && <Button size="sm" onClick={() => setDialog("detach")}>이슈에서 제외</Button>}
                {story?.story_id && <Button size="sm" onClick={() => setDialog("merge")}>이 이슈를 병합…</Button>}
              </div>
            </Step>
            <Step title="전송" last meta={`${c.deliveries.length}건`} tone={c.deliveries.some((d) => d.status === "unknown") ? "bad" : c.deliveries.length ? "accent" : "muted"}>
              {c.deliveries.length ? (
                <ul className="space-y-1">
                  {c.deliveries.map((d, i) => (
                    <li key={i} className="flex flex-wrap gap-2">
                      <span>{d.target_key}</span>
                      <Badge tone={d.status === "sent" ? "ok" : d.status === "unknown" ? "bad" : "muted"}>{d.status}</Badge>
                      <span className="num text-ink-4">{bj(d.created_at)}{d.sent_at ? ` → ${bj(d.sent_at)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-ink-4">전송 기록 없음</span>
              )}
            </Step>
          </ol>
        </Card>

        <div className="space-y-5">
          <Card title="원본 정보">
            <KV
              items={[
                ["원제목", a.title],
                ["작성자", a.author],
                ["언어", a.language],
                ["신원 키", <span className="break-all font-mono text-[11.5px]">{a.identity_key}</span>],
              ]}
            />
          </Card>
          <Card title="수정 기록">
            {c.history.length ? (
              <ul className="space-y-3 text-[12.5px]">
                {c.history.map((h, i) => (
                  <li key={i}>
                    <div className="text-ink-2"><span className="font-medium">{h.action}</span> · {h.actor} · {bj(h.created_at)}</div>
                    {h.reason && <div className="text-ink-3">{h.reason}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>수동 작업이 없습니다</Empty>
            )}
          </Card>
        </div>
      </div>

      <ReasonDialog
        open={dialog === "seo"}
        title={p?.indexable ? "검색 색인 해제" : "색인 가능으로 표시"}
        description={
          p?.indexable
            ? "상세 페이지를 다시 noindex로 되돌리고 사이트맵에서 제외합니다. 엄선이라도 다시 표시할 때까지 자동 색인되지 않습니다."
            : "상세 페이지는 기본 noindex이며, 엄선 콘텐츠는 자동 색인됩니다. 표시하면(공개 상태에서만) index로 바꾸고 사이트맵에 넣으며 다음 IndexNow에 제출합니다. 독립적 가치가 있고 요약·본문이 완비된 콘텐츠에 적합합니다."
        }
        confirmLabel={p?.indexable ? "색인 해제" : "색인 표시"}
        busy={pending === "seo"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/seo`, { indexed: !p?.indexable, reason }, { label: "seo", success: p?.indexable ? "색인을 해제했습니다" : "색인 가능으로 표시했습니다" })) !== null}
      />

      <ReasonDialog
        open={dialog === "visibility"}
        title="공개 범위"
        description="변경은 웹, API, RSS, MCP, 동기화 흐름, 검색 색인에 동시에 적용되며 캐시를 갱신합니다. 소식원 측이 내림을 요청하면 먼저 신원과 범위를 확인하세요."
        danger={visibility === "withdrawn"}
        confirmLabel="적용"
        busy={pending === "visibility"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/visibility`, { visibility, reason, version }, { label: "visibility", success: "공개 범위가 업데이트되었습니다" })) !== null}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            ["public", "공개", "정상 표시"],
            ["summary-only", "요약만", "본문 미표시, 제목·요약 유지"],
            ["withdrawn", "내림", "모든 출구에서 제거, 링크 404"],
          ] as const).map(([v, label, hint]) => (
            <label key={v} className={`cursor-pointer rounded-card p-3 ring-1 transition-colors ${visibility === v ? "bg-accent-soft ring-accent" : "ring-line-strong hover:bg-bg-sunk"}`}>
              <input type="radio" name="visibility" className="sr-only" checked={visibility === v} onChange={() => setVisibility(v)} />
              <div className="text-[13.5px] font-medium text-ink">{label}</div>
              <div className="mt-0.5 text-[12px] text-ink-3">{hint}</div>
            </label>
          ))}
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={dialog === "override"}
        title="수동 수정"
        description="수동 값은 모델 출력보다 우선하며 이후 재처리로 덮어쓰지 않습니다. 비워 두면 해당 필드를 수정하지 않습니다(기존 수정 제거는 “지움” 선택)."
        confirmLabel="수정 저장"
        busy={pending === "override"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => {
          const next: Record<string, unknown> = {};
          const clear: string[] = [];
          for (const k of ["title", "summary", "reason"] as const) {
            if (fields[k].trim()) next[k] = fields[k].trim();
            else if (c.override?.fields[k] !== undefined) clear.push(k);
          }
          if (fields.category) next.category = fields.category;
          else if (c.override?.fields.category !== undefined) clear.push("category");
          if (fields.tags.trim()) next.tags = fields.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
          else if (c.override?.fields.tags !== undefined) clear.push("tags");
          for (const k of ["selected", "silent"] as const) {
            if (fields[k] === "true" || fields[k] === "false") next[k] = fields[k] === "true";
            else if (c.override?.fields[k] !== undefined) clear.push(k);
          }
          return (await run("POST", `${base}/override`, { fields: next, clear, reason, version }, { label: "override", success: "수정이 저장되어 다시 발행되었습니다" })) !== null;
        }}
      >
        <Field label="제목"><Input value={fields.title} placeholder={p?.title ?? ""} onChange={(e) => setFields({ ...fields, title: e.target.value })} /></Field>
        <Field label="요약"><Textarea rows={3} value={fields.summary} placeholder={p?.summary ?? ""} onChange={(e) => setFields({ ...fields, summary: e.target.value })} /></Field>
        <Field label="추천 이유"><Textarea rows={2} value={fields.reason} placeholder={p?.reason ?? ""} onChange={(e) => setFields({ ...fields, reason: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="카테고리">
            <Select value={fields.category} onChange={(e) => setFields({ ...fields, category: e.target.value })}>
              <option value="">수정 안 함</option>
              {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
            </Select>
          </Field>
          <Field label="태그(쉼표로 구분)"><Input value={fields.tags} onChange={(e) => setFields({ ...fields, tags: e.target.value })} /></Field>
          <Field label="엄선">
            <Select value={fields.selected} onChange={(e) => setFields({ ...fields, selected: e.target.value })}>
              <option value="">모델에 따름</option>
              <option value="true">강제 선정</option>
              <option value="false">강제 제외</option>
            </Select>
          </Field>
          <Field label="푸시">
            <Select value={fields.silent} onChange={(e) => setFields({ ...fields, silent: e.target.value })}>
              <option value="">정상</option>
              <option value="true">무음(선정돼도 푸시 안 함)</option>
              <option value="false">무음 해제</option>
            </Select>
          </Field>
        </div>
      </ReasonDialog>

      <ReasonDialog
        open={dialog === "analyze"}
        title="현재 수정본 재평가"
        description="새 모델 호출을 한 번 발생시킵니다(과금되고 영수증이 기록됩니다). 같은 제출을 반복 클릭해도 중복 과금되지 않습니다."
        requireReason={false}
        confirmLabel="재평가"
        busy={pending === "analyze"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "analyze" }, { label: "analyze", success: "평가 대기열에 추가되었습니다" })) !== null}
      />
      <ReasonDialog
        open={dialog === "extract"}
        title="본문 재추출"
        requireReason={false}
        confirmLabel="재추출"
        busy={pending === "extract"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "extract" }, { label: "extract", success: "추출 대기열에 추가되었습니다" })) !== null}
      />
      <ReasonDialog
        open={dialog === "group"}
        title="재그룹화"
        description="수동 그룹화한 멤버십은 덮어쓰지 않습니다."
        requireReason={false}
        confirmLabel="재그룹화"
        busy={pending === "group"}
        onClose={() => setDialog(null)}
        onSubmit={async () => (await run("POST", `${base}/rerun`, { step: "group" }, { label: "group", success: "그룹화 대기열에 추가되었습니다" })) !== null}
      />
      <ReasonDialog
        open={dialog === "detach"}
        title="이슈에서 제외"
        description="이 콘텐츠는 독립 콘텐츠로 표시되고 이슈 페이지도 함께 갱신됩니다."
        danger
        confirmLabel="제외"
        busy={pending === "detach"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => (await run("POST", `${base}/detach`, { reason }, { label: "detach", success: "이슈에서 제외했습니다" })) !== null}
      />
      <ReasonDialog
        open={dialog === "merge"}
        title="이슈 병합"
        description={`이슈 #${story?.story_id}(${story?.story_title ?? ""})를 다른 이슈에 병합합니다. 기존 링크는 새 이슈로 이동됩니다.`}
        danger
        confirmLabel="병합"
        busy={pending === "merge"}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => {
          if (!/^\d+$/.test(mergeInto.trim())) return false;
          return (await run("POST", "/api/admin/stories/merge", { from: story!.story_id, into: Number(mergeInto), reason }, { label: "merge", success: "이슈가 병합되었습니다" })) !== null;
        }}
      >
        <Field label="병합 대상 이슈 번호" hint="대상 이슈의 어느 콘텐츠든 진단 페이지에서 #번호를 볼 수 있습니다">
          <Input inputMode="numeric" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} placeholder="예: 1234" />
        </Field>
      </ReasonDialog>
    </AdminPage>
  );
}
