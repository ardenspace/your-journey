/**
 * Question progression (B5).
 * Pure module — no React, no DB, no `new Date()`.
 */
import type { Question } from "./types";

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

/** An unanswered question persists for at most this many shown-days. */
const MAX_SHOWN_DAYS = 3;

/**
 * Advance the question state for `today` (local `YYYY-MM-DD`, from
 * `localDateString`). Call only when the question card is actually shown —
 * days the app wasn't opened don't count as shown-days.
 *
 * Same-day re-resolve is a no-op. On a new day: if the current question was
 * answered or has been shown `MAX_SHOWN_DAYS` days, move to the next
 * question; otherwise keep it and count one more shown-day.
 */
export function resolveToday(state: QuestionState, today: string): QuestionState {
  if (state.shownDate === today) {
    return state;
  }
  if (state.answeredCurrent || state.shownCount >= MAX_SHOWN_DAYS) {
    return {
      cursor: state.cursor + 1,
      shownDate: today,
      shownCount: 1,
      answeredCurrent: false,
    };
  }
  return {
    cursor: state.cursor,
    shownDate: today,
    shownCount: state.shownCount + 1,
    answeredCurrent: false,
  };
}

/** The question the cursor points at, or null when the bank is exhausted. */
export function currentQuestion(
  bank: Question[],
  state: QuestionState
): Question | null {
  return bank[state.cursor] ?? null;
}

/** Mark the current question answered; the cursor advances on the next new day. */
export function markAnswered(state: QuestionState): QuestionState {
  return { ...state, answeredCurrent: true };
}
