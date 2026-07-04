import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Img } from "remotion";
import type { VideoProps } from "../Root";

export const QuoteCard: React.FC<VideoProps> = ({ text, backgroundImage, backgroundColor = "#0f0f23" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, fps], [0.9, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {backgroundImage ? (
        <Img src={backgroundImage} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5)" }} />
      ) : (
        <AbsoluteFill style={{ backgroundColor }} />
      )}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
        }}
      >
        <div
          style={{
            opacity,
            transform: `scale(${scale})`,
            color: "#ffffff",
            fontFamily: "'Georgia', serif",
            fontSize: 44,
            fontWeight: 700,
            fontStyle: "italic",
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: "85%",
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}
        >
          &ldquo;{text}&rdquo;
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
