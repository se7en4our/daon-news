import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import type { ItemAvailability } from "@aihot/contracts/site";
import { SITE } from "@aihot/site";
import { Presence } from "../components/ui/Presence";
import { edgeTtl } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { exportBundle, importBundle, removeStar, useStarred, type ImportReport } from "../lib/local-state";
import { fullDateTime } from "../lib/format";
import { IconBookmark, IconDownload, IconClose } from "../components/icons";
import { readSnapshot, restoreAnchor, useSaveOnLeave } from "../lib/restore";
import { PhoneBar } from "../components/shell/PhoneBar";
import type { Screen } from "../components/shell/screens";
import { webModules } from "../site-modules";

export const handle: Screen = { tab: "me", name: "북마크" };

export function headers() {
  return edgeTtl(300);
}

export function meta() {
  return pageMeta({ title: "내 북마크", description: `이 기기에 저장된 ${SITE.name} 북마크.`, path: "/starred", noindex: true });
}

function reportText(r: ImportReport): string {
  const parts = [`북마크 ${r.starredAdded}건 추가`, `읽음 기록 ${r.readAdded}건`];
  if (r.starredSkipped || r.readSkipped) parts.push(`상한 초과 또는 형식 오류로 ${r.starredSkipped + r.readSkipped}건 건너뜀`);
  if (r.themeApplied) parts.push("가져온 다크·라이트 설정을 적용함");
  if (r.readFailed) parts.push("읽음 기록을 저장하지 못함 (브라우저 저장소 가득 참 또는 사용 불가)");
  return parts.join(", ");
}

