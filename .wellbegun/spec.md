---
status: approved
cycle: 1
---

# 당신의 여정 — spec (스키마 제약 강화)

begin.md "This cycle"의 델타를 해결 공간으로 옮깁니다. 새 여정은 없으며, 사용자에게 보이는 동작은 바뀌지 않아야 합니다.

## Resolved decisions
| decision | grade | choice | ADR |
|---|---|---|---|
| 어떤 제약을 스키마에 걸 것인가 | L | 아래 "B1 제약 델타" 표 그대로 | schema.constraints (dec-0005) |
| 이미 설치된 DB에 제약을 적용하는 방식 | L | `PRAGMA user_version` 기반 순차 마이그레이션 + 테이블 재생성 | schema.migration (dec-0006, supersedes dec-0004) |
| 기존 DB에 제약을 어기는 행이 있을 때 | L | 결정적 규칙으로 보정·정리하고 마이그레이션은 실패하지 않음 | schema.legacy-repair (dec-0007) |
| 마이그레이션 트랜잭션을 B2 인터페이스로 어떻게 처리할 것인가 | M | B2는 그대로 두고 `run("BEGIN")`/`COMMIT`/`ROLLBACK`으로 처리 | db.interface-transaction (dec-0008) |

### B1 제약 델타 (dec-0005)
| 테이블 | NOT NULL로 바뀌는 컬럼 | nullable로 남는 컬럼 | 기타 |
|---|---|---|---|
| diaries | background_color, notebook_design, font_family, font_size, font_color, created_at, updated_at | title(톰스톤), question_id, deleted_at | content는 이미 NOT NULL |
| capsules | diary_id, open_date, created_at | opened_at, notification_id | `diary_id` UNIQUE (톰스톤 일기 포함 전체에서 일기당 캡슐 최대 1개) |
| settings | value | — | — |

인덱스 `idx_diaries_created_at`은 재생성 후에도 유지합니다. CHECK 제약(예: notebook_design 값 목록)은 이번 범위에 넣지 않습니다.

### 마이그레이션 계약 (dec-0006)
- `user_version` 0 = 현재 설치본(talpi v1 스키마) 또는 빈 DB. 마이그레이션 목록은 버전 순서대로 실행하고, 각 단계가 끝나면 같은 트랜잭션 안에서 `user_version`을 올립니다.
- 빈 DB(새 설치)도 같은 경로를 거쳐 최종 스키마에 도달합니다. 최종 스키마는 한 곳에만 정의합니다.
- 테이블 재생성은 SQLite 공식 절차를 따릅니다: 트랜잭션 밖에서 `foreign_keys` OFF → BEGIN → 새 테이블 생성·복사·DROP·RENAME → `PRAGMA foreign_key_check`가 비어 있음을 확인 → COMMIT → `foreign_keys`를 원래 값으로 복원.
- 실패하면 ROLLBACK하여 기존 DB를 그대로 남깁니다(데이터 손실 없음). 이때 앱은 기존 동작(DbProvider의 조용한 로딩 화면)을 따릅니다.
- `migrate()`는 계속 앱 시작마다 호출되며, 최신 버전이면 아무것도 하지 않습니다.

### 위반 데이터 보정 규칙 (dec-0007)
현재 앱 흐름에서는 생기지 않는 데이터이지만, 생겼을 때 앱이 로딩 화면에 갇히지 않도록 정합니다.
- diaries의 꾸미기 컬럼 NULL → Conventions의 기본 스타일 값으로 채움
- diaries.created_at NULL → `updated_at`, 둘 다 없으면 마이그레이션 시각 / updated_at NULL → `created_at`
- capsules 중복(같은 diary_id) → `created_at`이 가장 이른 행 1개만 남김(같으면 id 사전순). 버려진 행의 예약 알림은 취소하지 않음 — 탭하면 같은 일기로 이동하므로 해가 없음
- capsules.diary_id NULL 또는 존재하지 않는 일기를 가리킴 → 행 삭제
- capsules.open_date NULL → 행 삭제(일기는 일반 일기로 남음 — Simplicity Zones의 "캡슐 쓰기 실패 시 일반 일기"와 같은 결과)
- capsules.created_at NULL → 마이그레이션 시각
- settings.value NULL → 행 삭제(레포지토리가 기본값으로 처리)

## Registries
- DB schema: **active**. 정본은 `src/db/schema.ts`와 `src/db/__tests__/schema.test.ts`이며, 별도 markdown 레지스트리는 만들지 않습니다. 계약은 위 델타 + `.talpi/spec.md` B1. 결정 키: schema.shape, schema.delete-semantics, schema.constraints, schema.migration, schema.legacy-repair
- DB 인터페이스(B2): **active, 변경 없음**. `src/db/database.ts`, 테스트 어댑터 `tests/support/testDb.ts`, 계약 테스트 `src/db/__tests__/database.contract.test.ts`. 결정 키: db.interface-transaction
- design tokens / shared components / backend common: N/A (이번 사이클에서 건드리지 않음)

## Implementer discretion
- 마이그레이션 목록의 자료 구조와 파일 배치(`src/db/` 안)
- 재생성 SQL의 구체적인 작성 방식(INSERT ... SELECT의 COALESCE 형태 등)
- 레거시 v0 DB 픽스처를 테스트에서 만드는 방법
- 기본 스타일 값을 domain 상수에서 가져올지 SQL 리터럴로 둘지(단, 값은 Conventions와 같아야 함 — 테스트로 확인)

## Check contract
- command: `npm run check` (lint + typecheck + test)
- test: 최종 스키마 제약(NOT NULL·UNIQUE·nullable 유지 컬럼) → `src/db/__tests__/schema.test.ts`
- test: v0 → 최신 마이그레이션이 데이터를 보존하고 보정 규칙을 적용함, 재실행 시 아무것도 바꾸지 않음, 실패 시 ROLLBACK으로 원본 유지 → `src/db/__tests__/` 아래 마이그레이션 테스트
- test: UNIQUE 위반 삽입이 거부됨(일기당 캡슐 1개) → 위 스키마 테스트
- lint: expo-sqlite import는 `src/db/database.ts`만 → 기존 `no-restricted-imports` 규칙, 기존 rule test `tests/lint-rules.test.ts` (변경 없음, B2 영역을 건드리므로 재확인만)
- review: 실제 expo-sqlite에서 마이그레이션이 동작함(better-sqlite3와 `foreign_keys` 기본값이 다를 수 있음) — jest에서 expo-sqlite를 돌릴 수 없으므로, 기존 설치본이 있는 시뮬레이터에서 업그레이드를 수동으로 확인
- CI: `.github/workflows/check.yml`
