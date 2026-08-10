# 당신의 여정 — Phase 1: 로컬 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버 없이 완전히 동작하는 오프라인 일기 앱 — 일기 쓰기(꾸미기), 오늘의 질문, 타임캡슐, 여정 시각화, 설정.

**Architecture:** Expo(React Native) + expo-router 앱. 모든 데이터는 로컬 SQLite에 저장(오프라인 우선). 순수 로직(질문 진행, 캡슐 규칙, 여정 진행도)은 `src/domain`에 UI/DB 무관 함수로 분리해 jest로 검증. DB 접근은 얇은 `DB` 인터페이스 뒤에 숨겨 앱에서는 expo-sqlite, 테스트에서는 better-sqlite3(in-memory)로 실행한다. AWS 동기화는 Phase 2, Play Store 출시는 Phase 3의 별도 계획.

**Tech Stack:** Expo SDK(최신), TypeScript(strict), expo-router, expo-sqlite, expo-notifications, expo-crypto, jest + jest-expo + @testing-library/react-native, better-sqlite3(테스트 전용).

## Global Constraints

- **원칙 1 — 앱은 일기를 읽었다는 티를 내지 않는다**: 일기 내용을 분석·반영하는 코드는 어떤 형태로도 작성 금지 (감정 분석, 키워드 추출, 내용 기반 분기 일절 없음).
- **원칙 2 — 통제권은 쓰는 사람에게**: 질문 모드는 설정에서 끌 수 있고, 질문이 켜져 있어도 자유 쓰기에 아무 제약이 없어야 한다.
- **원칙 3 — 스며들듯 깊어진다**: 질문은 순서 기반 시퀀스로만 진행. 일기 내용에 따라 분기하지 않는다.
- LLM API 호출 코드 작성 금지. 네트워크 호출 자체가 이 Phase에는 없다.
- UI 문구는 전부 한국어, 부드러운 존댓말 (예: "오늘을 써 볼까요?"). 명령조·통계·잔소리 금지.
- 기본 본문 글자 크기 18 이상, 터치 타겟 최소 48dp — 중년 사용자 기준.
- 화면은 태블릿 대응: 본문 컨테이너 `maxWidth: 720` 중앙 정렬.
- TypeScript strict 모드. 날짜는 ISO 8601 문자열로 저장, "오늘" 판정은 로컬 타임존 기준 `YYYY-MM-DD`.
- 도메인 함수는 `new Date()`를 내부에서 호출하지 않고 항상 인자로 받는다 (테스트 가능성).
- 커밋은 태스크마다 최소 1회, conventional commits (`feat:`, `test:`, `chore:`).

## File Structure

```
app/                          # expo-router 화면
  _layout.tsx                 # 루트 레이아웃 (DB provider, 알림 리스너)
  index.tsx                   # 홈: 여정 + 오늘의 질문 + 쓰기 버튼
  write.tsx                   # 일기 작성 (꾸미기, 봉인)
  list.tsx                    # 지난 일기 목록
  diary/[id].tsx              # 일기 열람 (봉인 잠금 처리)
  settings.tsx                # 설정
src/
  db/
    database.ts               # DB 인터페이스 + expo-sqlite 어댑터
    schema.ts                 # DDL 문장 배열 + migrate()
    provider.tsx              # React context (DB 열기/마이그레이션)
  repositories/
    diaryRepository.ts
    capsuleRepository.ts
    settingsRepository.ts
  domain/
    types.ts                  # Diary, Capsule, Question, DiaryStyle 등
    dates.ts                  # localDateString()
    questionEngine.ts         # 질문 진행 순수 로직
    capsuleRules.ts           # 개봉일 계산·개봉 가능 판정
    journeyProgress.ts        # 기록 수 → 여정 진행도
  content/
    questions.ts              # 질문 뱅크 (1장 10개로 시작)
  ui/
    theme.ts                  # 색·타이포 상수
    QuestionCard.tsx
    JourneyPath.tsx
    DiaryCard.tsx
  notifications/
    capsuleNotifications.ts   # 로컬 알림 예약/취소
tests/support/testDb.ts       # better-sqlite3 in-memory DB 어댑터
src/**/__tests__/*.test.ts    # 유닛 테스트
```

---

### Task 1: Expo 스캐폴드 + 테스트 인프라

**Files:**
- Create: Expo 기본 프로젝트 전체, `package.json`(jest 설정), `tsconfig.json`(strict)

**Interfaces:**
- Consumes: 없음
- Produces: `npm test`로 jest 실행 가능한 Expo 프로젝트

- [ ] **Step 1: Expo 프로젝트 생성 후 저장소에 병합**

```bash
cd /Users/arden/code/your-journey
npx create-expo-app@latest scaffold --template default
rsync -a --exclude README.md --exclude .git scaffold/ ./
rm -rf scaffold
npm run reset-project   # 예제 화면 제거 (프롬프트에서 app-example 삭제 선택, 남으면 rm -rf app-example)
```

- [ ] **Step 2: 의존성 설치**

```bash
npx expo install expo-sqlite expo-notifications expo-crypto
npm i -D jest jest-expo @testing-library/react-native @types/jest better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 3: package.json에 jest 설정과 test 스크립트 추가**

```json
{
  "scripts": { "test": "jest" },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg)"
    ]
  }
}
```

- [ ] **Step 4: tsconfig.json에 strict 확인** (`"strict": true` — Expo 기본값이면 그대로 둠)

- [ ] **Step 5: 스모크 테스트 작성 → 실행**

`src/__tests__/smoke.test.ts`:
```ts
test('jest runs', () => {
  expect(1 + 1).toBe(2);
});
```

Run: `npm test` / Expected: PASS 1 test

- [ ] **Step 6: 앱 기동 확인**

Run: `npx expo start` 후 프로세스 정상 시작 로그 확인하고 종료 (에뮬레이터 없이 번들러 기동만 확인).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold expo app with test infra"
```

---

### Task 2: dates 유틸 + DB 레이어 (schema, 어댑터)

**Files:**
- Create: `src/domain/dates.ts`, `src/db/database.ts`, `src/db/schema.ts`, `tests/support/testDb.ts`
- Test: `src/domain/__tests__/dates.test.ts`, `src/db/__tests__/schema.test.ts`

**Interfaces:**
- Produces:
  - `localDateString(d: Date): string` — 로컬 타임존 `YYYY-MM-DD`
  - `interface DB { run(sql: string, params?: unknown[]): Promise<void>; all<T>(sql: string, params?: unknown[]): Promise<T[]>; get<T>(sql: string, params?: unknown[]): Promise<T | null> }`
  - `openAppDb(): Promise<DB>` (expo-sqlite, 앱 전용)
  - `migrate(db: DB): Promise<void>`, `SCHEMA_STATEMENTS: string[]`
  - `createTestDb(): DB` (better-sqlite3 :memory:, 테스트 전용)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/domain/__tests__/dates.test.ts`:
```ts
import { localDateString } from '../dates';

