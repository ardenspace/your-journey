import { Stack } from "expo-router";

import { DbProvider } from "@/db/provider";
import { theme } from "@/ui/theme";

export default function RootLayout() {
  return (
    <DbProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.paper },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontSize: theme.fontSize.title },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ title: "당신의 여정" }} />
        <Stack.Screen name="write" options={{ title: "오늘을 쓰다" }} />
        <Stack.Screen name="list" options={{ title: "지난 여정" }} />
        <Stack.Screen name="diary/[id]" options={{ title: "" }} />
        <Stack.Screen name="settings" options={{ title: "설정" }} />
      </Stack>
    </DbProvider>
  );
}
