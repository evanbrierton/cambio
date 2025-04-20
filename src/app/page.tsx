"use client";

import type { Game } from "boardgame.io";
import type { NextPage } from "next";
import { Board } from "@/components/Board";
import { cambio } from "@/game";
import { Client, Lobby } from "boardgame.io/react";
import Image from "next/image";

import { applyMiddleware, compose } from "redux";
import logger from "redux-logger";

const App = Client({
  game: cambio,
  enhancer: applyMiddleware(logger as any),
});

const Home: NextPage = () => {
  return (
    <App />
  );
};

export default Home;
