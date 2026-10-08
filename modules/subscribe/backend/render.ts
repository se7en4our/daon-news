// The daily briefing as a Telegram post and as an email, from the issue the daily RSS feed is built from
// (publication/reports.ts feedIssues): headline, lead paragraph and each section's titles with their links.
import { SITE } from "@aihot/site";
import type { FeedIssue } from "@aihot/backend/publication/reports";
import { siteUrl } from "@aihot/backend/publication/links";
import { beijingWeekday } from "@aihot/contracts/time";

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "10월 8일 (목)" for a YYYY-MM-DD key. */
export function issueDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${m}월 ${d}일 (${beijingWeekday(key).slice(0, 1)})`;
}

export const dailyLink = (key: string) => siteUrl(`/daily/${key}`);

/** Telegram allows 4096 characters per message; entries that do not fit are counted at the end. */
const TELEGRAM_LIMIT = 3900;

export function telegramPost(issue: FeedIssue): string {
  const head = [`<b>${escapeHtml(SITE.name)} 데일리 브리핑 · ${issueDate(issue.key)}</b>`];
  if (issue.headline) head.push("", `<b>${escapeHtml(issue.headline)}</b>`);
  if (issue.leadParagraph) head.push(escapeHtml(issue.leadParagraph));
  const tail = ["", `<a href="${escapeHtml(dailyLink(issue.key))}">전체 브리핑 보기 →</a>`];
  const lines = [...head];
  let length = [...head, ...tail].join("\n").length;
  let left = 0;
  for (const section of issue.sections) {
    const label = ["", `<b>${escapeHtml(section.label)}</b>`];
    let labelled = false;
    for (const item of section.items) {
      const line = `• <a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a>`;
      const add = (labelled ? 0 : label.join("\n").length + 1) + line.length + 1;
      if (left || length + add > TELEGRAM_LIMIT) {
        left++;
        continue;
      }
      if (!labelled) lines.push(...label);
      labelled = true;
      lines.push(line);
      length += add;
    }
  }
  if (left) lines.push("", `외 ${left}건`);
  return [...lines, ...tail].join("\n");
}

export interface Mail {
  subject: string;
  text: string;
  html: string;
}

const footerText = (unsubscribe: string) =>
  [
    `이 메일은 ${SITE.name} 데일리 브리핑 구독을 신청하고 확인하신 분께 보내드립니다.`,
    `수신거부: ${unsubscribe}`,
    `발신: 다온클라우드 · ${SITE.contactEmail ?? "contact@daon.cloud"} · ${siteUrl("/")}`,
  ].join("\n");

const shell = (body: string, footer: string) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
<div style="max-width:640px;margin:0 auto;padding:28px 20px;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;color:#1c1917;line-height:1.65;word-break:keep-all;">
<div style="background:#ffffff;border-radius:12px;padding:28px 24px;">${body}</div>
<p style="font-size:12px;color:#78716c;margin:18px 4px 0;">${footer}</p>
</div></body></html>`;

export function dailyMail(issue: FeedIssue, unsubscribe: string): Mail {
  const date = issueDate(issue.key);
  const subject = `[${SITE.name}] ${issue.headline ?? `데일리 브리핑 ${date}`}`;
  const text = [
    `${SITE.name} 데일리 브리핑 · ${date}`,
    "",
    ...(issue.headline ? [issue.headline] : []),
    ...(issue.leadParagraph ? [issue.leadParagraph] : []),
    ...issue.sections.flatMap((s) => ["", `■ ${s.label}`, ...s.items.map((i) => `- ${i.title}\n  ${i.link}`)]),
    "",
    `전체 브리핑: ${dailyLink(issue.key)}`,
    "",
    footerText(unsubscribe),
  ].join("\n");
  const body = [
    `<p style="margin:0;font-size:13px;color:#78716c;">${escapeHtml(SITE.name)} 데일리 브리핑 · ${escapeHtml(date)}</p>`,
    issue.headline ? `<h1 style="font-size:21px;line-height:1.4;margin:10px 0 8px;">${escapeHtml(issue.headline)}</h1>` : "",
    issue.leadParagraph ? `<p style="font-size:15px;margin:0 0 8px;color:#44403c;">${escapeHtml(issue.leadParagraph)}</p>` : "",
    ...issue.sections.map(
      (s) =>
        `<h2 style="font-size:15px;margin:24px 0 8px;padding-top:16px;border-top:1px solid #e7e5e4;">${escapeHtml(s.label)}</h2><ul style="margin:0;padding-left:18px;">${s.items
          .map((i) => `<li style="margin:0 0 6px;font-size:14.5px;"><a href="${escapeHtml(i.link)}" style="color:#1c1917;">${escapeHtml(i.title)}</a></li>`)
          .join("")}</ul>`,
    ),
    `<p style="margin:26px 0 0;"><a href="${escapeHtml(dailyLink(issue.key))}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px;">전체 브리핑 보기</a></p>`,
  ].join("");
  const footer = [
    `이 메일은 ${escapeHtml(SITE.name)} 데일리 브리핑 구독을 신청하고 확인하신 분께 보내드립니다.`,
    `더 받지 않으시려면 <a href="${escapeHtml(unsubscribe)}" style="color:#78716c;">수신거부</a>를 눌러 주세요.`,
    `발신: 다온클라우드 · ${escapeHtml(SITE.contactEmail ?? "contact@daon.cloud")}`,
  ].join("<br>");
  return { subject, text, html: shell(body, footer) };
}

export function confirmMail(confirm: string): Mail {
  const subject = `[${SITE.name}] 구독 신청을 확인해 주세요`;
  const lead = `${SITE.name} 데일리 브리핑 구독을 신청하셨습니다. 아래 버튼을 눌러 확인하시면 매일 오전 9시 소식을 이메일로 보내드립니다.`;
  const ignore = "본인이 신청하지 않으셨다면 이 메일을 무시하세요. 확인하지 않은 신청은 7일 뒤 자동으로 삭제됩니다.";
  const text = [lead, "", `구독 확인: ${confirm}`, "", ignore].join("\n");
  const body = [
    `<h1 style="font-size:20px;margin:0 0 12px;">구독 신청을 확인해 주세요</h1>`,
    `<p style="font-size:15px;margin:0 0 20px;color:#44403c;">${escapeHtml(lead)}</p>`,
    `<p style="margin:0 0 20px;"><a href="${escapeHtml(confirm)}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px;">구독 확인하기</a></p>`,
    `<p style="font-size:13px;color:#78716c;margin:0;">${escapeHtml(ignore)}</p>`,
  ].join("");
  return { subject, text, html: shell(body, `발신: 다온클라우드 · ${escapeHtml(SITE.contactEmail ?? "contact@daon.cloud")}`) };
}
