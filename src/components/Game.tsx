import { cambio } from "@/game";
import { Client } from "boardgame.io/react";

const Game = Client({ game: cambio, board: () => null });

export default Game;
