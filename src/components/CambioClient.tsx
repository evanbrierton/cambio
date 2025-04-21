import { cambio } from "@/game";
import { Local } from "boardgame.io/multiplayer";
import { Client } from "boardgame.io/react";
import BoardWrapper from "./BoardWrapper";
import { Debug } from 'boardgame.io/debug';

const CambioClient = Client({
  game: cambio,
  board: BoardWrapper,
  multiplayer: Local(),
  debug: { impl: Debug }
});

export default CambioClient;
