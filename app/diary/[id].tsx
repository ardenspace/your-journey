import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/ui/theme";

/** 일기 상세 플레이스홀더 — 실제 상세 UI는 이후 스텝에서. */
export default function DiaryDetail() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>이 날의 기록을 곧 보여 드릴게요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.paper,
    padding: 24,
  },
  message: {
    fontSize: theme.fontSize.body,
    color: theme.colors.subtle,
    textAlign: "center",
  },
});