test('formats local date as YYYY-MM-DD', () => {
  expect(localDateString(new Date(2026, 7, 10, 23, 59))).toBe('2026-08-10');
  expect(localDateString(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
});
```

`src/db/__tests__/schema.test.ts`:
```ts
import { createTestDb } from '../../../tests/support/testDb';
import { migrate } from '../schema';

test('migrate creates tables, is idempotent', async () => {
  const db = createTestDb();
  await migrate(db);
  await migrate(db); // 두 번 실행해도 에러 없어야 함
  const tables = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  const names = tables.map(t => t.name);
  expect(names).toEqual(expect.arrayContaining(['diaries', 'capsules', 'settings']));
});
```

- [ ] **Step 2: 실행해 실패 확인** — Run: `npm test` / Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/domain/dates.ts`:
```ts
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

`src/db/database.ts`:
```ts
import * as SQLite from 'expo-sqlite';

export interface DB {
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

export async function openAppDb(): Promise<DB> {
  const raw = await SQLite.openDatabaseAsync('your-journey.db');
  return {
    async run(sql, params = []) {
      await raw.runAsync(sql, params as SQLite.SQLiteBindParams);
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return (await raw.getAllAsync(sql, params as SQLite.SQLiteBindParams)) as T[];
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return ((await raw.getFirstAsync(sql, params as SQLite.SQLiteBindParams)) as T) ?? null;
    },
  };
}
```

`src/db/schema.ts`:
```ts
import type { DB } from './database';

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS diaries (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT NOT NULL,
    question_id TEXT,
    background_color TEXT NOT NULL,
    notebook_design TEXT NOT NULL,
    font_family TEXT NOT NULL,
    font_size INTEGER NOT NULL,
    font_color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS capsules (
    id TEXT PRIMARY KEY,
    diary_id TEXT NOT NULL REFERENCES diaries(id),
    open_date TEXT NOT NULL,
    opened_at TEXT,
    notification_id TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_created ON diaries(created_at DESC)`,
];

export async function migrate(db: DB): Promise<void> {
  for (const stmt of SCHEMA_STATEMENTS) await db.run(stmt);
}
```

`tests/support/testDb.ts`:
```ts
import Database from 'better-sqlite3';
import type { DB } from '../../src/db/database';

export function createTestDb(): DB {
  const raw = new Database(':memory:');
  return {
    async run(sql, params = []) { raw.prepare(sql).run(...(params as unknown[])); },
    async all<T>(sql: string, params: unknown[] = []) {
      return raw.prepare(sql).all(...(params as unknown[])) as T[];
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return ((raw.prepare(sql).get(...(params as unknown[])) as T) ?? null);
    },
  };
}
```

- [ ] **Step 4: 실행해 통과 확인** — Run: `npm test` / Expected: PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: db layer with schema and test adapter"`

---

### Task 3: 도메인 타입 + diaryRepository

**Files:**
- Create: `src/domain/types.ts`, `src/repositories/diaryRepository.ts`
- Test: `src/repositories/__tests__/diaryRepository.test.ts`

**Interfaces:**
- Consumes: `DB`, `migrate`, `createTestDb`
- Produces:
  - `interface DiaryStyle { backgroundColor: string; notebookDesign: 'plain' | 'lined' | 'grid'; fontFamily: string; fontSize: number; fontColor: string }`
  - `const DEFAULT_STYLE: DiaryStyle` (`{ backgroundColor: '#FFFDF7', notebookDesign: 'lined', fontFamily: 'system', fontSize: 20, fontColor: '#3A3A3A' }`)
  - `interface Diary { id: string; title: string | null; content: string; questionId: string | null; style: DiaryStyle; createdAt: string; updatedAt: string }`
  - `interface NewDiaryInput { title?: string; content: string; questionId?: string; style: DiaryStyle }`
  - `createDiary(db, input: NewDiaryInput, meta: { id: string; now: string }): Promise<Diary>`
  - `updateDiary(db, id: string, patch: { title?: string; content?: string; style?: DiaryStyle }, now: string): Promise<void>`
  - `getDiary(db, id: string): Promise<Diary | null>`
  - `listDiaries(db): Promise<Diary[]>` — createdAt 내림차순
  - `countDiaries(db): Promise<number>`
  - `deleteDiary(db, id: string): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/repositories/__tests__/diaryRepository.test.ts`:
```ts
import { createTestDb } from '../../../tests/support/testDb';
import { migrate } from '../../db/schema';
import { DEFAULT_STYLE } from '../../domain/types';
import {
  createDiary, getDiary, listDiaries, countDiaries, updateDiary, deleteDiary,
} from '../diaryRepository';

async function setup() {
  const db = createTestDb();
  await migrate(db);
  return db;
}

test('create and read back a diary', async () => {
  const db = await setup();
  const d = await createDiary(db,
    { content: '오늘은 맑았다', style: DEFAULT_STYLE, questionId: 'ch1-q1' },
    { id: 'd1', now: '2026-08-10T09:00:00.000Z' });
  expect(d.id).toBe('d1');
  const read = await getDiary(db, 'd1');
  expect(read?.content).toBe('오늘은 맑았다');
  expect(read?.questionId).toBe('ch1-q1');
  expect(read?.style).toEqual(DEFAULT_STYLE);
});

test('list is newest first, count works', async () => {
  const db = await setup();
  await createDiary(db, { content: 'a', style: DEFAULT_STYLE }, { id: 'd1', now: '2026-08-01T00:00:00.000Z' });
  await createDiary(db, { content: 'b', style: DEFAULT_STYLE }, { id: 'd2', now: '2026-08-02T00:00:00.000Z' });
  const list = await listDiaries(db);
  expect(list.map(d => d.id)).toEqual(['d2', 'd1']);
  expect(await countDiaries(db)).toBe(2);
});

test('update and delete', async () => {
  const db = await setup();
  await createDiary(db, { content: 'a', style: DEFAULT_STYLE }, { id: 'd1', now: '2026-08-01T00:00:00.000Z' });
  await updateDiary(db, 'd1', { content: 'b', title: '제목' }, '2026-08-02T00:00:00.000Z');
  const read = await getDiary(db, 'd1');
  expect(read?.content).toBe('b');
  expect(read?.title).toBe('제목');
  expect(read?.updatedAt).toBe('2026-08-02T00:00:00.000Z');
  await deleteDiary(db, 'd1');
  expect(await getDiary(db, 'd1')).toBeNull();
});
```

- [ ] **Step 2: 실행해 실패 확인** — Run: `npm test -- diaryRepository` / Expected: FAIL

- [ ] **Step 3: 구현**

`src/domain/types.ts`:
```ts
export interface DiaryStyle {
  backgroundColor: string;
  notebookDesign: 'plain' | 'lined' | 'grid';
  fontFamily: string;
  fontSize: number;
  fontColor: string;
}

export const DEFAULT_STYLE: DiaryStyle = {
  backgroundColor: '#FFFDF7',
  notebookDesign: 'lined',
  fontFamily: 'system',
  fontSize: 20,
  fontColor: '#3A3A3A',
};

export interface Diary {
  id: string;
  title: string | null;
  content: string;
  questionId: string | null;
  style: DiaryStyle;
  createdAt: string;
  updatedAt: string;
}

export interface NewDiaryInput {
  title?: string;
  content: string;
  questionId?: string;
  style: DiaryStyle;
}

export interface Capsule {
  id: string;
  diaryId: string;
  openDate: string;
  openedAt: string | null;
  notificationId: string | null;
  createdAt: string;
}

export interface Question {
  id: string;
  chapter: number;
  order: number;
  text: string;
}
```

`src/repositories/diaryRepository.ts`:
```ts
import type { DB } from '../db/database';
import type { Diary, NewDiaryInput, DiaryStyle } from '../domain/types';

interface DiaryRow {
  id: string; title: string | null; content: string; question_id: string | null;
  background_color: string; notebook_design: string; font_family: string;
  font_size: number; font_color: string; created_at: string; updated_at: string;
}

function toDiary(r: DiaryRow): Diary {
  return {
    id: r.id, title: r.title, content: r.content, questionId: r.question_id,
    style: {
      backgroundColor: r.background_color,
      notebookDesign: r.notebook_design as DiaryStyle['notebookDesign'],
      fontFamily: r.font_family, fontSize: r.font_size, fontColor: r.font_color,
    },
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export async function createDiary(
  db: DB, input: NewDiaryInput, meta: { id: string; now: string },
): Promise<Diary> {
  const s = input.style;
  await db.run(
    `INSERT INTO diaries (id, title, content, question_id, background_color,
      notebook_design, font_family, font_size, font_color, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [meta.id, input.title ?? null, input.content, input.questionId ?? null,
     s.backgroundColor, s.notebookDesign, s.fontFamily, s.fontSize, s.fontColor,
     meta.now, meta.now],
  );
  return (await getDiary(db, meta.id))!;
}

export async function updateDiary(
  db: DB, id: string,
  patch: { title?: string; content?: string; style?: DiaryStyle }, now: string,
): Promise<void> {
  const current = await getDiary(db, id);
  if (!current) return;
  const title = patch.title ?? current.title;
  const content = patch.content ?? current.content;
  const s = patch.style ?? current.style;
  await db.run(
    `UPDATE diaries SET title=?, content=?, background_color=?, notebook_design=?,
      font_family=?, font_size=?, font_color=?, updated_at=? WHERE id=?`,
    [title, content, s.backgroundColor, s.notebookDesign, s.fontFamily,
     s.fontSize, s.fontColor, now, id],
  );
}

export async function getDiary(db: DB, id: string): Promise<Diary | null> {
  const row = await db.get<DiaryRow>('SELECT * FROM diaries WHERE id=?', [id]);
  return row ? toDiary(row) : null;
}

export async function listDiaries(db: DB): Promise<Diary[]> {
  const rows = await db.all<DiaryRow>('SELECT * FROM diaries ORDER BY created_at DESC');
  return rows.map(toDiary);
}

export async function countDiaries(db: DB): Promise<number> {
  const row = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM diaries');
  return row?.n ?? 0;
}

export async function deleteDiary(db: DB, id: string): Promise<void> {
  await db.run('DELETE FROM capsules WHERE diary_id=?', [id]);
  await db.run('DELETE FROM diaries WHERE id=?', [id]);
}
```

- [ ] **Step 4: 실행해 통과 확인** — Run: `npm test -- diaryRepository` / Expected: PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: diary repository with style persistence"`

---

### Task 4: settingsRepository (질문 상태·꾸미기 기본값 저장)

**Files:**
- Create: `src/repositories/settingsRepository.ts`
- Test: `src/repositories/__tests__/settingsRepository.test.ts`

**Interfaces:**
- Consumes: `DB`, `DiaryStyle`, `DEFAULT_STYLE`
- Produces:
  - `getSetting(db, key: string): Promise<string | null>` / `setSetting(db, key: string, value: string): Promise<void>`
  - `isQuestionMode(db): Promise<boolean>` — 기본 true / `setQuestionMode(db, on: boolean): Promise<void>`
  - `getQuestionState(db): Promise<QuestionState>` — 없으면 `initialQuestionState`
  - `saveQuestionState(db, s: QuestionState): Promise<void>`
  - `getLastStyle(db): Promise<DiaryStyle>` — 없으면 `DEFAULT_STYLE` / `saveLastStyle(db, s: DiaryStyle): Promise<void>`
  - `QuestionState`는 Task 5의 questionEngine에서 정의: `{ cursor: number; shownDate: string | null; shownCount: number; answeredCurrent: boolean }` (이 태스크에서는 JSON 직렬화만 하므로 타입을 `src/domain/questionEngine.ts`에 먼저 인터페이스+`initialQuestionState`만 생성해 사용)

- [ ] **Step 1: questionEngine에 상태 타입 스텁 생성** (로직은 Task 5)

`src/domain/questionEngine.ts`:
```ts
export interface QuestionState {
  cursor: number;
  shownDate: string | null;
  shownCount: number;
  answeredCurrent: boolean;
}

export const initialQuestionState: QuestionState = {
  cursor: 0, shownDate: null, shownCount: 0, answeredCurrent: false,
};
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/repositories/__tests__/settingsRepository.test.ts`:
```ts
import { createTestDb } from '../../../tests/support/testDb';
import { migrate } from '../../db/schema';
import { DEFAULT_STYLE } from '../../domain/types';
import { initialQuestionState } from '../../domain/questionEngine';
import {
  getSetting, setSetting, isQuestionMode, setQuestionMode,
  getQuestionState, saveQuestionState, getLastStyle, saveLastStyle,
} from '../settingsRepository';

async function setup() { const db = createTestDb(); await migrate(db); return db; }

test('raw get/set', async () => {
  const db = await setup();
  expect(await getSetting(db, 'x')).toBeNull();
  await setSetting(db, 'x', '1');
  await setSetting(db, 'x', '2'); // upsert
  expect(await getSetting(db, 'x')).toBe('2');
});

test('question mode defaults to on', async () => {
  const db = await setup();
  expect(await isQuestionMode(db)).toBe(true);
  await setQuestionMode(db, false);
  expect(await isQuestionMode(db)).toBe(false);
});

test('question state round-trips, defaults to initial', async () => {
  const db = await setup();
  expect(await getQuestionState(db)).toEqual(initialQuestionState);
  const s = { cursor: 3, shownDate: '2026-08-10', shownCount: 2, answeredCurrent: true };
  await saveQuestionState(db, s);
  expect(await getQuestionState(db)).toEqual(s);
});

test('last style round-trips, defaults to DEFAULT_STYLE', async () => {
  const db = await setup();
  expect(await getLastStyle(db)).toEqual(DEFAULT_STYLE);
  const s = { ...DEFAULT_STYLE, fontSize: 24, notebookDesign: 'grid' as const };
  await saveLastStyle(db, s);
  expect(await getLastStyle(db)).toEqual(s);
});
```

- [ ] **Step 3: 실행해 실패 확인** — Run: `npm test -- settingsRepository` / Expected: FAIL

- [ ] **Step 4: 구현**

`src/repositories/settingsRepository.ts`:
```ts
import type { DB } from '../db/database';
import type { DiaryStyle } from '../domain/types';
import { DEFAULT_STYLE } from '../domain/types';
import type { QuestionState } from '../domain/questionEngine';
import { initialQuestionState } from '../domain/questionEngine';

export async function getSetting(db: DB, key: string): Promise<string | null> {
  const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key=?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db: DB, key: string, value: string): Promise<void> {
  await db.run(
    'INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value],
  );
}

export async function isQuestionMode(db: DB): Promise<boolean> {
  return (await getSetting(db, 'question_mode')) !== 'off';
}

export async function setQuestionMode(db: DB, on: boolean): Promise<void> {
  await setSetting(db, 'question_mode', on ? 'on' : 'off');
}

export async function getQuestionState(db: DB): Promise<QuestionState> {
  const raw = await getSetting(db, 'question_state');
  return raw ? (JSON.parse(raw) as QuestionState) : initialQuestionState;
}

export async function saveQuestionState(db: DB, s: QuestionState): Promise<void> {
  await setSetting(db, 'question_state', JSON.stringify(s));
}

export async function getLastStyle(db: DB): Promise<DiaryStyle> {
  const raw = await getSetting(db, 'last_style');
  return raw ? (JSON.parse(raw) as DiaryStyle) : DEFAULT_STYLE;
}

export async function saveLastStyle(db: DB, s: DiaryStyle): Promise<void> {
  await setSetting(db, 'last_style', JSON.stringify(s));
}
```

- [ ] **Step 5: 실행해 통과 확인** — Run: `npm test -- settingsRepository` / Expected: PASS

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: settings repository (question state, last style)"`

---

### Task 5: questionEngine 로직 + 질문 뱅크 1장

**Files:**
- Modify: `src/domain/questionEngine.ts` (Task 4의 스텁에 로직 추가)
- Create: `src/content/questions.ts`
- Test: `src/domain/__tests__/questionEngine.test.ts`

**Interfaces:**
- Consumes: `Question` 타입
- Produces:
  - `resolveToday(state: QuestionState, today: string): QuestionState` — 하루 1개 규칙. 같은 날 재호출이면 그대로. 새 날이면: 직전 질문에 답했거나 3일(shownCount ≥ 3) 노출됐으면 cursor+1·shownCount=1·answeredCurrent=false, 아니면 shownCount+1. 항상 shownDate=today.
  - `currentQuestion(bank: Question[], state: QuestionState): Question | null` — cursor 범위 밖이면 null (뱅크 소진).
  - `markAnswered(state: QuestionState): QuestionState`
  - `QUESTION_BANK: Question[]` — 1장 10개, id는 `ch1-q1`…`ch1-q10`

**설계 근거:** 답 안 한 질문은 3일까지 기다렸다 조용히 다음으로 넘어간다 — 같은 질문이 계속 남아 있으면 압박(원칙 2 위반)이 되므로.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/domain/__tests__/questionEngine.test.ts`:
```ts
import {
  initialQuestionState, resolveToday, currentQuestion, markAnswered,
} from '../questionEngine';
import { QUESTION_BANK } from '../../content/questions';

test('first day shows first question', () => {
  const s = resolveToday(initialQuestionState, '2026-08-10');
  expect(s).toEqual({ cursor: 0, shownDate: '2026-08-10', shownCount: 1, answeredCurrent: false });
  expect(currentQuestion(QUESTION_BANK, s)?.id).toBe('ch1-q1');
});

test('same day is stable', () => {
  const s1 = resolveToday(initialQuestionState, '2026-08-10');
  expect(resolveToday(s1, '2026-08-10')).toEqual(s1);
});

test('advances next day when answered', () => {
  let s = resolveToday(initialQuestionState, '2026-08-10');
  s = markAnswered(s);
  s = resolveToday(s, '2026-08-11');
  expect(s.cursor).toBe(1);
  expect(s.answeredCurrent).toBe(false);
  expect(currentQuestion(QUESTION_BANK, s)?.id).toBe('ch1-q2');
});

test('unanswered question stays up to 3 shown days then moves on', () => {
  let s = resolveToday(initialQuestionState, '2026-08-10'); // shownCount 1
  s = resolveToday(s, '2026-08-11');                        // 2, same question
  expect(s.cursor).toBe(0);
  s = resolveToday(s, '2026-08-12');                        // 3, same question
  expect(s.cursor).toBe(0);
  s = resolveToday(s, '2026-08-13');                        // moves on
  expect(s.cursor).toBe(1);
});

test('bank exhaustion returns null', () => {
  const s = { cursor: QUESTION_BANK.length, shownDate: '2026-08-10', shownCount: 1, answeredCurrent: false };
  expect(currentQuestion(QUESTION_BANK, s)).toBeNull();
});

test('bank has 10 chapter-1 questions in order', () => {
  expect(QUESTION_BANK).toHaveLength(10);
  expect(QUESTION_BANK.every(q => q.chapter === 1)).toBe(true);
  expect(QUESTION_BANK.map(q => q.order)).toEqual([1,2,3,4,5,6,7,8,9,10]);
});
```

- [ ] **Step 2: 실행해 실패 확인** — Run: `npm test -- questionEngine` / Expected: FAIL

- [ ] **Step 3: 구현**

`src/domain/questionEngine.ts`에 추가:
```ts
import type { Question } from './types';

const MAX_SHOWN_DAYS = 3;

export function resolveToday(state: QuestionState, today: string): QuestionState {
  if (state.shownDate === today) return state;
  if (state.shownDate === null) {
    return { cursor: state.cursor, shownDate: today, shownCount: 1, answeredCurrent: false };
  }
  if (state.answeredCurrent || state.shownCount >= MAX_SHOWN_DAYS) {
    return { cursor: state.cursor + 1, shownDate: today, shownCount: 1, answeredCurrent: false };
  }
  return { ...state, shownDate: today, shownCount: state.shownCount + 1 };
}

export function currentQuestion(bank: Question[], state: QuestionState): Question | null {
  return bank[state.cursor] ?? null;
}

export function markAnswered(state: QuestionState): QuestionState {
  return { ...state, answeredCurrent: true };
}
```

`src/content/questions.ts`:
```ts
import type { Question } from '../domain/types';

// 1장 — 가벼운 오늘. 질문 추가는 이 배열 끝에 다음 장을 이어 붙인다.
// 톤: 부드러운 존댓말, 답을 강요하지 않는 열린 질문. 내용 분석·개인화 금지 (원칙 1·3).
export const QUESTION_BANK: Question[] = [
  { id: 'ch1-q1',  chapter: 1, order: 1,  text: '오늘 드신 것 중에 제일 맛있었던 건 뭐예요?' },
  { id: 'ch1-q2',  chapter: 1, order: 2,  text: '요즘 아침에 눈 뜨면 제일 먼저 뭘 하세요?' },
  { id: 'ch1-q3',  chapter: 1, order: 3,  text: '오늘 하늘을 보셨나요? 어떤 모습이었어요?' },
  { id: 'ch1-q4',  chapter: 1, order: 4,  text: '요즘 자주 흥얼거리게 되는 노래가 있나요?' },
  { id: 'ch1-q5',  chapter: 1, order: 5,  text: '오늘 하루 중 가장 조용했던 순간은 언제였어요?' },
  { id: 'ch1-q6',  chapter: 1, order: 6,  text: '요즘 마음이 가는 드라마나 프로그램이 있으세요?' },
  { id: 'ch1-q7',  chapter: 1, order: 7,  text: '이번 계절에 꼭 해 보고 싶은 일이 하나 있다면요?' },
  { id: 'ch1-q8',  chapter: 1, order: 8,  text: '오늘 나눈 대화 중에 기억에 남는 말이 있나요?' },
  { id: 'ch1-q9',  chapter: 1, order: 9,  text: '집 안에서 제일 마음에 드는 자리는 어디예요?' },
  { id: 'ch1-q10', chapter: 1, order: 10, text: '내일 아무 일정이 없다면 무얼 하고 싶으세요?' },
];
```

- [ ] **Step 4: 실행해 통과 확인** — Run: `npm test -- questionEngine` / Expected: PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: question engine with chapter-1 bank"`

---

### Task 6: capsuleRules + capsuleRepository

**Files:**
- Create: `src/domain/capsuleRules.ts`, `src/repositories/capsuleRepository.ts`
- Test: `src/domain/__tests__/capsuleRules.test.ts`, `src/repositories/__tests__/capsuleRepository.test.ts`

**Interfaces:**
- Consumes: `DB`, `Capsule` 타입, `createDiary`(테스트 셋업용)
- Produces:
  - `type CapsuleOption = '1m' | '3m' | '6m' | '1y'`
  - `resolveOpenDate(option: CapsuleOption, from: Date): Date` — 개월/년 더하기, 시각은 오전 9시로 고정
  - `isOpenable(openDate: string, openedAt: string | null, now: Date): boolean`
  - `sealDiary(db, diaryId: string, openDate: string, meta: { id: string; now: string }): Promise<Capsule>`
  - `getCapsuleForDiary(db, diaryId: string): Promise<Capsule | null>`
  - `listCapsules(db): Promise<Capsule[]>` — openDate 오름차순
  - `markOpened(db, capsuleId: string, now: string): Promise<void>`
  - `setNotificationId(db, capsuleId: string, notificationId: string): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/domain/__tests__/capsuleRules.test.ts`:
```ts
import { resolveOpenDate, isOpenable } from '../capsuleRules';

test('resolveOpenDate adds months/years at 9am local', () => {
  const from = new Date(2026, 7, 10, 22, 30); // 2026-08-10 22:30
  expect(resolveOpenDate('1m', from)).toEqual(new Date(2026, 8, 10, 9, 0, 0, 0));
  expect(resolveOpenDate('3m', from)).toEqual(new Date(2026, 10, 10, 9, 0, 0, 0));
  expect(resolveOpenDate('6m', from)).toEqual(new Date(2027, 1, 10, 9, 0, 0, 0));
  expect(resolveOpenDate('1y', from)).toEqual(new Date(2027, 7, 10, 9, 0, 0, 0));
});

test('isOpenable: only after openDate and not yet opened', () => {
  const openDate = '2026-09-10T00:00:00.000Z';
  expect(isOpenable(openDate, null, new Date('2026-09-09T00:00:00.000Z'))).toBe(false);
  expect(isOpenable(openDate, null, new Date('2026-09-10T00:00:00.000Z'))).toBe(true);
  expect(isOpenable(openDate, '2026-09-11T00:00:00.000Z', new Date('2026-09-12T00:00:00.000Z'))).toBe(false);
});
```

`src/repositories/__tests__/capsuleRepository.test.ts`:
```ts
import { createTestDb } from '../../../tests/support/testDb';
import { migrate } from '../../db/schema';
import { DEFAULT_STYLE } from '../../domain/types';
import { createDiary } from '../diaryRepository';
import {
  sealDiary, getCapsuleForDiary, listCapsules, markOpened, setNotificationId,
} from '../capsuleRepository';

async function setup() {
  const db = createTestDb();
  await migrate(db);
  await createDiary(db, { content: 'x', style: DEFAULT_STYLE }, { id: 'd1', now: '2026-08-10T00:00:00.000Z' });
  return db;
}

test('seal and read back', async () => {
  const db = await setup();
  const c = await sealDiary(db, 'd1', '2026-09-10T00:00:00.000Z', { id: 'c1', now: '2026-08-10T00:00:00.000Z' });
  expect(c.diaryId).toBe('d1');
  expect(c.openedAt).toBeNull();
  expect((await getCapsuleForDiary(db, 'd1'))?.id).toBe('c1');
  expect(await getCapsuleForDiary(db, 'nope')).toBeNull();
});

test('markOpened and setNotificationId persist', async () => {
  const db = await setup();
  await sealDiary(db, 'd1', '2026-09-10T00:00:00.000Z', { id: 'c1', now: '2026-08-10T00:00:00.000Z' });
  await setNotificationId(db, 'c1', 'notif-1');
  await markOpened(db, 'c1', '2026-09-11T00:00:00.000Z');
  const c = await getCapsuleForDiary(db, 'd1');
  expect(c?.notificationId).toBe('notif-1');
  expect(c?.openedAt).toBe('2026-09-11T00:00:00.000Z');
});

test('listCapsules ascending by openDate', async () => {
  const db = await setup();
  await createDiary(db, { content: 'y', style: DEFAULT_STYLE }, { id: 'd2', now: '2026-08-10T00:00:00.000Z' });
  await sealDiary(db, 'd1', '2026-12-01T00:00:00.000Z', { id: 'c1', now: '2026-08-10T00:00:00.000Z' });
  await sealDiary(db, 'd2', '2026-09-01T00:00:00.000Z', { id: 'c2', now: '2026-08-10T00:00:00.000Z' });
  expect((await listCapsules(db)).map(c => c.id)).toEqual(['c2', 'c1']);
});
```

- [ ] **Step 2: 실행해 실패 확인** — Run: `npm test -- capsule` / Expected: FAIL

- [ ] **Step 3: 구현**

`src/domain/capsuleRules.ts`:
```ts
export type CapsuleOption = '1m' | '3m' | '6m' | '1y';

const MONTHS: Record<CapsuleOption, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 };

export function resolveOpenDate(option: CapsuleOption, from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth() + MONTHS[option], from.getDate(), 9, 0, 0, 0);
  return d;
}

export function isOpenable(openDate: string, openedAt: string | null, now: Date): boolean {
  return openedAt === null && new Date(openDate).getTime() <= now.getTime();
}
```

`src/repositories/capsuleRepository.ts`:
```ts
import type { DB } from '../db/database';
import type { Capsule } from '../domain/types';

interface CapsuleRow {
  id: string; diary_id: string; open_date: string;
  opened_at: string | null; notification_id: string | null; created_at: string;
}

function toCapsule(r: CapsuleRow): Capsule {
  return {
    id: r.id, diaryId: r.diary_id, openDate: r.open_date,
    openedAt: r.opened_at, notificationId: r.notification_id, createdAt: r.created_at,
  };
}

export async function sealDiary(
  db: DB, diaryId: string, openDate: string, meta: { id: string; now: string },
): Promise<Capsule> {
  await db.run(
    'INSERT INTO capsules (id, diary_id, open_date, opened_at, notification_id, created_at) VALUES (?,?,?,NULL,NULL,?)',
    [meta.id, diaryId, openDate, meta.now],
  );
  return (await getCapsule(db, meta.id))!;
}

async function getCapsule(db: DB, id: string): Promise<Capsule | null> {
  const row = await db.get<CapsuleRow>('SELECT * FROM capsules WHERE id=?', [id]);
  return row ? toCapsule(row) : null;
}

export async function getCapsuleForDiary(db: DB, diaryId: string): Promise<Capsule | null> {
  const row = await db.get<CapsuleRow>('SELECT * FROM capsules WHERE diary_id=?', [diaryId]);
  return row ? toCapsule(row) : null;
}

export async function listCapsules(db: DB): Promise<Capsule[]> {
  const rows = await db.all<CapsuleRow>('SELECT * FROM capsules ORDER BY open_date ASC');
  return rows.map(toCapsule);
}

export async function markOpened(db: DB, capsuleId: string, now: string): Promise<void> {
  await db.run('UPDATE capsules SET opened_at=? WHERE id=?', [now, capsuleId]);
}

export async function setNotificationId(db: DB, capsuleId: string, notificationId: string): Promise<void> {
  await db.run('UPDATE capsules SET notification_id=? WHERE id=?', [notificationId, capsuleId]);
}
```

- [ ] **Step 4: 실행해 통과 확인** — Run: `npm test -- capsule` / Expected: PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: time capsule rules and repository"`

---

### Task 7: journeyProgress

**Files:**
- Create: `src/domain/journeyProgress.ts`
- Test: `src/domain/__tests__/journeyProgress.test.ts`

**Interfaces:**
- Produces:
  - `const MILESTONES: number[]` = `[1, 3, 7, 14, 30, 60, 100, 150, 210, 280, 365]`
  - `journeyProgress(count: number): { reached: number; next: number | null; fraction: number }` — `reached`: 달성한 마일스톤 개수, `next`: 다음 마일스톤 기록 수(다 달성 시 null), `fraction`: 직전 마일스톤→다음 마일스톤 구간 내 진행율 0..1

- [ ] **Step 1: 실패하는 테스트 작성**

`src/domain/__tests__/journeyProgress.test.ts`:
```ts
import { journeyProgress, MILESTONES } from '../journeyProgress';

test('zero entries: nothing reached, heading to first milestone', () => {
  expect(journeyProgress(0)).toEqual({ reached: 0, next: 1, fraction: 0 });
});

test('mid-journey fraction', () => {
  // 5 entries: reached [1,3], next 7, 구간 3→7에서 2/4 진행
  expect(journeyProgress(5)).toEqual({ reached: 2, next: 7, fraction: 0.5 });
});

test('exactly on milestone', () => {
  expect(journeyProgress(7)).toEqual({ reached: 3, next: 14, fraction: 0 });
});

test('beyond final milestone', () => {
  const last = MILESTONES[MILESTONES.length - 1];
  expect(journeyProgress(last + 10)).toEqual({ reached: MILESTONES.length, next: null, fraction: 1 });
});
```

- [ ] **Step 2: 실행해 실패 확인** — Run: `npm test -- journeyProgress` / Expected: FAIL

- [ ] **Step 3: 구현**

`src/domain/journeyProgress.ts`:
```ts
export const MILESTONES = [1, 3, 7, 14, 30, 60, 100, 150, 210, 280, 365];

export interface JourneyProgress {
  reached: number;
  next: number | null;
  fraction: number;
}

export function journeyProgress(count: number): JourneyProgress {
  const reached = MILESTONES.filter(m => count >= m).length;
  if (reached === MILESTONES.length) return { reached, next: null, fraction: 1 };
  const next = MILESTONES[reached];
  const prev = reached === 0 ? 0 : MILESTONES[reached - 1];
  const fraction = (count - prev) / (next - prev);
  return { reached, next, fraction };
}
```

- [ ] **Step 4: 실행해 통과 확인** — Run: `npm test -- journeyProgress` / Expected: PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: journey progress calculation"`

---

### Task 8: DB provider + theme + 앱 셸

**Files:**
- Create: `src/db/provider.tsx`, `src/ui/theme.ts`
- Modify: `app/_layout.tsx`
- Test: 수동 (화면 렌더는 Task 9부터 테스트)

**Interfaces:**
- Consumes: `openAppDb`, `migrate`
- Produces:
  - `<DbProvider>` — 앱 시작 시 DB 열고 마이그레이션, 준비 전에는 children 미표시
  - `useDb(): DB` — context 훅. Provider 밖에서 호출 시 throw
  - `theme` 상수: `colors`(paper `#FFFDF7`, ink `#3A3A3A`, accent `#C08A5D`, subtle `#8A8578`), `fontSize`(body 20, title 24, small 16), `touchTarget: 48`, `maxContentWidth: 720`
  - `newId(): string` — expo-crypto randomUUID 래퍼 (`src/db/provider.tsx`에서 export)

- [ ] **Step 1: 구현**

`src/ui/theme.ts`:
```ts
export const theme = {
  colors: {
    paper: '#FFFDF7',
    ink: '#3A3A3A',
    accent: '#C08A5D',
    subtle: '#8A8578',
    card: '#FFFFFF',
  },
  fontSize: { body: 20, title: 24, small: 16 },
  touchTarget: 48,
  maxContentWidth: 720,
} as const;
```

`src/db/provider.tsx`:
```tsx
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DB } from './database';
import { openAppDb } from './database';
import { migrate } from './schema';

const DbContext = createContext<DB | null>(null);

export function newId(): string {
  return Crypto.randomUUID();
}

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opened = await openAppDb();
      await migrate(opened);
      if (!cancelled) setDb(opened);
    })();
    return () => { cancelled = true; };
  }, []);
  if (!db) return null;
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): DB {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used within DbProvider');
  return db;
}
```

`app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { DbProvider } from '../src/db/provider';
import { theme } from '../src/ui/theme';

export default function RootLayout() {
  return (
    <DbProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.paper },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontSize: theme.fontSize.title },
          contentStyle: { backgroundColor: theme.colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ title: '당신의 여정' }} />
        <Stack.Screen name="write" options={{ title: '오늘을 쓰다' }} />
        <Stack.Screen name="list" options={{ title: '지난 여정' }} />
        <Stack.Screen name="diary/[id]" options={{ title: '' }} />
        <Stack.Screen name="settings" options={{ title: '설정' }} />
      </Stack>
    </DbProvider>
  );
}
```

- [ ] **Step 2: 타입 체크** — Run: `npx tsc --noEmit` / Expected: 에러 없음

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: db provider, theme, app shell"`

---

### Task 9: 홈 화면 (여정 + 오늘의 질문 + 쓰기 버튼)

**Files:**
- Create: `src/ui/JourneyPath.tsx`, `src/ui/QuestionCard.tsx`
- Modify: `app/index.tsx`
- Test: `src/ui/__tests__/JourneyPath.test.tsx`, `src/ui/__tests__/QuestionCard.test.tsx`

**Interfaces:**
- Consumes: `journeyProgress`, `countDiaries`, `isQuestionMode`, `getQuestionState`, `saveQuestionState`, `resolveToday`, `currentQuestion`, `QUESTION_BANK`, `useDb`, `localDateString`
- Produces:
  - `<JourneyPath count={number} />` — 마일스톤 점을 가로 경로로 렌더. 도달한 점은 accent 색, 다음 구간은 fraction만큼 채움. 수치·통계 텍스트 없음. 문구는 기록이 1개 이상이면 "여기까지 걸어오셨어요", 0개면 "오늘, 첫 걸음을 시작해 보세요"만.
  - `<QuestionCard question={Question} onWrite={() => void} />` — 질문 텍스트 + "이 이야기 써 볼까요?" 버튼. 홈에서 질문 모드 off 또는 질문 null이면 카드 자체를 렌더하지 않음.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ui/__tests__/JourneyPath.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { JourneyPath } from '../JourneyPath';

test('first-step copy when empty', () => {
  const { getByText } = render(<JourneyPath count={0} />);
  getByText('오늘, 첫 걸음을 시작해 보세요');
});

test('encouragement copy when entries exist, no statistics text', () => {
  const { getByText, queryByText } = render(<JourneyPath count={5} />);
  getByText('여기까지 걸어오셨어요');
  expect(queryByText(/5/)).toBeNull(); // 수치 노출 금지
});
```

`src/ui/__tests__/QuestionCard.test.tsx`:
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { QuestionCard } from '../QuestionCard';

const q = { id: 'ch1-q1', chapter: 1, order: 1, text: '오늘 드신 것 중에 제일 맛있었던 건 뭐예요?' };

test('renders question and fires onWrite', () => {
  const onWrite = jest.fn();
  const { getByText } = render(<QuestionCard question={q} onWrite={onWrite} />);
  getByText(q.text);
  fireEvent.press(getByText('이 이야기 써 볼까요?'));
  expect(onWrite).toHaveBeenCalled();
});
```

- [ ] **Step 2: 실행해 실패 확인** — Run: `npm test -- ui` / Expected: FAIL

- [ ] **Step 3: 구현**

`src/ui/JourneyPath.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { journeyProgress, MILESTONES } from '../domain/journeyProgress';
import { theme } from './theme';

export function JourneyPath({ count }: { count: number }) {
  const p = journeyProgress(count);
  return (
    <View style={styles.wrap}>
      <View style={styles.path}>
        {MILESTONES.map((m, i) => (
          <View
            key={m}
            style={[styles.dot, i < p.reached ? styles.dotReached : styles.dotPending]}
          />
        ))}
      </View>
      <Text style={styles.copy}>
        {count > 0 ? '여기까지 걸어오셨어요' : '오늘, 첫 걸음을 시작해 보세요'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 24, alignItems: 'center' },
  path: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotReached: { backgroundColor: theme.colors.accent },
  dotPending: { backgroundColor: '#E5E0D5' },
  copy: { fontSize: theme.fontSize.body, color: theme.colors.subtle },
});
```

`src/ui/QuestionCard.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Question } from '../domain/types';
import { theme } from './theme';

export function QuestionCard({ question, onWrite }: { question: Question; onWrite: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.text}>{question.text}</Text>
      <Pressable style={styles.button} onPress={onWrite}>
        <Text style={styles.buttonText}>이 이야기 써 볼까요?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card, borderRadius: 16, padding: 24,
    marginHorizontal: 16, gap: 16, elevation: 2,
  },
  text: { fontSize: theme.fontSize.title, color: theme.colors.ink, lineHeight: 34 },
  button: {
    minHeight: theme.touchTarget, justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.colors.accent, borderRadius: 12, paddingHorizontal: 20,
  },
  buttonText: { fontSize: theme.fontSize.body, color: '#FFFFFF' },
});
```

`app/index.tsx`:
```tsx
import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDb } from '../src/db/provider';
import { countDiaries } from '../src/repositories/diaryRepository';
import {
  isQuestionMode, getQuestionState, saveQuestionState,
} from '../src/repositories/settingsRepository';
import { resolveToday, currentQuestion } from '../src/domain/questionEngine';
import { QUESTION_BANK } from '../src/content/questions';
import { localDateString } from '../src/domain/dates';
import type { Question } from '../src/domain/types';
import { JourneyPath } from '../src/ui/JourneyPath';
import { QuestionCard } from '../src/ui/QuestionCard';
import { theme } from '../src/ui/theme';

export default function Home() {
  const db = useDb();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setCount(await countDiaries(db));
        if (!(await isQuestionMode(db))) { setQuestion(null); return; }
        const today = localDateString(new Date());
        const state = resolveToday(await getQuestionState(db), today);
        await saveQuestionState(db, state);
        setQuestion(currentQuestion(QUESTION_BANK, state));
      })();
    }, [db]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <JourneyPath count={count} />
        {question && (
          <QuestionCard
            question={question}
            onWrite={() => router.push({ pathname: '/write', params: { questionId: question.id, questionText: question.text } })}
          />
        )}
        <Pressable style={styles.writeButton} onPress={() => router.push('/write')}>
          <Text style={styles.writeButtonText}>오늘을 쓰다</Text>
        </Pressable>
        <View style={styles.links}>
          <Pressable style={styles.link} onPress={() => router.push('/list')}>
            <Text style={styles.linkText}>지난 여정</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={() => router.push('/settings')}>
            <Text style={styles.linkText}>설정</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: theme.maxContentWidth, gap: 24, paddingVertical: 16 },
  writeButton: {
    marginHorizontal: 16, minHeight: 64, borderRadius: 16,
    backgroundColor: theme.colors.ink, justifyContent: 'center', alignItems: 'center',
  },
  writeButtonText: { color: '#FFFFFF', fontSize: theme.fontSize.title },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  link: { minHeight: theme.touchTarget, justifyContent: 'center' },
  linkText: { fontSize: theme.fontSize.body, color: theme.colors.subtle },
});
```

- [ ] **Step 4: 실행해 통과 확인** — Run: `npm test -- ui` 그리고 `npx tsc --noEmit` / Expected: PASS, 타입 에러 없음

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: home screen with journey path and daily question"`

---

### Task 10: 일기 작성 화면 (꾸미기 + 봉인)

**Files:**
- Create: `src/ui/StylePicker.tsx`
- Modify: `app/write.tsx`
- Test: `src/ui/__tests__/StylePicker.test.tsx`

**Interfaces:**
- Consumes: `createDiary`, `getLastStyle`, `saveLastStyle`, `getQuestionState`, `saveQuestionState`, `markAnswered`, `sealDiary`, `resolveOpenDate`, `newId`, `useDb`
- Produces:
  - `<StylePicker style={DiaryStyle} onChange={(s: DiaryStyle) => void} />` — 배경색 4종(`#FFFDF7`, `#FDF3E7`, `#EFF5EF`, `#EEF2F7`), 속지 3종(plain/lined/grid → "무지"/"줄노트"/"모눈"), 글자 크기(18/20/24 → "작게"/"보통"/"크게") 선택 UI
  - `app/write.tsx` — 파라미터 `questionId`, `questionText`(선택). 있으면 상단에 질문 표시, 저장 시 diary.questionId 기록 + `markAnswered` 반영. 봉인 스위치 켜면 기간(1m/3m/6m/1y) 선택, 저장 시 `sealDiary`. 저장 후 `saveLastStyle`, 홈으로 복귀.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ui/__tests__/StylePicker.test.tsx`:
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { StylePicker } from '../StylePicker';
import { DEFAULT_STYLE } from '../../domain/types';

test('changing notebook design calls onChange', () => {
  const onChange = jest.fn();
  const { getByText } = render(<StylePicker style={DEFAULT_STYLE} onChange={onChange} />);
  fireEvent.press(getByText('모눈'));
  expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_STYLE, notebookDesign: 'grid' });
});

test('changing font size calls onChange', () => {
  const onChange = jest.fn();
  const { getByText } = render(<StylePicker style={DEFAULT_STYLE} onChange={onChange} />);
  fireEvent.press(getByText('크게'));
  expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_STYLE, fontSize: 24 });
});
```

- [ ] **Step 2: 실행해 실패 확인** — Run: `npm test -- StylePicker` / Expected: FAIL

- [ ] **Step 3: StylePicker 구현**

`src/ui/StylePicker.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { DiaryStyle } from '../domain/types';
import { theme } from './theme';

const BACKGROUNDS = ['#FFFDF7', '#FDF3E7', '#EFF5EF', '#EEF2F7'];
const DESIGNS: { value: DiaryStyle['notebookDesign']; label: string }[] = [
  { value: 'plain', label: '무지' },
  { value: 'lined', label: '줄노트' },
  { value: 'grid', label: '모눈' },
];
const SIZES: { value: number; label: string }[] = [
  { value: 18, label: '작게' }, { value: 20, label: '보통' }, { value: 24, label: '크게' },
];

export function StylePicker({ style, onChange }: {
  style: DiaryStyle; onChange: (s: DiaryStyle) => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {BACKGROUNDS.map(bg => (
          <Pressable
            key={bg}
            style={[styles.swatch, { backgroundColor: bg }, style.backgroundColor === bg && styles.selected]}
            onPress={() => onChange({ ...style, backgroundColor: bg })}
          />
        ))}
      </View>
      <View style={styles.row}>
        {DESIGNS.map(d => (
          <Pressable
            key={d.value}
            style={[styles.chip, style.notebookDesign === d.value && styles.chipSelected]}
            onPress={() => onChange({ ...style, notebookDesign: d.value })}
          >
            <Text style={styles.chipText}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {SIZES.map(s => (
          <Pressable
            key={s.value}
            style={[styles.chip, style.fontSize === s.value && styles.chipSelected]}
            onPress={() => onChange({ ...style, fontSize: s.value })}
          >
            <Text style={styles.chipText}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  swatch: {
    width: theme.touchTarget, height: theme.touchTarget, borderRadius: 24,
    borderWidth: 1, borderColor: '#E5E0D5',
  },
  selected: { borderWidth: 3, borderColor: theme.colors.accent },
  chip: {
    minHeight: theme.touchTarget, paddingHorizontal: 20, borderRadius: 24,
    justifyContent: 'center', backgroundColor: '#F1EDE3',
  },
  chipSelected: { backgroundColor: theme.colors.accent },
  chipText: { fontSize: theme.fontSize.small, color: theme.colors.ink },
});
```

- [ ] **Step 4: StylePicker 테스트 통과 확인** — Run: `npm test -- StylePicker` / Expected: PASS

- [ ] **Step 5: write 화면 구현**

`app/write.tsx`:
```tsx
import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, Switch, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDb, newId } from '../src/db/provider';
import { createDiary } from '../src/repositories/diaryRepository';
import {
  getLastStyle, saveLastStyle, getQuestionState, saveQuestionState,
} from '../src/repositories/settingsRepository';
import { markAnswered } from '../src/domain/questionEngine';
import { sealDiary } from '../src/repositories/capsuleRepository';
import { resolveOpenDate, type CapsuleOption } from '../src/domain/capsuleRules';
import { DEFAULT_STYLE, type DiaryStyle } from '../src/domain/types';
import { StylePicker } from '../src/ui/StylePicker';
import { theme } from '../src/ui/theme';

const CAPSULE_OPTIONS: { value: CapsuleOption; label: string }[] = [
  { value: '1m', label: '한 달 뒤' }, { value: '3m', label: '세 달 뒤' },
  { value: '6m', label: '여섯 달 뒤' }, { value: '1y', label: '일 년 뒤' },
];

export default function Write() {
  const db = useDb();
  const router = useRouter();
  const params = useLocalSearchParams<{ questionId?: string; questionText?: string }>();
  const [content, setContent] = useState('');
  const [style, setStyle] = useState<DiaryStyle>(DEFAULT_STYLE);
  const [seal, setSeal] = useState(false);
  const [capsuleOption, setCapsuleOption] = useState<CapsuleOption>('1m');

  useEffect(() => { getLastStyle(db).then(setStyle); }, [db]);

  async function save() {
    if (!content.trim()) return;
    const now = new Date();
    const diary = await createDiary(db,
      { content, style, questionId: params.questionId },
      { id: newId(), now: now.toISOString() });
    if (params.questionId) {
      await saveQuestionState(db, markAnswered(await getQuestionState(db)));
    }
    if (seal) {
      const openDate = resolveOpenDate(capsuleOption, now);
      await sealDiary(db, diary.id, openDate.toISOString(), { id: newId(), now: now.toISOString() });
      Alert.alert('봉인되었어요', '때가 되면 조용히 알려드릴게요.');
    }
    await saveLastStyle(db, style);
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        {params.questionText && <Text style={styles.question}>{params.questionText}</Text>}
        <TextInput
          style={[styles.input, {
            backgroundColor: style.backgroundColor,
            fontSize: style.fontSize,
            color: style.fontColor,
          }]}
          multiline
          placeholder="마음 가는 대로 적어 보세요"
          placeholderTextColor={theme.colors.subtle}
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
        />
        <StylePicker style={style} onChange={setStyle} />
        <View style={styles.sealRow}>
          <Text style={styles.sealLabel}>타임캡슐로 봉인하기</Text>
          <Switch value={seal} onValueChange={setSeal} />
        </View>
        {seal && (
          <View style={styles.capsuleRow}>
            {CAPSULE_OPTIONS.map(o => (
              <Pressable
                key={o.value}
                style={[styles.chip, capsuleOption === o.value && styles.chipSelected]}
                onPress={() => setCapsuleOption(o.value)}
              >
                <Text style={styles.chipText}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable style={styles.saveButton} onPress={save}>
          <Text style={styles.saveButtonText}>간직하기</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 16 },
  content: { width: '100%', maxWidth: theme.maxContentWidth, gap: 20 },
  question: { fontSize: theme.fontSize.title, color: theme.colors.accent, lineHeight: 34 },
  input: {
    minHeight: 280, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E5E0D5', lineHeight: 32,
  },
  sealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sealLabel: { fontSize: theme.fontSize.body, color: theme.colors.ink },
  capsuleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    minHeight: theme.touchTarget, paddingHorizontal: 20, borderRadius: 24,
    justifyContent: 'center', backgroundColor: '#F1EDE3',
  },
  chipSelected: { backgroundColor: theme.colors.accent },
  chipText: { fontSize: theme.fontSize.small, color: theme.colors.ink },
  saveButton: {
    minHeight: 64, borderRadius: 16, backgroundColor: theme.colors.ink,
    justifyContent: 'center', alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: theme.fontSize.title },
});
```

- [ ] **Step 6: 타입 체크 + 전체 테스트** — Run: `npx tsc --noEmit && npm test` / Expected: PASS

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: write screen with style picker and capsule sealing"`

---

### Task 11: 목록·열람 화면 (봉인 잠금 처리)

**Files:**
- Create: `src/ui/DiaryCard.tsx`
- Modify: `app/list.tsx`, `app/diary/[id].tsx`
- Test: `src/ui/__tests__/DiaryCard.test.tsx`

**Interfaces:**
- Consumes: `listDiaries`, `getDiary`, `listCapsules`, `getCapsuleForDiary`, `markOpened`, `isOpenable`, `useDb`
- Produces:
  - `<DiaryCard diary={Diary} capsule={Capsule | null} now={Date} onPress={() => void} />` — 봉인 중(캡슐 있고 `openedAt === null`이고 아직 openDate 전)이면 내용 대신 "🔒 봉인된 이야기 · YYYY년 M월 D일에 열려요" 표시. 개봉 가능(`isOpenable`)이면 "열어볼 수 있어요" 배지. 그 외엔 첫 40자 미리보기.
  - `app/diary/[id].tsx` — 봉인 중이면 잠금 안내만. 개봉 가능하면 "열어보기" 버튼 → `markOpened` 후 내용 표시. 일반/개봉된 일기는 저장된 style 그대로 렌더.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ui/__tests__/DiaryCard.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { DiaryCard } from '../DiaryCard';
import { DEFAULT_STYLE } from '../../domain/types';

const diary = {
  id: 'd1', title: null, content: '오늘은 정말 좋은 하루였다. 산책을 오래 했다.',
  questionId: null, style: DEFAULT_STYLE,
  createdAt: '2026-08-10T09:00:00.000Z', updatedAt: '2026-08-10T09:00:00.000Z',
};

test('normal diary shows preview', () => {
  const { getByText } = render(
    <DiaryCard diary={diary} capsule={null} now={new Date('2026-08-11T00:00:00.000Z')} onPress={() => {}} />,
  );
  getByText(/오늘은 정말 좋은 하루였다/);
});

test('sealed diary hides content', () => {
  const capsule = {
    id: 'c1', diaryId: 'd1', openDate: '2026-12-01T00:00:00.000Z',
    openedAt: null, notificationId: null, createdAt: '2026-08-10T09:00:00.000Z',
  };
  const { queryByText, getByText } = render(
    <DiaryCard diary={diary} capsule={capsule} now={new Date('2026-08-11T00:00:00.000Z')} onPress={() => {}} />,
  );
  expect(queryByText(/산책/)).toBeNull();
  getByText(/봉인된 이야기/);
});

test('openable capsule shows badge', () => {
  const capsule = {
    id: 'c1', diaryId: 'd1', openDate: '2026-12-01T00:00:00.000Z',
    openedAt: null, notificationId: null, createdAt: '2026-08-10T09:00:00.000Z',
  };
  const { getByText } = render(
    <DiaryCard diary={diary} capsule={capsule} now={new Date('2026-12-02T00:00:00.000Z')} onPress={() => {}} />,
  );
  getByText('열어볼 수 있어요');
});
```

- [ ] **Step 2: 실행해 실패 확인** — Run: `npm test -- DiaryCard` / Expected: FAIL

- [ ] **Step 3: 구현**

`src/ui/DiaryCard.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Diary, Capsule } from '../domain/types';
import { isOpenable } from '../domain/capsuleRules';
import { theme } from './theme';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function DiaryCard({ diary, capsule, now, onPress }: {
  diary: Diary; capsule: Capsule | null; now: Date; onPress: () => void;
}) {
  const sealed = capsule !== null && capsule.openedAt === null;
  const openable = capsule !== null && isOpenable(capsule.openDate, capsule.openedAt, now);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.date}>{formatDate(diary.createdAt)}</Text>
      {sealed ? (
        openable ? (
          <Text style={styles.badge}>열어볼 수 있어요</Text>
        ) : (
          <Text style={styles.locked}>🔒 봉인된 이야기 · {formatDate(capsule.openDate)}에 열려요</Text>
        )
      ) : (
        <Text style={styles.preview} numberOfLines={2}>{diary.content.slice(0, 40)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card, borderRadius: 16, padding: 20, gap: 8,
    minHeight: theme.touchTarget,
  },
  date: { fontSize: theme.fontSize.small, color: theme.colors.subtle },
  preview: { fontSize: theme.fontSize.body, color: theme.colors.ink, lineHeight: 28 },
  locked: { fontSize: theme.fontSize.body, color: theme.colors.subtle },
  badge: { fontSize: theme.fontSize.body, color: theme.colors.accent },
});
```

`app/list.tsx`:
```tsx
import { useCallback, useState } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDb } from '../src/db/provider';
import { listDiaries } from '../src/repositories/diaryRepository';
import { listCapsules } from '../src/repositories/capsuleRepository';
import type { Diary, Capsule } from '../src/domain/types';
import { DiaryCard } from '../src/ui/DiaryCard';
import { theme } from '../src/ui/theme';

export default function List() {
  const db = useDb();
  const router = useRouter();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [capsules, setCapsules] = useState<Map<string, Capsule>>(new Map());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setDiaries(await listDiaries(db));
        const cs = await listCapsules(db);
        setCapsules(new Map(cs.map(c => [c.diaryId, c])));
      })();
    }, [db]),
  );

  return (
    <FlatList
      data={diaries}
      keyExtractor={d => d.id}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.empty}>아직 적힌 이야기가 없어요</Text>}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <DiaryCard
            diary={item}
            capsule={capsules.get(item.id) ?? null}
            now={new Date()}
            onPress={() => router.push({ pathname: '/diary/[id]', params: { id: item.id } })}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, maxWidth: theme.maxContentWidth, width: '100%', alignSelf: 'center' },
  item: { marginBottom: 12 },
  empty: { fontSize: theme.fontSize.body, color: theme.colors.subtle, textAlign: 'center', marginTop: 48 },
});
```

`app/diary/[id].tsx`:
```tsx
import { useCallback, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useDb } from '../../src/db/provider';
import { getDiary } from '../../src/repositories/diaryRepository';
import { getCapsuleForDiary, markOpened } from '../../src/repositories/capsuleRepository';
import { isOpenable } from '../../src/domain/capsuleRules';
import type { Diary, Capsule } from '../../src/domain/types';
import { theme } from '../../src/ui/theme';

