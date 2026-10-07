// The engine's ways in, one panel each: what it is for, the steps to connect, then the details folded away.
// Addresses are the site's configured public address (`base`); what visitors copy carries the site's tag
// (CopyTag) when it has one.
import { Fragment, useState } from "react";
import { Link } from "react-router";
import { PUBLIC_INTERFACE_VERSION } from "@aihot/contracts/http-policy";
import { MCP_TOOL_NAMES as T, MCP_TOOLS } from "@aihot/contracts/mcp";
import { feedCategoryLabel, PUBLIC_API_CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import { ACCESS, AGENT, EDITION_WHEN, POLICY, REPORTS, SITE, subjectAfter, withSubject } from "@aihot/site";
import { CodeBlock, CopyButton } from "./CodeBlock";
import { PillTabs } from "../../components/ui/Tabs";
import type { AgentPanelProps } from "../../modules";
import { AGENT_PARTS, GUIDE_CLIENTS, TAG } from "./module-parts";
import { Address, Ask, Block, Bullets, Details, Mono, PanelHead, Step, Steps, Table, Tips } from "./parts";

const V = PUBLIC_INTERFACE_VERSION;

/** Every MCP tool: the engine's and the modules'. */
export const mcpToolCount = () => MCP_TOOLS.length + AGENT_PARTS.reduce((n, a) => n + (a.tools?.length ?? 0), 0);
const link = "text-accent hover:underline";

/** An address on this site as the copy buttons copy it, with the tag. */
function addressOf({ base, tag }: AgentPanelProps, path: string): string {
  return TAG && tag ? `${base}${path}?${TAG.query}=${tag}` : `${base}${path}`;
}

const MCP_CLIENTS = [
  { key: "claude", label: "Claude Code" },
  { key: "codex", label: "Codex" },
  { key: "json", label: "JSON 설정" },
  { key: "other", label: "기타 클라이언트" },
] as const;

export function McpPanel(props: AgentPanelProps) {
  const url = addressOf(props, "/api/mcp");
  const name = SITE.mcpPrefix;
  const [client, setClient] = useState<string>("claude");
  return (
    <>
      <PanelHead label={`MCP · ${V}`} title={`주소 하나만 넣으면 Agent에 도구 ${mcpToolCount()}개가 추가됩니다`}>
        표준 Streamable HTTP, 익명 읽기 전용이라 토큰이 필요 없고 로그인 상태도 읽지 않습니다. Claude 데스크톱, Cursor, Cherry Studio처럼 원격 MCP를 지원하는 클라이언트에 적합합니다.
      </PanelHead>
      <Steps>
        <Step n={1} title="서비스 주소 복사">
          <Address url={url} />
          {TAG && <p className="mt-2 text-[13px] text-ink-3">{TAG.mcp}</p>}
        </Step>
        <Step n={2} title="클라이언트에 추가">
          <PillTabs className="mt-3" size="xs" layoutId="agent-mcp-client" label="클라이언트" active={client} onSelect={setClient} items={MCP_CLIENTS.map((c) => ({ key: c.key, label: c.label }))} />
          {client === "claude" && <CodeBlock className="mb-0 mt-3" lang="bash" code={`claude mcp add --transport http ${name} '${url}'`} />}
          {client === "codex" && <CodeBlock className="mb-0 mt-3" lang="bash" code={`codex mcp add ${name} --url '${url}'`} />}
          {client === "json" && <CodeBlock className="mb-0 mt-3" title="Cursor, Cherry Studio 등 JSON 설정을 쓰는 클라이언트" lang="json" code={JSON.stringify({ mcpServers: { [name]: { type: "http", url } } }, null, 2)} />}
          {client === "other" && <p className="mt-3">{`클라이언트의 MCP 또는 커넥터 설정에서 항목을 하나 새로 만듭니다: 이름은 ${name}, 주소는 위 URL을 넣고 인증은 "없음"을 선택하며 API Key는 넣지 마세요. 로컬 명령만 지원하는 클라이언트는 자체 원격 MCP 프록시를 먼저 사용하세요.`}</p>}
        </Step>
        <Step n={3} title="Agent로 한 번 호출해 보기">
          <Ask text={`${T.latest} 를 호출해서 지난 24시간 가장 중요한 ${subjectAfter("뉴스 5건", "")}을 알려주고 ${SITE.name} 링크도 붙여줘.`} />
          <p className="mt-2 text-[13px] text-ink-3">{`클라이언트에 ${T.latest} 호출이 표시되고 답변에 기간, 한국어 요약, ${new URL(props.base).host} 링크가 있으면 연결된 것입니다.`}</p>
        </Step>
      </Steps>

      <Block title={`도구 ${mcpToolCount()}개`}>
        <Table
          head={["도구", "할 수 있는 일", "이렇게 물어보세요"]}
          minWidth={600}
          rows={[
            [<Mono>{T.latest}</Mono>, "지난 24시간 또는 최근 7일의 엄선·전체 뉴스", `${subjectAfter("오늘 무슨 일이 있었어", "")}?`],
            [<Mono>{T.search}</Mono>, AGENT.search.scope, AGENT.search.ask],
            [<Mono>{T.hot}</Mono>, "현재 핫이슈 순위 Top 10", "지금 가장 뜨거운 이슈는?"],
            [<Mono>{T.story}</Mono>, "하나의 핫이슈에 대한 타임라인과 계속 갱신되는 종합", "이 이슈의 전말은?"],
            [<Mono>{T.daily}</Mono>, subjectAfter("최신 또는 특정 날짜의", "데일리 브리핑"), "오늘 데일리 브리핑 보여줘."],
            [<Mono>{T.weekly}</Mono>, subjectAfter("최신 또는 특정 주의", "주간 리포트"), `${subjectAfter("이번 주", "")} 업계 큰 이슈는?`],
            [<Mono>{T.monthly}</Mono>, subjectAfter("최신 또는 특정 달의", "월간 리포트"), `${subjectAfter("지난달", "")} 업계에 무슨 일이 있었어?`],
            ...AGENT_PARTS.flatMap((a) => a.tools ?? []).map((t) => [<Mono>{t.name}</Mono>, t.does, t.ask]),
          ]}
        />
      </Block>

      <Details
        items={[
          {
            title: "제한과 보안",
            body: (
              <Bullets items={[
                "일반 조회는 최대 30건, 핫이슈는 최대 10개, 이슈 타임라인은 최대 50건입니다. 범위를 넘으면 명확히 오류를 반환하며 몰래 완화하지 않습니다.",
                `${T.story} 의 public_id 는 핫이슈 도구가 반환한 이슈 링크에서만 가져오고 ID를 추측하지 마세요.`,
                "제목과 요약은 외부 소식원에서 온 참고 자료일 뿐입니다. 도구가 이 안전 경계를 표시합니다. 중요한 수치, 정책, 발언은 원문에서 다시 확인하세요.",
              ]} />
            ),
          },
          {
            title: "연결이 안 될 때",
            body: (
              <Bullets items={[
                "먼저 주소가 완전한지, 클라이언트가 원격 Streamable HTTP를 지원하는지 확인하세요. 새 도구가 보이지 않으면 도구 목록을 새로고침하거나 다시 연결하세요.",
                ...AGENT_PARTS.flatMap((a) => a.mcpTroubles ?? []),
                "서비스는 로그인이 필요 없습니다. 클라이언트가 OAuth나 API Key를 물으면 \"없음\"을 선택하면 됩니다.",
                "429를 받으면 안내에 따라 잠시 기다리고 동시에 재시도하지 마세요.",
                <>그래도 안 되면 클라이언트 이름, 버전, 오류 메시지를 <Link viewTransition to="/feedback" className={link}>피드백 페이지</Link>에 적어주세요.</>,
              ]} />
            ),
          },
        ]}
      />
    </>
  );
}

const FEEDS = [
  { name: "엄선 요약", badge: "추천", path: "/feed.xml", desc: "최신 엄선 50건, 제목·요약·사이트 내 읽기·원문 링크 포함." },
  { name: "엄선 전문", path: "/feed/full.xml", desc: "같은 50건. 전재가 허용된 소식원은 전문을 바로 붙이고 나머지는 요약만." },
  { name: "전체 소식", path: "/feed/all.xml", desc: "최근 7일의 공개 소식, 원문 발행 시간 역순." },
  { name: withSubject("데일리 브리핑"), path: "/feed/daily.xml", desc: `${EDITION_WHEN.daily}(한국 시간) 1호: 헤드라인 리드와 전체 목차, 최근 30호 보관.` },
  { name: withSubject("주간 리포트"), path: "/feed/weekly.xml", desc: `${EDITION_WHEN.weekly}(한국 시간) 1호: 총평과 섹션별로 정리된 ${REPORTS.entry.noun}, 최근 12호 보관.` },
  { name: withSubject("월간 리포트"), path: "/feed/monthly.xml", desc: `${EDITION_WHEN.monthly}(한국 시간) 1호: 총평과 섹션별로 정리된 ${REPORTS.entry.noun}, 최근 12호 보관.` },
];

/** The category feeds, under the names the feeds themselves use. */
const FEED_CATEGORIES = PUBLIC_API_CATEGORY_KEYS.map((key) => [key, feedCategoryLabel(key)] as const);

export function RssPanel(props: AgentPanelProps) {
  const { base } = props;
  const lead = `${["주요 RSS 2.0 리더와 호환되며 n8n, Zapier 같은 자동화 도구에도 연결할 수 있습니다. 주소는 오랫동안 바뀌지 않습니다", ...AGENT_PARTS.flatMap((a) => a.rssLead ?? [])].join("; ")}.`;
  return (
    <>
      <PanelHead label="RSS" title="주소를 복사해 리더로 구독하세요">
        {lead}
      </PanelHead>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEEDS.map((f) => (
          <div key={f.path} className="card flex flex-col p-4">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{f.name}</span>
              {f.badge && <span className="inline-flex h-[18px] items-center rounded-full bg-accent-soft px-2 text-[11px] font-medium text-accent">{f.badge}</span>}
            </div>
            <p className="mt-1 flex-1 text-[13px] leading-[1.7] text-ink-3">{f.desc}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-line-soft pt-3">
              <code className="mono min-w-0 flex-1 truncate text-[12px] text-ink-4">{base}{f.path}</code>
              <CopyButton text={addressOf(props, f.path)} label="주소 복사" className="shrink-0" />
            </div>
          </div>
        ))}
      </div>
      {TAG && <p className="mt-3 text-[12.5px] text-ink-4">{TAG.rss}</p>}

      <Block title="카테고리별 구독">
        <Table
          head={["카테고리", "요약", "전문"]}
          minWidth={420}
          rows={FEED_CATEGORIES.map(([slug, label]) => [
            <span className="font-medium text-ink">{label}</span>,
            <span className="inline-flex items-center gap-2"><Mono>{`/feed/category/${slug}.xml`}</Mono><CopyButton text={addressOf(props, `/feed/category/${slug}.xml`)} className="!h-6 !px-1.5" /></span>,
            <span className="inline-flex items-center gap-2"><Mono>{`/feed/full/category/${slug}.xml`}</Mono><CopyButton text={addressOf(props, `/feed/full/category/${slug}.xml`)} className="!h-6 !px-1.5" /></span>,
          ])}
        />
      </Block>

      <Block title="새로고침 주기">
        <p>리더는 지난번 ETag를 함께 보내 물어보고, 내용이 바뀌지 않았으면 아주 작은 304만 돌려받아 중복 다운로드를 하지 않습니다. 30분에 한 번 새로고침이면 충분하고, 더 빨라도 새 내용을 받지는 못합니다.</p>
        <p className="mt-3 text-[13px] text-ink-3">{`항목 링크는 사이트 내 읽기 페이지를 가리키고 원문 링크는 요약 안에 있습니다. 익명으로 구독할 수 있다고 해서 모든 용도가 허가되는 것은 아닙니다${POLICY.terms.notes ? `: ${POLICY.terms.notes.rss}` : ""}. 자세한 내용은 `}<Link viewTransition to="/terms" className={link}>{POLICY.terms.name}</Link>을 보세요.</p>
      </Block>
    </>
  );
}

