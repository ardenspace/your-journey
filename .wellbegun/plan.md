---
status: approved
cycle: 1
---

# 당신의 여정 — plan (스키마 제약 강화)

## Phases
| phase | delivers | steps |
|---|---|---|
| 1 | 새 설치와 기존 설치 모두 제약이 걸린 최종 스키마에 도달하고, 실제 앱에서 업그레이드가 동작함 | 1.1–1.2 |

## Step contracts

### 1.1 버전 마이그레이션 + 제약 재생성 (foundation, L)
round_limit 2: 완료 조건이 모두 `npm run check`가 실행하는 테스트로 덮이므로, fresh 검증은 해석과 review 항목만 판단합니다.

<!-- wellbegun:contract step-1.1 -->
{"id":"step-1.1","kind":"step","scope_id":"scope-schema-migration",
 "goal":"migrate() brings both an empty DB and a talpi v1 (user_version 0) DB to the constrained final schema via user_version-ordered migrations",
 "completion":[
  {"id":"final-schema","text":"After migrate() on an empty DB, PRAGMA table_info/index_list show exactly the dec-0005 NOT NULL set, the listed nullable columns stay nullable, capsules.diary_id is UNIQUE, idx_diaries_created_at exists, and user_version equals the latest version"},
  {"id":"unique-enforced","text":"Inserting a second capsule for the same diary_id is rejected by the DB"},
  {"id":"upgrade-preserves","text":"A v0 fixture DB built from the frozen talpi v1 statements with valid rows (normal, sealed, opened, tombstoned diaries; settings) migrates with every row and value preserved and repository reads returning the same results as before"},
  {"id":"repair-rules","text":"A v0 fixture containing each dec-0007 violation migrates successfully and each row ends in exactly the state dec-0007 specifies; no diaries row is deleted"},
  {"id":"idempotent","text":"Running migrate() again at the latest version changes nothing (same rows, same user_version)"},
  {"id":"rollback","text":"If a migration step throws mid-rebuild, migrate() rejects, the DB keeps its original tables, rows and user_version, and foreign_keys is restored"},
  {"id":"fk-explicit","text":"The rebuild sets foreign_keys OFF before BEGIN, checks PRAGMA foreign_key_check is empty before COMMIT, and restores the previous foreign_keys value, independent of the adapter default"},
  {"id":"existing-suites","text":"All existing repository, flow and schema tests pass unchanged except schema assertions updated to the new constraints"}
 ],
 "verification":["npm run check"],
 "decisions":["schema.shape","schema.delete-semantics","schema.constraints","schema.migration","schema.legacy-repair","db.interface-transaction"],
 "registry":["db.schema","db.interface"],
 "discretion":"Migration list data structure and file layout inside src/db; rebuild SQL shape; how v0 fixtures are built in tests; whether default style values come from a domain constant or SQL literals (values must match Conventions)",
 "requires":[],"grade":"fresh","round_limit":2}
<!-- /wellbegun:contract -->

### 1.2 실제 앱 업그레이드 확인 + 계약 문서 반영 (basic)
jest에서 expo-sqlite를 돌릴 수 없어서 spec의 review 항목을 여기서 처리합니다.

<!-- wellbegun:contract step-1.2 -->
{"id":"step-1.2","kind":"step","scope_id":"scope-device-upgrade",
 "goal":"The real expo-sqlite app upgrades an existing installed DB and keeps working",
 "completion":[
  {"id":"sim-upgrade","text":"On an iOS simulator with the pre-change build installed and data present (a normal diary, a sealed diary, settings changed), installing the new build opens past the loading view, shows the same diaries, the sealed diary stays sealed, and writing/sealing/deleting still work; result recorded in the run evidence"},
  {"id":"version-checked","text":"On that device the DB reports the latest user_version (e.g. via a temporary debug log or sqlite3 on the simulator container file), and the check method is recorded"},
  {"id":"docs","text":"src/db/schema.ts header comment describes the versioned migration and the new constraints; B1 wording in .talpi/spec.md is left untouched and the new contract lives in .wellbegun/spec.md"}
 ],
 "verification":["npm run check"],
 "decisions":["schema.migration","schema.constraints"],
 "registry":["db.schema"],
 "discretion":"How the old build is produced (git stash/worktree of main) and how the DB file is inspected on the simulator",
 "requires":["step-1.1"],"grade":"basic"}
<!-- /wellbegun:contract -->

## Integration and release criteria

<!-- wellbegun:contract whole-run -->
{"id":"whole-run","kind":"whole-run","scope_id":"scope-whole-run",
 "goal":"Schema constraints are enforced for fresh and upgraded installs with no user-visible change",
 "completion":[
  {"id":"check","text":"npm run check passes on the final tree"},
  {"id":"no-ux-change","text":"No screen, copy or flow changed; diff outside src/db, tests and .wellbegun is limited to fixtures/test support"},
  {"id":"device","text":"step-1.2 simulator upgrade result is recorded and positive"}
 ],
 "verification":["npm run check"],
 "decisions":["schema.constraints","schema.migration","schema.legacy-repair"],
 "registry":["db.schema"],
 "discretion":"none",
 "requires":["step-1.1","step-1.2"],"grade":"fresh"}
<!-- /wellbegun:contract -->

## Run preview
| step | tier | touches |
|---|---|---|
| 1.1 | fresh (round_limit 2) | schema.constraints, schema.migration, schema.legacy-repair — 설치된 DB를 바꾸는 단계 |
| whole-run | fresh | 최종 수용 |
