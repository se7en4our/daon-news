// 사이트 정체성과 독자에게 보이는 문구. 다른 분야로 바꿀 때는 먼저 이 파일을 고치세요.
// 웹과 백엔드가 모두 이 파일을 읽습니다. 수정 후 다시 빌드(docker compose up --build)하면 반영됩니다.
// 도메인은 여기 없습니다. 배포 시 환경 변수 SITE_URL 로 설정하세요.

/**
 * 데일리 브리핑·주간 리포트·월간 리포트의 발행 시각(한국 시간, HH:mm): 데일리 브리핑은 이 시각 이전의 24시간을 담고,
 * 주간 리포트는 자연주가 끝난 뒤의 월요일에, 월간 리포트는 매월 1일에 나옵니다. 스케줄링, 발행 완성 시간 창,
 * 결호 알림, 시간을 언급하는 모든 문구가 이 값을 읽습니다(public/ 아래 파일은 자리표시자 {{dailyTime}}·{{weeklyTime}}·
 * {{monthlyTime}} 로 표기). 스케줄링은 30분마다 점검하므로 정각이나 30분 단위로 적으세요.
 */
export const EDITION_TIMES = { daily: "09:00", weekly: "10:00", monthly: "10:30" };

/** "매일 08:00" "매주 월요일 10:00" "매월 1일 10:30": 문장에 들어가는 발행 시각. */
export const EDITION_WHEN = {
  daily: `매일 ${EDITION_TIMES.daily}`,
  weekly: `매주 월요일 ${EDITION_TIMES.weekly}`,
  monthly: `매월 1일 ${EDITION_TIMES.monthly}`,
};

export const SITE = {
  /** 사이트명: 내비게이션, 페이지 제목, 공유 이미지, RSS, MCP, 관리자에서 모두 사용합니다. */
  name: "DaON News",
  /**
   * 분야 키워드: 기본 표현에 합성됩니다. 예: "AI·IT 데일리 브리핑" "AI·IT 소식".
   * "법률" "HR" "금" 등으로 바꾸면 페이지에 "법률 데일리 브리핑" "법률 소식" 처럼 표시됩니다.
   */
  subject: "AI·IT",
  /** 홈 페이지의 전체 제목(브라우저 탭, 검색 결과). */
  homeTitle: "DaON News — AI·IT 업계 소식 · 매일 엄선 뉴스와 데일리 브리핑",
  /** 주제 목록 페이지(/topics)의 제목. */
  topicsTitle: "AI·IT 주제: 기업과 모델, 기술 분야, 콘텐츠 유형별 최신 소식",
  /** 피드백 폼 입력란의 예시. */
  feedbackExample: "예: 어떤 키워드를 검색했을 때 …… 문제가 있었고, 원래는 ……하려고 했습니다",
  /** 피드백 페이지 제목 아래 한 줄. */
  feedbackLead: "버그, 원하는 기능, 불편한 점 무엇이든 알려 주세요.",
  /** 피드백 폼 이메일 입력란의 안내. */
  feedbackEmailHint: "이메일을 남겨 주시면 답장을 드릴 수 있습니다",
  /** 한 줄 소개: 검색 엔진, 공유 카드, RSS, llms.txt 에서 사용합니다. */
  description: `여러 AI·IT 소식원에서 읽을 만한 소식을 골라 같은 사건의 기사를 하나로 묶고, ${EDITION_WHEN.daily} 데일리 브리핑을 발행합니다.`,
  /** llms.txt 의 한 줄 소개 아래에 붙는 상세 소개 문단(선택). */
  llmsIntro: null as string | null,
  /** 한 줄 문구: 공유 이미지, 포스터 하단. */
  tagline: "주목할 만한 AI·IT 소식",
  /** 검색 엔진이 읽는 키워드(홈 페이지 구조화 데이터). */
  keywords: ["AI 뉴스", "IT 뉴스", "AI 데일리 브리핑", "클라우드", "AI 업계 동향"] as string[],
  /** 사이트가 수집을 시작한 연도(구조화 데이터의 기간 범위, 선택). */
  since: null as string | null,
  /** 인터페이스 언어(HTML lang, og:locale). */
  locale: "ko-KR",
  /** 기본 도메인. SITE_URL 이 설정되지 않았을 때만 사용합니다. */
  defaultUrl: "https://news.daon.cloud",
  /** 표준 아이콘(favicon.ico, icon.png, icon-192.png, apple-icon.png, logo.svg) 외에 사이트 루트에 두는 아이콘, site/brand/ 안의 파일명(선택). manifest.webmanifest 나 외부에서 참조할 때 사용합니다. */
  rootIcons: [] as string[],
  /**
   * MCP 도구 이름의 접두사(소문자, 숫자, 밑줄). 도구 이름은 myhot_get_latest, myhot_search …… 처럼 됩니다.
   * 이미 연동한 사용자가 생긴 뒤에는 바꾸지 마세요.
   */
  mcpPrefix: "daonnews",
  /**
   * 공개 인터페이스(MCP, OpenAPI, llms.txt)의 버전 번호. 올리기만 하고 내리지 않습니다.
   * 인터페이스의 기존 필드나 의미를 바꾸면 메이저 버전을 올리고 배포 안내에 명확히 적으세요.
   */
  interfaceVersion: "4.0.0",
  /** 대외 연락 이메일(선택): llms.txt 와 Agent 사용 안내에 표기됩니다. */
  contactEmail: "contact@daon.cloud" as string | null,
  /** 소개 페이지 하단의 한 줄 문구(선택). */
  footerNote: "AIHOT 오픈소스 프레임워크 기반 (MIT)",
  /** 중국 본토 사이트의 ICP 등록번호(선택). 입력하면 사이드바 하단과 "내 정보" 페이지 하단에 표시되고 공신부 등록 시스템으로 연결됩니다. */
  icp: null as string | null,
  /** 소스 코드 GitHub 저장소 주소(선택). 입력하면 사이드바 하단과 "내 정보" 페이지 하단에 "GitHub 오픈소스"를 표시합니다. */
  github: null as string | null,
  /** 구조화 데이터의 사이트 운영자(검색 엔진용). */
  organization: {
    name: "DaON",
    /** 창립자(선택). */
    founder: null as null | { name: string; alternateName?: string; jobTitle?: string; description?: string; url?: string },
  },
  /** 소식원 수집 시 밝히는 이름과 버전(User-Agent 에 사용). 다른 사이트를 사칭하지 마세요. */
  crawlerName: "DaONNewsBot/1.0",
} as const;