const RECIPES = [
  { key: "latest", label: "최신 뉴스 모니터링" },
  { key: "sync", label: "전체 엄선 동기화" },
];

export function ApiPanel(props: AgentPanelProps) {
  const { base, tag } = props;
  const userAgent = [ACCESS.userAgent, TAG && tag ? TAG.userAgent(tag) : null].filter(Boolean).join(" ");
  const curl = `curl --compressed${userAgent ? ` -A '${userAgent}'` : ""}`;
  let pace = `내용이 바뀌는 주기: 새 뉴스는 하루 종일 들어오고, 엄선은 하루에 몇 번에서 수십 번 바뀌며, 데일리 브리핑 ${EDITION_WHEN.daily}, 주간 리포트 ${EDITION_WHEN.weekly}, 월간 리포트 ${EDITION_WHEN.monthly}(한국 시간)에 각 1호씩 나옵니다.`;
  if (ACCESS.ratePerMinute) pace += `같은 IP가 분당 약 ${ACCESS.ratePerMinute}회를 넘으면 429를 받습니다. Retry-After에 따라 기다리고 동시에 재시도하지 마세요.`;
  const [recipe, setRecipe] = useState<string>("latest");
  const recipes = AGENT_PARTS.flatMap((a) => a.recipes ?? []);
  const items = `${base}/api/v1/items?mode=selected&window=24h&limit=20`;
  return (
    <>
      <PanelHead label={`REST API · ${V}`} title="익명 GET, 바로 쓸 수 있습니다">
        토큰이 필요 없습니다. 브라우저 CORS, curl, 각 언어의 기본 HTTP 클라이언트로 바로 호출할 수 있습니다. 경로는 /api/v1이고 필드와 오류 코드는 <a href="/openapi-v1.json" className={link}>OpenAPI</a>를 기준으로 합니다.
      </PanelHead>
      <CodeBlock className="mt-6" title="첫 요청" lang="bash" code={`${curl} '${items}'`} />

      <Block title="아끼면서 더 빠르게">
        <Tips
          items={[
            { title: "압축 켜기", text: <>curl에는 <Mono>--compressed</Mono>를 붙이고 다른 클라이언트는 gzip이나 br을 켜세요. JSON은 압축하면 원래의 1/4에서 1/8 크기가 됩니다.</> },
            { title: "ETag 사용", text: <>응답의 ETag를 저장했다가 다음에 <Mono>If-None-Match</Mono>로 보내세요. 내용이 바뀌지 않았으면 304를 반환하고 본문은 보내지 않습니다.</> },
            { title: "리듬에 맞춰 받기", text: `뉴스와 핫이슈는 최대 분당 1회, 데일리 브리핑은 ${EDITION_WHEN.daily} 후 한 번, 주간·월간 리포트는 발행 후 한 번 받고, 뒤로 넘기다 이미 가진 항목에 닿으면 멈추세요.` },
          ]}
        />
        <p className="mt-3 text-[13px] leading-[1.75] text-ink-3">{pace}</p>
      </Block>

      <Block title="엔드포인트 한눈에">
        <Table
          head={["경로", "용도", "조회 주기"]}
          minWidth={640}
          rows={[
            { group: "뉴스" },
            [<Mono>/api/v1/items</Mono>, "엄선 또는 최근 7일 전체 소식, 카테고리·시간 창·키워드로 필터 가능", "최대 1분에 1회"],
            { group: "핫이슈와 이슈" },
            [<Mono>/api/v1/hot-topics</Mono>, "현재 핫이슈 순위 Top 10", "최대 1분에 1회"],
            [<Mono>{"/api/v1/stories/{publicId}"}</Mono>, "하나의 이슈에 대한 보도 타임라인, AI 종합, 연관 이슈", "필요할 때"],
            { group: "데일리 브리핑" },
            [<Mono>/api/v1/dailies/latest</Mono>, "최신 데일리 브리핑", `${EDITION_WHEN.daily} 후 1회`],
            [<Mono>{"/api/v1/dailies/{date}"}</Mono>, "특정 날짜의 데일리 브리핑. 철회 시 참조가 제거됩니다", "캐시 만료 후 사용 전 ETag 확인"],
            [<Mono>/api/v1/dailies</Mono>, "데일리 브리핑 날짜 색인", "하루에 1회"],
            { group: "주간·월간 리포트" },
            [<Mono>/api/v1/weeklies/latest</Mono>, "최신 주간 리포트: 헤드라인, 총평, 한 주의 중점, 섹션별 정리", `${EDITION_WHEN.weekly} 후 1회`],
            [<Mono>{"/api/v1/weeklies/{week}"}</Mono>, "특정 주, ISO 주 표기 예: 2026-W39. 철회 시 참조가 제거됩니다", "캐시 만료 후 사용 전 ETag 확인"],
            [<Mono>/api/v1/weeklies</Mono>, "주간 리포트 색인", "주에 1회"],
            [<Mono>/api/v1/monthlies/latest</Mono>, "최신 월간 리포트", `${EDITION_WHEN.monthly} 후 1회`],
            [<Mono>{"/api/v1/monthlies/{month}"}</Mono>, "특정 달, 예: 2026-09", "캐시 만료 후 사용 전 ETag 확인"],
            [<Mono>/api/v1/monthlies</Mono>, "월간 리포트 색인", "달에 1회"],
            ...AGENT_PARTS.flatMap((a) => (a.api ? [{ group: a.api.group }, ...a.api.rows.map(([path, does, often]) => [<Mono>{path}</Mono>, does, often])] : [])),
            { group: "AI 어시스턴트용" },
            [<Mono>/api/v1/agent</Mono>, `Agent용 사용 설명. 안내된 주소는 정리된 한국어 Markdown을 반환합니다${GUIDE_CLIENTS ? `; ${GUIDE_CLIENTS}가 이것을 사용합니다` : ""}`, "필요할 때"],
            { group: "전체 엄선 동기화" },
            [<Mono>/api/v1/selected/snapshot</Mono>, "현재 전체 엄선, 페이지로 한 번에 전부 받기", "처음에만"],
            [<Mono>/api/v1/selected/changes</Mono>, "이후의 추가·수정·엄선 해제", "몇 분에 1회"],
          ]}
        />
      </Block>

      <Block title="자주 쓰는 방법">
        <PillTabs size="xs" layoutId="agent-api-recipe" label="사용법" active={recipe} onSelect={setRecipe} items={[...RECIPES, ...recipes].map((r) => ({ key: r.key, label: r.label }))} />
        {recipe === "latest" && (
          <>
            <CodeBlock className="mb-3 mt-3" lang="bash" code={`# 처음: 응답 헤더의 ETag를 저장\n${curl} -i '${items}'\n# 이후 최대 분당 1회, ETag를 함께 보냄. 304면 변화 없음\n${curl} -i -H 'If-None-Match: <지난번 ETag>' '${items}'`} />
            <p>뒤로 넘겨야 할 때는 <Mono>page.nextCursor</Mono>를 cursor로 다시 넘기고, 이미 가진 항목에 닿으면 멈추세요. 매번 7일치를 다시 넘기지 마세요.</p>
          </>
        )}
        {recipe === "sync" && (
          <>
            <CodeBlock className="mb-3 mt-3" lang="bash" code={`# 처음: 페이지로 전부 받기. 첫 페이지 응답의 cursor를 저장(모든 페이지가 동일)\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500'\n# hasMore가 true면 nextPage를 붙여 계속 넘기고, 끝날 때까지 반복\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500&page=<이전 페이지의 nextPage>'\n# 이후: cursor를 그대로 다시 보내 추가·수정·엄선 해제만 받기\n${curl} '${base}/api/v1/selected/changes?cursor=<첫 페이지의 cursor>&limit=100'`} />
            <p>각 페이지를 로컬에 성공적으로 쓴 뒤에 새 cursor를 저장하세요. cursor는 변경 로그의 수위라서 아무리 오래 두어도 만료되지 않습니다. 409 <Mono>snapshot_required</Mono>를 받으면 스냅샷을 다시 받으며, 데이터를 몰래 놓치지 않습니다.</p>
          </>
        )}
        {recipes.map((r) => recipe === r.key && <r.Body key={r.key} base={base} curl={curl} />)}
      </Block>

      <Block title="오류가 났을 때" id="agent-api-recovery">
        <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-2.5">
          <dt className="mono text-[13px] text-ink">400</dt>
          <dd>매개변수 오류: OpenAPI와 반환된 code에 따라 고치고 더 넓은 조회로 자동 전환하지 마세요. cursor가 무효이거나 시간 창을 벗어나면 invalid_cursor를 반환하니 첫 페이지부터 다시 하세요.</dd>
          <dt className="mono text-[13px] text-ink">409</dt>
          <dd>snapshot_required: 증분을 안전하게 이어갈 수 없으니 전체 스냅샷을 다시 받으세요.</dd>
          <dt className="mono text-[13px] text-ink">429</dt>
          <dd>요청이 너무 잦음: Retry-After에 따라 기다리고 동시에 재시도하지 마세요.</dd>
          <dt className="mono text-[13px] text-ink">5xx</dt>
          <dd>지수 백오프를 쓰고 우선 지난번 성공 결과를 사용하세요. 공개 서비스는 SLA를 보장하지 않습니다.</dd>
          {AGENT_PARTS.flatMap((a) => a.apiErrors ?? []).map(([status, what]) => (
            <Fragment key={status}>
              <dt className="mono text-[13px] text-ink">{status}</dt>
              <dd>{what}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="mt-4 text-[13px] text-ink-3">{`익명으로 호출할 수 있다고 해서 모든 용도가 허가되는 것은 아닙니다${POLICY.terms.notes ? `: ${POLICY.terms.notes.api}` : ""}. 자세한 내용은 `}<Link viewTransition to="/terms" className={link}>{POLICY.terms.name}</Link>을 보세요.</p>
      </Block>

    </>
  );
}
