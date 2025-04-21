import { cambio } from "@/game";
import { Debug } from "boardgame.io/debug";
import { Local } from "boardgame.io/multiplayer";
import { Client } from "boardgame.io/react";
import BoardWrapper from "./BoardWrapper";

const CambioClient = Client({
  game: cambio,
  board: BoardWrapper,
  multiplayer: Local(),
  debug: { impl: Debug },
});

export default CambioClient;
