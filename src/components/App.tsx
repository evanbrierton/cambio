import { cambio } from "@/game";
import { Local } from "boardgame.io/multiplayer";
import { Client } from "boardgame.io/react";
import BoardWrapper from "./BoardWrapper";

const CambioClient = Client({
  game: cambio,
  board: BoardWrapper,
  multiplayer: Local(),
});

export default CambioClient;
