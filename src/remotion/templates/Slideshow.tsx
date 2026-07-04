import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Sequence } from "remotion";
import type { VideoProps } from "../Root";

const SCENE_DURATION = 3;

function Slide({ text, index, bgColor }: { text: string; index: number; bgColor: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, fps * 0.5], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, justifyContent: "center", alignItems: "center", padding: 40 }}>
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          fontSize: 28,
          fontWeight: 400,
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: "85%",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}

const COLORS = ["#1a1a2e", "#16213e", "#0f3460", "#533483"];

export const Slideshow: React.FC<VideoProps> = ({ text, backgroundColor }) => {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .slice(0, 4);

  if (sentences.length === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: backgroundColor || "#1a1a2e", justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "#fff", fontSize: 32, textAlign: "center", padding: 40 }}>{text}</div>
      </AbsoluteFill>
    );
  }

  return (
    <>
      {sentences.map((sentence, i) => (
        <Sequence key={i} durationInFrames={SCENE_DURATION * 30} from={i * SCENE_DURATION * 30}>
          <Slide text={sentence} index={i} bgColor={backgroundColor || COLORS[i % COLORS.length]} />
        </Sequence>
      ))}
    </>
  );
};
