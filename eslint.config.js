// https://docs.expo.dev/guides/using-eslint/
//
// Project rules below enforce .talpi/conventions.md mechanically.
// Each rule has should-flag / should-pass cases in tests/lint-rules.test.ts.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

// --- no-restricted-imports -------------------------------------------------
// Flat config replaces (does not merge) a rule's options when several objects
// match one file, so each scope builds its full option list from these parts.

const SQLITE = {
  name: "expo-sqlite",
  message: "Only src/db/database.ts may import expo-sqlite. Use the DB interface.",
};
const CRYPTO = {
  name: "expo-crypto",
  message: "Only src/db/provider.tsx may import expo-crypto. Use newId().",
};
const RN_TEXT = {
  name: "react-native",
  importNames: ["Text"],
  message: "Render UI text with AppText from @/ui/primitives.",
};
const NO_RELATIVE = {
  group: ["./*", "../*"],
  message: "app/ files import src through the @/* alias.",
};
const NO_ALIAS = {
  group: ["@/*"],
  message: "Inside src/, use relative imports instead of the @/* alias.",
};

function restrictedImports({ sqlite = true, crypto = true, text = false, patterns = [] }) {
  const paths = [];
  if (sqlite) paths.push(SQLITE);
  if (crypto) paths.push(CRYPTO);
  if (text) paths.push(RN_TEXT);
  return { "no-restricted-imports": ["error", { paths, patterns }] };
}

// --- no-restricted-syntax --------------------------------------------------

// Spacing, radius and typography sizes come from theme tokens. 0 stays allowed.
const SIZE_KEYS =
  "/^(fontSize|lineHeight|letterSpacing|gap|rowGap|columnGap|padding[A-Za-z]*|margin[A-Za-z]*|border[A-Za-z]*Radius)$/";
const COLOR_KEYS = "/^(color|[a-z]+Color)$/";
const RAW_COLOR = "/^(#|rgba?\\(|hsla?\\()/";

const RAW_STYLE = [
  {
    selector: `Property[key.name=${SIZE_KEYS}][value.type="Literal"][value.value!=0]`,
    message: "Use theme.spacing / theme.radius / theme.typography instead of a raw size.",
  },
  {
    selector: `Property[key.name=${SIZE_KEYS}][value.type="UnaryExpression"]`,
    message: "Use theme.spacing / theme.radius / theme.typography instead of a raw size.",
  },
  {
    selector: `Property[key.name="fontWeight"][value.type="Literal"]`,
    message: "Use theme.fontWeight instead of a raw font weight.",
  },
  {
    selector: `Property[key.name=${COLOR_KEYS}][value.value=${RAW_COLOR}]`,
    message: "Use theme.colors instead of a raw color.",
  },
  {
    selector: `JSXAttribute[name.name=${COLOR_KEYS}] > Literal[value=${RAW_COLOR}]`,
    message: "Use theme.colors instead of a raw color.",
  },
];

// "Today" and other calendar days come from localDateString (local timezone).
const UTC_DATE_SLICE = [
  {
    selector:
      'CallExpression[callee.property.name=/^(slice|substring|substr|split)$/][callee.object.type="CallExpression"][callee.object.callee.property.name="toISOString"]',
    message: "toISOString() is UTC. Use localDateString() from src/domain/dates.ts for calendar days.",
  },
];

function restrictedSyntax({ rawStyle }) {
  return {
    "no-restricted-syntax": ["error", ...(rawStyle ? RAW_STYLE : []), ...UTC_DATE_SLICE],
  };
}

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*"],
  },

  // Screens.
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      ...restrictedImports({ text: true, patterns: [NO_RELATIVE] }),
      ...restrictedSyntax({ rawStyle: true }),
    },
  },
  {
    // The diary body and title render with the user's DiaryStyle, not AppText.
    files: ["app/diary/[[]id].tsx"],
    rules: restrictedImports({ patterns: [NO_RELATIVE] }),
  },

  // src/ layers.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      ...restrictedImports({ patterns: [NO_ALIAS] }),
      ...restrictedSyntax({ rawStyle: false }),
    },
  },
  {
    // Every component renders through theme tokens; theme.ts and the
    // DEFAULT_STYLE data in .ts files hold the raw values.
    files: ["src/**/*.tsx"],
    rules: restrictedSyntax({ rawStyle: true }),
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: restrictedImports({ text: true, patterns: [NO_ALIAS] }),
  },
  {
    files: ["src/ui/primitives/AppText.tsx"],
    rules: restrictedImports({ patterns: [NO_ALIAS] }),
  },
  {
    files: ["src/db/database.ts"],
    rules: restrictedImports({ sqlite: false, patterns: [NO_ALIAS] }),
  },
  {
    files: ["src/db/provider.tsx"],
    rules: restrictedImports({ crypto: false, patterns: [NO_ALIAS] }),
  },

  // Tests may build fixtures with raw values and import across layers.
  {
    files: ["**/__tests__/**", "tests/**"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
]);
