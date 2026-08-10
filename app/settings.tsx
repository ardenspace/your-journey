import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { useDb } from "@/db/provider";
import {
  isQuestionMode,
  setQuestionMode,
} from "@/repositories/settingsRepository";
import { theme } from "@/ui/theme";

/**
 * 설정 (Requirement 6): 질문 모드 on/off 토글 하나뿐인 조용한 화면.
 * 화면에 돌아올 때마다(useFocusEffect) 저장된 값을 다시 읽는다.
 */
export default function Settings() {
  const db = useDb();
  const [questionMode, setQuestionModeState] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const on = await isQuestionMode(db);
        if (!cancelled) {
          setQuestionModeState(on);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const onToggle = useCallback(
    async (on: boolean) => {
      setQuestionModeState(on);
      await setQuestionMode(db, on);
    },
    [db],
  );

  // 첫 로드 전에는 조용한 빈 화면 (순간이라 거의 안 보인다).
  if (questionMode === null) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>오늘의 질문</Text>
            <Text style={styles.hint}>
              끄면 질문 없이 조용한 일기장이 돼요
            </Text>
          </View>
          <Switch
            accessibilityLabel="오늘의 질문"
            value={questionMode}
            onValueChange={onToggle}
            trackColor={{ true: theme.colors.accent }}
            thumbColor={theme.colors.card}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: theme.maxContentWidth,
    alignSelf: "center",
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
  },
  hint: {
    fontSize: theme.fontSize.small,
    color: theme.colors.subtle,
  },
});