export default function DiaryDetail() {
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [capsule, setCapsule] = useState<Capsule | null>(null);

  const load = useCallback(async () => {
    setDiary(await getDiary(db, id));
    setCapsule(await getCapsuleForDiary(db, id));
  }, [db, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!diary) return null;

  const sealed = capsule !== null && capsule.openedAt === null;
  const openable = capsule !== null && isOpenable(capsule.openDate, capsule.openedAt, new Date());

  if (sealed && !openable) {
    const d = new Date(capsule.openDate);
    return (
      <View style={styles.center}>
        <Text style={styles.lockedTitle}>🔒 아직 봉인되어 있어요</Text>
        <Text style={styles.lockedCopy}>
          {`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 다시 만나요`}
        </Text>
      </View>
    );
  }

  if (sealed && openable) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockedTitle}>그날의 이야기가 도착했어요</Text>
        <Pressable
          style={styles.openButton}
          onPress={async () => { await markOpened(db, capsule.id, new Date().toISOString()); await load(); }}
        >
          <Text style={styles.openButtonText}>열어보기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.page, { backgroundColor: diary.style.backgroundColor }]}>
        {diary.title && <Text style={styles.title}>{diary.title}</Text>}
        <Text style={{
          fontSize: diary.style.fontSize, color: diary.style.fontColor, lineHeight: diary.style.fontSize * 1.6,
        }}>
          {diary.content}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 16 },
  page: {
    width: '100%', maxWidth: theme.maxContentWidth, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#E5E0D5', gap: 12,
  },
  title: { fontSize: theme.fontSize.title, color: theme.colors.ink },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  lockedTitle: { fontSize: theme.fontSize.title, color: theme.colors.ink },
  lockedCopy: { fontSize: theme.fontSize.body, color: theme.colors.subtle },
  openButton: {
    minHeight: 56, paddingHorizontal: 32, borderRadius: 16,
    backgroundColor: theme.colors.accent, justifyContent: 'center',
  },
  openButtonText: { color: '#FFFFFF', fontSize: theme.fontSize.title },
});
```

- [ ] **Step 4: 실행해 통과 확인** — Run: `npm test -- DiaryCard && npx tsc --noEmit` / Expected: PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: diary list and detail with capsule locking"`

