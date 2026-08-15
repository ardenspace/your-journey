import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { QUESTION_BANK } from "@/content/questions";
import { useDb } from "@/db/provider";
import { localDateString } from "@/domain/dates";
import { currentQuestion, resolveToday } from "@/domain/questionEngine";
import type { Question } from "@/domain/types";
import { countDiaries } from "@/repositories/diaryRepository";
import {
  getQuestionState,
  isQuestionMode,
  saveQuestionState,
} from "@/repositories/settingsRepository";
import { JourneyPath } from "@/ui/JourneyPath";
import { Button, Screen } from "@/ui/primitives";
import { QuestionCard } from "@/ui/QuestionCard";
import { theme } from "@/ui/theme";

interface HomeData {
  count: number;
  question: Question | null;
}

/**
 * 홈: 여정 경로(Requirement 4) + 오늘의 질문 카드(Requirement 2) + 쓰기 진입.
 * 화면에 돌아올 때마다(useFocusEffect) 기록 수와 질문 상태를 다시 읽는다 —
 * 질문 상태 전진(resolveToday)은 카드가 실제로 보일 수 있는 이 시점에만 일어난다.
 * 질문 모드가 꺼져 있거나 뱅크가 소진되면 카드는 아예 없다.
 */
export default function Index() {
  const db = useDb();
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const count = await countDiaries(db);
        let question: Question | null = null;
        if (await isQuestionMode(db)) {
          const previous = await getQuestionState(db);
          const state = resolveToday(
            previous,
            localDateString(new Date()),
            QUESTION_BANK.length,
          );
          if (state !== previous) {
            await saveQuestionState(db, state);
          }
          question = currentQuestion(QUESTION_BANK, state);
        }
        if (!cancelled) {
          setData({ count, question });
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  // 첫 로드 전에는 조용한 빈 화면 (순간이라 거의 안 보인다).
  if (data === null) {
    return <Screen />;
  }

  const { count, question } = data;

  return (
    <Screen scroll verticalCenter padding="xxl" gap="xxxl">
      <JourneyPath count={count} />

      {question !== null && (
        <QuestionCard
          question={question}
          onWrite={() =>
            router.push({
              pathname: "/write",
              params: {
                questionId: question.id,
                questionText: question.text,
              },
            })
          }
        />
      )}

      <Button label="오늘을 쓰다" onPress={() => router.push("/write")} />

      <View style={styles.links}>
        <Button
          label="지난 여정"
          variant="pillOutline"
          onPress={() => router.push("/list")}
        />
        <Button
          label="설정"
          variant="pillOutline"
          onPress={() => router.push("/settings")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.lg,
  },
});