export default function StarredPage() {
  const starred = useStarred();
  const [mounted, setMounted] = useState(false);
  const [availability, setAvailability] = useState<Record<string, ItemAvailability>>({});
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setMounted(true), []);

  const starredIds = starred.map((s) => s.id).join(",");
  useEffect(() => {
    if (!mounted || !starredIds) return;
    const controller = new AbortController();
    // Batches of 100: a request line with all 500 ids is longer than the front servers accept.
    const ids = starredIds.split(",");
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100));
    Promise.all(
      batches.map((batch) =>
        fetch(`/api/site/items/availability?ids=${encodeURIComponent(batch.join(","))}`, { signal: controller.signal })
          .then((r) => (r.ok ? (r.json() as Promise<Record<string, ItemAvailability>>) : {}))
          .catch(() => ({})),
      ),
    ).then((parts) => {
      if (!controller.signal.aborted) setAvailability(Object.assign({}, ...parts));
    });
    return () => controller.abort();
  }, [mounted, starredIds]);

  // Back from an item: the list renders only after mounting (it lives in this browser), so the
  // position comes back once it is there, by the same card anchor the other lists use.
  const historyKey = useLocation().key;
  useLayoutEffect(() => {
    if (!mounted || starred.length === 0) return;
    const snap = readSnapshot<null>(historyKey);
    if (snap) restoreAnchor(snap.anchor, snap.scrollY);
  }, [mounted, historyKey]);
  useSaveOnLeave(historyKey, () => null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportBundle(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${SITE.mcpPrefix}-local-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const report = importBundle(await file.text());
      setNotice({ kind: report.readFailed ? "error" : "ok", text: `가져오기 완료: ${reportText(report)}` });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "가져오기 실패" });
    }
  };

  // Imports from elsewhere that the site's modules offer.
  const importFrom = (run: () => Promise<{ ok: boolean; text: string }>) =>
    run().then(
      (r) => setNotice({ kind: r.ok ? "ok" : "error", text: r.text }),
      (err: Error) => setNotice({ kind: "error", text: err.message }),
    );

  const action = "text-[12.5px] text-ink-3 transition-colors hover:text-accent";
  return (
    <div className="pb-12">
      <PhoneBar back={{ to: "/more", label: "내 메뉴" }} title="북마크" />
      <header className="flex flex-col gap-2 pb-4 pt-3 sm:flex-row sm:items-start sm:justify-between lg:pt-1">
        <div>
          <h1 data-page-title="" className="text-[24px] font-semibold leading-[1.3] text-ink">북마크</h1>
          <p className="mt-1.5 text-[13px] text-ink-3">{`이 기기에 저장한 ${SITE.name} 콘텐츠, 나중에 읽거나 다시 보기 좋습니다.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:pt-1.5">
          {webModules().flatMap((m) => m.starredImports ?? []).map((i) => (
            <button key={i.label} type="button" onClick={() => importFrom(i.run)} className={action}>
              {i.label}
            </button>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} className={action}>
            파일 가져오기
          </button>
          {mounted && starred.length > 0 && (
            <button type="button" onClick={doExport} className={`${action} inline-flex items-center gap-1`}>
              <IconDownload size={13} /> 내보내기
            </button>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => doImport(e.target.files?.[0])} />
        </div>
      </header>
      <p className="rounded-tile border border-line bg-surface px-4 py-2.5 text-[12.5px] text-ink-3">북마크는 현재 브라우저에만 저장됩니다. 브라우저 데이터를 지우거나 기기를 바꾸면 동기화되지 않습니다.</p>
      <Presence show={!!notice} enter="anim-notice-in" exit="anim-fade-out" duration={160}>
        <div
          role="status"
          className={`mt-3 flex items-start justify-between gap-3 rounded-tile px-4 py-2.5 text-[13px] ${notice?.kind === "ok" ? "bg-accent-soft text-accent-ink dark:text-accent" : "bg-hot-soft text-hot"}`}
        >
          {notice?.text}
          <button type="button" aria-label="닫기" onClick={() => setNotice(null)} className="shrink-0 opacity-70 hover:opacity-100">
            <IconClose size={14} />
          </button>
        </div>
      </Presence>
      {!mounted ? null : starred.length === 0 ? (
        <div className="mt-3 flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
          <IconBookmark size={20} className="text-ink-4" />
          <p className="mt-3 text-[13px] text-ink-3">아직 북마크한 콘텐츠가 없습니다. 아무 콘텐츠나 열어 상세 페이지에서 북마크를 누르면 추가됩니다.</p>
          <Link to="/" className="mt-4 text-[12.5px] font-medium text-accent hover:text-accent-ink">
            엄선 보러 가기 →
          </Link>
        </div>
      ) : (
        <ul className="mt-3 lg:space-y-3">
          {starred.map((s) => {
            const current = availability[s.id];
            const status = current?.status;
            const unavailable = status === "unavailable";
            return (
              <li key={s.id} data-card-key={s.id} className={`relative border-b border-line-soft py-4 lg:card lg:px-[18px] lg:py-[15px] ${unavailable ? "opacity-70" : "lg:card-hover"}`}>
                <div className="flex items-center gap-2 text-[12.5px] text-ink-4">
                  <span className="min-w-0 truncate text-ink-3">{current?.sourceName ?? s.sourceName}</span>
                  {s.publishedAt && <span className="num shrink-0">· {fullDateTime(s.publishedAt)}</span>}
                  <span className="ml-auto hidden shrink-0 sm:inline">
                    북마크 <span className="num">{fullDateTime(s.savedAt)}</span>
                  </span>
                  <button type="button" aria-label="북마크 해제" title="북마크 해제" onClick={() => removeStar(s.id)} className="relative z-10 -my-1 ml-auto grid size-7 shrink-0 place-items-center rounded-full text-ink-4 transition-colors hover:bg-bg-sunk hover:text-ink sm:ml-0">
                    <IconClose size={14} />
                  </button>
                </div>
                <h2 className="mt-1.5 text-[16px] font-[650] leading-[1.55] text-ink">
                  {unavailable ? (
                    s.title
                  ) : (
                    <Link viewTransition to={`/items/${s.id}`} className="transition-colors after:absolute after:inset-0 after:content-[''] hover:text-accent">
                      {s.title}
                    </Link>
                  )}
                </h2>
                {s.summary && <p className="mt-1.5 line-clamp-2 text-[14px] leading-[1.75] text-ink-3">{s.summary}</p>}
                {unavailable && <p className="mt-2 text-[12.5px] text-hot">이 콘텐츠는 더 이상 공개되지 않습니다. 직접 삭제하기 전까지 북마크는 유지됩니다.</p>}
                {status === "summary-only" && <p className="mt-2 text-[12.5px] text-amber-ink">소식원의 요청에 따라 이 콘텐츠는 현재 요약만 제공합니다.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
