/**
 * Question progression (B5). Phase 1 defines only the persisted state
 * shape; the progression logic itself lands in Phase 2.
 * Pure module — no React, no DB, no `new Date()`.
 */

/** Persisted as the `question_state` settings key (B1), JSON-encoded. */
export interface QuestionState {
  /** index into the question bank; past the end means "no question" */
  cursor: number;
  /** local calendar day `YYYY-MM-DD` the current question was last shown, or null */
  shownDate: string | null;
  /** number of distinct days the current question has been shown */
  shownCount: number;
  /** whether the current question has been answered */
  answeredCurrent: boolean;
}

/** State before any question has ever been shown (also the corrupted-JSON reset target). */
export const initialQuestionState: QuestionState = {
  cursor: 0,
  shownDate: null,
  shownCount: 0,
  answeredCurrent: false,
};
