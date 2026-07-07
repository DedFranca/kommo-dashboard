"use client";

import { Card } from "@/components/ui/card";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { name: "Seg", v: 4 },
  { name: "Ter", v: 7 },
  { name: "Qua", v: 5 },
  { name: "Qui", v: 12 },
  { name: "Sex", v: 9 },
  { name: "Sáb", v: 6 },
  { name: "Dom", v: 3 },
];

export function SimpleLineChart({ title = "Atividade" }: { title?: string }) {
  return (
    <Card className="flex h-full min-h-[200px] flex-col">
      <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis width={28} tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid rgb(226 232 240)",
                background: "rgba(255,255,255,0.95)",
              }}
            />
            <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
