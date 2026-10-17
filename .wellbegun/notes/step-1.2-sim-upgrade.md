# step-1.2 simulator upgrade evidence (2026-10-17)

Device: iPhone 17 simulator, iOS 26.4 (DC1C4C31-8871-46B1-8C63-5794484892B4), Xcode 27.0 (27A266a).
Builds: both `npx expo run:ios --configuration Release --no-bundler` (embedded JS bundle, no Metro).
- pre-change: git worktree of 55328dd (talpi v1 schema, no user_version handling)
- new: working tree 55328dd + step-1.1 diff (src/db/schema.ts), installed over the old app (same bundle id, data container kept)
UI driven with Maestro (OpenJDK 21); flows and screenshots in the session scratchpad / ~/.maestro/tests/2026-10-17_10*.

## Pre-change data (old build, via UI)
- normal diary "Before upgrade normal" (lined)
- sealed diary "Before upgrade sealed" (grid), capsule open_date 2026-11-17, notification scheduled
- settings changed: question_mode=off (toggled in 설정), last_style grid
- `sqlite3 <container>/Documents/SQLite/your-journey.db "PRAGMA user_version"` → 0; DB backed up with `.backup`

## After installing the new build (sim-upgrade)
- app opened past the loading view to home; question card absent (question_mode=off preserved)
- 지난 여정 list showed the same two diaries; sealed card still "🔒 봉인된 이야기 · 2026년 11월 17일에 열려요"
- tapping the sealed diary → "아직 봉인되어 있어요" (still sealed, content not shown)
- write + seal: new diary "After upgrade sealed", 세 달 뒤 → "봉인되었어요"; capsule open_date 2027-01-17 with notification id
- delete: normal diary → 지우기 → confirm → removed from list; row tombstoned (title NULL, content '', deleted_at set)
- sealed diary row and its capsule row are byte-identical to the pre-upgrade backup (sqlite3 diff)

## version-checked
Method: sqlite3 on the simulator data-container file (`xcrun simctl get_app_container ... data`).
- `PRAGMA user_version` → 1 (= LATEST_VERSION)
- `sqlite_master` shows capsules `diary_id TEXT NOT NULL UNIQUE REFERENCES diaries(id)`, `open_date TEXT NOT NULL`, settings `value TEXT NOT NULL`
- `PRAGMA foreign_keys` on a fresh sqlite3 connection → 0 (connection setting; the app restores its own previous value)
