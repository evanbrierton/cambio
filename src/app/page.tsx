"use client";

import type { NextPage } from "next";
import dynamic from "next/dynamic";

const CambioClient = dynamic(() => import("../components/App"), { ssr: false });

const Home: NextPage = () => {
  return (
    <div style={{ display: "flex", justifyContent: "space-around", width: "100%", marginRight: "20rem" }}>
      <CambioClient playerID="0" />
      <CambioClient playerID="1" />
    </div>
  );
};

export default Home;
