"use client";

import { Player } from "@remotion/player";
import { ConfessionRevealComposition } from "./ConfessionReveal";

export default function ConfessionPlayer() {
  return (
    <Player
      component={ConfessionRevealComposition}
      durationInFrames={120}
      compositionWidth={420}
      compositionHeight={260}
      fps={30}
      autoPlay
      loop
      style={{
        width: "100%",
        maxWidth: 420,
        borderRadius: 20,
        overflow: "hidden",
        background: "transparent",
      }}
      inputProps={{}}
    />
  );
}
