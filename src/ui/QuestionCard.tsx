import { StyleSheet } from "react-native";

import type { Question } from "../domain/types";
import { AppText, Button, Card } from "./primitives";

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
    <Card radius="md" padding="xxl" gap="xl" style={styles.card}>
      <AppText variant="titleLoose">{question.text}</AppText>
      <Button
        label="이 이야기 써 볼까요?"
        variant="pill"
        onPress={onWrite}
        style={styles.writeButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  writeButton: {
    alignSelf: "flex-start",
  },
});