/** 이용 규칙과 개인정보 안내 두 페이지(본문은 pages/ 안에 있음). */
export const POLICY = {
  terms: {
    /** 페이지명: 내비게이션, 푸터, 페이지 제목에 모두 사용합니다. */
    name: "이용 규칙",
    description: "본 사이트의 웹, RSS, 공개 API, MCP 이용 규칙입니다.",
    /** llms.txt 에서 이 페이지를 설명하는 한 줄(선택). */
    covers: null as string | null,
    /** Agent 연동 페이지의 RSS·API 두 영역에서 각각 안내하는 이용 규칙(선택). */
    notes: null as null | { rss: string; api: string },
    /**
     * 어떤 용도에 사전 허가가 필요한지 밝히는 문구(선택): llms 는 llms.txt "이용 안내"의 저작권 설명 뒤에,
     * agent 는 Agent 사용 안내의 "이용 규칙" 절 첫머리에 붙습니다.
     */
    license: null as null | { llms: string; agent: string },
    /**
     * 공개 API, RSS, OpenAPI 파일이 이용 규칙을 알리는 응답 헤더(선택): 그대로 덧붙이고, 이 페이지를 가리키는
     * Link 헤더(rel="terms-of-service")를 하나 더 추가합니다. 브라우저의 호출자도 이 헤더를 읽을 수 있습니다.
     */
    headers: null as null | Record<string, string>,
  },
  privacy: {
    description: "본 사이트가 브라우저 로컬 데이터, 피드백 자료, 접속 로그를 어떻게 처리하는지 안내합니다.",
    /** llms.txt 에서 이 페이지를 설명하는 한 줄(선택). */
    covers: null as string | null,
  },
  /**
   * X 게시글 자체의 글과 이미지를 전문으로 볼지 여부: 전문으로 보면 해당 글이 사이트 내 전문을 허용할 때만 표시하고
   * (소식원이 전문을 허용하고 본문도 수집된 경우), 전문으로 보지 않으면 제목·요약과 마찬가지로 항상 표시합니다.
   */
  xPostIsFullText: true,
} as const;

