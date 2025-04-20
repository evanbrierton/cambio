"use client";

import type { Game } from "boardgame.io";
import type { NextPage } from "next";
import { Board } from "@/components/Board";
import { cambio } from "@/game";
import { Client, Lobby } from "boardgame.io/react";

const App = Client({
  game: cambio,
});

const Home: NextPage = () => {
  return <App />;
};

export default Home;
