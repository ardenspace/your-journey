import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

import { DbProvider, useDb } from "@/db/provider";
import { addCapsuleNotificationTapListener } from "@/notifications/capsuleNotifications";
import { getDiary } from "@/repositories/diaryRepository";
import { theme } from "@/ui/theme";

/**
 * B3: tapping a capsule notification navigates to the diary's viewing
 * screen — opening still happens only via the button there. If the diary is
 * gone (deleted after the notification fired), go quietly home instead of
 * landing on a "not found" view. Lives inside DbProvider for the lookup.
 */
function CapsuleNotificationRouting() {
  const db = useDb();
  const router = useRouter();

  useEffect(() => {
    const subscription = addCapsuleNotificationTapListener((diaryId) => {
      void (async () => {
        try {
          const diary = await getDiary(db, diaryId);
          if (diary === null) {
            router.replace("/");
          } else {
            router.push({ pathname: "/diary/[id]", params: { id: diaryId } });
          }
        } catch {
          // 조용한 축소 — 조회 실패도 조용히 홈으로.
          router.replace("/");
        }
      })();
    });
    return () => subscription.remove();
  }, [db, router]);

  return null;
}

export default function RootLayout() {
  return (
    <DbProvider>
      <CapsuleNotificationRouting />
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