---

### Task 12: 설정 화면

**Files:**
- Modify: `app/settings.tsx`
- Test: 수동 확인 (로직은 settingsRepository 테스트로 커버됨)

**Interfaces:**
- Consumes: `isQuestionMode`, `setQuestionMode`, `useDb`

- [ ] **Step 1: 구현**

`app/settings.tsx`:
```tsx
import { useCallback, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDb } from '../src/db/provider';
import { isQuestionMode, setQuestionMode } from '../src/repositories/settingsRepository';
import { theme } from '../src/ui/theme';

export default function Settings() {
  const db = useDb();
  const [questionOn, setQuestionOn] = useState(true);

  useFocusEffect(useCallback(() => { isQuestionMode(db).then(setQuestionOn); }, [db]));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.labelWrap}>
          <Text style={styles.label}>오늘의 질문</Text>
          <Text style={styles.hint}>끄면 질문 없이 조용한 일기장이 돼요</Text>
        </View>
        <Switch
          value={questionOn}
          onValueChange={async v => { setQuestionOn(v); await setQuestionMode(db, v); }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, maxWidth: theme.maxContentWidth, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56 },
  labelWrap: { gap: 4, flexShrink: 1 },
  label: { fontSize: theme.fontSize.body, color: theme.colors.ink },
  hint: { fontSize: theme.fontSize.small, color: theme.colors.subtle },
});
```

