"use client";

import { Player } from "@remotion/player";
import { ConfessionRevealComposition } from "./ConfessionReveal";

type ConfessionPlayerProps = {
  variant?: "dark" | "light";
};

export default function ConfessionPlayer({ variant = "dark" }: ConfessionPlayerProps) {
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
      inputProps={{ variant }}
    />
  );
}
