# Deferred findings

- step-1.1: 중복 캡슐 복구에서 한 행의 `created_at`이 NULL인 경우를 테스트하지 않음 — NULL은 `COALESCE(created_at, now)`로 마이그레이션 시각이 되어 가장 늦은 행으로 정렬되고, 따라서 버려짐. 현재 테스트는 둘 다 값이 있는 경우와 동점인 경우만 다룸. 계약 위반이 아니라서 미룸(test로 보완 가능)
- step-1.1: `id TEXT PRIMARY KEY` / `key TEXT PRIMARY KEY`가 NULL을 허용함(SQLite 레거시 동작, NULL 여러 행 삽입 가능) — dec-0005의 NOT NULL 목록에 PK 열이 빠져 있어서 생긴 계약 수준의 빈틈. 다음 사이클 스키마 결정 대상
