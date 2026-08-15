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
    /** accent 배경 위에 올라가는 텍스트·아이콘 색. */
    onAccent: "#FFFFFF",
    /** 속지(줄노트/모눈) 괘선 — 본문보다 절대 크게 들리지 않는 옅은 톤. */
    notebookLine: "#0000000D",
  },
  fontSize: {
    body: 20,
    title: 24,
    small: 16,
  },
  /**
   * 텍스트 variant — AppText가 그대로 펼친다. 리디자인 시 여기(+폰트
   * 패밀리)만 바꾸면 전 화면 타이포가 함께 바뀐다.
   */
  typography: {
    title: { fontSize: 24 },
    /** 여유 행간 타이틀 — 질문 카드처럼 문장형 타이틀에. */
    titleLoose: { fontSize: 24, lineHeight: 38 },
    body: { fontSize: 20 },
    /** 여유 행간 본문 — 미리보기·문장형 안내에. */
    bodyRelaxed: { fontSize: 20, lineHeight: 30 },
    small: { fontSize: 16 },
  },
  fontWeight: {
    regular: "400",
    semibold: "600",
  },
  /** 4px 그리드 스페이싱 스케일 — 화면 코드는 생숫자 대신 이것만 쓴다. */
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
  },
  radius: {
    sm: 12,
    md: 16,
    /** 완전한 알약 — 높이의 절반보다 큰 값이면 무엇이든 같다. */
    pill: 999,
  },
  /** 버튼·행 높이 — touchTarget(48)보다 큰 두 단계. */
  controlHeight: {
    large: 56,
    primary: 64,
  },
  touchTarget: 48,
  maxContentWidth: 720,
} as const;

export type ThemeColor = keyof typeof theme.colors;
export type TypographyVariant = keyof typeof theme.typography;
export type FontWeight = keyof typeof theme.fontWeight;
export type SpacingKey = keyof typeof theme.spacing;
export type RadiusKey = keyof typeof theme.radius;

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
