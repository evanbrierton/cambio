"use client";

import type { NextPage } from "next";
import dynamic from "next/dynamic";

const CambioClient = dynamic(() => import("../components/CambioClient"), { ssr: false });

const Home: NextPage = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", width: "100%", height: "100%" }}>
      <CambioClient playerID="0" />
      <hr />
      <CambioClient playerID="1" />
    </div>
  );
};

export default Home;