/** 뉴스 카드와 상세 페이지의 몇몇 표현과 표시 설정. */
export const ITEM_COPY = {
  /** 모델이 쓴 그 한 줄의 이유를 뭐라고 부를지: 카드, 상세 페이지, Markdown 내보내기, Agent 응답, 그룹 알림에서 모두 사용합니다. */
  reasonLabel: "추천 이유",
  /** 독자가 웹과 공유 이미지에서 AI 점수를 볼지 여부. 표시만 제어합니다: 공개 API 와 MCP 데이터는 그대로 score 를 포함하고, 관리자에는 그대로 표시됩니다. */
  showScore: true,
};

/** 소개 페이지의 QR 코드 카드 하나. */
interface ContactCard {
  kind: string;
  title: string;
  note: string;
  /** 외부에서 링크했던 루트 디렉터리 파일명(선택), 예: qr-wechat.jpg. 이 주소는 항상 현재의 QR 코드로 연결됩니다. */
  alias?: string;
}

/** 소개 페이지 문구. 숫자(소식원 수, 수집 수, 엄선 수, 데일리 브리핑 호수)는 사이트 실시간 통계에서 가져오므로 여기 적지 않습니다. */
export const ABOUT = {
  kicker: `${SITE.name} 소개`,
  /** 페이지 설명(검색 결과, 공유 카드). */
  description: `${SITE.name} 소개: ${SITE.description}`,
  /** 큰 제목: 첫 줄은 기본 색, 둘째 줄은 강조 색. */
  headline: ["AI 업계는 매일 새로운 소식이 쏟아지지만,", "볼 만한 건 몇 건뿐입니다."] as [string, string],
  /** 제목 아래 한 문단. {sources} 는 실시간 소식원 수로 치환됩니다(양쪽에 공백이 자동으로 들어가므로 {sources} 양옆에 공백을 쓰지 마세요). 통계를 못 가져오면 sourcesFallback 으로 대체됩니다. */
  lead: `${SITE.name} 가 소식원{sources}곳을 대신 지켜봅니다: 수집·병합·채점·엄선을 거쳐 ${EDITION_WHEN.daily} 데일리 브리핑을 한 부 발행합니다. 무료이며 가입이 필요 없습니다.`,
  sourcesFallback: "수십",
  /** 소식원 흐름 애니메이션 아래의 네 단계. */
  steps: {
    collect: "공식 블로그, 미디어, 개인의 구독 소스를 모두 지켜봅니다. 자주 갱신되는 소스일수록 더 자주 확인하며, 최소 15분에 한 번 봅니다.",
    store: "수집한 것은 모두 저장하고, 같은 사건을 다룬 기사를 하나로 묶습니다. 핫이슈 순위도 여기서 계산됩니다.",
    select: `모델이 먼저 이 분야의 사건인지, 실질 정보가 있는지 판단한 뒤 한국어 제목·요약·${ITEM_COPY.reasonLabel}를 작성합니다. 홍보성 글과 중복 전재는 들어오지 못합니다.`,
    publish: `${EDITION_WHEN.daily} 데일리 브리핑, ${EDITION_WHEN.weekly} 주간 리포트, ${EDITION_WHEN.monthly} 월간 리포트를 발행합니다.`,
  },
  /**
   * 작성자 블록(선택), null 이면 표시하지 않습니다.
   * avatarSourceId: X 계정 소식원의 id. 프로필 이미지를 그 계정에서 가져옵니다(선택).
   * QR 코드는 관리자 "설정"에서 업로드하거나 site/brand/contact/ 에 두세요. QR 코드가 없으면 해당 카드를 표시하지 않습니다.
   */
  maker: null as null | {
    name: string;
    avatarSourceId?: string | null;
    greeting: string[];
    wechat?: ContactCard;
    feishu?: ContactCard;
  },
  /** 페이지 하단의 저작권·게재 중단 안내. 가운데에 "피드백 페이지" 링크가 들어갑니다. */
  copyright: [`${SITE.name} 는 요약을 모으고 읽기 쉽게 색인하는 서비스이며, 원문 저작권은 각 출처에 있습니다. 출처 측으로서 정정·게재 중단·표시 방식 조정을 원하시면`, "문의해 주세요."] as [string, string],
  /** 페이지 하단 "이용 규칙" 링크의 앵커 id(선택): 외부 문서가 이 앵커를 고정해 두었다면 입력하고, 이후 바꾸지 마세요. */
  termsAnchor: null as string | null,
} as const;

