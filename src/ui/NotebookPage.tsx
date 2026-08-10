import { useState, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { DiaryStyle } from "../domain/types";
import { theme } from "./theme";

interface NotebookPageProps {
  design: DiaryStyle["notebookDesign"];
  /** hex `#RRGGBB` — one of the diary background palette */
  backgroundColor: string;
  /**
   * Distance between ruled lines (and grid cell size). Callers pass the
   * body text's lineHeight (~1.6 × fontSize) so lines follow the writing.
   */
  lineSpacing?: number;
  /** Outer container styling (borderRadius, padding, flex, ...). */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

const DEFAULT_LINE_SPACING = 32;

/**
 * 속지(무지/줄노트/모눈) 시각 처리를 하나로 모은 종이 배경 (Requirement 1).
 * - plain: 배경색만
 * - lined: 옅은 가로 괘선
 * - grid: 옅은 모눈 격자
 * 괘선은 절대적으로 배치한 View로만 그린다(외부 의존성 없음). 터치를
 * 가로채지 않도록 pointerEvents="none" 오버레이 위에 children을 얹는다.
 */
export function NotebookPage({
  design,
  backgroundColor,
  lineSpacing = DEFAULT_LINE_SPACING,
  style,
  children,
}: NotebookPageProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      prev !== null && prev.width === width && prev.height === height
        ? prev
        : { width, height },
    );
  };

  const spacing = Math.max(8, lineSpacing);
  const horizontalLines: number[] = [];
  const verticalLines: number[] = [];
  if (size !== null && design !== "plain") {
    for (let y = spacing; y < size.height; y += spacing) {
      horizontalLines.push(y);
    }
    if (design === "grid") {
      for (let x = spacing; x < size.width; x += spacing) {
        verticalLines.push(x);
      }
    }
  }

  return (
    <View
      testID="notebook-page"
      onLayout={handleLayout}
      style={[styles.page, { backgroundColor }, style]}
    >
      {(horizontalLines.length > 0 || verticalLines.length > 0) && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {horizontalLines.map((top) => (
            <View
              key={`h-${top}`}
              style={[styles.horizontalLine, { top }]}
            />
          ))}
          {verticalLines.map((left) => (
            <View
              key={`v-${left}`}
              style={[styles.verticalLine, { left }]}
            />
          ))}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    overflow: "hidden",
  },
  horizontalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.notebookLine,
  },
  verticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: theme.colors.notebookLine,
  },
});
