import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
    return <View style={styles.screen} />;
  }

  const { count, question } = data;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
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

          <Link href="/write" asChild>
            <Pressable accessibilityRole="button" style={styles.writeButton}>
              <Text style={styles.writeButtonLabel}>오늘을 쓰다</Text>
            </Pressable>
          </Link>

          <View style={styles.links}>
            <Link href="/list" asChild>
              <Pressable accessibilityRole="button" style={styles.linkButton}>
                <Text style={styles.linkLabel}>지난 여정</Text>
              </Pressable>
            </Link>
            <Link href="/settings" asChild>
              <Pressable accessibilityRole="button" style={styles.linkButton}>
                <Text style={styles.linkLabel}>설정</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: theme.maxContentWidth,
    alignSelf: "center",
    gap: 32,
  },
  writeButton: {
    minHeight: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accent,
  },
  writeButtonLabel: {
    fontSize: theme.fontSize.title,
    color: theme.colors.card,
    fontWeight: "600",
  },
  links: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  linkButton: {
    minHeight: theme.touchTarget,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.subtle,
    backgroundColor: theme.colors.card,
  },
  linkLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
  },
});