- [ ] **Step 2: 타입 체크 + 전체 테스트** — Run: `npx tsc --noEmit && npm test` / Expected: PASS

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: settings screen with question mode toggle"`

---

### Task 13: 타임캡슐 로컬 알림

**Files:**
- Create: `src/notifications/capsuleNotifications.ts`
- Modify: `app/write.tsx` (봉인 시 알림 예약), `app/_layout.tsx` (알림 탭 → 해당 일기로 이동), `app.json` (expo-notifications 플러그인 설정)
- Test: 수동 (기기/에뮬레이터에서 확인. expo-notifications는 jest 환경에서 네이티브 모듈이라 유닛 테스트 제외)

**Interfaces:**
- Consumes: `setNotificationId`, `sealDiary` 흐름
- Produces:
  - `scheduleCapsuleNotification(diaryId: string, openDate: Date): Promise<string | null>` — 권한 요청 후 예약, 거부 시 null (봉인 자체는 그대로 진행)
  - 알림 문구: 제목 "당신의 여정", 본문 "봉인해 두신 이야기가 열렸어요. 그날의 마음을 다시 만나 보세요." (일기 내용 인용 금지 — 원칙 1)

- [ ] **Step 1: 구현**

`src/notifications/capsuleNotifications.ts`:
```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
    shouldShowBanner: true, shouldShowList: true,
  }),
});

async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.status === 'granted'
    ? existing.status
    : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('capsule', {
      name: '타임캡슐', importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return true;
}

export async function scheduleCapsuleNotification(
  diaryId: string, openDate: Date,
): Promise<string | null> {
  if (!(await ensurePermission())) return null;
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: '당신의 여정',
      body: '봉인해 두신 이야기가 열렸어요. 그날의 마음을 다시 만나 보세요.',
      data: { diaryId, type: 'capsule' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: openDate,
      channelId: Platform.OS === 'android' ? 'capsule' : undefined,
    },
  });
}
```

