import { defineWebModule } from "@aihot/web/modules.ts";
import { IconMessage } from "@aihot/web/components/icons.tsx";

export default defineWebModule({
  name: "subscribe",
  sidebar: { section: "구독", items: [{ to: "/subscribe", label: "뉴스 구독", icon: IconMessage }] },
  tools: [{ to: "/subscribe", label: "뉴스 구독", icon: <IconMessage size={18} /> }],
});
