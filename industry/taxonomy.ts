// 이 분야의 분류 체계: 카테고리, 태그 어휘, 회사(주체) 명부, 그리고 주체를 헷갈리지 않게 하는 신원 사전.
// 모델은 여기 어휘에 따라 태그를 달고, 주제 페이지(topics.json)는 태그로 분류하며, 필터 바는 카테고리로 묶는다.
// 분야를 바꿀 때: 카테고리의 key 는 URL(/all?category=…)에 들어가므로 출시 후에는 바꾸지 말 것. 태그와 명부는 언제든 늘리거나 줄여도 된다.

/**
 * 웹에 노출되는 카테고리(필터 바, 카드 배지, RSS 카테고리 구독). key 는 URL 과 API 상의 신원이니 출시 후 바꾸지 말 것.
 * section 은 데일리 브리핑의 섹션 제목(여러 카테고리가 한 섹션을 공유할 수 있고, 여기 순서대로 배치된다); guide 는 구조 추출 모델에게 이 카테고리가 무엇을 담고
 * 인접 카테고리와의 경계가 어디인지 알려준다(전체 분류 원칙은 prompts/structure.md 에 적혀 있다).
 * commentary 는 평론류(튜토리얼, 관점)를 표시한다: 데일리 브리핑에서 이미 다룬 이슈에 평론류 후속 보도가 붙으면 한 줄 속보로만 들어간다(그 이슈를 보도한 소식원이 충분히 많을 때는 예외).
 * 분류되지 않은 자료는 데일리 브리핑에서 key 가 industry 인 첫 카테고리가 속한 섹션에 넣는다(없으면 마지막 섹션).
 * feedLabel 은 카테고리별 RSS 제목에 쓰는 이름(없으면 label 사용). 공개 API, RSS, MCP 에서 한 카테고리를 다른 카테고리에 합쳐 발행하려면 사이트 설정(site/site.ts 의 PUBLIC_CATEGORIES)에 적는다.
 */
