status: approved
# Plan: 당신의 여정 (Your Journey) — v1 로컬 MVP

## Phase 1: 쓰고 다시 읽는 일기장

이 페이즈가 끝나면: 네트워크 없이 일기를 꾸며 쓰고, 목록에서 다시 열어 읽을 수 있다.

Contracts: B1, B2

- [x] Expo 스캐폴드 + jest 테스트 인프라(jest-expo, better-sqlite3, TypeScript strict) + `allowBackup=false`·`dataExtractionRules` 설정 — 계약 테스트가 돌 수 있는 최소 기반
- [x] B1·B2 계약을 실패하는 테스트로 고정(3-테이블 스키마와 `deleted_at` 배제 시맨틱, settings 값 형태와 손상 JSON 기본값 리셋, DB 인터페이스 적합성) → dates 유틸 + 스키마/migrate + expo-sqlite·better-sqlite3 어댑터로 통과
- [ ] 도메인 타입 + diaryRepository — 생성·조회·목록(작성일 내림차순)·개수·수정·소프트 삭제(내용 소거 + `deleted_at`), 모든 집계는 `deleted_at IS NULL`만
- [ ] settingsRepository — `question_mode`·`question_state`·`last_style` 라운드트립, 기본값 규칙
- [ ] DbProvider + 테마 토큰(conventions.md) + 앱 셸(expo-router `_layout`, 화면 라우트)
- [ ] 쓰기 화면 + StylePicker — 속지 3종·글자 크기 3종·배경 4종, 빈 본문(공백만 포함) 거부, 저장 완료 시에만 `last_style` 갱신, 첫 일기는 기본 스타일
- [ ] 목록 + 열람 화면 — 저장된 스타일 그대로 렌더, 태블릿 maxWidth 720

## Phase 2: 오늘의 질문과 여정

이 페이즈가 끝나면: 홈에서 오늘의 질문을 보고 그 질문으로 일기를 쓸 수 있으며, 기록이 쌓이는 만큼 여정 경로가 이어지고, 설정에서 질문을 끌 수 있다.

Contracts: B4, B5

- [ ] B4·B5 계약을 실패하는 테스트로 고정 — 뱅크 유효성(id 체계·배열 순서 일치), 질문 진행 규칙(하루 1개·같은 날 안정·표시일 3일·뱅크 소진), 캡슐 규칙(프리셋·캘린더 날짜·오전 9시·말일 클램프·개봉 가능 판정), 여정 진행도(마일스톤·구간 진행율·최종 이후 1 고정). **early-pull: 캡슐 규칙 순수 함수는 Phase 3의 UI보다 먼저 여기서 구현·고정된다**
- [ ] questionEngine + 1장 질문 뱅크 10개 + capsuleRules + journeyProgress 구현으로 계약 테스트 통과 — 도메인 함수는 `new Date()` 내부 호출 금지
- [ ] 홈 화면 — JourneyPath(숫자·통계 미노출을 테스트로 강제) + QuestionCard(질문 모드 off/뱅크 소진이면 미표시) + 질문에서 쓰기 진입 시 `question_id` 연결·`markAnswered`
- [ ] 설정 화면 — 질문 모드 토글(기본 on), 부드러운 안내 문구

## Phase 3: 타임캡슐

이 페이즈가 끝나면: 일기를 봉인해 두고, 개봉일에 알림을 받아 "열어보기"로 그날의 이야기를 다시 만날 수 있다.

Contracts: B3

- [ ] B3 계약을 실패하는 테스트로 고정 — 알림 모듈을 seam 뒤에 두고(expo-notifications 모킹) 페이로드 문구(일기 내용 인용 금지)·data 형태·채널(capsule/HIGH)·취소·권한 거부 시 null 반환을 테스트. 캡슐 규칙은 Phase 2에서 이미 고정됨 — 적합성 확인만
- [ ] capsuleRepository + 쓰기 화면 봉인 UI — 봉인 스위치, 프리셋 4종 + 캘린더 선택(내일 포함 이후만, 상한 없음), 캡슐 쓰기 실패 시 일반 일기로 남음
- [ ] 봉인 표시와 개봉 흐름 — 목록·열람에서 작성일+개봉 예정일만 노출(제목·본문 숨김), 개봉 가능 시 "열어보기" → `markOpened` → 일반 렌더, 재봉인 불가
- [ ] 알림 연결 — 봉인 시 예약(`notification_id` 저장), 탭 시 해당 일기로(개봉은 버튼으로만), 없는 일기면 조용히 홈으로, 권한 거부 시 알림 없이 진행

## Phase 4: 수정과 삭제

이 페이즈가 끝나면: 쓴 일기를 고치고, 지우고 싶은 일기는 (봉인 중이라도) 지울 수 있다.

Contracts:

- [ ] 수정 흐름 — 열람 화면에서 수정 진입, 제목·본문·꾸미기 변경(작성일·질문 연결 유지), 빈 본문 거부·`last_style` 갱신 규칙 동일 적용, 봉인 중 수정 불가. Phase 1의 B1 소프트 삭제 계약에 대한 적합성 확인 포함
- [ ] 삭제 흐름 — 부드러운 확인 → 소프트 삭제(내용 즉시 소거 + `deleted_at`), 순서는 알림 취소 → 캡슐 → 일기, `notification_id` NULL이면 취소 생략, 봉인 중 삭제 허용, 여정 기록 수 감소 반영
- [ ] 마무리 — 전체 테스트 + 타입체크 통과 확인, 스펙의 스모크 시나리오를 에뮬레이터에서 수동 확인(체크리스트 결과를 저널에 기록)
