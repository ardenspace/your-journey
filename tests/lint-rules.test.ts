/**
 * @jest-environment node
 *
 * Guards the project rules in eslint.config.js: each rule must flag its
 * violation and must pass the allowed form, at the real file paths it scopes.
 */
import path from "node:path";

import { ESLint } from "eslint";

const root = path.resolve(__dirname, "..");
// Jest cannot run ESLint's dynamic import of the config file, so pass it in.
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  overrideConfig: require("../eslint.config.js"),
});

const PROJECT_RULES = new Set(["no-restricted-imports", "no-restricted-syntax"]);

async function projectErrors(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, file) });
  return result.messages
    .filter((m) => m.ruleId !== null && PROJECT_RULES.has(m.ruleId))
    .map((m) => m.message);
}

type Case = { name: string; file: string; code: string };

const flagged: Case[] = [
  {
    name: "raw spacing in a screen",
    file: "app/index.tsx",
    code: `const s = { padding: 12 };`,
  },
  {
    name: "raw negative margin in src/ui",
    file: "src/ui/DiaryCard.tsx",
    code: `const s = { marginTop: -4 };`,
  },
  {
    name: "raw radius in a primitive",
    file: "src/ui/primitives/Card.tsx",
    code: `const s = { borderTopLeftRadius: 6 };`,
  },
  {
    name: "raw font weight",
    file: "app/list.tsx",
    code: `const s = { fontWeight: "600" };`,
  },
  {
    name: "raw hex color in a style object",
    file: "app/settings.tsx",
    code: `const s = { backgroundColor: "#FFFDF7" };`,
  },
  {
    name: "raw rgba color in a JSX attribute",
    file: "src/db/provider.tsx",
    code: `const x = <ActivityIndicator color="rgba(0,0,0,0.4)" />;`,
  },
  {
    name: "raw hex color in a JSX attribute in a screen",
    file: "app/write.tsx",
    code: `const x = <Switch thumbColor="#fff" />;`,
  },
  {
    name: "react-native Text in a screen",
    file: "app/list.tsx",
    code: `import { Text } from "react-native";`,
  },
  {
    name: "react-native Text in src/ui",
    file: "src/ui/QuestionCard.tsx",
    code: `import { StyleSheet, Text } from "react-native";`,
  },
  {
    name: "expo-sqlite outside database.ts",
    file: "src/repositories/diaryRepository.ts",
    code: `import { openDatabaseAsync } from "expo-sqlite";`,
  },
  {
    name: "expo-sqlite in a screen",
    file: "app/write.tsx",
    code: `import * as SQLite from "expo-sqlite";`,
  },
  {
    name: "expo-crypto outside provider.tsx",
    file: "src/domain/types.ts",
    code: `import { randomUUID } from "expo-crypto";`,
  },
  {
    name: "relative import in a screen",
    file: "app/index.tsx",
    code: `import { theme } from "../src/ui/theme";`,
  },
  {
    name: "alias import inside src",
    file: "src/ui/DiaryCard.tsx",
    code: `import { theme } from "@/ui/theme";`,
  },
  {
    name: "UTC calendar day via toISOString().slice",
    file: "src/domain/capsuleRules.ts",
    code: `const day = new Date().toISOString().slice(0, 10);`,
  },
  {
    name: "UTC calendar day via toISOString().split in a screen",
    file: "app/write.tsx",
    code: `const day = now.toISOString().split("T")[0];`,
  },
];

const allowed: Case[] = [
  {
    name: "token spacing and zero",
    file: "app/index.tsx",
    code: `const s = { padding: theme.spacing.md, margin: 0, flex: 1, width: "100%" };`,
  },
  {
    name: "token color and transparent",
    file: "src/ui/DiaryEditor.tsx",
    code: `const s = { color: theme.colors.ink, backgroundColor: "transparent" };`,
  },
  {
    name: "AppText color token name",
    file: "app/list.tsx",
    code: `const x = <AppText color="muted">hi</AppText>;`,
  },
  {
    name: "raw values in theme.ts",
    file: "src/ui/theme.ts",
    code: `export const theme = { spacing: { md: 12 }, colors: { ink: "#3A3A3A" } };`,
  },
  {
    name: "raw style defaults in the domain layer",
    file: "src/domain/types.ts",
    code: `export const DEFAULT_STYLE = { fontSize: 20, fontColor: "#3A3A3A" };`,
  },
  {
    name: "react-native Text in AppText",
    file: "src/ui/primitives/AppText.tsx",
    code: `import { Text, type TextProps } from "react-native";`,
  },
  {
    name: "react-native Text for the DiaryStyle body",
    file: "app/diary/[id].tsx",
    code: `import { Text } from "react-native";`,
  },
  {
    name: "other react-native imports in a screen",
    file: "app/write.tsx",
    code: `import { StyleSheet, TextInput, View } from "react-native";`,
  },
  {
    name: "expo-sqlite in database.ts",
    file: "src/db/database.ts",
    code: `import { openDatabaseAsync } from "expo-sqlite";`,
  },
  {
    name: "expo-crypto in provider.tsx",
    file: "src/db/provider.tsx",
    code: `import { randomUUID } from "expo-crypto";`,
  },
  {
    name: "alias import in a screen",
    file: "app/index.tsx",
    code: `import { theme } from "@/ui/theme";`,
  },
  {
    name: "relative import inside src",
    file: "src/ui/DiaryCard.tsx",
    code: `import { theme } from "./theme";`,
  },
  {
    name: "full ISO instant",
    file: "app/write.tsx",
    code: `const now = new Date().toISOString();`,
  },
  {
    name: "raw values in tests",
    file: "src/ui/__tests__/DiaryCard.test.tsx",
    code: `import { Text } from "react-native";\nconst s = { padding: 12, color: "#000" };`,
  },
];

describe("project lint rules", () => {
  test.each(flagged)("flags $name", async ({ file, code }) => {
    expect(await projectErrors(file, code)).toHaveLength(1);
  });

  test.each(allowed)("allows $name", async ({ file, code }) => {
    expect(await projectErrors(file, code)).toEqual([]);
  });
});
