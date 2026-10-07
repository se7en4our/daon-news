import { POLICY, SITE } from "@aihot/site";
import copy from "@aihot/site/pages/privacy.md?raw";
import { edgeTtl } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { prepareCopy } from "../lib/site-copy";
import { CopyPage, LegalFooterLinks } from "../features/copy/CopyPage";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: "me" };

const PRIVACY = prepareCopy(copy);

export function headers() {
  return edgeTtl(300);
}

export function meta() {
  return pageMeta({ title: "개인정보 처리방침", description: POLICY.privacy.description, path: "/privacy", image: "/og/pages/privacy.png" });
}

export default function PrivacyPage() {
  return (
    <CopyPage
      doc={PRIVACY.doc}
      rendered={PRIVACY.rendered}
      eyebrow={SITE.name}
      footer={<LegalFooterLinks links={[{ to: "/terms", label: POLICY.terms.name }, { to: "/feedback", label: "피드백 페이지" }]} note={`개인정보 처리방침 ${PRIVACY.doc.meta["버전"] ?? ""} · ${PRIVACY.doc.meta["시행일"] ?? ""}`} />}
    />
  );
}
