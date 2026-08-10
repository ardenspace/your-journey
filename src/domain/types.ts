/**
 * Domain types shared across repositories, domain logic, and UI.
 * Pure data shapes only — no React, no DB imports.
 *
 * Instants (createdAt/updatedAt/openedAt/...) are UTC ISO 8601 strings
 * (`toISOString()` form); calendar days (openDate) are local-timezone
 * `YYYY-MM-DD` strings (see src/domain/dates.ts).
 */

export interface DiaryStyle {
  /** hex `#RRGGBB` — one of the 4-color palette */
  backgroundColor: string;
  notebookDesign: "plain" | "lined" | "grid";
  /** v1: always 'system' */
  fontFamily: string;
  fontSize: number;
  /** hex `#RRGGBB` */
  fontColor: string;
}

/** Default style for the very first diary (Conventions "기본 스타일"). */
export const DEFAULT_STYLE: DiaryStyle = {
  backgroundColor: "#FFFDF7",
  notebookDesign: "lined",
  fontFamily: "system",
  fontSize: 20,
  fontColor: "#3A3A3A",
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
  /** local calendar day `YYYY-MM-DD`; opening time is fixed to local 9am */
  openDate: string;
  openedAt: string | null;
  /** device-local OS notification handle; null when permission was denied */
  notificationId: string | null;
  createdAt: string;
}

/** B4: question bank entry. id rule `ch<장>-q<번호>`, e.g. `ch1-q1`. */
export interface Question {
  id: string;
  chapter: number;
  order: number;
  text: string;
}
