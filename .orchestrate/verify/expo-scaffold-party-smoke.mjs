#!/usr/bin/env node
/**
 * Verifier smoke: PartySocket connectivity to local PartyServer (CAM-41).
 * Usage: EXPO_PUBLIC_PARTY_HOST=localhost:8787 node .orchestrate/verify/expo-scaffold-party-smoke.mjs
 */
import PartySocket from "partysocket";

const host = process.env.EXPO_PUBLIC_PARTY_HOST ?? "localhost:8787";
const room = "expo-smoke";

const socket = new PartySocket({
  host,
  room,
  query: { name: "VerifierSmoke", playerId: "verifier-smoke" },
});

const timeout = setTimeout(() => {
  console.error(`FAIL: timeout waiting for open (host=${host} room=${room})`);
  socket.close();
  process.exit(1);
}, 10000);

socket.addEventListener("open", () => {
  clearTimeout(timeout);
  console.log(`PASS: connected (host=${host} room=${room})`);
  socket.close();
  process.exit(0);
});

socket.addEventListener("error", () => {
  clearTimeout(timeout);
  console.error(`FAIL: error event (host=${host} room=${room})`);
  process.exit(1);
});
