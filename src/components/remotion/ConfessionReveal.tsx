"use client";

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

export function ConfessionRevealComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const cardY = spring({ frame, fps, from: 60, to: 0, config: { damping: 14, stiffness: 80 } });

  const textOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(frame, [30, 55], [12, 0], { extrapolateRight: "clamp" });

  const heartScale = spring({ frame: Math.max(0, frame - 60), fps, from: 0, to: 1, config: { damping: 10, stiffness: 200 } });
  const mutualOpacity = interpolate(frame, [65, 80], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          opacity: containerOpacity,
          transform: `translateY(${cardY}px)`,
          width: 380,
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(13,13,31,0.95) 0%, rgba(18,18,42,0.95) 100%)",
          border: "1px solid rgba(30,30,63,0.9)",
          backdropFilter: "blur(20px)",
          padding: 28,
          boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(124,58,237,0.1)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Glow overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(192,132,252,0.04) 0%, rgba(244,114,182,0.03) 100%)",
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
                background: "linear-gradient(135deg, #7c3aed, #c084fc)",
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
              <div style={{ color: "#f0eeff", fontSize: 13, fontWeight: 600 }}>Anonymous</div>
              <div style={{ color: "#4a4870", fontSize: 11 }}>College · 3 days ago</div>
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              padding: "3px 10px",
              borderRadius: 999,
              background: "rgba(96,165,250,0.1)",
              color: "#60a5fa",
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
            color: "#f0eeff",
            marginBottom: 20,
          }}
        >
          &quot;You always sit by the window in the library. The way you focus on your work is
          honestly inspiring. I&apos;ve been working up the courage to say this for a long time.&quot;
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #1e1e3f",
            paddingTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 11, color: "#4a4870" }}>CSE · 2026 · XYZ University</div>

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
              background: "rgba(244,114,182,0.15)",
              color: "#f472b6",
            }}
          >
            ✦ Mutual
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
