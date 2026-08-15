import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme, type ThemeColor } from "../theme";
import { AppText } from "./AppText";

type ButtonVariant = "primary" | "pill" | "pillOutline" | "quiet";

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: ButtonVariant;
  /** pill 전용 — large는 개봉 버튼처럼 한층 큰 알약. */
  size?: "medium" | "large";
  /** quiet 전용 — 지우기(subtle)처럼 톤을 낮출 때. */
  textColor?: ThemeColor;
  style?: StyleProp<ViewStyle>;
}

/**
 * 앱의 모든 버튼. 모양(variant)별 배경·테두리·타이포가 여기 한 곳에만
 * 있다 — 리디자인 시 이 파일과 theme.ts만 바꾸면 전 화면 버튼이 바뀐다.
 * - primary: 저장·쓰기 같은 큰 주 행동 (disabled면 흐려진다)
 * - pill: accent 알약 (medium: 카드 안 행동 / large: 개봉 같은 무대 중앙)
 * - pillOutline: 조용한 이동 (지난 여정/설정)
 * - quiet: 배경 없는 텍스트 버튼 (고치기/지우기)
 */
export function Button({
  label,
  variant = "primary",
  size = "medium",
  textColor,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    variant === "primary" && styles.primary,
    variant === "pill" && (size === "large" ? styles.pillLarge : styles.pill),
    variant === "pillOutline" && styles.pillOutline,
    variant === "quiet" && styles.quiet,
    variant === "primary" && disabled === true && styles.primaryDisabled,
    style,
  ];

  const text =
    variant === "primary"
      ? ({ variant: "title", color: "onAccent", weight: "semibold" } as const)
      : variant === "pill"
        ? size === "large"
          ? ({ variant: "body", color: "onAccent", weight: "semibold" } as const)
          : ({ variant: "small", color: "onAccent", weight: "regular" } as const)
        : variant === "pillOutline"
          ? ({ variant: "body", color: "ink", weight: "regular" } as const)
          : ({ variant: "small", color: textColor ?? "accent", weight: "regular" } as const);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={containerStyle}
      {...rest}
    >
      <AppText variant={text.variant} color={text.color} weight={text.weight}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    minHeight: theme.controlHeight.primary,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  primaryDisabled: {
    opacity: 0.4,
  },
  pill: {
    minHeight: theme.touchTarget,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.accent,
  },
  pillLarge: {
    minHeight: theme.controlHeight.large,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xxxl,
    backgroundColor: theme.colors.accent,
  },
  pillOutline: {
    minHeight: theme.touchTarget,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: theme.colors.subtle,
    backgroundColor: theme.colors.card,
  },
  quiet: {
    minHeight: theme.touchTarget,
    minWidth: theme.touchTarget,
    paddingHorizontal: theme.spacing.md,
  },
});
