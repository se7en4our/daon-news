import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/models";
import type { AdminModels } from "@aihot/contracts/admin";
import { SITE } from "@aihot/site";
import { adminGet } from "../../lib/admin.server";
import { useAdminAction } from "../../features/admin/action";
import { bj, money, num } from "../../features/admin/format";
import { AdminPage, Badge, Button, Card, DataTable, Empty, Field, FilterChips, ReasonDialog, Select } from "../../features/admin/ui";
import { webModules } from "../../site-modules";



export async function loader({ request }: Route.LoaderArgs) {
  const days = new URL(request.url).searchParams.get("days") ?? "7";
  return adminGet<AdminModels>(request, `/api/admin/models?days=${encodeURIComponent(days)}`);
}

export const meta: Route.MetaFunction = () => [{ title: `모델·평가 · ${SITE.name} 관리자` }];

const SOURCE_LABEL = { admin: "관리자 전환", env: "환경 변수", default: "코드 기본값" } as const;

/** A cost the provider did not report and no price covers: a link to the prices when a module keeps them. */
function Unpriced() {
  const prices = webModules().find((m) => m.admin?.prices)?.admin?.prices;
  if (prices) return <Link to={prices} className="whitespace-nowrap text-ink-4 hover:text-accent">가격 미설정</Link>;
  return <span className="whitespace-nowrap text-ink-4" title="서비스 제공자가 비용을 반환하지 않았습니다. 토큰 수와 모델 단가로 직접 추산하세요">가격 미설정</span>;
}
const secs = (ms: number | null) => (ms == null ? "—" : ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${(ms / 1000).toFixed(1)} s`);

export default function ModelsAdmin({ loaderData: m }: Route.ComponentProps) {
  const { run, pending } = useAdminAction();
  const [target, setTarget] = useState<AdminModels["capabilities"][number] | null>(null);
  const [choice, setChoice] = useState<string>("");
  const labelOf = (key: string) => m.capabilities.find((c) => `capability:${c.key}` === key)?.label ?? key;

  return (
    <AdminPage
      title="모델·평가"
      subtitle="각 능력이 현재 어떤 모델을, 어디에서(관리자 전환 > 환경 변수 > 코드 기본값) 사용하는지, 그리고 최근 성공률·소요 시간·비용을 보여줍니다. 전환은 이후의 새 작업에만 적용되고 기존 결과는 재계산하지 않습니다. 엄선 모델을 바꾸기 전에 SelectBench 동일 배치 비교를 먼저 확인하세요."
      actions={<FilterChips param="days" options={[{ value: "1", label: "24시간" }, { value: "", label: "7일" }, { value: "30", label: "30일" }]} />}
    >
      <div className="grid gap-5">
        {m.capabilities.map((c) => {
          const total = c.usage.reduce((a, u) => a + u.calls, 0);
          return (
            <Card
              key={c.key}
              title={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {c.label}
                  <span className="font-mono text-[12px] font-normal text-ink-3">{c.current.model}</span>
                  <Badge tone={c.current.source === "admin" ? "accent" : "muted"}>{SOURCE_LABEL[c.current.source]}</Badge>
                </span>
              }
              right={
                <Button
                  size="sm"
                  onClick={() => {
                    setTarget(c);
                    setChoice(c.current.model);
                  }}
                >
                  전환
                </Button>
              }
              pad={false}
            >
              {c.usage.length ? (
                <DataTable
                  dense
                  rows={c.usage}
                  rowKey={(u) => `${u.purpose}|${u.model}|${u.promptVersion}`}
                  columns={[
                    { key: "m", label: "모델", render: (u) => <span className="whitespace-nowrap font-mono text-[12px]">{u.model}</span> },
                    { key: "v", label: "프롬프트 버전", render: (u) => <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-3">{u.promptVersion ?? "—"}</span> },
                    { key: "p", label: "용도", render: (u) => <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-3">{u.purpose}</span> },
                    { key: "c", label: "호출", align: "right", render: (u) => num(u.calls) },
                    {
                      key: "ok",
                      label: "성공률",
                      align: "right",
                      render: (u) => {
                        const rate = u.calls ? u.ok / u.calls : 0;
                        return <span className={rate < 0.95 ? "text-hot" : ""} title={`실패 ${u.failed} · 결과 불명 ${u.unknown}`}>{`${Math.round(rate * 1000) / 10}%`}</span>;
                      },
                    },
                    { key: "l", label: "소요 p50 / p95", align: "right", render: (u) => <span className="whitespace-nowrap">{`${secs(u.p50)} / ${secs(u.p95)}`}</span> },
                    { key: "t", label: "입력 / 출력 token", align: "right", render: (u) => <span className="whitespace-nowrap">{`${num(u.tokensIn)} / ${num(u.tokensOut)}`}</span> },
                    {
                      key: "$",
                      label: "비용",
                      align: "right",
                      render: (u) =>
                        u.actualCost !== null ? (
                          `${money(u.actualCost)}${u.currency && u.currency !== "CNY" ? ` ${u.currency}` : ""}`
                        ) : u.estimate ? (
                          <span title="사용량 × 단가로 추산">≈ {money(u.estimate.amount)}{u.estimate.currency !== "CNY" ? ` ${u.estimate.currency}` : ""}</span>
                        ) : (
                          <Unpriced />
                        ),
                    },
                  ]}
                />
              ) : (
                <Empty>{m.days}일 내 호출 없음{total === 0 && c.vision ? "(이미지가 있을 때만 사용)" : ""}</Empty>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="전환 기록" pad={false}>
          {m.history.length ? (
            <DataTable
              dense
              rows={m.history}
              rowKey={(h) => `${h.at}|${h.subject}`}
              columns={[
                { key: "at", label: "시간", render: (h) => <span className="num whitespace-nowrap">{bj(h.at)}</span> },
                { key: "c", label: "능력", render: (h) => labelOf(h.subject) },
                { key: "m", label: "변화", render: (h) => <span className="font-mono text-[12px]">{h.before?.model ?? "—"} → {h.after?.model ?? "—"}</span> },
                { key: "r", label: "사유", render: (h) => <span className="text-ink-3">{h.reason}</span> },
                { key: "a", label: "작업자", render: (h) => h.actor },
              ]}
            />
          ) : (
            <Empty>아직 관리자에서 모델을 전환한 적이 없습니다</Empty>
          )}
        </Card>
        <Card title="동일 배치 샘플 비교(SelectBench)" right={<Link to="/admin/selectbench" className="text-accent">전체 실행</Link>} pad={false}>
          {m.benches.length ? (
            <DataTable
              dense
              rows={m.benches}
              rowKey={(b) => b.id}
              columns={[
                { key: "l", label: "실행", render: (b) => <Link to={`/admin/selectbench/${b.id}`} className="text-ink hover:text-accent">{b.label}</Link> },
                { key: "m", label: "모델", render: (b) => <span className="font-mono text-[11.5px] text-ink-3">{b.models.join(", ")}</span> },
                { key: "n", label: "샘플", align: "right", render: (b) => num(b.sample_size) },
                { key: "at", label: "시간", render: (b) => <span className="num whitespace-nowrap">{bj(b.created_at)}</span> },
              ]}
            />
          ) : (
            <Empty>아직 가져온 비교 실행이 없습니다</Empty>
          )}
        </Card>
      </div>

      <ReasonDialog
        open={!!target}
        title={`모델 전환: ${target?.label ?? ""}`}
        description="이후의 새 작업에만 적용됩니다. “기본값 복원”을 선택하면 환경 변수 또는 코드 기본값으로 돌아갑니다."
        confirmLabel="전환"
        busy={pending === "switch"}
        onClose={() => setTarget(null)}
        onSubmit={async (reason) =>
          (await run("POST", `/api/admin/models/${target!.key}`, { model: choice === "__default" ? null : choice, reason }, { label: "switch", success: "전환되었습니다. 다음 호출부터 적용됩니다" })) !== null
        }
      >
        <Field label="모델">
          <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
            {m.choices
              .filter((x) => !target?.vision || x.vision)
              .map((x) => (
                <option key={x.key} value={x.key}>
                  {x.key}({x.service})
                </option>
              ))}
            <option value="__default">기본값 복원({target?.env} 또는 {target?.defaultModel})</option>
          </Select>
        </Field>
      </ReasonDialog>
    </AdminPage>
  );
}
