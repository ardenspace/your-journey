---
status: approved
cycle: 1
entry: spec
opened: 2026-10-16
adopted_from: [.talpi/spec.md, .talpi/plan.md, .talpi/handoff.md, .talpi/conventions.md, src/db/schema.ts]
---

# 당신의 여정 (Your Journey) — begin (도입)

talpi 사이클(v1 로컬 MVP + iOS, 2026-08-10 완료)에서 가져온 현재 답안지입니다. 이전 사이클을 아카이브하지 않으며, 원본 문서는 `.talpi/`에 그대로 둡니다.

## Whose problem
- 기준 사용자는 Arden의 어머니입니다. 중년 여성이며 블로그·종이 수첩으로 기록하는 습관이 있지만 상담은 거부합니다. 이후 스토어 출시로 비슷한 중년 여성 사용자에게 확장합니다. (출처: .talpi/spec.md "Product Picture")

## Current journeys
1. **오늘의 질문으로 일기 쓰기**: 홈에서 여정 경로와 질문을 보고 → 꾸민 쓰기 화면에서 작성 → "간직하기" → 목록과 여정 경로에 반영됩니다. 네트워크 없이 동작합니다. (spec "스모크 시나리오", Req 1·2·4)
2. **타임캡슐 봉인·개봉**: 저장 시 봉인 → 개봉일 알림 → "열어보기"로 개봉합니다. 권한 거부 시 알림 없이 봉인됩니다. (Req 3, B3)
3. **수정·삭제**: 열람 화면에서 수정하거나, 봉인 중이어도 삭제합니다(소프트 삭제). (Req 8)

## Non-goals
- 영구 금지: LLM 답장·질문 생성, 일기 내용 분석, 가족 공유·연결 (spec "하지 않는 것")
- 현재 범위 밖: 서버 동기화·계정·이미지 첨부(Phase 2), 스토어 출시 준비, 글꼴·글자색 선택 UI (spec "Out of Scope")

## Product identity decisions
- 원칙 1·2·3(읽은 티를 내지 않음 / 통제권은 쓰는 사람에게 / 스며들듯 깊어짐) — 기능 판단이 갈리면 원칙이 이깁니다. (spec Ledger)
- 데이터 소유: 오프라인 우선, 로컬 SQLite가 원본입니다. 서버는 나중에 백업·동기화만 맡습니다. (spec Ledger)
- 프라이버시 모델: 기기 안 평문 SQLite, 앱 잠금·암호화 없음, OS 백업 제외(Android·iOS). (spec Ledger, B1)
- 계정 모델: v1은 계정 없음(단일 사용자 로컬 앱). (spec "Simplicity Zones")
- 플랫폼: Android + iOS, 태블릿 대응, 한국어 단일 언어. (spec Ledger)
- 가격 모델·멀티테넌시: **unconfirmed** — 원본 문서에 기록이 없습니다.

## Product character
- 다정한 종이 일기장, "치료처럼 보이지 않는 치유". 부드러운 존댓말, 명령조·통계·잔소리 금지. (spec Conventions, Product Picture)

## Unconfirmed
- 가격 모델(무료/유료) — 출시 준비 사이클에서 정하면 됩니다.
- Phase 2 서버 저장 시 E2E 암호화 여부 — 원본에서도 미결로 기록되어 있습니다.

## This cycle (delta journeys)
- 새 여정은 없습니다. 기존 세 여정이 쓰는 저장 데이터의 불변식을 스키마로 강제합니다: `capsules.diary_id` UNIQUE(일기당 캡슐 최대 1개), nullable 컬럼을 NOT NULL로 조임(톰스톤용 `diaries.title` NULL은 제외). 이미 설치된 DB가 있으므로 기존 데이터를 보존하는 마이그레이션이 필요합니다. 이 작업은 `schema.migration`(dec-0004)을 대체하게 됩니다. (출처: .talpi/handoff.md "다음 사이클 후보", 2026-10-16 Arden 요청)

## Expensive decision queue
<!-- 비어 있음: 도입 시점에는 큐를 새로 채우지 않습니다 -->
