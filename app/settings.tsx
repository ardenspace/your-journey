import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { useDb } from "@/db/provider";
import {
  isQuestionMode,
  setQuestionMode,
} from "@/repositories/settingsRepository";
import { AppText, contentFrame, Screen } from "@/ui/primitives";
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
    return <Screen />;
  }

  return (
    <Screen padding="xxl">
      <View style={contentFrame}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <AppText>오늘의 질문</AppText>
            <AppText variant="small" color="subtle">
              끄면 질문 없이 조용한 일기장이 돼요
            </AppText>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.controlHeight.large,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
});
