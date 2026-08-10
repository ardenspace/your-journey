import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { DbProvider, useDb } from "@/db/provider";
import {
  addCapsuleNotificationTapListener,
  getInitialCapsuleTapDiaryId,
} from "@/notifications/capsuleNotifications";
import { getDiary } from "@/repositories/diaryRepository";
import { theme } from "@/ui/theme";

/** Same-diary taps within this window are one tap (cold-start dedupe). */
const TAP_DEDUPE_WINDOW_MS = 3000;

/**
 * B3: tapping a capsule notification navigates to the diary's viewing
 * screen — opening still happens only via the button there. If the diary is
 * gone (deleted after the notification fired), go quietly home instead of
 * landing on a "not found" view. Lives inside DbProvider for the lookup.
 *
 * Two tap paths feed one handler:
 * - live listener — app foreground/background;
 * - `getInitialCapsuleTapDiaryId()` once on mount — app KILLED, tap launched
 *   it (the listener never fires for that response on its own).
 * On some platforms the cold-start response reaches BOTH paths, in either
 * order, so the handler dedupes: the same diaryId within a short window is
 * treated as one tap. Later taps for the same diary route normally.
 */
function CapsuleNotificationRouting() {
  const db = useDb();
  const router = useRouter();
  const checkedColdStartRef = useRef(false);
  const lastHandledRef = useRef<{ diaryId: string; at: number } | null>(null);

  useEffect(() => {
    const handleTap = (diaryId: string) => {
      const now = Date.now();
      const last = lastHandledRef.current;
      if (
        last !== null &&
        last.diaryId === diaryId &&
        now - last.at < TAP_DEDUPE_WINDOW_MS
      ) {
        return;
      }
      lastHandledRef.current = { diaryId, at: now };
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
    };

    const subscription = addCapsuleNotificationTapListener(handleTap);
    if (!checkedColdStartRef.current) {
      checkedColdStartRef.current = true;
      void getInitialCapsuleTapDiaryId().then((diaryId) => {
        if (diaryId !== null) {
          handleTap(diaryId);
        }
      });
    }
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
