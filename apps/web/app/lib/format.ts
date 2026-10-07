import { beijingDate, beijingTime } from "@aihot/contracts/time";

/** "9월 28일" of a calendar date (YYYY-MM-DD). */
export function monthDay(date: string): string {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
}

/** Korean short weekday (일..토) of a calendar date (YYYY-MM-DD). */
const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];
/** "토" of a calendar date (YYYY-MM-DD). */
export function weekdayShort(date: string): string {
  return WEEKDAY_SHORT[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "방금";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}일 전`;
  return beijingDate(iso);
}

export function fullDateTime(iso: string): string {
  return `${beijingDate(iso)} ${beijingTime(iso)}`;
}

/** "9월 24일 10:51" (KST), for lists that span days. */
export function monthDayTime(iso: string): string {
  return `${monthDay(beijingDate(iso))} ${beijingTime(iso)}`;
}

export function sourceInitial(name: string): string {
  const s = name.replace(/^[^\p{L}\p{N}]+/u, "");
  return (s[0] ?? "A").toUpperCase();
}
