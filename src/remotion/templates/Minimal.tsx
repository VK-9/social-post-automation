import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import type { VideoProps } from "../Root";

export const Minimal: React.FC<VideoProps> = ({ text, backgroundColor = "#1a1a2e" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, fps * 0.5], [50, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor, justifyContent: "center", alignItems: "center", padding: 40 }}>
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          fontSize: 36,
          fontWeight: 500,
          textAlign: "center",
          lineHeight: 1.5,
          maxWidth: "90%",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
