// /subscribe: the ways to get the daily briefing — the Telegram channel, email (double opt-in) and RSS.
import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { EDITION_WHEN, SITE } from "@aihot/site";
import { apiGet, cachedPage } from "@aihot/web/lib/api.server.ts";
import { pageMeta } from "@aihot/web/lib/seo.ts";
import { AsideCard, ReadingLayout } from "@aihot/web/components/ui/Page.tsx";
import { PhoneBar } from "@aihot/web/components/shell/PhoneBar.tsx";
import { IconCheck, IconMessage, IconRss } from "@aihot/web/components/icons.tsx";
import type { Screen } from "@aihot/web/components/shell/screens.ts";

export const handle: Screen = { tab: "me", name: "뉴스 구독" };
export { pageHeaders as headers } from "@aihot/web/lib/api.server.ts";

interface Info {
  telegramUrl: string | null;
  email: boolean;
}

export async function loader({ request }: { request: Request }) {
  const info = await apiGet<Info>("/api/subscribe/info", { signal: request.signal });
  return cachedPage(300, { ...info, feed: `${process.env.SITE_URL ?? SITE.defaultUrl}/feed/daily.xml` });
}

export function meta() {
  return pageMeta({
    title: "뉴스 구독",
    description: `${SITE.name} 데일리 브리핑을 텔레그램, 이메일, RSS로 받아 보세요. ${EDITION_WHEN.daily} 발행.`,
    path: "/subscribe",
  });
}

const field =
  "w-full rounded-card bg-bg-sunk text-ink outline-none ring-1 ring-inset ring-line-soft transition-[background-color,box-shadow] placeholder:text-ink-4 hover:ring-line-strong focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:ring-accent dark:bg-bg-muted/60 dark:focus:bg-surface";
const button =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[14px] font-medium text-accent-contrast transition-[background-color,opacity] hover:bg-accent-ink disabled:bg-line-strong disabled:text-ink-4";

function EmailForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; message?: string }>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent, website: trap }),
      });
      if (res.ok) return setState({ kind: "done" });
      const body = (await res.json().catch(() => null)) as { detail?: string } | null;
      setState({ kind: "error", message: body?.detail ?? "지금은 신청할 수 없습니다. 잠시 후 다시 시도하세요." });
    } catch {
      setState({ kind: "error", message: "네트워크 오류입니다. 잠시 후 다시 시도하세요." });
    }
  };

  if (state.kind === "done")
    return (
      <p role="status" className="flex items-start gap-2.5 rounded-tile bg-accent-softer px-4 py-3 text-[14px] leading-relaxed text-ink-2">
        <IconCheck size={18} />
        <span>
          확인 메일을 보냈습니다. 메일의 <b>구독 확인하기</b> 버튼을 누르면 구독이 완료됩니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.
        </span>
      </p>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="sub-email" className="mb-2 block text-[13px] font-semibold text-ink">
          이메일 주소
        </label>
        <input id="sub-email" type="email" required autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={`${field} h-11 px-4 text-[14.5px]`} />
      </div>
      {/* Hidden from people; bots that fill every field are ignored by the server. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="sub-website">웹사이트</label>
        <input id="sub-website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </div>
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-3">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
        <span>
          (필수) 데일리 브리핑 발송을 위해 이메일 주소를 수집·이용하는 데 동의합니다. 수신거부 시 즉시 삭제되며, 자세한 내용은{" "}
          <Link viewTransition to="/privacy" className="text-accent hover:underline">
            개인정보 처리방침
          </Link>
          을 확인하세요.
        </span>
      </label>
      {state.kind === "error" && (
        <p role="alert" className="rounded-tile bg-hot-soft px-3.5 py-2.5 text-[13px] text-hot">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={state.kind === "sending" || !email || !consent} className={button}>
        구독 신청
      </button>
    </form>
  );
}

function Channel({ icon, title, lead, children }: { icon: React.ReactNode; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center well rounded-tile text-accent">{icon}</span>
        <div>
          <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{lead}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SubscribePage() {
  const info = useLoaderData<typeof loader>();
  return (
    <>
      <PhoneBar back={{ to: "/more", label: "내 메뉴" }} title="뉴스 구독" />
      <ReadingLayout
        aside={
          <AsideCard title="무엇을 보내 드리나요">
            <p className="text-[13px] leading-[1.75] text-ink-3">
              {EDITION_WHEN.daily}(한국 시간)에 발행되는 데일리 브리핑입니다. 전날 AI·IT 업계의 주요 소식을 AI가 골라 요약하고, 각 항목에 원문과 상세 페이지 링크를 붙입니다.
            </p>
          </AsideCard>
        }
      >
        <header>
          <h1 data-page-title="" className="text-[24px] font-semibold leading-[1.3] text-ink">
            데일리 브리핑 구독
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">편한 방법으로 매일 아침 소식을 받아 보세요. 모두 무료입니다.</p>
        </header>
        <div className="mt-6 space-y-4">
          <Channel icon={<IconMessage size={19} />} title="텔레그램 채널" lead="채널에 참여하면 브리핑이 올라올 때 알림을 받습니다. 개인정보를 입력하지 않아도 됩니다.">
            {info.telegramUrl ? (
              <a href={info.telegramUrl} target="_blank" rel="noopener noreferrer" className={button}>
                텔레그램 채널 열기
              </a>
            ) : (
              <p className="text-[13.5px] text-ink-4">텔레그램 채널은 준비 중입니다.</p>
            )}
          </Channel>
          <Channel icon={<IconCheck size={19} />} title="이메일" lead="신청하면 확인 메일을 보내 드립니다. 확인을 마친 주소로만 발송하며, 메일마다 수신거부 링크가 있습니다.">
            {info.email ? <EmailForm /> : <p className="text-[13.5px] text-ink-4">이메일 구독은 준비 중입니다.</p>}
          </Channel>
          <Channel icon={<IconRss size={19} />} title="RSS" lead="RSS 리더에 아래 주소를 추가하세요.">
            <code className="mono block break-all rounded-tile bg-bg-sunk px-3.5 py-2.5 text-[13px] text-ink-2">{info.feed}</code>
          </Channel>
        </div>
      </ReadingLayout>
    </>
  );
}
