import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/ui/theme";

/** 설정 플레이스홀더 — 실제 설정 UI는 이후 스텝에서. */
export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>설정을 곧 이곳에서 도와 드릴게요.</Text>
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
