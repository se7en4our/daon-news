import { pageMeta } from "@aihot/web/lib/seo.ts";
import type { Screen } from "@aihot/web/components/shell/screens.ts";
import { TokenAction } from "./TokenAction.tsx";

export const handle: Screen = { tab: "me", name: "수신거부" };

export function meta() {
  return pageMeta({ title: "수신거부", path: "/subscribe/unsubscribe", noindex: true });
}

export default function UnsubscribePage() {
  return (
    <TokenAction
      copy={{
        title: "수신거부",
        lead: "아래 버튼을 누르면 데일리 브리핑 이메일 발송이 중단되고 이메일 주소가 삭제됩니다.",
        button: "수신거부하기",
        done: "수신거부가 처리되었고 이메일 주소를 삭제했습니다. 언제든 다시 구독하실 수 있습니다.",
        endpoint: "/api/subscribe/unsubscribe",
      }}
    />
  );
}
