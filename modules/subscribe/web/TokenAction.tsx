// /subscribe/confirm and /subscribe/unsubscribe: the links in the emails open a page with a button, so a
// mail scanner that opens every link neither confirms nor unsubscribes anyone.
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { SITE } from "@aihot/site";
import { ReadingLayout } from "@aihot/web/components/ui/Page.tsx";
import { PhoneBar } from "@aihot/web/components/shell/PhoneBar.tsx";

export interface TokenActionCopy {
  title: string;
  lead: string;
  button: string;
  done: string;
  endpoint: string;
}

export function TokenAction({ copy }: { copy: TokenActionCopy }) {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; message?: string }>({ kind: "idle" });

  const run = async () => {
    setState({ kind: "sending" });
    try {
      const res = await fetch(copy.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      if (res.ok) return setState({ kind: "done" });
      const body = (await res.json().catch(() => null)) as { detail?: string } | null;
      setState({ kind: "error", message: body?.detail ?? "처리하지 못했습니다. 잠시 후 다시 시도하세요." });
    } catch {
      setState({ kind: "error", message: "네트워크 오류입니다. 잠시 후 다시 시도하세요." });
    }
  };

  return (
    <>
      <PhoneBar back={{ to: "/", label: SITE.name }} title={copy.title} />
      <ReadingLayout>
        <section className="card p-6">
          <h1 data-page-title="" className="text-[22px] font-semibold text-ink">
            {copy.title}
          </h1>
          {state.kind === "done" ? (
            <p role="status" className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
              {copy.done}
            </p>
          ) : (
            <>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">{token ? copy.lead : "링크가 올바르지 않습니다. 메일의 링크를 다시 열어 주세요."}</p>
              {state.kind === "error" && (
                <p role="alert" className="mt-4 rounded-tile bg-hot-soft px-3.5 py-2.5 text-[13px] text-hot">
                  {state.message}
                </p>
              )}
              {token && (
                <button
                  type="button"
                  onClick={run}
                  disabled={state.kind === "sending"}
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-accent px-6 text-[14px] font-medium text-accent-contrast hover:bg-accent-ink disabled:bg-line-strong disabled:text-ink-4"
                >
                  {copy.button}
                </button>
              )}
            </>
          )}
          <p className="mt-6 text-[13px]">
            <Link to="/" className="text-accent hover:underline">
              {SITE.name} 홈으로
            </Link>
          </p>
        </section>
      </ReadingLayout>
    </>
  );
}