/** 관리자 페이지에서 관리자에게 보이는 안내(선택). */
export const ADMIN = {
  /** "피드백" 페이지 제목 아래 한 줄. */
  feedbackNote: null as string | null,
  /** 확인창에 덧붙이는 본 사이트 규정 한 줄: 피드백 출처를 차단할 때. */
  banNote: null as string | null,
  /** 확인창에 덧붙이는 본 사이트 규정 한 줄: 유료 서비스의 요청 상한을 조정할 때. */
  budgetNote: null as string | null,
};

/** Agent 연동 페이지의 예시. */
export const AGENT = {
  /** MCP 도구 표의 "검색" 행: 무엇을 검색할 수 있고, 어떻게 물어볼 수 있는지. */
  search: { scope: "기업·제품·인물·주제로 최근 7일 검색", ask: "이 기업은 최근 무엇을 발표했나요?" },
};

/** 데일리 브리핑·주간 리포트·월간 리포트 지면에서 쓰는 표현. */
export const REPORTS = {
  /** 제호 아래 발행자 한 줄. */
  imprint: SITE.name.toUpperCase(),
  /** 제호 옆의 한 단어. */
  motto: SITE.subject as string,
  /** 각 리포트 페이지의 설명(검색 결과, 공유 카드), 마침표 없이. llms.txt 가 주간·월간 리포트를 소개할 때도 사용합니다. */
  descriptions: {
    daily: `${SITE.name} ${subjectAfter(`${EDITION_WHEN.daily}(한국 시간) 발행하는`, "업계 엄선 데일리 브리핑")}`,
    weekly: subjectAfter("매주", "업계 종합 리뷰"),
    monthly: subjectAfter("매월", "업계 결산"),
  },
  /**
   * 한 호 안의 한 건을 뭐라고 부를지("4건의 핵심 이슈"): 헤드라인이 없을 때의 제목("이날의 AI·IT 핵심 이슈 4건"),
   * 제호와 지난 호 목록의 건수, 주간·월간 리포트에 총평이 없을 때의 그 문장, 구독 안내의 "섹션별로 정리한 핵심 이슈"에 모두 사용합니다.
   */
  entry: { measure: "건", noun: "핵심 이슈" },
  /** 제호의 나머지 숫자 뒤에 붙는 표현. 엄선 수와 데일리 브리핑 호수는 소개 페이지·주제 페이지에서도 이렇게 표기합니다. */
  metricUnits: { sourcesCount: "개 출처", firstPartyEvents: "건 1차 발표", selectedCount: "건 엄선", reportsCovered: "호 데일리 브리핑" },
  /** 리포트 공유 이미지의 "총 몇 건" 표현. */
  shareUnit: "건의 핵심 이슈",
  /** 데일리 브리핑 기간에 심사를 거친 자료는 있으나 새로운 핵심 이슈가 없을 때의 제목과 리드. */
  quiet: { title: "오늘은 조용합니다, 큰 이슈 없음", paragraph: `${subjectAfter("한국 시간 {start} 부터 {end} 까지, 새로운", "핵심 이슈")}가 없었습니다.` },
};

/** 운영 알림(사이트 관리자에게만 발송)에서 배포에 따라 달라지는 몇몇 표현. */
export const ALERTS = {
  /** 몇 분 동안 새 기사 수집이 없으면 "사이트가 새 콘텐츠 수집을 멈췄습니다" 알림을 보낼지(최대 하루). 환경 변수 ALERT_QUIET_MINUTES 가 우선합니다. */
  quietMinutes: 360,
  /** 같은 알림에서 "없음" 뒤에 평소 수집량을 한 줄 덧붙임. null 이면 쓰지 않음. */
  usualFlow: null as string | null,
  /** worker 가 멈췄다는 알림에서, 그 로그를 어떻게 보는지. */
  workerLogs: "worker 로그 보기(docker compose logs worker)",
  /** 특정 모델 서비스가 요청을 거부하거나 한도를 소진했을 때, 알림에 어떤 단계가 멈췄는지 적음. 적지 않은 서비스는 일반 표현을 사용. */
  modelStops: {} as Record<string, string>,
};

/** 관리자에서 새 소식원을 만들 때의 기본 설정. */
export const SOURCE_DEFAULTS = {
  /** 사이트 내 전문 표시. false 면 요약과 원문 링크만 표시합니다. */
  siteFulltext: false,
};

/**
 * 커뮤니티형 소식원(소식원 id 입력): 열기 계산 시 게시한 계정 단위로 세며, 한 계정을 독립 출처 하나로 보고 소식원 전체를 하나로 치지 않습니다.
 * dev 는 dev.to 의 글 피드, hn 은 Hacker News 의 게시글 피드입니다.
 */
