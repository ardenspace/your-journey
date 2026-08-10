import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { useDb } from "@/db/provider";
import type { Diary } from "@/domain/types";
import { listDiaries } from "@/repositories/diaryRepository";
import { DiaryCard } from "@/ui/DiaryCard";
import { theme } from "@/ui/theme";

/**
 * 지난 여정(목록) 화면: 저장된 일기를 최신순으로 보여 준다.
 * 화면에 돌아올 때마다(useFocusEffect) 다시 읽어 방금 쓴 일기가 바로 보인다.
 * 숫자·통계는 노출하지 않는다 (Requirement 4).
 */
export default function List() {
  const db = useDb();
  const router = useRouter();
  const [diaries, setDiaries] = useState<Diary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const items = await listDiaries(db);
        if (!cancelled) {
          setDiaries(items);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  // 첫 로드 전에는 조용한 빈 화면 (순간이라 거의 안 보인다).
  if (diaries === null) {
    return <View style={styles.screen} />;
  }

  if (diaries.length === 0) {
    return (
      <View style={[styles.screen, styles.emptyContainer]}>
        <Text style={styles.emptyText}>아직 적힌 이야기가 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={diaries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <DiaryCard
            diary={item}
            onPress={() => router.push(`/diary/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.subtle,
    textAlign: "center",
  },
  listContent: {
    width: "100%",
    maxWidth: theme.maxContentWidth,
    alignSelf: "center",
    padding: 20,
    gap: 12,
  },
});
