import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { SITE } from "@aihot/site";
import { Presence } from "../components/ui/Presence";
import { edgeTtl } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { KEYS, lastPage, readJson, writeRaw } from "../lib/local-state";
import { IconCheck, IconClose, IconImage } from "../components/icons";
import { RingMark } from "@aihot/site/brand/Logo.tsx";
import { AsideCard, ReadingLayout } from "../components/ui/Page";
import { PhoneBar } from "../components/shell/PhoneBar";
import type { Screen } from "../components/shell/screens";
import { webModules } from "../site-modules";

export const handle: Screen = { tab: "me", name: "피드백" };

export function headers() {
  return edgeTtl(300);
}

export function meta() {
  return pageMeta({ title: "피드백", description: `${SITE.name}이(가) 더 나아질 수 있는 점을 알려주세요: 콘텐츠, 기능, 연동, 또는 소식원의 정정·게시 중단 요청.`, path: "/feedback", image: "/og/pages/feedback.png", noindex: true });
}

interface Draft {
  content: string;
  email: string;
  pageUrl: string;
}

function parseDraft(value: unknown): Draft | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Record<string, unknown>;
  return { content: String(d.content ?? ""), email: String(d.email ?? ""), pageUrl: String(d.pageUrl ?? "") };
}

/** Drafts the site's modules keep elsewhere in this browser. */
const otherDrafts = () => webModules().flatMap((m) => (m.feedbackDraft ? [m.feedbackDraft] : []));

function readDraft(): Draft | null {
  let draft = parseDraft(readJson(KEYS.feedbackDraft));
  for (const other of otherDrafts()) draft ??= parseDraft(other.read());
  return draft;
}

/** Saves the draft in this browser, or clears it (null); false when the browser refused. */
function writeDraft(d: Draft | null): boolean {
  const saved = writeRaw(KEYS.feedbackDraft, d && JSON.stringify({ ...d, savedAt: new Date().toISOString() }));
  // Another draft is kept until this one is saved; a submitted draft clears them all.
  if (saved || d === null) for (const other of otherDrafts()) other.clear();
  return saved;
}

const TIPS = ["문제가 생긴 페이지나 기사 링크", "무엇을 보았고 원래 무엇을 하려 했는지", "스크린샷이 있으면 더 좋습니다. 민감 정보는 먼저 가려주세요"];

function FeedbackAside() {
  return (
    <>
      <AsideCard title="이 점을 명확히 적으면 처리가 빨라집니다">
        <ol className="space-y-2.5">
          {TIPS.map((t, i) => (
            <li key={t} className="flex gap-2.5 text-[13px] leading-[1.6] text-ink-3">
              <span className="mono mt-px text-[11px] font-bold text-accent">{String(i + 1).padStart(2, "0")}</span>
              {t}
            </li>
          ))}
        </ol>
      </AsideCard>
      <AsideCard title="소식원이신가요">
        <p className="text-[13px] leading-[1.75] text-ink-3">소식원으로서 정정, 게시 중단, 노출 방식 조정을 원하시면 해당 기사 링크와 요청 사항을 적어주시면 됩니다.</p>
      </AsideCard>
    </>
  );
}

/**
 * Some phones report a JPEG as image/jpg, or give no type at all: the file name decides then. The
 * server checks the picture's real bytes either way.
 */
function screenshotType(file: File): string {
  const type = file.type.trim().toLowerCase();
  if (type === "image/jpg") return "image/jpeg";
  if (type && type !== "application/octet-stream") return type;
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return type;
}

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_TEXT = 2000;