export const COMMUNITY_FEEDS: { dev: string[]; hn: string[] } = {
  dev: [],
  hn: [],
};

/** 각 페이지 공유 이미지(/og/pages/*.png)의 텍스트. 주제 목록 페이지의 이미지는 주제 수에 따라 자동 생성됩니다. */
export const CARDS: Record<string, { kicker: string; title: string; subtitle: string; accent?: "hot" | "amber" }> = {
  site: { kicker: subjectAfter("매일", "엄선 뉴스"), title: SITE.tagline, subtitle: SITE.description },
  all: { kicker: subjectAfter("전체", "소식"), title: "모든 소식원의 최신 소식을 한곳에서", subtitle: "각 소식원의 최신 소식을 시간순으로 모았으며, 카테고리와 태그로 필터링할 수 있습니다." },
  hot: { kicker: "핫이슈", title: "지난 48시간, 사람들이 무엇을 이야기했나", subtitle: "열기 지수, 추이, 그리고 열기를 이룬 공개 출처.", accent: "hot" },
  daily: { kicker: withSubject("데일리 브리핑"), title: subjectAfter(`매일 ${spokenTime(EDITION_TIMES.daily)}, 끝까지 읽을 수 있는`, "데일리 브리핑"), subtitle: `${subjectAfter("전날 주목할 만한", "소식")}.` },
  weekly: { kicker: withSubject("주간 리포트"), title: `한 주의 ${REPORTS.entry.noun}, 한눈에`, subtitle: "이번 주의 흐름, 주요 발표, 다시 볼 만한 논의." },
  monthly: { kicker: withSubject("월간 리포트"), title: "한 달의 변화", subtitle: "월간 흐름과 핵심 사건 돌아보기." },
  about: { kicker: "소개", title: `${SITE.name} 소개`, subtitle: SITE.description },
  terms: { kicker: "이용 규칙", title: `${SITE.name} 이용 규칙`, subtitle: "웹, API, RSS, MCP 의 이용 범위." },
  privacy: { kicker: "개인정보 안내", title: `${SITE.name} 개인정보 안내`, subtitle: "접속 로그, 브라우저 로컬 데이터, 피드백 자료의 처리 방식." },
  changelog: { kicker: "업데이트 로그", title: `${SITE.name} 업데이트 로그`, subtitle: "기능 업데이트, 개선, 공지, 종료 기록." },
  feedback: { kicker: "피드백", title: "더 좋아질 수 있는 점을 알려 주세요", subtitle: "콘텐츠, 기능, 연동, 또는 출처 측의 정정·게재 중단 요청." },
  agent: { kicker: "Agent 연동", title: `${SITE.name} 를 당신의 Agent 에 연결하세요`, subtitle: "MCP, RSS, API 세 가지 방식, 익명 읽기 전용, API Key 불필요." },
};

/** 공개 인터페이스의 접근 약정에서 배포에 따라 달라지는 몇몇 값: Agent 사용 안내, llms.txt 에 표기됩니다. */
export const ACCESS = {
  /** 동일 IP 가 분당 대략 몇 번 요청할 수 있는지. 초과하면 429 와 Retry-After 를 받습니다(선택, 배포한 리버스 프록시가 제한). null 이면 제한 없음이며 안내에 언급하지 않습니다. */
  ratePerMinute: null as number | null,
  /** 프로그램으로 데이터를 동기화하는 쪽이 밝힐 User-Agent(선택). JSON 인터페이스 안내 뒤에 적습니다. */
  userAgent: null as string | null,
};

