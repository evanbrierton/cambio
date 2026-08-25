#!/usr/bin/env node
/**
 * CAM-42 verifier: PartySocket lobby smoke against local party:dev.
 * Mirrors useGameConnection query params used by Expo home/lobby routes.
 */
import PartySocket from "partysocket";
import { customAlphabet } from "nanoid";

const HOST = process.env.PARTY_HOST ?? "localhost:8787";
const generateRoomCode = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  6,
);

function waitForLobby(socket, label, { minPlayers = 1, expectSolo = false } = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label}: timed out waiting for lobby`));
    }, 15000);

    const onMessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "state" && data.view?.phase === "lobby") {
        const players = data.view.players ?? [];
        const ready = players.filter(
          (p) => (p.connected || p.isBot) && !p.isWaiting,
        );
        const soloOk = !expectSolo || data.view.isSoloMode === true;
        if (ready.length >= minPlayers && soloOk) {
          clearTimeout(timeout);
          socket.removeEventListener("message", onMessage);
          resolve({ view: data.view, readyCount: ready.length, players });
        }
      }
    };

    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error(`${label}: socket error`));
    });
  });
}

function connect({ roomId, name, playerId, solo, bots, difficulty }) {
  const query = { name, playerId };
  if (solo) {
    query.solo = "1";
    query.bots = String(bots ?? 2);
    query.difficulty = difficulty ?? "medium";
  }

  return new PartySocket({
    host: HOST,
    room: roomId,
    query,
  });
}

async function waitForOpen(socket, label) {
  if (socket.readyState === WebSocket.OPEN) return;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label}: open timeout`));
    }, 10000);
    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error(`${label}: failed to open`));
    });
  });
}

async function run() {
  const results = [];

  // 1. Create room (host) → lobby with 1 player
  const createRoom = generateRoomCode();
  const hostSocket = connect({
    roomId: createRoom,
    name: "VerifierHost",
    playerId: "verify-host-1",
  });
  await waitForOpen(hostSocket, "create");
  const createLobby = await waitForLobby(hostSocket, "create", {
    minPlayers: 1,
  });
  results.push({
    test: "create_room",
    roomId: createRoom,
    playerCount: createLobby.readyCount,
    pass: createLobby.readyCount === 1,
  });
  hostSocket.close();

  // 2. Solo vs bots → lobby with human + bots
  const soloRoom = generateRoomCode();
  const soloSocket = connect({
    roomId: soloRoom,
    name: "VerifierSolo",
    playerId: "verify-solo-1",
    solo: true,
    bots: 2,
    difficulty: "medium",
  });
  await waitForOpen(soloSocket, "solo");
  const soloLobby = await waitForLobby(soloSocket, "solo", {
    minPlayers: 3,
    expectSolo: true,
  });
  const botCount = soloLobby.players.filter((p) => p.isBot).length;
  results.push({
    test: "solo_vs_bots",
    roomId: soloRoom,
    playerCount: soloLobby.readyCount,
    botCount,
    isSoloMode: soloLobby.view.isSoloMode,
    pass:
      soloLobby.readyCount >= 3 &&
      botCount >= 2 &&
      soloLobby.view.isSoloMode === true,
  });
  soloSocket.close();

  // 3. Join by code → 2 players in lobby
  const joinRoom = generateRoomCode();
  const hostJoin = connect({
    roomId: joinRoom,
    name: "JoinHost",
    playerId: "verify-join-host",
  });
  await waitForOpen(hostJoin, "join-host");
  await waitForLobby(hostJoin, "join-host", { minPlayers: 1 });

  const guestJoin = connect({
    roomId: joinRoom,
    name: "JoinGuest",
    playerId: "verify-join-guest",
  });
  await waitForOpen(guestJoin, "join-guest");
  const joinLobby = await waitForLobby(guestJoin, "join", { minPlayers: 2 });
  results.push({
    test: "join_by_code",
    roomId: joinRoom,
    playerCount: joinLobby.readyCount,
    pass: joinLobby.readyCount === 2,
  });
  hostJoin.close();
  guestJoin.close();

  const allPass = results.every((r) => r.pass);
  console.log(JSON.stringify({ host: HOST, allPass, results }, null, 2));
  process.exit(allPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
