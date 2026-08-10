/**
 * Design tokens (conventions.md). Every screen pulls colors/sizes from here —
 * no hardcoded colors or font sizes in components.
 */
export const theme = {
  colors: {
    paper: "#FFFDF7",
    ink: "#3A3A3A",
    accent: "#C08A5D",
    subtle: "#8A8578",
    card: "#FFFFFF",
    /** 속지(줄노트/모눈) 괘선 — 본문보다 절대 크게 들리지 않는 옅은 톤. */
    notebookLine: "#0000000D",
  },
  fontSize: {
    body: 20,
    title: 24,
    small: 16,
  },
  touchTarget: 48,
  maxContentWidth: 720,
} as const;

/**
 * 일기 배경색 팔레트 4종: 종이 / 살구 / 연둣빛 / 하늘빛.
 * 스타일 선택 UI와 일기 렌더링이 공유한다.
 */
export const DIARY_BACKGROUND_COLORS = [
  "#FFFDF7",
  "#FDF3E7",
  "#EFF5EF",
  "#EEF2F7",
] as const;

export type DiaryBackgroundColor = (typeof DIARY_BACKGROUND_COLORS)[number];

/**
 * 일기 본문 글자 크기 3종: 작게 / 보통 / 크게 (Requirement 1).
 * 본문은 18 이상 규칙과 함께 스타일 선택 UI가 사용한다.
 */
export const DIARY_FONT_SIZES = [18, 20, 24] as const;

export type DiaryFontSize = (typeof DIARY_FONT_SIZES)[number];

/**
 * 글자 크기별 부드러운 라벨 — DiaryFontSize에 타입으로 묶여 있어
 * 토큰이 바뀌면 렌더링이 아니라 빌드가 깨진다.
 */
export const DIARY_FONT_SIZE_LABELS: Record<DiaryFontSize, string> = {
  18: "작게",
  20: "보통",
  24: "크게",
};
