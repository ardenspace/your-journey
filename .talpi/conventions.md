# Conventions

## Prior work this phase (Phase 1)

- step 1: Expo SDK 57 스캐폴드 (routes `app/`, jest-expo+better-sqlite3 인프라, tsconfig strict+jest types, `expo.android.allowBackup:false` — SDK 57은 build-properties가 아니라 app.json 필드) — `src/__tests__/smoke.test.ts`
- ⚠️ 미해결(phase 1 내 처리 예정): `dataExtractionRules`는 expo config 미지원 — withAndroidManifest 커스텀 config plugin 필요 (B1)
- step 6: `src/ui/StylePicker.tsx`(+테스트 4개) + `app/write.tsx` 실화면(빈 본문 조용한 비활성, 저장 실패 문구, questionId/questionText 파라미터 수용). ⚠️ 속지(줄노트/모눈) 시각 렌더는 미구현 — step 7에서 공용 처리 필요
- step 5: `src/ui/theme.ts` + `src/db/provider.tsx` + 앱 셸(`app/_layout.tsx` 테마 Stack, index/write/list/diary/[id]/settings 라우트 플레이스홀더). DB 실패 시 조용한 로딩 뷰(유일한 치명 실패)
- step 4: `src/repositories/settingsRepository.ts`(+테스트 11개) + `src/domain/questionEngine.ts` 스텁(QuestionState+initialQuestionState만 — Phase 2 로직은 이걸 재사용)
- step 3: `src/domain/types.ts` + `src/repositories/diaryRepository.ts`(+테스트 9개). updateDiary는 title에 null 허용(제목 지우기), softDelete는 updated_at도 갱신(동기화 대비), 빈 본문 검증은 쓰기 화면 책임
- step 2: B1·B2 계약 테스트(`src/db/__tests__/`) + `src/domain/dates.ts` + `src/db/database.ts`(DB 인터페이스+expo-sqlite 어댑터, expo-sqlite import는 이 파일만) + `src/db/schema.ts`(SCHEMA_STATEMENTS+migrate, 멱등) + `tests/support/testDb.ts`. 손상 JSON→기본값 리셋은 레포지토리 레이어 책임으로 문서화(step 4에서 구현)


## Design Tokens

- 색: paper `#FFFDF7`, ink `#3A3A3A`, accent `#C08A5D`, subtle `#8A8578`, card `#FFFFFF`
- 일기 배경색 팔레트 4종: `#FFFDF7`(종이), `#FDF3E7`(살구), `#EFF5EF`(연둣빛), `#EEF2F7`(하늘빛)
- 기본 스타일(첫 일기): 배경 `#FFFDF7`, 속지 줄노트(lined), 시스템 폰트, 글자 크기 20, 글자색 `#3A3A3A`
- 글자 크기: body 20 / title 24 / small 16. **일기 본문은 18 이상**(보조 텍스트·캡션만 small 16 허용)
- 터치 타겟 최소 48dp, 본문 컨테이너 maxWidth 720 중앙 정렬(태블릿 대응)
- 토큰은 `src/ui/theme.ts` 한 곳에 두고 모든 화면이 거기서 가져다 쓴다

## Shared Utilities

빌드 중 새 유틸을 만들면 여기 등록한다.

- `src/domain/dates.ts` — `localDateString(d: Date)`: 로컬 타임존 `YYYY-MM-DD`. "오늘" 판정은 반드시 이것으로
- `src/domain/questionEngine.ts` — 질문 진행 순수 로직 (B5)
- `src/domain/capsuleRules.ts` — 개봉일 계산·개봉 가능 판정 (B5)
- `src/domain/journeyProgress.ts` — 기록 수 → 여정 진행도 (B5)
- `src/db/database.ts` — `DB` 인터페이스 (B2). 레포지토리·도메인은 expo-sqlite를 직접 import하지 않는다
- `src/db/schema.ts` — `SCHEMA_STATEMENTS` + `migrate()` (멱등, 앱 시작마다 실행)
- `src/domain/types.ts` — 도메인 타입 + `DEFAULT_STYLE`. 스타일 기본값은 여기서만 가져다 쓴다
- `src/repositories/diaryRepository.ts` — diaries CRUD + 소프트 삭제. 시각/id는 항상 인자로 주입. 빈 본문 검증은 저장 흐름(UI) 책임
- `src/repositories/settingsRepository.ts` — settings 키 접근은 반드시 이 레포지토리 경유. 손상 JSON→기본값 조용한 리셋(B1)은 getter가 구현(read 시 self-heal write 없음)
- `tests/support/testDb.ts` — better-sqlite3 in-memory 테스트 어댑터
- `src/ui/theme.ts` — `theme` + `DIARY_BACKGROUND_COLORS`. 색·크기 하드코딩 금지, 전부 여기서
- `src/db/provider.tsx` — `DbProvider` / `useDb()` / `newId()`. 화면은 expo-sqlite·expo-crypto 직접 import 금지
- import 규칙: `app/` 파일은 `@/*` 별칭(→`src/*`), `src/` 내부는 상대 경로
- `src/ui/StylePicker.tsx` — 꾸미기 선택 UI. 수정 화면(Req 8)에서 재사용할 것
- `DIARY_FONT_SIZES`(18/20/24)는 theme.ts에 — 글자 크기 리터럴 금지
- 테스트 주의: @testing-library/react-native v14는 render/fireEvent가 async — 반드시 await

## Layout & Naming

- 화면은 `app/`(expo-router), 로직은 `src/` — `db/` `repositories/` `domain/` `content/` `ui/` `notifications/`
- 도메인(`src/domain`)은 React도 DB도 import하지 않는 순수 함수. `new Date()`를 내부에서 호출하지 않고 항상 인자로 받는다
- 날짜·시각: 시각(instant)은 UTC ISO 8601(`toISOString()`), 달력일 판정은 로컬 타임존. id는 UUID(expo-crypto)
- 테스트는 `src/**/__tests__/*.test.ts(x)`, DB가 필요하면 testDb 어댑터 사용
- TypeScript strict. 커밋은 conventional commits(`feat:` `test:` `chore:`), 플랜 스텝당 1 커밋

## Failure Behavior

- 사용자에게는 조용하고 다정하게 — 기술 용어·에러 코드·스택트레이스 노출 금지. 문구는 전부 한국어 부드러운 존댓말("오늘을 써 볼까요?"). 명령조·통계·잔소리 금지
- 사용자 행동이 필요한 실패(저장 실패 등)만 안내: 예 "잠시 후 다시 한번 눌러 주세요"
- 조용한 축소가 원칙: 알림 권한 거부 → 알림 없이 봉인 진행. 예약 알림 유실 → 목록에서 그대로 개봉 가능. 손상된 settings JSON → 기본값으로 조용히 리셋
- 부분 실패 허용(트랜잭션 없음): 봉인 중 캡슐 쓰기 실패 → 일반 일기로 남음. 삭제는 알림 취소 → 캡슐 → 일기 순서
- 치명적 실패는 DB 열기/마이그레이션 실패뿐 — 이때만 앱이 준비 화면에서 멈출 수 있다
- **원칙 1이 최우선 실패 규칙**: 어떤 에러 메시지·알림·로그에도 일기 내용을 싣지 않는다
