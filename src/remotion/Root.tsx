import React from "react";
import { Composition } from "remotion";
import { Minimal } from "./templates/Minimal";
import { QuoteCard } from "./templates/QuoteCard";
import { StoryMode } from "./templates/StoryMode";
import { Slideshow } from "./templates/Slideshow";

export interface VideoProps {
  text: string;
  hashtags?: string;
  backgroundImage?: string;
  backgroundColor?: string;
}

const fps = 30;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="minimal"
        component={Minimal as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={5 * fps}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ text: "Hello", backgroundColor: "#1a1a2e" }}
      />
      <Composition
        id="quote-card"
        component={QuoteCard as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={6 * fps}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ text: "Quote" }}
      />
      <Composition
        id="story-mode"
        component={StoryMode as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={5 * fps}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ text: "Story" }}
      />
      <Composition
        id="slideshow"
        component={Slideshow as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={8 * fps}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ text: "Slideshow" }}
      />
    </>
  );
};
