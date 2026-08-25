import "partysocket/event-target-polyfill";

import { getPartyHost } from "@cambio/client";
import PartySocket from "partysocket";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const SMOKE_ROOM = "expo-smoke";

type SmokeStatus = "connecting" | "connected" | "disconnected" | "error";

export function PartySmokeTest() {
  const [status, setStatus] = useState<SmokeStatus>("connecting");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    const host = getPartyHost();
    setDetail(`host=${host} room=${SMOKE_ROOM}`);

    const socket = new PartySocket({
      host,
      room: SMOKE_ROOM,
      query: { name: "ExpoSmoke", playerId: "expo-smoke" },
    });

    const onOpen = () => {
      setStatus("connected");
      console.log("[expo-smoke] connected to PartyServer");
    };
    const onClose = () => {
      setStatus("disconnected");
      console.log("[expo-smoke] disconnected from PartyServer");
    };
    const onError = () => {
      setStatus("error");
      console.log("[expo-smoke] PartyServer connection error");
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("error", onError);
      socket.close();
    };
  }, []);

  const statusColor =
    status === "connected"
      ? "#4ade80"
      : status === "error"
        ? "#f87171"
        : status === "disconnected"
          ? "#fbbf24"
          : "#94a3b8";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>PartyServer connectivity</Text>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={styles.status}>{status}</Text>
      </View>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e1033",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    width: "100%",
  },
  label: {
    color: "#c4b5fd",
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  status: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  detail: {
    color: "#94a3b8",
    fontSize: 12,
  },
});
