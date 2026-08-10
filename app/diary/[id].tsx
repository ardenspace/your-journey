import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useDb } from "@/db/provider";
import { formatKoreanDate } from "@/domain/dates";
import type { Diary } from "@/domain/types";
import { getDiary } from "@/repositories/diaryRepository";
import { NotebookPage } from "@/ui/NotebookPage";
import { theme } from "@/ui/theme";

/**
 * 일기 열람 화면: 저장된 꾸미기(배경색·속지·글자 크기·글자색) 그대로
 * NotebookPage 위에 제목·본문을 보여 준다. 화면에 돌아올 때마다 다시
 * 읽는다(수정 화면에서 돌아온 경우 대비). 일기를 찾지 못하면 조용하고
 * 다정한 빈 화면만 — 에러 코드 없음.
 */
export default function DiaryDetail() {
  const db = useDb();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;

  const [diary, setDiary] = useState<Diary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const found = id === undefined ? null : await getDiary(db, id);
        if (!cancelled) {
          setDiary(found);
          setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [db, id]),
  );

  if (!loaded) {
    return <View style={styles.screen} />;
  }

  if (diary === null) {
    return (
      <View style={[styles.screen, styles.missingContainer]}>
        <Text style={styles.missingText}>
          이 이야기는 지금 찾을 수 없어요.
        </Text>
      </View>
    );
  }

  const { style } = diary;
  const lineHeight = Math.round(style.fontSize * 1.6);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        <Text style={styles.date}>{formatKoreanDate(diary.createdAt)}</Text>
        <NotebookPage
          design={style.notebookDesign}
          backgroundColor={style.backgroundColor}
          lineSpacing={lineHeight}
          style={styles.page}
        >
          {diary.title !== null && diary.title.length > 0 && (
            <Text
              style={[
                styles.title,
                { fontSize: style.fontSize + 4, color: style.fontColor },
              ]}
            >
              {diary.title}
            </Text>
          )}
          <Text
            style={{
              fontSize: style.fontSize,
              lineHeight,
              color: style.fontColor,
            }}
          >
            {diary.content}
          </Text>
        </NotebookPage>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: theme.maxContentWidth,
    alignSelf: "center",
    gap: 12,
  },
  date: {
    fontSize: theme.fontSize.small,
    color: theme.colors.subtle,
  },
  page: {
    flexGrow: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontWeight: "600",
    marginBottom: 12,
  },
  missingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.subtle,
    textAlign: "center",
  },
});
