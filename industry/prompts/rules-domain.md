【AI 분야 번역 규칙 — 본 플랫폼은 100% AI/ML/LLM 업계 콘텐츠이므로 엄격히 준수】

1. 중의성 기본값: 아래 용어는 비(non)AI 의미와 헷갈릴 수 있으나 **무조건 AI 의미로** 처리한다. 영문 약어·명칭은 그대로 두고, 한글 번역이 필요할 때만 아래 역어를 쓴다:
   - LLM = 대규모 언어 모델(절대 "법학 석사"로 풀지 않는다)
   - Token / tokens = 모델 token(영문 유지. 절대 "토큰(화폐)"로 풀지 않는다)
   - Transformer = Transformer 아키텍처(영문 유지. "변압기"로 풀지 않는다)
   - Diffusion = 디퓨전 모델(AI 생성이지 물리적 확산이 아니다)
   - Agent / Agentic = AI 에이전트 / 에이전트형(Agent 는 그대로 써도 된다. "대리인/중개"로 풀지 않는다)
   - Alignment = 정렬(AI 안전 맥락)
   - Inference = 추론(모델 생성)
   - Reasoning = 추론(inference 와 함께 "추론"으로 번역. 필요하면 CoT 를 "사고 사슬"로 구분. reasoning model 은 o1/o3/R1 류의 사고형 모델)
   - Embedding = 임베딩 벡터(영문 Embedding 유지해도 됨)
   - Distillation = 지식 증류
   - Hallucination = 모델 환각
   - Fine-tune / Fine-tuning = 파인튜닝
   - Pretrain / Pretraining = 사전학습
   - Context window = 컨텍스트 윈도우
   - Prompt = 프롬프트
   - Skill / Skills = 스킬(Claude 등 Agent 프레임워크의 능력 패키지. "특기"로 풀지 않는다)

2. 아래 고유명사는 **무조건 영문 원문을 유지**하고 한글 괄호 병기를 하지 않는다:
   - AI 회사: OpenAI / Anthropic / Google DeepMind / xAI / Meta AI / Mistral / DeepSeek / Cohere / HuggingFace(HF) / Runway / ElevenLabs / Suno / Pika / Midjourney / Perplexity
   - 모델 패밀리(예시 + 일반 규칙): GPT / Claude / Gemini / Llama / Qwen / Grok / o 시리즈 / DeepSeek / Mistral / Mixtral / Phi / Sora / Veo / Imagen
     **규칙**: 모든 대형 모델 패밀리명, 제품 코드명은 영문 유지
   - 모델 버전 번호(예시 + 일반 규칙): GPT-5 / Claude 4.7 / Claude Sonnet 4.6 / Llama 4 / Gemini 3 / o3 / o4 / DeepSeek-V4 / Qwen3.7
     **규칙**: 버전 번호는 한 글자도 바꾸지 않는다(4o / 4.7 / 405B / V4 / R1 같은 영숫자 접미사 포함). "번역성 확장"을 절대 하지 않는다("405B"를 "4050억"으로, "V4"를 "제4세대"로 바꾸지 말 것)
   - 기술 약어(예시 + 일반 규칙): LLM / RAG / RLHF / DPO / LoRA / QLoRA / PEFT / MoE / CoT / ReAct / KV cache / SOTA / AGI / MCP / ADK / NPU / GPU / TPU
     **규칙**: 2~5자 전부 대문자 약어는 기본적으로 AI/ML 의미로 영문 유지
   - 평가 벤치마크(예시 + 일반 규칙): MMLU / GPQA / HumanEval / SWE-bench / SWE-bench Verified / AIME / HLE / ARC-AGI / ARC-AGI 2 / MT-Bench / Chatbot Arena / Aider Polyglot / LiveCodeBench
     **규칙**: -bench / -eval 로 끝나거나 전부 대문자인 평가명은 영문 유지
   - AI 도구/제품: Cursor / Copilot / Codex / Aider / Devin / Cline / Claude Code / Windsurf / Zed / v0 / Bolt / Lovable / Replit Agent
   - Agent 프레임워크: LangChain / LangGraph / LlamaIndex / CrewAI / AutoGen / Pydantic AI / Vercel AI SDK / DSPy
   - 추론/배포: Ollama / vLLM / SGLang / TensorRT / Triton / CUDA / ROCm
   - 범용 기술: API / SDK / CLI / IDE / SaaS / CDN / SSO / OAuth / JWT / WebSocket / SSE / gRPC

3. 중국·기타 비영어권 업체는 **영문 공식 명칭을 기본으로** 하되, 널리 쓰이는 한글 표기가 있으면 함께 쓸 수 있다(첫 등장 시 "Qwen(큐원)"처럼 병기 가능. 이후에는 하나로 통일):
   - Qwen(알리바바) / Ernie(바이두) / GLM(Zhipu) / Kimi(Moonshot) / DeepSeek(딥시크) / Step(스텝) / Yi / Baichuan / Doubao(바이트댄스) / Hunyuan(텐센트) / Kling(콰이쇼우) / Jimeng(바이트댄스) / MiniMax / LongCat(메이투안) / Skywork(쿤룬) / MiniCPM / Ascend(화웨이) / Cambricon

4. 코드 / 명령어 / URL / 숫자·단위는 **한 글자도 바꾸지 않고** 유지한다:
   - 백틱 코드 `code` 는 번역하지 않는다
   - /code-review, pip install, npm run 같은 명령어는 번역하지 않는다("코드 리뷰"로 풀지 말 것)
   - URL 은 원문 그대로
   - 숫자+단위: 8k context / 175B params / 3.5x speedup / $3 per M tokens / 99.9%
   - 금액, 파라미터 수, 비율, 구간은 원문의 아라비아 숫자와 단위를 유지한다. $10B-$100B 를 "수백억~수천억 달러" 같은 한글 수량 표현으로 바꾸지 말 것