export default function FeedbackPage() {
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<Draft>({ content: "", email: "", pageUrl: params.get("from") ?? "" });
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; message?: string; id?: number }>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readDraft();
    // The page the reader was on before coming here (tracked across in-site navigation, "내 메뉴" skipped);
    // a document the browser opened fresh falls back to its referrer.
    const before = params.get("from") ? null : (lastPage() ?? (document.referrer.startsWith(location.origin) ? document.referrer : null));
    const from = before ? new URL(before, location.origin).href : null;
    if (saved) setDraft((d) => ({ ...saved, pageUrl: d.pageUrl || from || saved.pageUrl }));
    else if (from) setDraft((d) => ({ ...d, pageUrl: from }));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => writeDraft(draft.content || draft.email ? draft : null), 400);
    return () => clearTimeout(t);
  }, [draft]);

  useEffect(() => {
    if (!shot) return;
    return () => URL.revokeObjectURL(shot.url);
  }, [shot]);

  const pick = (picked: File | null | undefined) => {
    if (!picked) return;
    const type = screenshotType(picked);
    if (!/^image\/(png|jpeg|webp)$/.test(type)) return setState({ kind: "error", message: "스크린샷은 PNG, JPEG 또는 WebP여야 합니다." });
    const file = type === picked.type ? picked : new File([picked], picked.name, { type });
    if (file.size > MAX_IMAGE) return setState({ kind: "error", message: "스크린샷 원본은 5 MB를 넘을 수 없습니다." });
    setShot({ file, url: URL.createObjectURL(file) });
    setState({ kind: "idle" });
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) pick(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.content.trim().length < 2) return setState({ kind: "error", message: "피드백 내용을 입력해 주세요." });
    setState({ kind: "sending" });
    try {
      const form = new FormData();
      form.set("content", draft.content);
      form.set("email", draft.email);
      form.set("pageUrl", draft.pageUrl);
      if (shot) form.set("screenshot", shot.file);
      const res = await fetch("/api/site/feedback", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setState({ kind: "error", message: body.detail ?? "제출에 실패했습니다. 잠시 후 다시 시도하세요." });
      writeDraft(null);
      setState({ kind: "done", id: body.id });
      setDraft({ content: "", email: "", pageUrl: "" });
      setShot(null);
    } catch {
      setState({ kind: "error", message: "네트워크가 원활하지 않습니다. 초안은 기기에 저장되었으니 나중에 다시 제출하세요." });
    }
  };

  if (state.kind === "done") {
    return (
      <ReadingLayout>
        <div className="card px-6 py-14 text-center">
          <div className="anim-pop-in mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-accent-contrast">
            <IconCheck size={26} />
          </div>
          <h1 className="mt-6 text-[22px] font-semibold text-ink">접수되었습니다. 감사합니다</h1>
          <p className="mt-2 text-[14px] text-ink-3">
            피드백 번호 <span className="mono font-semibold text-ink">#{state.id}</span>, 회신이 필요할 때 이 번호를 참조합니다.
          </p>
          <Link to="/" className="mt-8 inline-flex h-10 items-center rounded-full bg-ink px-6 text-[14px] font-medium text-bg transition-opacity hover:opacity-90">
            엄선으로 돌아가기
          </Link>
        </div>
      </ReadingLayout>
    );
  }

  const field = "w-full rounded-card bg-bg-sunk text-ink outline-none ring-1 ring-inset ring-line-soft transition-[background-color,box-shadow] placeholder:text-ink-4 hover:ring-line-strong focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:ring-accent dark:bg-bg-muted/60 dark:focus:bg-surface";
  const label = "mb-2 block text-[13px] font-semibold text-ink";
  const canSend = draft.content.trim().length >= 2 && state.kind !== "sending";
  return (
    <>
    <PhoneBar back={{ to: "/more", label: "내 메뉴" }} title="피드백" />
    <ReadingLayout aside={<FeedbackAside />}>
      <header>
        <h1 data-page-title="" className="text-[24px] font-semibold leading-[1.3] text-ink">의견을 들려주세요</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{SITE.feedbackLead}</p>
      </header>

      <form
        onSubmit={submit}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`card mt-6 overflow-hidden transition-shadow ${dragging ? "shadow-[0_0_0_3px_var(--accent-soft)] ring-1 ring-accent" : ""}`}
      >
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label htmlFor="fb-content" className={label}>
              무슨 말씀이든 들려주세요
            </label>
            <div className="relative">
              <textarea
                id="fb-content"
                required
                rows={9}
                maxLength={MAX_TEXT}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder={SITE.feedbackExample}
                className={`${field} block resize-y px-4 pb-8 pt-3.5 text-[14.5px] leading-relaxed`}
              />
              <span className="mono pointer-events-none absolute bottom-3 right-4 text-[11px] text-ink-4">
                {draft.content.length} / {MAX_TEXT}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="fb-email" className={label}>
              이메일 <span className="font-normal text-ink-4">(선택)</span>
            </label>
            <input id="fb-email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder={SITE.feedbackEmailHint} className={`${field} h-11 px-4 text-[14.5px]`} />
          </div>

          <div>
            <span className={label}>
              스크린샷 <span className="font-normal text-ink-4">(선택)</span>
            </span>
            {shot ? (
              <div className="flex items-center gap-4 well rounded-card p-3">
                <img src={shot.url} alt="스크린샷 미리보기" className="h-16 w-24 shrink-0 rounded-control border border-line bg-surface object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink-2">{shot.file.name}</div>
                  <div className="mono mt-0.5 text-[11.5px] text-ink-4">{(shot.file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button type="button" aria-label="스크린샷 제거" onClick={() => setShot(null)} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-4 transition-colors hover:bg-surface hover:text-ink">
                  <IconClose size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`group flex w-full items-center gap-3.5 rounded-card border border-dashed px-4 py-3.5 text-left transition-colors ${dragging ? "border-accent bg-accent-softer" : "border-line-strong hover:border-ink-4 hover:bg-bg-sunk/60"}`}
              >
                <span className="grid size-10 shrink-0 place-items-center well rounded-tile text-ink-3 transition-colors group-hover:text-accent">
                  <IconImage size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink-2">문제 스크린샷 추가</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-4">붙여넣기나 드래그도 가능합니다 · 민감 정보는 먼저 가려주세요. PNG, JPEG 또는 WebP, 원본 5 MB 이하</span>
                </span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </div>

          <Presence show={state.kind === "error"} enter="anim-notice-in" exit="anim-fade-out" duration={160}>
            <p role="alert" className="rounded-tile bg-hot-soft px-3.5 py-2.5 text-[13px] text-hot">
              {state.kind === "error" ? state.message : ""}
            </p>
          </Presence>
        </div>

        <div className="flex flex-col-reverse gap-4 border-t border-line-soft bg-bg-sunk/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:bg-bg-muted/30">
          <p className="text-[12px] leading-relaxed text-ink-4 sm:max-w-[400px]">
            API 키, 신분증, 문제와 무관한 민감 정보는 제출하지 마세요. 제출하면 피드백 내용, 선택 입력한 이메일, 페이지 정보, 스크린샷이{" "}
            <Link viewTransition to="/privacy" className="text-accent hover:underline">
              개인정보 처리방침
            </Link>
            에 따라 처리됨에 동의하는 것으로 간주됩니다.
          </p>
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-accent px-6 text-[14px] font-medium text-accent-contrast transition-[background-color,opacity] hover:bg-accent-ink disabled:bg-line-strong disabled:text-ink-4 sm:self-auto"
          >
            {state.kind === "sending" && <RingMark className="size-4" spinning />}
            피드백 보내기
          </button>
        </div>
      </form>
    </ReadingLayout>
    </>
  );
}
