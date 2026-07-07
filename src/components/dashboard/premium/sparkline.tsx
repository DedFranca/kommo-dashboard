"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

type Props = {
  data: number[];
  color: string;
  height?: number;
};

export function Sparkline({ data, color, height = 40 }: Props) {
  const values =
    data.length >= 2 ? data : data.length === 1 ? [data[0], data[0]] : [0, 0];
  const chartData = values.map((v, i) => ({ i, v }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color.replace("#", "")})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
