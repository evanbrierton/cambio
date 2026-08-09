/**
 * Verifier script for CAM-81/83 theme + appearance behavior.
 * Run with: node verifier/cam-81-83-themes-verify.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const THEME_IDS = [
  "retro",
  "casino",
  "party",
  "minimal",
  "calm",
  "library",
  "lodge",
  "ink",
];

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split("; ")
      .filter(Boolean)
      .map((entry) => {
        const idx = entry.indexOf("=");
        return [entry.slice(0, idx), entry.slice(idx + 1)];
      }),
  );
}

async function getDomState(page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    return {
      dataTheme: html.dataset.theme ?? null,
      dataAppearance: html.dataset.appearance ?? null,
      colorScheme: html.style.colorScheme || null,
      fontClasses: Array.from(html.classList).filter((c) =>
        c.startsWith("__variable_"),
      ),
      tagline: document.querySelector(".font-display.text-theme-muted.text-xs")
        ?.textContent,
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];

  const log = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
  };

  // 1) SSR + FOUC init: cookie should win over stale localStorage
  await context.addCookies([
    {
      name: "cambio-theme",
      value: "library",
      url: BASE,
      sameSite: "Lax",
    },
    {
      name: "cambio-appearance",
      value: "dark",
      url: BASE,
      sameSite: "Lax",
    },
  ]);
  await page.addInitScript(() => {
    localStorage.setItem("cambio-theme", "retro");
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const initial = await getDomState(page);
  log(
    "FOUC init: cookie theme beats stale localStorage",
    initial.dataTheme === "library",
    `data-theme=${initial.dataTheme}`,
  );
  log(
    "FOUC init: appearance cookie applied before hydration",
    initial.dataAppearance === "dark" && initial.colorScheme === "dark",
    `data-appearance=${initial.dataAppearance}, colorScheme=${initial.colorScheme}`,
  );

  // 2) Style theme switch via ThemePicker
  await page.getByRole("button", { name: /Casino Night/i }).click();
  await page.waitForTimeout(300);
  const afterStyle = await getDomState(page);
  const cookiesAfterStyle = parseCookies(
    (await context.cookies()).map((c) => `${c.name}=${c.value}`).join("; "),
  );
  log(
    "Style switch updates data-theme",
    afterStyle.dataTheme === "casino",
    `data-theme=${afterStyle.dataTheme}`,
  );
  log(
    "Style switch writes cambio-theme cookie",
    cookiesAfterStyle["cambio-theme"] === "casino",
    `cookie=${cookiesAfterStyle["cambio-theme"]}`,
  );
  log(
    "THEME_VOICES updates with style theme",
    afterStyle.tagline === "Take a seat at the table",
    `tagline=${JSON.stringify(afterStyle.tagline)}`,
  );

  // 3) Appearance axis independent of style theme
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.waitForTimeout(300);
  const afterAppearance = await getDomState(page);
  const cookiesAfterAppearance = parseCookies(
    (await context.cookies()).map((c) => `${c.name}=${c.value}`).join("; "),
  );
  log(
    "Appearance light does not reset style theme",
    afterAppearance.dataTheme === "casino",
    `data-theme=${afterAppearance.dataTheme}`,
  );
  log(
    "Appearance switch updates data-appearance",
    afterAppearance.dataAppearance === "light" &&
      afterAppearance.colorScheme === "light",
    `data-appearance=${afterAppearance.dataAppearance}`,
  );
  log(
    "Appearance switch writes cambio-appearance cookie",
    cookiesAfterAppearance["cambio-appearance"] === "light",
    `cookie=${cookiesAfterAppearance["cambio-appearance"]}`,
  );

  // 4) Hard reload persistence
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const afterReload = await getDomState(page);
  log(
    "Hard reload persists style theme",
    afterReload.dataTheme === "casino",
    `data-theme=${afterReload.dataTheme}`,
  );
  log(
    "Hard reload persists appearance",
    afterReload.dataAppearance === "light",
    `data-appearance=${afterReload.dataAppearance}`,
  );

  // 5) All 8 themes reachable
  let allThemesOk = true;
  for (const id of THEME_IDS) {
    const option = THEME_OPTIONS_LABEL[id];
    await page.getByRole("button", { name: option }).click();
    await page.waitForTimeout(150);
    const state = await getDomState(page);
    if (state.dataTheme !== id) {
      allThemesOk = false;
      log(`Theme ${id} selectable`, false, `got ${state.dataTheme}`);
    }
  }
  if (allThemesOk) {
    log("All 8 style themes selectable via ThemePicker", true, THEME_IDS.join(", "));
  }

  // 6) System appearance
  await page.getByRole("button", { name: "System", exact: true }).click();
  await page.waitForTimeout(200);
  const systemState = await getDomState(page);
  const systemCookies = parseCookies(
    (await context.cookies()).map((c) => `${c.name}=${c.value}`).join("; "),
  );
  log(
    "System appearance preference stored",
    systemCookies["cambio-appearance"] === "system",
    `cookie=${systemCookies["cambio-appearance"]}`,
  );
  log(
    "System appearance resolves to light or dark",
    systemState.dataAppearance === "light" ||
      systemState.dataAppearance === "dark",
    `resolved=${systemState.dataAppearance}`,
  );

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- SUMMARY ---");
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);
  if (failed.length) {
    console.error("Failed checks:", failed);
    process.exit(1);
  }
}

const THEME_OPTIONS_LABEL = {
  retro: /Retro Arcade/i,
  casino: /Casino Night/i,
  party: /Party Pop/i,
  minimal: /Modern Minimal/i,
  calm: /Scandinavian Calm/i,
  library: /Midnight Library/i,
  lodge: /Campfire Lodge/i,
  ink: /Ink & Paper/i,
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
