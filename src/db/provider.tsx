import { randomUUID } from "expo-crypto";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { openAppDb, type DB } from "./database";
import { migrate } from "./schema";
import { theme } from "../ui/theme";

const DbContext = createContext<DB | null>(null);

/**
 * Opens the app database and runs the idempotent migration once on mount.
 * Children render only when the DB is ready. Open/migrate failure is the
 * only fatal failure (conventions.md): the app stays on this quiet loading
 * view — no error codes, no diary content in any message.
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opened = await openAppDb();
        await migrate(opened);
        if (!cancelled) {
          setDb(opened);
        }
      } catch {
        // Fatal: stay on the loading view. Intentionally silent to the user.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (db === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

/** The ready DB. Throws if used outside DbProvider (programmer error). */
export function useDb(): DB {
  const db = useContext(DbContext);
  if (db === null) {
    throw new Error("useDb must be used within a DbProvider");
  }
  return db;
}

/** New entity id — UUID via expo-crypto (conventions.md). */
export function newId(): string {
  return randomUUID();
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.paper,
  },
});
