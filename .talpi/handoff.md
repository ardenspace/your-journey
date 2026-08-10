# Handoff

갱신: 2026-08-10, Phase 2 → 3 경계.

## 지금 어디인가

- Phase 1(일기장 뼈대)·Phase 2(질문+여정) 완료·검증(P2는 CLEAN)·보고됨. Phase 2 diff: 5d5da35..bd6ff7c. 테스트 115개 green, tsc clean.
- Phase 3 (타임캡슐) 시작 직전. 계약 B3(알림 seam) 첫 스텝에서 고정. capsuleRules 순수 로직은 Phase 2에서 이미 구현·계약됨(`src/domain/capsuleRules.ts` — open_date는 "YYYY-MM-DD" 달력일 저장, 9시 인스턴트는 `openInstant()`로 파생) — Phase 3은 적합성 확인만.
- 채널: Arden과 Telegram (chat_id 7656702539). 페이즈 보고는 Telegram reply로.

## 미결/대기

- **에스컬레이션(비차단, 답 대기)**: `android.package` = `com.xfor.ps.project.yourjourney` (자동 생성). Play 출시 전 확정 필요 — Phase 1 보고에서 질문함.
- 1장 질문 10개 문구 검토 요청함 (Phase 2 보고) — 사람 소유 콘텐츠, id 불변·문구 수정 가능.
- 페이즈 경계마다 origin/main push.

## 알아야 할 것

- Expo dev server 띄우지 말 것 (이 머신 포트 점유: 8080/8081/8000 등). 검증은 npm test + npx tsc --noEmit.
- 구현 현황은 `.talpi/conventions.md`(Shared Utilities + Prior work), plan.md 체크박스, git log가 원본.
- Phase 3 주의: DiaryCard 봉인 표시 확장 예정, write.tsx에 봉인 UI 추가 예정(이미 questionId 파라미터 흐름 있음), expo-notifications는 jest에서 네이티브라 seam 뒤에 두고 모킹.