export const CATEGORIES = [
  { key: "ai-models", label: "모델", feedLabel: "AI 모델", section: "모델 공개/업데이트", guide: "모델 자체의 공개, 버전, 가중치 개방, 성능이나 가격 변화, 그리고 기존 리더보드에서의 모델 성적. 한 번 벤치마크 점수를 공개한 것은 새 벤치마크 발표도, 튜토리얼도 아니다." },
  { key: "ai-products", label: "제품", feedLabel: "AI 제품", section: "제품 출시/업데이트", guide: "사용할 수 있는 AI 제품, 기능, 애플리케이션, 도구, API, 플랫폼, 엔지니어링 구성요소의 출시·업데이트. 모델 업체가 내놓은 추론 프레임워크, 연산 라이브러리, 하드웨어 호환 구성요소도 여전히 제품이며, 업체 이름 때문에 모델로 분류하지 않는다." },
  { key: "industry", label: "업계", feedLabel: "업계 소식", section: "업계 소식", guide: "이미 벌어진 회사 경영, 투자·인수합병, 인사, 제휴, 소송, 정책, 실제 보안 사고 및 조사 진행. 당사자가 직접 올렸거나 입장이 담긴 소식이라도 그 때문에 관점으로 바뀌지는 않는다." },
  { key: "paper", label: "논문", feedLabel: "논문", section: "논문 연구", guide: "새로운 연구 방법, 실험 설계, 발견을 핵심으로 하는 논문, 기술 보고서, 새 벤치마크나 연구용 데이터셋. 체계적인 레드팀 실험은 연구에 속하고, 기존 리더보드 성적은 모델로, 실제 사고의 뉴스 조사는 업계로 분류한다." },
  { key: "tip", label: "튜토리얼", section: "노하우와 관점", guide: "독자가 그대로 따라 쓸 수 있는 방법, 프롬프트, 도구 사용법, 엔지니어링 실전 회고, 기술 해설. 핵심은 재사용 가능한 방식이다. 도구를 단순 출시한 것은 제품으로, 입장과 예측만 있고 방법이 없는 것은 관점으로 분류한다.", commentary: true },
  { key: "opinion", label: "관점", section: "노하우와 관점", guide: "핵심이 저자의 해석, 판단, 주장, 예측, 논평, 인터뷰 관점인 경우. 시장을 논한다고 자동으로 업계가 되지 않고, 저자가 유명인이라고 자동으로 관점이 되지 않는다.", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 이 분야에서 가장 주목받는 한 종류의 공개(AI 분야에서는 새 모델): 데일리 브리핑 헤더의 "새 모델 N개", 분류를 바꿔 이미 나온 리포트를 수정할 때 모두 이 기준으로 센다.
 * category 는 카테고리, tag 는 태그이며 둘 다 맞아야 집계된다. unit 은 숫자 뒤에 붙는다.
 * 이런 종류가 없는 분야는 null 로 두면 헤더에 이 숫자를 표시하지 않는다.
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "ai-models", tag: "모델 공개", unit: "개의 새 모델" };

/** 주간 리포트·월간 리포트의 총평에서 보도에 출처가 없어도 바로 쓸 수 있는, 이 분야의 일반 용어(소문자). 사이트 이름은 자동으로 포함된다. */
export const PLAIN_TERMS: readonly string[] = ["ai", "api", "llm", "gpu", "agi", "ceo", "ipo"];

/**
 * 콘텐츠 이해 단계에서 각 자료에 판정하는 "콘텐츠 유형"(prompts/content-understanding.md 에 적혀 있으며, 유형을 바꾸면 그 프롬프트도 함께 고쳐야 한다).
 * 평가 프롬프트(prompts/selection-score.md)는 유형별로 다섯 축에 서로 다른 가중치를 준다.
 */
export const ITEM_TYPES = ["model_release", "product_launch", "tool_or_prompt", "research_paper", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

// ── 태그 어휘 ────────────────────────────────────────────────────────────────────────────

/** 각 자료의 첫 번째 태그는 반드시 이 "분류 태그" 중 하나여야 한다. */
export const CATEGORY_TAGS = [
  "제품 업데이트", "모델 공개", "논문/연구", "오픈소스/저장소", "튜토리얼/실전", "현상/트렌드", "전문가 관점", "평가/벤치마크", "안전/정렬", "업계 소식", "정책/규제",
  "비AI/범용 도구", "기타",
] as const;

/** 선택 가능한 주제 태그. */
export const TOPIC_TAGS = [
  "Agent", "코딩", "추론", "멀티모달", "음성", "비디오", "이미지 생성", "RAG", "온디바이스", "데이터/학습", "검색", "배포/엔지니어링", "오픈소스 생태계", "체화 지능", "MCP/도구 호출",
] as const;

/** 선택 가능한 엔티티 태그(회사, 기관, 플랫폼). */
export const ENTITY_TAGS = ["OpenAI", "Anthropic", "DeepSeek", "DeepMind", "Google", "Meta", "Microsoft", "xAI", "Hugging Face", "GitHub", "arXiv"] as const;

/** 모델이 자주 쓰는 유의어를 어휘표의 표기로 통일한다. */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "튜토리얼/활용법": "튜토리얼/실전", "노하우/모범사례": "튜토리얼/실전", "제휴/생태계": "업계 소식", "투자/인수": "업계 소식", "회사 소식": "업계 소식",
  제휴: "업계 소식", 생태계: "업계 소식", 투자유치: "업계 소식", 인수: "업계 소식", 투자: "업계 소식", 인수합병: "업계 소식",
  정책: "정책/규제", 규제: "정책/규제", 법규: "정책/규제", 안전: "안전/정렬", 정렬: "안전/정렬",
  논문: "논문/연구", 연구: "논문/연구", paper: "논문/연구", papers: "논문/연구",
  "open-source": "오픈소스/저장소", 오픈소스: "오픈소스/저장소", 저장소: "오픈소스/저장소", repo: "오픈소스/저장소",
  튜토리얼: "튜토리얼/실전", 활용법: "튜토리얼/실전", 가이드: "튜토리얼/실전", 노하우: "튜토리얼/실전", 모범사례: "튜토리얼/실전", 실전: "튜토리얼/실전",
  제품: "제품 업데이트", 업데이트: "제품 업데이트", 공개: "모델 공개", 모델: "모델 공개", 트렌드: "현상/트렌드", 현상: "현상/트렌드", 관점: "전문가 관점",
  영상생성: "비디오", 비ai: "비AI/범용 도구", "non-ai": "비AI/범용 도구", 범용도구: "비AI/범용 도구", 엔지니어링도구: "비AI/범용 도구",
  보안스캔: "비AI/범용 도구", devops: "비AI/범용 도구", 업계: "업계 소식", 소식: "업계 소식",
};

// ── 회사와 주체 ──────────────────────────────────────────────────────────────────────────

/**
 * 회사 주제: id → 표시명, 카드에 표시할 태그(null 이면 entity:<id> 로만 분류), 별칭.
 * aliases 는 구조 추출 모델에게 보여 주는 것이고, otherNames 는 회사가 스스로 쓰는 다른 명칭(공식 계정명, 하위 브랜드)으로,
 * 사실의 주체를 발표 주체에 연결할 때 이들도 인정한다.
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; otherNames?: string[] }> = {
  "world-labs": { name: "World Labs", displayTag: null, aliases: ["World Labs"] },
  "thinking-machines": { name: "Thinking Machines Lab", displayTag: null, aliases: ["Thinking Machines"] },
  amd: { name: "AMD", displayTag: null, aliases: ["AMD", "Advanced Micro Devices"] },
  openai: { name: "OpenAI", displayTag: "OpenAI", aliases: ["OpenAI", "ChatGPT", "Sora", "Codex", "GPT"], otherNames: ["OpenAI Developers"] },
  anthropic: { name: "Anthropic", displayTag: "Anthropic", aliases: ["Anthropic", "Claude"], otherNames: ["Claude Code"] },
  google: { name: "Google", displayTag: "Google", aliases: ["Google", "DeepMind", "Gemini", "구글"], otherNames: ["Google DeepMind", "Google Research", "Google AI", "Google Labs", "Google Cloud"] },
  deepseek: { name: "DeepSeek", displayTag: "DeepSeek", aliases: ["DeepSeek", "深度求索", "딥시크"] },
  qwen: { name: "Qwen", displayTag: null, aliases: ["Qwen", "通义", "阿里", "알리바바"], otherNames: ["通义千问", "千问", "Qwen Team", "通义实验室", "阿里巴巴", "Alibaba", "阿里云", "Alibaba Cloud"] },
  kimi: { name: "Kimi / Moonshot", displayTag: null, aliases: ["Kimi", "月之暗面", "Moonshot"], otherNames: ["Moonshot AI"] },
  minimax: { name: "MiniMax", displayTag: null, aliases: ["MiniMax", "海螺"], otherNames: ["稀宇科技"] },
  zhipu: { name: "Zhipu GLM", displayTag: null, aliases: ["智谱", "GLM", "Z.ai"], otherNames: ["智谱AI", "Zhipu", "Zhipu AI"] },
  xai: { name: "xAI", displayTag: "xAI", aliases: ["xAI", "Grok"], otherNames: ["SpaceXAI"] },
  meta: { name: "Meta", displayTag: "Meta", aliases: ["Meta", "Llama"], otherNames: ["Meta AI", "AI at Meta"] },
  microsoft: { name: "Microsoft", displayTag: "Microsoft", aliases: ["Microsoft", "微软", "마이크로소프트", "Copilot"], otherNames: ["Microsoft Research", "Microsoft AI"] },
  nvidia: { name: "NVIDIA", displayTag: null, aliases: ["NVIDIA", "英伟达", "엔비디아"] },
  "hugging-face": { name: "Hugging Face", displayTag: "Hugging Face", aliases: ["Hugging Face"], otherNames: ["HuggingFace"] },
  cursor: { name: "Cursor", displayTag: null, aliases: ["Cursor", "Anysphere"] },
  openrouter: { name: "OpenRouter", displayTag: null, aliases: ["OpenRouter"] },
};

/**
 * 신원 사전: 요약과 제목에 등장하는 회사는 반드시 원문에도 나와야 하며, 그렇지 않으면 원래 제목으로 되돌리고 요약을 버린다(모델이 주체를 헷갈리는 것을 막기 위함).
 * 이 문제가 없는 분야는 빈 배열로 둘 수 있다.
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "openai", name: "OpenAI", patterns: [/openai|chatgpt|\bgpt-?[o\d]|\bsora\b|\bcodex\b/i] },
  { id: "anthropic", name: "Anthropic", patterns: [/anthropic|\bclaude\b/i, /\b(?:opus|sonnet|haiku)\s*\d+(?:[.\-]\d+)*\b/i, /\bfable\s*\d+(?:[.\-]\d+)*\b|\bmythos\b/i] },
  { id: "google", name: "Google / Gemini", patterns: [/google|deepmind|\bgemini\b|notebooklm|\bveo\s?\d|\bAlphaFold\b|\bAMIE\b/i] },
  { id: "deepseek", name: "DeepSeek", patterns: [/deepseek|深度求索/i] },
  { id: "xai", name: "xAI / Grok", patterns: [/\bxai\b|\bgrok\b/i] },
  { id: "meta", name: "Meta / Llama", patterns: [/\bMeta\b/, /\bmeta\s?ai\b|\bllama\b/i] },
  { id: "microsoft", name: "Microsoft / Copilot", patterns: [/microsoft|copilot|微软/i] },
  { id: "nvidia", name: "NVIDIA", patterns: [/nvidia|英伟达|\bnemotron\b|\bnemo\b|\bblackwell\b|\brubin(?:\s+ultra)?\b|\bcuda\b/i] },
  { id: "qwen", name: "Qwen", patterns: [/\bqwen|通义|千问/i] },
  { id: "hugging-face", name: "Hugging Face", patterns: [/hugging\s?face/i] },
  { id: "cursor", name: "Cursor", patterns: [/\bCursor\b/] },
  { id: "kimi", name: "Kimi / Moonshot", patterns: [/\bkimi\b|月之暗面|\bmoonshot\s?ai\b/i] },
  { id: "openrouter", name: "OpenRouter", patterns: [/openrouter/i] },
  { id: "minimax", name: "MiniMax", patterns: [/minimax/i] },
  { id: "zhipu", name: "Zhipu GLM", patterns: [/智谱|\bglm-?[4-9]/i] },
  { id: "hunyuan", name: "Tencent Hunyuan", patterns: [/混元|hunyuan/i] },
  { id: "doubao", name: "ByteDance Doubao", patterns: [/豆包|doubao|字节跳动|bytedance/i] },
  { id: "mistral", name: "Mistral", patterns: [/mistral/i] },
  { id: "perplexity", name: "Perplexity", patterns: [/\bPerplexity\b/] },
  { id: "runway", name: "Runway", patterns: [/\brunway\b/i] },
  { id: "suno", name: "Suno", patterns: [/\bsuno\b/i] },
  { id: "midjourney", name: "Midjourney", patterns: [/midjourney/i] },
  { id: "stability-ai", name: "Stability AI", patterns: [/stability\s?ai/i] },
  { id: "elevenlabs", name: "ElevenLabs", patterns: [/eleven\s?labs/i] },
  { id: "vllm", name: "vLLM", patterns: [/\bvllm\b/i] },
  { id: "ollama", name: "Ollama", patterns: [/\bollama\b/i] },
  { id: "windsurf", name: "Windsurf", patterns: [/windsurf/i] },
  { id: "devin", name: "Devin", patterns: [/\bdevin\b/i] },
  { id: "manus", name: "Manus", patterns: [/\bmanus\b/i] },
  { id: "apple", name: "Apple AI", patterns: [/\bapple\s?(intelligence|silicon|ai)\b|苹果(智能|\s?AI)/i] },
  { id: "amazon", name: "Amazon / AWS", patterns: [/amazon|\baws\b|亚马逊/i] },
  { id: "baidu", name: "Baidu ERNIE", patterns: [/百度|baidu|文心|\bernie\s?bot\b/i] },
];

/** 이 도메인에서 발행된 글은 발행 주체가 해당 회사다(GitHub, arXiv 같은 호스팅 플랫폼은 제외). */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "openai", domains: ["openai.com"] },
  { entityId: "anthropic", domains: ["anthropic.com", "claude.com"] },
  { entityId: "google", domains: ["deepmind.google", "ai.google", "blog.google"] },
  { entityId: "deepseek", domains: ["deepseek.com"] },
  { entityId: "xai", domains: ["x.ai"] },
  { entityId: "meta", domains: ["ai.meta.com"] },
  { entityId: "microsoft", domains: ["microsoft.com"] },
  { entityId: "nvidia", domains: ["nvidia.com"] },
  { entityId: "qwen", domains: ["qwen.ai"] },
  { entityId: "cursor", domains: ["cursor.com"] },
  { entityId: "openrouter", domains: ["openrouter.ai"] },
];

/** 원문의 이런 표기도 해당 회사를 언급한 것으로 본다. */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "meta", pattern: /@AIatMeta\b/i },
  { entityId: "zhipu", pattern: /\bZhipu(?:\s+AI\b|['’]s\b)/i },
];
