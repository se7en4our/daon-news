import { pageMeta } from "@aihot/web/lib/seo.ts";
import type { Screen } from "@aihot/web/components/shell/screens.ts";
import { TokenAction } from "./TokenAction.tsx";

export const handle: Screen = { tab: "me", name: "구독 확인" };

export function meta() {
  return pageMeta({ title: "구독 확인", path: "/subscribe/confirm", noindex: true });
}

export default function ConfirmPage() {
  return (
    <TokenAction
      copy={{
        title: "구독 확인",
        lead: "아래 버튼을 누르면 데일리 브리핑 이메일 구독이 완료됩니다.",
        button: "구독 확인하기",
        done: "구독이 완료되었습니다. 내일 오전 9시부터 데일리 브리핑을 보내 드립니다.",
        endpoint: "/api/subscribe/confirm",
      }}
    />
  );
}