- [ ] **Step 2: write.tsx의 save()에서 봉인 시 알림 예약 연결**

`app/write.tsx`의 `save()` 안 `if (seal)` 블록을 다음으로 교체:
```tsx
    if (seal) {
      const openDate = resolveOpenDate(capsuleOption, now);
      const capsule = await sealDiary(db, diary.id, openDate.toISOString(), { id: newId(), now: now.toISOString() });
      const notifId = await scheduleCapsuleNotification(diary.id, openDate);
      if (notifId) await setNotificationId(db, capsule.id, notifId);
      Alert.alert('봉인되었어요', '때가 되면 조용히 알려드릴게요.');
    }
```
상단 import에 추가:
```tsx
import { sealDiary, setNotificationId } from '../src/repositories/capsuleRepository';
import { scheduleCapsuleNotification } from '../src/notifications/capsuleNotifications';
```

- [ ] **Step 3: 알림 탭 시 해당 일기로 이동**

`app/_layout.tsx`의 `RootLayout` 내부(Stack 렌더 위)에 추가:
```tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

// RootLayout 함수 안:
  const router = useRouter();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { diaryId?: string; type?: string };
      if (data.type === 'capsule' && data.diaryId) {
        router.push({ pathname: '/diary/[id]', params: { id: data.diaryId } });
      }
    });
    return () => sub.remove();
  }, [router]);
```

