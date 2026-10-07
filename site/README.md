# 사이트

이 사이트 고유의 것들: 이름, 문구, 브랜드, 페이지, 그리고 어떤 모듈을 켤지. 절차는 [내 분야로 바꾸기](../docs/customize.md)를 참고하세요.

| 파일 | 내용 |
|---|---|
| `site.ts` | 사이트명, 분야 키워드, 발행 시각, 홈·소개 페이지 문구, 공유 이미지 텍스트, 항목과 데일리 브리핑·주간 리포트·월간 리포트의 표현, 공개 인터페이스의 분류, 등록번호 |
| `models.ts` | 명명된 모델과 각 단계의 기본 모델(지정하지 않은 단계는 `.env` 에 설정한 것을 사용) |
| `brand/` | 아이콘, 로고(`Logo.tsx`), 공유 이미지와 포스터의 워드마크(`wordmark.svg`, `wordmark-dark.svg`, 선택), 데일리 브리핑·주간 리포트·월간 리포트의 제호 글자(`nameplates/`), 소개 페이지의 QR 코드(`contact/`, 선택) |
| `pages/` | 이용 규칙, 개인정보 안내(템플릿, 출시 전 실제 상황에 맞게 수정) |
| `public/` | 사이트 루트에 게시되는 고정 파일(사이트명·주소 등 자리표시자를 치환한 뒤 게시): `robots.txt`, `manifest.webmanifest`, `openapi-v1.json`, 그리고 선택 사항인 `.well-known/security.txt` |
| `changelog.json` | 업데이트 로그 |
| `modules/` | 어떤 모듈을 켤지: `index.ts`, `server.ts`, `web.ts` 세 가지 목록으로, 저장소 루트 `modules/<이름>/` 안의 사용할 모듈을 나열합니다. 기본값은 모두 비어 있으며, [아키텍처](../docs/architecture.md#模块)의 "모듈" 절을 참고하세요 |
