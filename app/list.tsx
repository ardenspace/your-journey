import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/ui/theme";

/** 지난 여정(목록) 플레이스홀더 — 실제 목록 UI는 이후 스텝에서. */
export default function List() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>지난 여정이 곧 이곳에 모여요.</Text>
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
