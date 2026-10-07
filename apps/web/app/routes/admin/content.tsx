import { SITE } from "@aihot/site";
import { Form, Link, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/content";
import type { AdminContentRow, AdminContentSearch } from "@aihot/contracts/admin";
import { adminGet } from "../../lib/admin.server";
import { VISIBILITY_LABEL } from "../../features/admin/labels";
import { AdminPage, Badge, Button, Card, DataTable, Empty, Input, Time } from "../../features/admin/ui";


export async function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return { q, rows: [] as AdminContentRow[] };
  const { rows } = await adminGet<AdminContentSearch>(request, `/api/admin/content?q=${encodeURIComponent(q)}`);
  return { q, rows };
}

export const meta: Route.MetaFunction = () => [{ title: `콘텐츠 진단 · ${SITE.name} 관리자` }];

export default function Content({ loaderData }: Route.ComponentProps) {
  const { q, rows } = loaderData;
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  return (
    <AdminPage title="콘텐츠 진단" subtitle="ID, 원문 링크 또는 제목으로 특정 콘텐츠를 찾아 소식원부터 공개 출구까지 전체 경로를 확인합니다. 내림, 요약만, 수동 수정, 재처리는 모두 상세 페이지에서 가능합니다.">
      <Form method="get" className="mb-5 flex max-w-2xl gap-2">
        <Input name="q" defaultValue={sp.get("q") ?? ""} placeholder="콘텐츠 ID, URL 또는 제목 키워드" aria-label="콘텐츠 검색" autoFocus />
        <Button type="submit" tone="primary">찾기</Button>
      </Form>
      {q && (
        <Card pad={false} title={`“${q}” 검색 결과`} right={<span>{rows.length === 50 ? "최근 50건만 표시" : `${rows.length}건`}</span>}>
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/admin/content/${r.id}`)}
            empty="찾을 수 없습니다. URL은 먼저 정규화한 뒤 비교하며, 제목은 한글·영문 조각 검색을 지원합니다."
            columns={[
              {
                key: "t",
                label: "제목",
                render: (r) => (
                  <div className="min-w-[320px]">
                    <Link to={`/admin/content/${r.id}`} className="font-medium text-ink hover:text-accent" onClick={(e) => e.stopPropagation()}>{r.title}</Link>
                    <div className="font-mono text-[11.5px] text-ink-4">{r.id}</div>
                  </div>
                ),
              },
              { key: "src", label: "소식원", render: (r) => <span className="whitespace-nowrap">{r.source}</span> },
              {
                key: "st",
                label: "상태",
                render: (r) => (
                  <span className="flex flex-wrap gap-1">
                    {r.selected && <Badge tone="accent">엄선</Badge>}
                    {r.visibility && <Badge tone={r.visibility === "public" ? "muted" : "warn"}>{VISIBILITY_LABEL[r.visibility] ?? r.visibility}</Badge>}
                    {!r.visibility && <Badge>{r.processing_state}</Badge>}
                  </span>
                ),
              },
              { key: "sc", label: "점수", align: "right", render: (r) => r.score ?? "—" },
              { key: "d", label: "발견", render: (r) => <Time at={r.discovered_at} /> },
            ]}
          />
        </Card>
      )}
      {!q && <Empty>ID, 링크 또는 제목을 입력해 검색을 시작합니다.</Empty>}
    </AdminPage>
  );
}