/** 이 배포 고유의 몇몇 설정(선택). */
export const DEPLOYMENT = {
  /** 자격 증명 그룹 파일(models.env, collectors.env ……)을 기본으로 둘 디렉터리, 저장소 루트 기준. 환경 변수 AIHOT_CREDENTIALS_DIR 가 우선하고, 둘 다 없으면 환경 변수만 읽습니다. */
  credentialsDir: null as string | null,
  /** 자격 증명 그룹의 파일명(자격 증명 디렉터리 안, 선택): 지정하지 않은 그룹은 "그룹명.env"(예: models.env)를 사용합니다. */
  credentialFiles: {} as Partial<Record<string, string>>,
  /** 이 배포가 추가로 요구하는 자격 증명([그룹, 환경 변수명]). 프로덕션 API 시작 시 점검하며, 기본값은 추가 요구 없음. */
  requiredSecrets: [] as const,
  /** 운영 api 가 받는 Host(CDN 오리진 도메인, 선택). 로컬 개발 시 웹 개발 서버가 api 로 넘기는 요청도 이 값으로 바꿔 운영과 일치시킵니다. */
  originHost: null as string | null,
  /** 리버스 프록시가 미로그인 관리자 접근을 로그인으로 넘길 때, 원래 주소를 어떤 요청 헤더로 전달할지(선택, 로그인 후 그 주소로 복귀). */
  loginReturnHeader: null as string | null,
  /**
   * 이미지 프록시가 원본 사이트에서 이미지를 가져올 때의 트래픽 상한: 초과하면 캐시 없는 이미지는 먼저 503 을 반환하고,
   * 해당 분/일이 지날 때까지 기다립니다. 당일 한도를 소진하면 운영 데일리 브리핑에 들어갑니다.
   * null 이면 상한 없음. 환경 변수 IMGPROXY_UPSTREAM_MB_PER_MINUTE, IMGPROXY_UPSTREAM_GB_PER_DAY 가 우선합니다.
   */
  imageUpstreamBudget: null as null | { mbPerMinute: number; gbPerDay: number },
  /**
   * 서버가 직접 연결해야 하고 아웃바운드 프록시(EGRESS_PROXY_URL)를 거치지 않음이 실측된 도메인. 수집과 이미지가 공유(선택).
   * 리다이렉트마다 대상 도메인에 따라 다시 경로를 정하고, 직접 연결에서도 실제 연결 주소를 계속 점검합니다.
   */
  directFetchHosts: [] as string[],
  /**
   * 엄선 평가(scripts/eval-selection.ts)에 인자가 없을 때 사용하는 금표준 세트: 파일(저장소 루트 기준), 샘플 건수, 어느 분할만 뽑을지, 임계값 스캔 범위.
   * null 이면 .data/gold.jsonl 의 전체 샘플(최대 200건)을 사용하고 40–90 사이를 스캔합니다.
   */
  selectionGold: null as null | { file: string; sample: number; split: string; sweep: [number, number] },
};

/** RSS 구독 소스 안내에서 사이트에 따라 달라지는 표현. */
export const FEED_COPY = {
  /** "전체 소식" 소스 안내에서, 미심사 콘텐츠·저관련 항목·이미 병합된 중복 항목 외에 포함되지 않는 내용을 추가로 명시(선택). */
  allLeavesOut: [] as string[],
};

/**
 * 공개 인터페이스(API, RSS, MCP)에서 웹과 다른 카테고리(선택). 출시 후 바꾸지 마세요: 인터페이스 파라미터와 구독 주소에 카테고리의 key 가 들어 있습니다.
 * merge: 다른 카테고리로 합쳐 발행하는 카테고리. key 는 분야 패키지의 카테고리, 값은 합쳐지는 대상 카테고리(공개 인터페이스가 웹보다 한 카테고리 적을 때 사용);
 * feedLabels: 분류 RSS 제목에 쓰는 이름. 분야 패키지의 feedLabel 을 대체합니다(다른 카테고리로 합쳐지면 이름도 함께 바뀌는 경우가 많습니다).
 */
export const PUBLIC_CATEGORIES = {
  merge: {},
  feedLabels: {},
} as const;

/** "AI·IT 데일리 브리핑" 류의 표현: 분야 키워드와 명사 사이에, 영문 끝은 공백을 넣고 비영문 끝은 넣지 않습니다. */
export function withSubject(noun: string): string {
  return /[A-Za-z0-9]$/.test(SITE.subject) ? `${SITE.subject} ${noun}` : `${SITE.subject}${noun}`;
}

/** "주제로 보는 AI·IT" "지난 AI·IT 데일리 브리핑" 류의 표현: 분야 키워드를 텍스트 뒤에 붙이되, 영문 앞엔 공백을 넣고 비영문 앞엔 넣지 않습니다. noun 은 withSubject 규칙대로 이어 붙입니다. */
export function subjectAfter(text: string, noun?: string): string {
  const gap = /^[A-Za-z0-9]/.test(SITE.subject) ? " " : "";
  return `${text}${gap}${noun ? withSubject(noun) : SITE.subject}`;
}

/** "8시" "10시 30분": 구어의 HH:mm. */
function spokenTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  return `${hour}시${minute ? ` ${minute}분` : ""}`;
}
