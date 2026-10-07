// Shared admin vocabulary.
export const KIND_LABEL: Record<string, string> = { rss: "RSS", web_list: "웹 목록", json_list: "JSON", x_search: "X", mp_account: "공식 계정", external: "외부 제보" };
export const MODE_LABEL: Record<string, string> = { editorial: "엄선", hot_signal: "분위기", isolated: "격리" };
export const HEALTH_LABEL: Record<string, string> = { ok: "정상", degraded: "불안정", failing: "실패", paused: "일시정지", unknown: "미점검" };
export const VISIBILITY_LABEL: Record<string, string> = { public: "공개", "summary-only": "요약만", withdrawn: "내림" };
export const FEEDBACK_STATUS: Record<string, string> = { new: "새 피드백", triaged: "처리 중", replied: "답변 완료", resolved: "해결됨", spam: "스팸" };
export const TIER_LABEL: Record<string, string> = { T1: "T1", T1_5: "T1.5", T2: "T2", EXCLUDE_MP: "공식 계정 제외" };
