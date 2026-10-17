# Decisions

talpi에서 이어받은 현재 유효한 L/XL 결정 중, 현재 작업을 제약하는 것만 옮겼습니다. 전체 이력은 `.talpi/spec.md` "Reversibility Ledger"에 있습니다.

## Active index
| key | record ID |
|---|---|
| data.ownership | dec-0001 |
| schema.shape | dec-0002 |
| schema.delete-semantics | dec-0003 |
| schema.migration | dec-0006 |
| schema.constraints | dec-0005 |
| schema.legacy-repair | dec-0007 |
| db.interface-transaction | dec-0008 |

## Records
### dec-0001
- key: data.ownership
- grade: XL
- status: approved, active
- choice: 오프라인 우선, 로컬 SQLite가 원본(source of truth). 서버는 이후 백업·동기화만 담당
- source: .talpi/spec.md "Reversibility Ledger > 데이터 소유"

### dec-0002
- key: schema.shape
- grade: L
- status: approved, active
- choice: B1의 3-테이블 스키마(diaries, capsules, settings). 시각은 UTC ISO 8601 문자열, 달력일 판정은 로컬 타임존, id는 UUID
- scope and constraints: Phase 2 동기화의 경계. `capsules.notification_id`는 기기 로컬 핸들로 동기화 대상에서 제외
- source: .talpi/spec.md "B1", "Reversibility Ledger > 스키마 형태"

### dec-0003
- key: schema.delete-semantics
- grade: L
- status: approved, active
- choice: 소프트 삭제(톰스톤). title·content를 즉시 비우고 deleted_at을 기록하며, 모든 조회·집계는 `deleted_at IS NULL`만 봄
- source: .talpi/spec.md "B1", "Reversibility Ledger > 삭제 의미론"

### dec-0004
- key: schema.migration
- grade: M
- status: superseded by dec-0006 (2026-10-17)
- choice: 정식 마이그레이션 프레임워크 없이 멱등한 `CREATE TABLE IF NOT EXISTS` 문 배열을 앱 시작마다 실행
- source: .talpi/spec.md "Simplicity Zones > 마이그레이션", src/db/schema.ts

### dec-0005
- key: schema.constraints
- grade: L
- status: approved, active (Arden, 2026-10-17)
- choice: spec.md "B1 제약 델타" 표대로 NOT NULL과 `capsules.diary_id` UNIQUE를 스키마에 건다. title·question_id·deleted_at·opened_at·notification_id는 nullable 유지
- alternatives: (a) 스키마 제약 — DB가 불변식을 보장하고 Phase 2 동기화가 믿을 수 있는 경계가 됨 / (b) 레포지토리 검증만 추가 — 마이그레이션은 없지만 동기화·직접 SQL 경로에서 불변식이 새어 나감
- reason: 스키마는 Phase 2 동기화의 경계이므로 동기화 스펙 전에 DB 수준에서 고정
- source: .talpi/handoff.md "다음 사이클 후보", .wellbegun/spec.md "B1 제약 델타"

### dec-0006
- key: schema.migration
- grade: L
- status: approved, active (Arden, 2026-10-17)
- supersedes: dec-0004
- choice: `PRAGMA user_version` 기반 순차 마이그레이션. 제약 변경은 SQLite 12단계 테이블 재생성 절차로, 단계마다 한 트랜잭션
- alternatives: (a) user_version 순차 마이그레이션 — 이후 Phase 2 스키마 변경도 같은 경로로 처리 / (b) 버전 없이 `PRAGMA table_info`·`index_list`로 현재 모양을 검사해 필요하면 재생성 — 버전 상태는 없지만 변경이 쌓일수록 검사 로직이 커짐 / (c) 마이그레이션 라이브러리(drizzle 등) 도입 — 이 규모에 비해 의존성과 B2 우회 비용이 큼
- reason: SQLite는 ALTER COLUMN이 없어 재생성이 필수이고, 기존 설치 DB를 구분할 확실한 표지가 필요함
- source: .wellbegun/spec.md "마이그레이션 계약"

### dec-0007
- key: schema.legacy-repair
- grade: L
- status: approved, active (Arden, 2026-10-17)
- choice: 위반 행은 결정적 규칙으로 보정·정리하고 마이그레이션은 성공시킨다(spec.md "위반 데이터 보정 규칙")
- alternatives: (a) 보정 후 진행 — 사용자는 아무것도 느끼지 않음, 고아·중복 캡슐 행만 사라짐 / (b) 위반이 있으면 마이그레이션을 중단 — 데이터는 그대로지만 DbProvider가 로딩 화면에 영구히 머무름(앱 사용 불가)
- reason: 일기 본문(diaries.content·title)은 어떤 경우에도 지우지 않으며, 지워지는 것은 의미 없는 캡슐·설정 행뿐
- source: .wellbegun/spec.md "위반 데이터 보정 규칙"

### dec-0008
- key: db.interface-transaction
- grade: M
- status: approved, active
- choice: B2 인터페이스는 바꾸지 않고, 마이그레이션은 `run("BEGIN")`/`COMMIT`/`ROLLBACK`으로 트랜잭션을 연다
- scope and constraints: DbProvider가 DB를 노출하기 전에 실행되므로 다른 쿼리가 끼어들지 않음. 앱 일반 경로의 트랜잭션 도입은 여전히 범위 밖(Simplicity Zones)
- source: .wellbegun/spec.md "Resolved decisions"
