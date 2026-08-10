import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useDb } from "@/db/provider";
import { isOpenable, openInstant } from "@/domain/capsuleRules";
import { formatKoreanDate } from "@/domain/dates";
import type { Capsule, Diary } from "@/domain/types";
import {
  getCapsuleForDiary,
  markOpened,
} from "@/repositories/capsuleRepository";
import { getDiary } from "@/repositories/diaryRepository";
import { NotebookPage } from "@/ui/NotebookPage";
import { theme } from "@/ui/theme";

/**
 * 일기 열람 화면. 화면에 돌아올 때마다 일기와 캡슐을 함께 다시 읽는다.
 * - 봉인 중 & 개봉일 전: 작성일도 제목도 본문도 없이 조용한 안내만
 *   (Requirement 3 — 봉인 중에는 내용을 볼 수 없다).
 * - 봉인 중 & 개봉 가능: "열어보기" 버튼 — 개봉은 명시적 행위. 누르면
 *   markOpened 후 일반 열람으로 전환되고, 한 번 개봉하면 다시 봉인되지
 *   않는다(openedAt이 남아 영원히 일반 렌더).
 * - 캡슐 없음/개봉됨: 저장된 꾸미기 그대로 NotebookPage 렌더.
 * 일기를 찾지 못하면 조용하고 다정한 빈 화면만 — 에러 코드 없음.
 */
export default function DiaryDetail() {
  const db = useDb();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;

  const [diary, setDiary] = useState<Diary | null>(null);
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const found = id === undefined ? null : await getDiary(db, id);
        const foundCapsule =
          found === null ? null : await getCapsuleForDiary(db, found.id);
        if (!cancelled) {
          setDiary(found);
          setCapsule(foundCapsule);
          setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [db, id]),
  );

  const handleOpen = useCallback(async () => {
    if (capsule === null) {
      return;
    }
    await markOpened(db, capsule.id, new Date().toISOString());
    const reloaded = await getCapsuleForDiary(db, capsule.diaryId);
    setCapsule(reloaded);
  }, [db, capsule]);

  if (!loaded) {
    return <View style={styles.screen} />;
  }

  if (diary === null) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.missingText}>
          이 이야기는 지금 찾을 수 없어요.
        </Text>
      </View>
    );
  }

  // 봉인 중 (캡슐 존재 && 미개봉) — 제목·본문은 절대 그리지 않는다.
  if (capsule !== null && capsule.openedAt === null) {
    if (!isOpenable(capsule.openDate, capsule.openedAt, new Date())) {
      return (
        <View style={[styles.screen, styles.centered]}>
          <Text style={styles.sealedTitle}>🔒 아직 봉인되어 있어요</Text>
          <Text style={styles.sealedSubtitle}>
            {`${formatKoreanDate(
              openInstant(capsule.openDate).toISOString(),
            )}에 다시 만나요`}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.sealedTitle}>그날의 이야기가 도착했어요</Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleOpen}
          style={styles.openButton}
        >
          <Text style={styles.openButtonText}>열어보기</Text>
        </Pressable>
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  missingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.subtle,
    textAlign: "center",
  },
  sealedTitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
    textAlign: "center",
  },
  sealedSubtitle: {
    fontSize: theme.fontSize.small,
    color: theme.colors.subtle,
    textAlign: "center",
  },
  openButton: {
    minHeight: 56,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    paddingHorizontal: 32,
    backgroundColor: theme.colors.accent,
  },
  openButtonText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.card,
    fontWeight: "600",
  },
});
