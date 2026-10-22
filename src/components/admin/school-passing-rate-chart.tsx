"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTooltip } from "@/components/charts/chart-theme";

export function SchoolPassingRateChart({ data }: { data: { school: string; rate: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 8, top: 22, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="school" tick={{ fontSize: 11, fill: "var(--text-soft)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-soft)" }} axisLine={false} tickLine={false} />
          <Tooltip {...chartTooltip} formatter={(value) => [`${value}%`, "Passing"]} />
          <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.rate >= 80 ? "var(--brand)" : d.rate >= 60 ? "var(--status-warn)" : "var(--status-bad)"} />
            ))}
            <LabelList dataKey="rate" position="top" formatter={(v: unknown) => `${v}%`} style={{ fill: "var(--text)", fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
