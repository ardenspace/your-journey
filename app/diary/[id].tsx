import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { useDb } from "@/db/provider";
import { isOpenable, openInstant } from "@/domain/capsuleRules";
import { formatKoreanDate } from "@/domain/dates";
import type { Capsule, Diary } from "@/domain/types";
import {
  getCapsuleForDiary,
  markOpened,
} from "@/repositories/capsuleRepository";
import { deleteDiaryFlow } from "@/repositories/deleteDiaryFlow";
import { getDiary } from "@/repositories/diaryRepository";
import { NotebookPage } from "@/ui/NotebookPage";
import { AppText, Button, Screen } from "@/ui/primitives";
import { theme } from "@/ui/theme";

/**
 * 일기 열람 화면. 화면에 돌아올 때마다 일기와 캡슐을 함께 다시 읽는다.
 * - 봉인 중 & 개봉일 전: 작성일도 제목도 본문도 없이 조용한 안내만
 *   (Requirement 3 — 봉인 중에는 내용을 볼 수 없다).
 * - 봉인 중 & 개봉 가능: "열어보기" 버튼 — 개봉은 명시적 행위. 누르면
 *   markOpened 후 일반 열람으로 전환되고, 한 번 개봉하면 다시 봉인되지
 *   않는다(openedAt이 남아 영원히 일반 렌더).
 * - 캡슐 없음/개봉됨: 저장된 꾸미기 그대로 NotebookPage 렌더 + 조용한
 *   "고치기" 진입점 (Requirement 8 — 일반·개봉된 일기만 수정 가능,
 *   봉인 중에는 수정 진입점 자체가 없다). 수정 후 돌아오면
 *   useFocusEffect가 다시 읽어 고친 내용이 바로 보인다.
 * - 지우기: 일기가 있는 모든 상태에서 가능 — 봉인 중에도 (Requirement 8,
 *   통제권은 쓰는 사람에게). 조용한 진입점 + 부드러운 확인 한 번. 봉인
 *   일기도 같은 확인 문구를 쓴다 — 내용은 어떤 경로로도 드러내지 않는다.
 *   실패하면 일기는 그대로 남고 다시 시도만 부탁한다.
 * 일기를 찾지 못하면 조용하고 다정한 빈 화면만 — 에러 코드 없음.
 */
export default function DiaryDetail() {
  const db = useDb();
  const router = useRouter();
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
    try {
      await markOpened(db, capsule.id, new Date().toISOString());
      const reloaded = await getCapsuleForDiary(db, capsule.diaryId);
      setCapsule(reloaded);
    } catch {
      // 조용한 축소 — 개봉 실패 시 봉인 화면 그대로, 다시 누르면 된다.
    }
  }, [db, capsule]);

  const confirmDelete = useCallback(() => {
    if (diary === null) {
      return;
    }
    const diaryId = diary.id;
    Alert.alert("이 이야기를 지울까요?", "지운 이야기는 다시 볼 수 없어요.", [
      { text: "그대로 두기", style: "cancel" },
      {
        text: "지우기",
        style: "destructive",
        onPress: () => {
          void (async () => {
            const deleted = await deleteDiaryFlow(
              db,
              diaryId,
              new Date().toISOString(),
            );
            if (deleted) {
              router.back();
            } else {
              Alert.alert(
                "아직 지우지 못했어요",
                "잠시 후 다시 한번 눌러 주세요.",
              );
            }
          })();
        },
      },
    ]);
  }, [db, diary, router]);

  if (!loaded) {
    return <Screen />;
  }

  if (diary === null) {
    return (
      <Screen centered padding="xxl">
        <AppText color="subtle" center>
          이 이야기는 지금 찾을 수 없어요.
        </AppText>
      </Screen>
    );
  }

  // 봉인 중 (캡슐 존재 && 미개봉) — 제목·본문은 절대 그리지 않는다.
  if (capsule !== null && capsule.openedAt === null) {
    if (!isOpenable(capsule.openDate, capsule.openedAt, new Date())) {
      return (
        <Screen centered padding="xxl" gap="lg">
          <AppText center>🔒 아직 봉인되어 있어요</AppText>
          <AppText variant="small" color="subtle" center>
            {`${formatKoreanDate(
              openInstant(capsule.openDate).toISOString(),
            )}에 다시 만나요`}
          </AppText>
          <Button
            label="지우기"
            variant="quiet"
            textColor="subtle"
            accessibilityLabel="지우기"
            onPress={confirmDelete}
          />
        </Screen>
      );
    }
    return (
      <Screen centered padding="xxl" gap="lg">
        <AppText center>그날의 이야기가 도착했어요</AppText>
        <Button
          label="열어보기"
          variant="pill"
          size="large"
          onPress={handleOpen}
          style={styles.openButton}
        />
        <Button
          label="지우기"
          variant="quiet"
          textColor="subtle"
          accessibilityLabel="지우기"
          onPress={confirmDelete}
        />
      </Screen>
    );
  }

  const { style } = diary;
  const lineHeight = Math.round(style.fontSize * 1.6);

  return (
    <Screen scroll stretch gap="md">
      <View style={styles.metaRow}>
        <AppText variant="small" color="subtle">
          {formatKoreanDate(diary.createdAt)}
        </AppText>
        <View style={styles.actionRow}>
          <Button
            label="지우기"
            variant="quiet"
            textColor="subtle"
            accessibilityLabel="지우기"
            onPress={confirmDelete}
          />
          <Button
            label="고치기"
            variant="quiet"
            accessibilityLabel="고치기"
            onPress={() =>
              router.push({
                pathname: "/edit/[id]",
                params: { id: diary.id },
              })
            }
          />
        </View>
      </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  page: {
    flexGrow: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  title: {
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing.md,
  },
  openButton: {
    minWidth: 200,
  },
});
