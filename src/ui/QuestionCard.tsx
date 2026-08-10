import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Question } from "../domain/types";
import { theme } from "./theme";

/**
 * 오늘의 질문 카드 (Requirement 2): 하루에 1개, 답해도 되고 무시해도 된다.
 * 질문 텍스트와 "이 이야기 써 볼까요?" 버튼만 — 강요하는 문구는 없다.
 */
export function QuestionCard({
  question,
  onWrite,
}: {
  question: Question;
  onWrite: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.questionText}>{question.text}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onWrite}
        style={styles.writeButton}
      >
        <Text style={styles.writeButtonLabel}>이 이야기 써 볼까요?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 24,
    gap: 20,
  },
  questionText: {
    fontSize: theme.fontSize.title,
    lineHeight: Math.round(theme.fontSize.title * 1.6),
    color: theme.colors.ink,
  },
  writeButton: {
    minHeight: theme.touchTarget,
    borderRadius: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.accent,
  },
  writeButtonLabel: {
    fontSize: theme.fontSize.small,
    color: theme.colors.card,
  },
});
