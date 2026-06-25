"use client";

import dynamic from "next/dynamic";

// WebGL must not run on the server; load only on the client, after paint.
const PaperGrain = dynamic(() => import("./PaperGrain"), { ssr: false });

export function AmbientBackground() {
  return <PaperGrain />;
}
