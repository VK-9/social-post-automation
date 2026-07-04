"use client";

import { useEffect, useRef } from "react";

const LINE_COLOR = "#94a3b8";

export default function AuthSvg() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.querySelectorAll(".pulse-dot").forEach((d, i) => {
      (d as SVGElement).style.animation = `pulse-dot 2.5s ease-in-out ${i * 0.3}s infinite`;
    });
  }, []);

  const cx = 350;
  const cy = 400;

  function animPath(nx: number, ny: number) {
    const mx = (cx + nx) / 2;
    const my = (cy + ny) / 2 - 50;
    return `M${cx},${cy} Q${mx.toFixed(1)},${my.toFixed(1)} ${nx},${ny}`;
  }

  const nodes = [
    { x: 90, y: 100, label: "X" },
    { x: 55, y: 390, label: "Threads" },
    { x: 120, y: 700, label: "Pinterest" },
    { x: 580, y: 700, label: "Facebook" },
    { x: 645, y: 390, label: "LinkedIn" },
    { x: 610, y: 100, label: "Instagram" },
  ];

  const animPaths = nodes.map((n) => animPath(n.x, n.y));

  const trailConfigs = [
    { offset: 0, r: 5, opacity: 1 },
    { offset: 0.25, r: 4, opacity: 0.55 },
    { offset: 0.5, r: 3, opacity: 0.3 },
    { offset: 0.75, r: 2, opacity: 0.12 },
  ];

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 700 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {animPaths.map((d, i) => (
          <path key={`mpath-${i}`} id={`post-path-${i}`} d={d} fill="none" stroke="none" />
        ))}
      </defs>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.6; }
        }
        @keyframes hub-glow {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.2; }
        }
      `}</style>

      {/* Hub glow */}
      <circle cx={cx} cy={cy} r={40} fill={LINE_COLOR} style={{ animation: "hub-glow 3s ease-in-out infinite" }} />

      {/* Hub node */}
      <circle cx={cx} cy={cy} r={28} fill={LINE_COLOR} opacity={0.3} />
      <circle cx={cx} cy={cy} r={22} fill="#eef0f4" stroke={LINE_COLOR} strokeWidth={1} opacity={0.7} vectorEffect="non-scaling-stroke" />
      <circle cx={cx} cy={cy} r={10} fill={LINE_COLOR} opacity={0.5} />
      <path d={`M${cx - 6},${cy} L${cx + 6},${cy} M${cx},${cy - 6} L${cx},${cy + 6}`} stroke="#eef0f4" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />

      {/* Trail dots + main dot for each path */}
      {animPaths.map((d, i) => (
        <g key={`trail-group-${i}`}>
          {trailConfigs.map((tc, ti) => (
            <circle key={`trail-${i}-${ti}`} r={tc.r} fill="#64748b" opacity={0}>
              <animateMotion dur="4s" repeatCount="indefinite" begin={`${i * 1.2 + tc.offset}s`}>
                <mpath href={`#post-path-${i}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                dur="4s"
                repeatCount="indefinite"
                begin={`${i * 1.2 + tc.offset}s`}
                values="0;0;1;1;0;0"
                keyTimes="0;0.05;0.15;0.8;0.9;1"
                calcMode="spline"
                keySplines="0.4 0 0.6 1;0 0 1 1;0 0 1 1;0.4 0 0.6 1;0 0 1 1"
              />
            </circle>
          ))}
        </g>
      ))}

      {/* Satellite nodes with movement */}
      {nodes.map((n, i) => {
        const dx1 = 6 + (i % 3) * 4;
        const dy1 = -6 - (i % 2) * 4;
        const dx2 = -4 - (i % 2) * 4;
        const dy2 = 6 + (i % 3) * 3;
        return (
          <g key={`node-${i}`}>
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`0,0; ${dx1},${dy1}; 0,0; ${dx2},${dy2}; 0,0`}
                dur={`${7 + (i % 3) * 2}s`}
                repeatCount="indefinite"
              />
              <circle cx={n.x} cy={n.y} r={18} fill={LINE_COLOR} className="pulse-dot" style={{ animationDelay: `${i * 0.3}s` }} />
              <circle cx={n.x} cy={n.y} r={16} fill="#eef0f4" stroke={LINE_COLOR} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="central" fill={LINE_COLOR} fontSize={10} fontWeight="600" fontFamily="system-ui, sans-serif">
                {n.label === "X" ? "X" : n.label === "Instagram" ? "IG" : n.label === "Facebook" ? "FB" : n.label === "LinkedIn" ? "LI" : n.label === "Threads" ? "TH" : "Pin"}
              </text>
              <text
                x={n.x}
                y={n.y + 30}
                textAnchor="middle"
                fill={LINE_COLOR}
                fontSize={12}
                fontFamily="system-ui, sans-serif"
                fontWeight={500}
                opacity={0.5}
                letterSpacing={2}
              >
                {n.label.toLowerCase()}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
