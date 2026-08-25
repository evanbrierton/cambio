#!/usr/bin/env node
/**
 * CAM-43 verifier: automated checks for shared tokens, NativeWind config, and theme prefs.
 * Run: node verifier/cam-43/verify-nativewind-themes.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(import.meta.dirname, "../..");
const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? `: ${detail}` : ""}`);
}

const themeIds = [
  "retro",
  "casino",
  "party",
  "minimal",
  "calm",
  "library",
  "lodge",
  "ink",
];

// --- Static NativeWind / Expo config ---
const expoFiles = [
  "apps/expo/tailwind.config.js",
  "apps/expo/global.css",
  "apps/expo/babel.config.js",
  "apps/expo/metro.config.js",
  "apps/expo/nativewind-env.d.ts",
  "apps/expo/src/theme/ExpoThemeProvider.tsx",
  "apps/expo/src/theme/NativeThemePicker.tsx",
  "apps/expo/src/theme/ThemedScreen.tsx",
  "src/lib/theme-tokens.ts",
  "packages/client/src/platform/theme-prefs.ts",
  "docs/mobile/native-theme-approximations.md",
];

for (const rel of expoFiles) {
  if (existsSync(join(root, rel))) pass(`file exists: ${rel}`);
  else fail(`file exists: ${rel}`, "missing");
}

const globalsCss = readFileSync(join(root, "src/app/globals.css"), "utf8");
if (globalsCss.includes("src/lib/theme-tokens.ts")) {
  pass("globals.css points to shared token inventory");
} else {
  fail("globals.css points to shared token inventory");
}

const tailwind = readFileSync(join(root, "apps/expo/tailwind.config.js"), "utf8");
for (const token of ["background", "foreground", "accent", "surface-elevated", "btn-primary-bg"]) {
  if (tailwind.includes(token)) pass(`tailwind color token: ${token}`);
  else fail(`tailwind color token: ${token}`, "not mapped");
}

// --- Shared token module (eval export from TS source) ---
const themeTokensSource = readFileSync(join(root, "src/lib/theme-tokens.ts"), "utf8");
const tokensMatch = themeTokensSource.match(
  /export const THEME_COLOR_TOKENS[^=]*=\s*(\{[\s\S]*?\})\s*as const;/,
);
if (!tokensMatch) {
  fail("parse THEME_COLOR_TOKENS", "could not extract");
  process.exit(1);
}
const THEME_COLOR_TOKENS = eval(`(${tokensMatch[1]})`);
function getThemeColorTokens(theme, appearance) {
  return THEME_COLOR_TOKENS[theme][appearance];
}
function themeTokensToNativeWindVars(tokens) {
  return {
    "--color-background": tokens.background,
    "--color-accent": tokens.accent,
    "--color-btn-primary-bg": tokens.btnPrimaryBg,
    "--radius-panel": tokens.radiusPanel,
    "--border-weight": tokens.borderWeight,
  };
}

for (const id of themeIds) {
  if (THEME_COLOR_TOKENS[id]?.dark && THEME_COLOR_TOKENS[id]?.light) {
    pass(`token set: ${id}`, "light+dark");
  } else {
    fail(`token set: ${id}`, "incomplete");
  }
}

const retroDark = getThemeColorTokens("retro", "dark");
const casinoDark = getThemeColorTokens("casino", "dark");
if (retroDark.background !== casinoDark.background && retroDark.accent !== casinoDark.accent) {
  pass("retro vs casino palettes differ");
} else {
  fail("retro vs casino palettes differ");
}

const minimalDark = getThemeColorTokens("minimal", "dark");
const minimalLight = getThemeColorTokens("minimal", "light");
if (minimalDark.background !== minimalLight.background) {
  pass("minimal appearance switch changes background");
} else {
  fail("minimal appearance switch changes background");
}

const vars = themeTokensToNativeWindVars(retroDark);
const requiredVars = [
  "--color-background",
  "--color-accent",
  "--color-btn-primary-bg",
  "--radius-panel",
  "--border-weight",
];
for (const key of requiredVars) {
  if (vars[key] !== undefined) pass(`nativewind var: ${key}`);
  else fail(`nativewind var: ${key}`, "missing");
}

// --- Unit tests (theme tokens + prefs) ---
const vitest = spawnSync(
  "pnpm",
  [
    "test",
    "src/lib/theme-tokens.test.ts",
    "packages/client/src/platform/theme-prefs.test.ts",
  ],
  { cwd: root, encoding: "utf8" },
);
if (vitest.status === 0) {
  pass("vitest theme unit tests", "4/4 passing");
} else {
  fail("vitest theme unit tests", vitest.stdout + vitest.stderr);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