- [ ] **Step 4: app.json plugins에 expo-notifications 추가**

```json
["expo-notifications", { "color": "#C08A5D" }]
```

- [ ] **Step 5: 검증** — Run: `npx tsc --noEmit && npm test` / Expected: PASS. 이후 에뮬레이터에서 1분 뒤 개봉으로 수동 확인(개발 중에는 `resolveOpenDate` 대신 `new Date(Date.now() + 60_000)`을 임시 주입해 확인하고 되돌릴 것).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: capsule open notifications"`

---

## Self-Review 결과 (작성 시 수행)

- **스펙 커버리지**: 일기 쓰기+꾸미기(T3·T10), 오늘의 질문+토글(T4·T5·T9·T12), 타임캡슐+알림(T6·T11·T13), 여정 시각화(T7·T9), 오프라인 우선(전체 로컬 SQLite) — Phase 1 범위 모두 매핑됨. 동기화·인증·S3·Play 출시는 Phase 2·3 계획으로 이월 (스펙의 "기술 아키텍처" 중 AWS 부분).
- **원칙 준수**: 일기 내용을 읽는 코드는 열람 렌더링뿐. 분석·분기 없음. 질문은 순서 기반. JourneyPath에 수치 미노출 테스트 포함.
- **타입 일관성**: `DB`/`Diary`/`Capsule`/`QuestionState`/`DiaryStyle` 시그니처를 태스크 간 Interfaces 블록에 명시해 통일함.
