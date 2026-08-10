# Conventions

## Prior work this phase (Phase 4)

- step 3: 마무리 검증 — 152 tests/tsc clean + 실제 스모크 런(iOS 시뮬레이터+Expo Go+Maestro 2.8.0, 이 머신에 Android SDK 없음): 스모크 6단계 전부 VERIFIED + 봉인 플로우 보너스, 제품 버그 0. last_style 이어짐·같은 날 질문 카드 유지·봉인 카드 프라이버시 실기기 확인
- step 2: `deleteDiaryFlow` 헬퍼(+테스트 4개) + 열람 화면 전 상태에 조용한 "지우기"(봉인 중 포함, 내용 미노출 확인 다이얼로그)
- step 1: `app/edit/[id].tsx`(StylePicker·NotebookPage 재사용, 봉인 일기는 수정 경로에서도 내용 미노출 가드) + 열람 화면 "고치기" 버튼(일반 상태만) + `_layout.tsx` 라우트 등록

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
- 테스트 주의: @testing-library/react-native v14는 render/fireEvent가 async — 반드시 await. layout 이벤트는 수동 fire 필요
- `src/ui/NotebookPage.tsx` — 속지 시각 렌더는 반드시 이 컴포넌트 경유. `lineSpacing`에 본문 lineHeight(1.6×fontSize) 전달
- `src/ui/DiaryCard.tsx` — 목록 카드 (봉인 표시 확장은 Phase 3 스텝에서)
- `formatKoreanDate(iso)` (dates.ts) — 표시용 한국어 날짜는 반드시 이것으로
- `theme.colors.notebookLine` — 속지 줄 색 토큰
- `src/repositories/capsuleRepository.ts` — capsules 접근은 반드시 이 레포지토리 경유. 시각/id 주입
- `src/repositories/deleteDiaryFlow.ts` — `deleteDiaryFlow(db, diaryId, now) → boolean`. 삭제는 반드시 이 흐름 경유(알림 취소→캡슐→일기 + 부분 실패 규칙). `false` = 일기 원상 유지, UI는 재시도 안내
- `src/notifications/capsuleNotifications.ts` — expo-notifications 유일 import 지점 (B3). `scheduleCapsuleNotification(diaryId, openDate) → id|null` / `cancelCapsuleNotification(id|null)`. 화면·레포지토리는 expo-notifications 직접 import 금지

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
