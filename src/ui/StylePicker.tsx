import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DiaryStyle } from "../domain/types";
import {
  DIARY_BACKGROUND_COLORS,
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

const FONT_SIZE_LABELS: Record<number, string> = {
  18: "작게",
  20: "보통",
  24: "크게",
};

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
        <Text style={styles.sectionLabel}>배경</Text>
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
        <Text style={styles.sectionLabel}>속지</Text>
        <View style={styles.row}>
          {NOTEBOOK_DESIGNS.map(({ label, value }) => {
            const selected = style.notebookDesign === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange({ ...style, notebookDesign: value })}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>글자 크기</Text>
        <View style={styles.row}>
          {DIARY_FONT_SIZES.map((size) => {
            const selected = style.fontSize === size;
            return (
              <Pressable
                key={size}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange({ ...style, fontSize: size })}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {FONT_SIZE_LABELS[size]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: theme.fontSize.small,
    color: theme.colors.subtle,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
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
  chip: {
    minHeight: theme.touchTarget,
    minWidth: theme.touchTarget,
    paddingHorizontal: 20,
    borderRadius: theme.touchTarget / 2,
    borderWidth: 1,
    borderColor: theme.colors.subtle,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: theme.fontSize.small,
    color: theme.colors.ink,
  },
  chipTextSelected: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
});
