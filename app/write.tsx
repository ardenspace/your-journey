import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/ui/theme";

/** 쓰기 화면 플레이스홀더 — 실제 쓰기 UI는 이후 스텝에서. */
export default function Write() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>곧 이곳에서 오늘을 쓰실 수 있어요.</Text>
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
