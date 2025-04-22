"use client";

import type { NextPage } from "next";
import dynamic from "next/dynamic";

const CambioClient = dynamic(() => import("../components/CambioClient"), { ssr: false });

const Home: NextPage = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "200vh" }}>
      <CambioClient playerID="0" />
      <hr />
      <CambioClient playerID="1" />
    </div>
  );
};

export default Home;
