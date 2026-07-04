import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Img } from "remotion";
import type { VideoProps } from "../Root";

export const StoryMode: React.FC<VideoProps> = ({ text, backgroundImage, backgroundColor = "#2d1b69" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const textOpacity = interpolate(frame, [fps * 0.3, fps * 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(frame, [fps * 0.3, fps * 1], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {backgroundImage ? (
        <Img src={backgroundImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <AbsoluteFill style={{ backgroundColor }} />
      )}
      <AbsoluteFill
        style={{
          background: "linear-gradient(transparent 50%, rgba(0,0,0,0.7) 100%)",
          justifyContent: "flex-end",
          padding: "0 30px 80px 30px",
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            color: "#ffffff",
            fontFamily: "system-ui, sans-serif",
            fontSize: 34,
            fontWeight: 600,
            textAlign: "left",
            lineHeight: 1.4,
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
