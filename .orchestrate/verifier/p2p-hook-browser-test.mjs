/**
 * CAM-23 verifier: headless browser check for local host/guest lobby + online regression.
 * Run: node .orchestrate/verifier/p2p-hook-browser-test.mjs
 * Requires: dev servers on :3000 (Next) and :8787 (PartyKit).
 */
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3000";

async function waitForLobby(page, label, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const body = await page.locator("body").innerText();
    if (body.includes("WAITING") || body.match(/\d+\/6/)) {
      return { ok: true, body: body.slice(0, 400) };
    }
    if (/LOST CONNECTION|Enter a valid host endpoint/i.test(body)) {
      return { ok: false, body: body.slice(0, 400) };
    }
    await page.waitForTimeout(500);
  }
  const body = await page.locator("body").innerText();
  return { ok: false, body: body.slice(0, 400), timeout: true };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const consoleLogs = [];

  context.on("page", (page) => {
    page.on("console", (msg) => {
      consoleLogs.push(`[${page.url()}] ${msg.type()}: ${msg.text()}`);
    });
  });

  const hostPage = await context.newPage();
  await hostPage.goto(
    `${BASE}/play/test?mode=local&host=1&name=Host`,
    { waitUntil: "domcontentloaded", timeout: 30000 },
  );
  const hostSharedWorker = await hostPage.evaluate(() => typeof SharedWorker);
  const hostLobby = await waitForLobby(hostPage, "host");

  const guestPage = await context.newPage();
  await guestPage.goto(
    `${BASE}/play/test?mode=local&join=1&endpoint=127.0.0.1:9876&name=Guest`,
    { waitUntil: "domcontentloaded", timeout: 30000 },
  );
  const guestSharedWorker = await guestPage.evaluate(() => typeof SharedWorker);
  await guestPage.waitForTimeout(8000);
  const guestLobby = await waitForLobby(guestPage, "guest", 1000);
  const guestBody = await guestPage.locator("body").innerText();
  const hostBodyAfter = await hostPage.locator("body").innerText();

  const onlinePage = await context.newPage();
  const wsUrls = [];
  onlinePage.on("websocket", (ws) => wsUrls.push(ws.url()));
  await onlinePage.goto(
    `${BASE}/play/test?host=1&name=OnlineHost`,
    { waitUntil: "domcontentloaded", timeout: 30000 },
  );
  await onlinePage.waitForTimeout(5000);
  const onlineLobby = await waitForLobby(onlinePage, "online");
  const onlineWs8787 = wsUrls.some((u) => u.includes(":8787"));

  await browser.close();

  const hostPlayers = hostBodyAfter.match(/\d+\/6/g)?.[0] ?? "unknown";
  const guestHasBothPlayers = /Host/i.test(guestBody) && /Guest/i.test(guestBody);
  const guestLostConnection = /LOST CONNECTION TO HOST/i.test(guestBody);

  const report = {
    hostSharedWorker,
    guestSharedWorker,
    hostLobbyOk: hostLobby.ok,
    guestLobbyOk: guestLobby.ok && guestHasBothPlayers && !guestLostConnection,
    guestLostConnection,
    hostPlayersAfterGuestJoin: hostPlayers,
    onlineLobbyOk: onlineLobby.ok,
    onlinePartySocket8787: onlineWs8787,
    wsUrls,
    guestBodySnippet: guestBody.slice(0, 300),
    consoleTail: consoleLogs.slice(-15),
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.guestLobbyOk && report.hostLobbyOk && report.onlineLobbyOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
