// 사이트의 워드마크와 링 마크: 페이지에서는 Wordmark 로 사이트명을 그린다(size 는 높이, 단위는 픽셀). RingMark 는 작은 마크로, 회전시키면 로딩 애니메이션이 된다.
// 여기서는 사이트명으로 글자를 조판한다. 전용 로고가 있으면 Wordmark 를 본인의 SVG 로 교체한다(동일한 파라미터 유지).
import { SITE } from "../site.ts";

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  return (
    <span className={`inline-flex items-center font-black leading-none tracking-[-0.03em] ${className}`} style={{ fontSize: Math.round(size * 0.92) }} aria-label={title} role="img">
      <span aria-hidden="true" className="mr-[0.3em] inline-block size-[0.42em] rounded-full bg-accent" />
      <span aria-hidden="true">{SITE.name}</span>
    </span>
  );
}

/** A ring with a dot; spinning, it is the loader. */
export function RingMark({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g style={spinning ? { transformOrigin: "12px 12px", animation: "spin-slow 1.1s linear infinite" } : undefined}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="42 15" />
      </g>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}
