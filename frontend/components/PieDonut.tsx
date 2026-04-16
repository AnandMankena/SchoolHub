import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

export type DonutSlice = { value: number; color: string; label?: string };

function donutPath(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number) {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const p = (r: number, deg: number) => ({
    x: cx + r * Math.cos(rad(deg)),
    y: cy + r * Math.sin(rad(deg)),
  });
  const p0o = p(rOut, a0);
  const p1o = p(rOut, a1);
  const p1i = p(rIn, a1);
  const p0i = p(rIn, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0o.x} ${p0o.y} A ${rOut} ${rOut} 0 ${large} 1 ${p1o.x} ${p1o.y} L ${p1i.x} ${p1i.y} A ${rIn} ${rIn} 0 ${large} 0 ${p0i.x} ${p0i.y} Z`;
}

export function PieDonut({
  slices,
  size = 168,
  innerRatio = 0.58,
}: {
  slices: DonutSlice[];
  size?: number;
  innerRatio?: number;
}) {
  const sum = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  const cx = size / 2;
  const cy = size / 2;
  const rOut = size / 2 - 6;
  const rIn = rOut * innerRatio;

  if (sum <= 0) {
    return (
      <Svg width={size} height={size}>
        <Path
          d={donutPath(cx, cy, rOut, rIn, 0, 359.99)}
          fill="#EAECEF"
        />
      </Svg>
    );
  }

  let angle = 0;
  const paths: React.ReactNode[] = [];
  slices.forEach((s, i) => {
    const v = Math.max(0, s.value);
    if (v <= 0) return;
    const sweep = (v / sum) * 360;
    if (sweep < 0.05) return;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    paths.push(
      <Path
        key={i}
        d={donutPath(cx, cy, rOut, rIn, start, end)}
        fill={s.color}
        stroke="#FFFFFF"
        strokeWidth={2}
      />
    );
  });

  return (
    <Svg width={size} height={size}>
      <G>{paths}</G>
    </Svg>
  );
}
