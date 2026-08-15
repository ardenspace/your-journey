# Handoff

갱신: 2026-08-10 — **run 완료 (Phase 5까지 전부 승인됨)**.

## 상태

- v1 로컬 MVP + iOS 지원(Phase 5)까지 Arden 최종 승인으로 종료. 저널 tail: `run done`.
- 5 페이즈 완료, 테스트 156개 green, Android(매니페스트 검증)+iOS(시뮬레이터 실조작 QA) 모두 확인, origin/main push 완료.
- 다음 세션: 이 run은 끝났다 — 다시 빌드하지 말 것. 새 작업은 새 talpi 사이클(talpispec)로.

## 다음 사이클 후보

- App Store / Play Store 출시 준비 (applicationId·bundleId 둘 다 com.ardenspace.yourjourney 확정)
- Phase 2 동기화: AWS 서버리스 (E2E 암호화 여부 미결 — 스펙 Ledger 참조)
- 스키마 제약 강화 (2026-08-16 코드 리뷰 지적): `capsules.diary_id`에 UNIQUE 제약 — "일기당 캡슐 최대 1개" 불변식이 현재 UI 흐름에만 있음(getCapsuleForDiary가 전제). `created_at` 등 nullable 컬럼 NOT NULL 조이기(톰스톤용 title NULL은 의도된 것이라 제외). 스키마는 Phase 2 동기화의 경계이므로 동기화 스펙 전에 처리 — 기존 설치 DB가 있으므로 CREATE TABLE IF NOT EXISTS만으로는 부족, 마이그레이션 필요
- 질문 뱅크 2장(어린 시절) — 콘텐츠는 Arden 소유, id 규칙 ch2-qN
- 실기 테스트: Android는 `npx expo run:android`(이 머신에 SDK 없음 — Arden 폰+Android Studio), iOS는 Xcode 무료 프로비저닝

## 기록 위치

- 결정: .talpi/spec.md Reversibility Ledger / 구현: conventions.md, plan.md, git log / 사건: journal.md
- Maestro 2.8.0 (~/.maestro, JAVA_HOME=/opt/homebrew/opt/openjdk) — QA 자동화 재사용 가능
