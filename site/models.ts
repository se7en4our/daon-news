// 이 사이트가 쓰는 모델들. 프레임워크에는 `default` 가 기본 내장되어 있다: 환경 변수 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 로 지정한 모델.
// 여기에 이름이 붙은 모델(각자 자신의 주소와 키 환경 변수를 사용)과 각 단계가 기본으로 어떤 것을 쓰는지 더 나열한다. 지정하지 않은 단계는 default 를 쓴다.
// 배포 시 환경 변수(PREFILTER_MODEL, SCORE_MODEL……)나 관리자의 "모델과 평가" 페이지에서 단계별로 바꿔 지정할 수도 있다.

export interface ModelPreset {
  service: string;
  model: string;
  baseUrlEnv: string;
  apiKeyEnv: string;
  /** 추가 요청 필드. 예: 짧은 구조화 작업에서 추론을 끄기. */
  extra?: Record<string, unknown>;
  /** 추론 모델은 먼저 생각하고 답한다. 추론용으로 추가로 남겨 두는 출력 토큰(token)이며 각 단계 자체 할당량에 더해진다. default 는 환경 변수 LLM_REASONING_TOKENS 를 쓴다. */
  reasoningTokens?: number;
  /** API 가 JSON 모드를 지원함. */
  jsonMode: boolean;
  /** 이미지를 볼 수 있음. */
  vision?: boolean;
}

/** 이름이 붙은 모델 예시(각자 자신의 키를 설정해야 함). 쓰지 않으면 삭제해도 된다. */
export const PRESETS: Record<string, ModelPreset> = {
  // GLM 5.3 Flash always reasons; the lowest effort keeps short structured tasks fast.
  "glm-5.3-flash": {
    service: "zhipu", model: "glm-5.3-flash", baseUrlEnv: "ZHIPU_BASE_URL", apiKeyEnv: "ZHIPU_API_KEY",
    extra: { thinking: { type: "enabled" }, reasoning_effort: "low" }, jsonMode: true, vision: true,
  },
  // The scorer's parameters for glm-5.3-flash (score calls; temperature 1 is set per call).
  "glm-5.3-flash-selection": {
    service: "zhipu", model: "glm-5.3-flash", baseUrlEnv: "ZHIPU_BASE_URL", apiKeyEnv: "ZHIPU_API_KEY",
    extra: { thinking: { type: "enabled", clear_thinking: false }, reasoning_effort: "high", top_p: 0.95 }, jsonMode: true, vision: true,
  },
  // DeepSeek Flash reasons by default; structured tasks switch it off. deepseek-flash-think keeps it on,
  // with room in the output for the reasoning.
  "deepseek-flash": {
    service: "deepseek", model: "deepseek-flash", baseUrlEnv: "DEEPSEEK_BASE_URL", apiKeyEnv: "DEEPSEEK_API_KEY",
    extra: { thinking: { type: "disabled" } }, jsonMode: true,
  },
  "deepseek-flash-think": {
    service: "deepseek", model: "deepseek-flash", baseUrlEnv: "DEEPSEEK_BASE_URL", apiKeyEnv: "DEEPSEEK_API_KEY", reasoningTokens: 4000, jsonMode: true,
  },
  "qwen3.7-flash": {
    service: "dashscope", model: "qwen3.7-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: true,
  },
  "qwen3.8-flash": {
    service: "dashscope", model: "qwen3.8-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: true,
  },
  "mimo-v2.6-flash": {
    service: "mimo", model: "mimo-v2.6-flash", baseUrlEnv: "XIAOMI_MIMO_BASE_URL", apiKeyEnv: "XIAOMI_MIMO_API_KEY",
    extra: { thinking: { type: "disabled" } }, jsonMode: true,
  },
  "qwen3-vl-flash": {
    service: "dashscope", model: "qwen3-vl-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: false, vision: true,
  },
};

/**
 * 각 단계가 기본으로 쓰는 모델(단계는 관리자 "모델과 평가" 페이지 참고). 값은 위의 이름이나 default. 지정하지 않은 단계는 default 를 쓴다.
 * 예: { score: "glm-5.3-flash-selection", groupReview: "mimo-v2.6-flash" }
 */
export const DEFAULTS: Record<string, string> = {};
