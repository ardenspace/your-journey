import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme } from "../theme";
import { AppText } from "./AppText";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /**
   * 선택 표시 방식:
   * - fill: accent로 채운다 (봉인 기간 칩)
   * - outline: accent 테두리만 (꾸미기 선택 칩)
   */
  selection?: "fill" | "outline";
  /** 칩이 놓이는 표면 — 카드 위에 놓이면 paper, 종이 위에 놓이면 card. */
  background?: "paper" | "card";
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * 고르는 알약 칩 하나. 선택 상태의 시각 언어(fill/outline)가 여기에만
 * 있어서 리디자인 시 이 파일만 바꾸면 모든 선택 UI가 함께 바뀐다.
 */
export function Chip({
  label,
  selected,
  onPress,
  selection = "fill",
  background = "card",
  accessibilityLabel,
  style,
}: ChipProps) {
  const fillSelected = selection === "fill" && selected;
  const outlineSelected = selection === "outline" && selected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.base,
        background === "paper" ? styles.onPaper : styles.onCard,
        fillSelected && styles.fillSelected,
        outlineSelected && styles.outlineSelected,
        style,
      ]}
    >
      <AppText
        variant="small"
        color={fillSelected ? "onAccent" : outlineSelected ? "accent" : "ink"}
        weight={selected ? "semibold" : "regular"}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.touchTarget,
    minWidth: theme.touchTarget,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  onPaper: {
    backgroundColor: theme.colors.paper,
  },
  onCard: {
    backgroundColor: theme.colors.card,
  },
  fillSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  outlineSelected: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
});
