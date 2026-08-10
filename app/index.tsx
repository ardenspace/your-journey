import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/ui/theme";

/** 홈 플레이스홀더 — 진짜 홈 UI는 이후 스텝에서. /write 이동만 보장한다. */
export default function Index() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>오늘도 잘 오셨어요.</Text>
        <Link href="/write" asChild>
          <Pressable style={styles.writeButton}>
            <Text style={styles.writeButtonLabel}>오늘을 써 볼까요?</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.paper,
  },
  content: {
    width: "100%",
    maxWidth: theme.maxContentWidth,
    alignItems: "center",
    gap: 24,
    padding: 24,
  },
  greeting: {
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
  },
  writeButton: {
    minHeight: theme.touchTarget,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accent,
  },
  writeButtonLabel: {
    fontSize: theme.fontSize.body,
    color: theme.colors.card,
  },
});
