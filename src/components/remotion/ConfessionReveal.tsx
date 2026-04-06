"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type ConfessionRevealCompositionProps = {
  variant?: "dark" | "light";
};

export function ConfessionRevealComposition({
  variant = "dark",
}: ConfessionRevealCompositionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isLight = variant === "light";

  const containerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const cardY = spring({ frame, fps, from: 60, to: 0, config: { damping: 14, stiffness: 80 } });

  const textOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(frame, [30, 55], [12, 0], { extrapolateRight: "clamp" });

  const heartScale = spring({
    frame: Math.max(0, frame - 60),
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 200 },
  });
  const mutualOpacity = interpolate(frame, [65, 80], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: isLight ? "'Georgia', serif" : "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          opacity: containerOpacity,
          transform: `translateY(${cardY}px)`,
          width: 380,
          borderRadius: 20,
          background: isLight
            ? "linear-gradient(145deg, rgba(251,246,238,0.97) 0%, rgba(242,232,219,0.94) 100%)"
            : "linear-gradient(135deg, rgba(13,13,31,0.95) 0%, rgba(18,18,42,0.95) 100%)",
          border: isLight ? "1px solid rgba(184, 159, 126, 0.45)" : "1px solid rgba(30,30,63,0.9)",
          backdropFilter: "blur(20px)",
          padding: 28,
          boxShadow: isLight
            ? "0 38px 90px rgba(117, 90, 56, 0.18), 0 0 60px rgba(206, 185, 156, 0.24)"
            : "0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(124,58,237,0.1)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Glow overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isLight
              ? "linear-gradient(135deg, rgba(196, 168, 133, 0.12) 0%, rgba(255, 255, 255, 0.18) 100%)"
              : "linear-gradient(135deg, rgba(192,132,252,0.04) 0%, rgba(244,114,182,0.03) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: isLight
                  ? "linear-gradient(135deg, #b08a60, #d5b690)"
                  : "linear-gradient(135deg, #7c3aed, #c084fc)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "white",
              }}
            >
              ?
            </div>
            <div>
              <div
                style={{
                  color: isLight ? "#4d3925" : "#f0eeff",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Anonymous
              </div>
              <div style={{ color: isLight ? "#927357" : "#4a4870", fontSize: 11 }}>
                College · 3 days ago
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              padding: "3px 10px",
              borderRadius: 999,
              background: isLight ? "rgba(164, 132, 95, 0.12)" : "rgba(96,165,250,0.1)",
              color: isLight ? "#8a6946" : "#60a5fa",
            }}
          >
            Delivered
          </div>
        </div>

        {/* Message */}
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            fontSize: 13,
            lineHeight: 1.7,
            color: isLight ? "#5a4430" : "#f0eeff",
            marginBottom: 20,
          }}
        >
          &quot;You always sit by the window in the library. The way you focus on your work is
          honestly inspiring. I&apos;ve been working up the courage to say this for a long time.&quot;
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: isLight ? "1px solid rgba(184, 159, 126, 0.35)" : "1px solid #1e1e3f",
            paddingTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 11, color: isLight ? "#927357" : "#4a4870" }}>
            CSE · 2026 · XYZ University
          </div>

          {/* Mutual heart */}
          <div
            style={{
              opacity: mutualOpacity,
              transform: `scale(${heartScale})`,
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              padding: "3px 10px",
              borderRadius: 999,
              background: isLight ? "rgba(185, 141, 110, 0.14)" : "rgba(244,114,182,0.15)",
              color: isLight ? "#9a6b43" : "#f472b6",
            }}
          >
            ✦ Mutual
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
