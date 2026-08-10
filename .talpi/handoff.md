# Handoff

갱신: 2026-08-10, Phase 1 → 2 경계.

## 지금 어디인가

- Phase 1 (쓰고 다시 읽는 일기장) 완료·검증·보고됨. 커밋 `abdc7d7`..`5d5da35` (base 0b56431). 테스트 62개 green, tsc clean.
- Phase 2 (오늘의 질문과 여정) 시작 직전. 계약 B4·B5를 첫 스텝에서 고정해야 함 — capsuleRules 순수 함수도 여기서 early-pull로 구현됨(플랜 참조).
- 채널: 사용자(Arden)와 Telegram으로 소통 중 (chat_id 7656702539). 페이즈 보고는 Telegram reply로.

## 미결/대기

- **에스컬레이션(비차단)**: `android.package`가 `com.xfor.ps.project.yourjourney`로 자동 설정됨 (app.json). Play 출시 시 영구 고정 — Phase 3 전까지 Arden 확정 필요. Phase 1 보고에 질문으로 나감, 아직 답 없음.
- 원격 push는 페이즈 경계마다 하면 좋음 (origin/main, 사용자가 push 요청했었음).

## 알아야 할 것

- 이 머신 포트 주의: 8080/8081/8000/5433 등 점유 — Expo dev server 띄우지 말 것 (검증은 npm test + tsc).
- 구현 세부·유틸 목록은 `.talpi/conventions.md`의 Shared Utilities + "Prior work this phase" 블록이 원본. plan.md 체크박스 + git log가 스텝 진행의 근거.
- 스펙 결정 배경(소프트 삭제, allowBackup 등)은 spec.md Reversibility Ledger에.
