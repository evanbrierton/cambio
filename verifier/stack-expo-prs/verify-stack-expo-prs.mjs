#!/usr/bin/env node
/**
 * stack-expo-prs verifier: CAM-41/42/43 artifacts + typecheck on stacked branch.
 * Run: node verifier/stack-expo-prs/verify-stack-expo-prs.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

function walkConflictMarkers(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist" ||
      entry.name === ".next"
    ) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkConflictMarkers(full, acc);
      continue;
    }
    if (!/\.(tsx?|jsx?|css|md|json|yaml|yml)$/.test(entry.name)) continue;
    const text = readFileSync(full, "utf8");
    if (/^<<<<<<<|^=======|^>>>>>>>/m.test(text)) {
      acc.push(full.slice(root.length + 1));
    }
  }
  return acc;
}

// CAM-41 scaffold artifacts
const scaffoldFiles = [
  "apps/expo/app.config.ts",
  "apps/expo/package.json",
  "apps/expo/app/_layout.tsx",
  "apps/expo/src/init-platform.ts",
  "packages/client/src/platform/expo.ts",
  "packages/client/src/platform/expo-clipboard.ts",
  "packages/client/src/platform/expo-storage.ts",
];

for (const rel of scaffoldFiles) {
  if (existsSync(join(root, rel))) pass(`CAM-41 scaffold: ${rel}`);
  else fail(`CAM-41 scaffold: ${rel}`, "missing");
}

// CAM-42 home/lobby routes
const lobbyFiles = [
  "apps/expo/app/index.tsx",
  "apps/expo/app/play/[roomId].tsx",
  "apps/expo/src/LobbyView.tsx",
  "apps/expo/src/usePlayerName.ts",
  "apps/expo/src/room-code.ts",
];

for (const rel of lobbyFiles) {
  if (existsSync(join(root, rel))) pass(`CAM-42 lobby: ${rel}`);
  else fail(`CAM-42 lobby: ${rel}`, "missing");
}

const homeSource = readFileSync(join(root, "apps/expo/app/index.tsx"), "utf8");
for (const needle of [
  "Create game",
  "goToRoom",
  "goToSolo",
  "NativeThemePicker",
  "ThemedScreen",
]) {
  if (homeSource.includes(needle)) pass(`CAM-42 home UI: ${needle}`);
  else fail(`CAM-42 home UI: ${needle}`, "not found in index.tsx");
}

const playSource = readFileSync(join(root, "apps/expo/app/play/[roomId].tsx"), "utf8");
for (const needle of ["LobbyView", "useGameConnection", "ConnectingView"]) {
  if (playSource.includes(needle)) pass(`CAM-42 play route: ${needle}`);
  else fail(`CAM-42 play route: ${needle}`, "not found");
}

// CAM-43 NativeWind / themes
const themeFiles = [
  "apps/expo/tailwind.config.js",
  "apps/expo/global.css",
  "apps/expo/babel.config.js",
  "apps/expo/metro.config.js",
  "apps/expo/nativewind-env.d.ts",
  "apps/expo/src/theme/ExpoThemeProvider.tsx",
  "apps/expo/src/theme/NativeThemePicker.tsx",
  "apps/expo/src/theme/ThemedScreen.tsx",
];

for (const rel of themeFiles) {
  if (existsSync(join(root, rel))) pass(`CAM-43 themes: ${rel}`);
  else fail(`CAM-43 themes: ${rel}`, "missing");
}

const metro = readFileSync(join(root, "apps/expo/metro.config.js"), "utf8");
if (metro.includes("withNativeWind")) pass("CAM-43 metro: withNativeWind");
else fail("CAM-43 metro: withNativeWind");

// Merge markers
const conflicts = walkConflictMarkers(root);
if (conflicts.length === 0) pass("no conflict markers in tree");
else fail("no conflict markers in tree", conflicts.join(", "));

// Typecheck
const typecheck = spawnSync("pnpm", ["--filter", "@cambio/expo", "typecheck"], {
  cwd: root,
  encoding: "utf8",
});
if (typecheck.status === 0) pass("pnpm --filter @cambio/expo typecheck");
else fail("pnpm --filter @cambio/expo typecheck", typecheck.stdout + typecheck.stderr);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
