---
cycle: 1
date: 2026-10-16
---

# Registry audit — before cycle 1

## Roster ↔ code drift
- registries: N/A (도입 시점이라 레지스트리 파일이 없음)
- B1 스키마 ↔ src/db/schema.ts: 일치. `capsules.diary_id`에 UNIQUE 없음, `diaries`의 background_color·notebook_design·font_*·created_at·updated_at과 `capsules`의 diary_id·open_date·created_at, `settings.value`가 nullable — 이번 사이클의 대상
- 불변식 위치: "일기당 캡슐 1개"는 `getCapsuleForDiary`(src/repositories/capsuleRepository.ts:66, 단일 행 조회)의 전제로만 존재
- 마이그레이션: `migrate()`는 `CREATE ... IF NOT EXISTS` 배열만 실행, 버전 추적(`user_version` 등) 없음 → 기존 설치 DB에는 제약이 적용되지 않음

## Check command
- `npm run check` (lint + typecheck + jest): pass — 20 suites, 190 tests

## Rule promotions (input to wellspec delta step 4)
- none (rule-candidates.md 없음)

## Promotion candidates (input to wellspec delta step 2)
- none
