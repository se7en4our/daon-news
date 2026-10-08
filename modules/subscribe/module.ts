import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "subscribe",
  pages: [
    { path: "subscribe", file: "web/subscribe.tsx" },
    { path: "subscribe/confirm", file: "web/confirm.tsx" },
    { path: "subscribe/unsubscribe", file: "web/unsubscribe.tsx" },
  ],
});
