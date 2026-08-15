import { Pressable, StyleSheet, View } from "react-native";

import type { DiaryStyle } from "../domain/types";
import { AppText, Chip } from "./primitives";
import {
  DIARY_BACKGROUND_COLORS,
  DIARY_FONT_SIZE_LABELS,
  DIARY_FONT_SIZES,
  theme,
  type DiaryBackgroundColor,
} from "./theme";

/** 배경색별 부드러운 이름 — 스와치 접근성 라벨에 쓴다. */
const BACKGROUND_NAMES: Record<DiaryBackgroundColor, string> = {
  "#FFFDF7": "종이",
  "#FDF3E7": "살구",
  "#EFF5EF": "연둣빛",
  "#EEF2F7": "하늘빛",
};

const NOTEBOOK_DESIGNS: ReadonlyArray<{
  label: string;
  value: DiaryStyle["notebookDesign"];
}> = [
  { label: "무지", value: "plain" },
  { label: "줄노트", value: "lined" },
  { label: "모눈", value: "grid" },
];

interface StylePickerProps {
  style: DiaryStyle;
  onChange: (style: DiaryStyle) => void;
}

/**
 * 일기 꾸미기 선택 UI: 배경색 4종 스와치, 속지 3종(무지/줄노트/모눈),
 * 글자 크기 3종(작게 18/보통 20/크게 24). 선택 상태는 accent로 표시하고
 * 모든 터치 타겟은 48dp 이상.
 */
export function StylePicker({ style, onChange }: StylePickerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <AppText variant="small" color="subtle">
          배경
        </AppText>
        <View style={styles.row}>
          {DIARY_BACKGROUND_COLORS.map((color) => {
            const selected = style.backgroundColor === color;
            return (
              <Pressable
                key={color}
                testID={`background-${color}`}
                accessibilityRole="button"
                accessibilityLabel={`배경색 ${BACKGROUND_NAMES[color]}`}
                accessibilityState={{ selected }}
                onPress={() => onChange({ ...style, backgroundColor: color })}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  selected && styles.swatchSelected,
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="small" color="subtle">
          속지
        </AppText>
        <View style={styles.row}>
          {NOTEBOOK_DESIGNS.map(({ label, value }) => (
            <Chip
              key={value}
              label={label}
              selected={style.notebookDesign === value}
              selection="outline"
              onPress={() => onChange({ ...style, notebookDesign: value })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="small" color="subtle">
          글자 크기
        </AppText>
        <View style={styles.row}>
          {DIARY_FONT_SIZES.map((size) => (
            <Chip
              key={size}
              label={DIARY_FONT_SIZE_LABELS[size]}
              selected={style.fontSize === size}
              selection="outline"
              onPress={() => onChange({ ...style, fontSize: size })}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  swatch: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: theme.touchTarget / 2,
    borderWidth: 1,
    borderColor: theme.colors.subtle,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
});
