"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTooltip } from "@/components/charts/chart-theme";
import { PASSING_GRADE } from "@/lib/grades";

export function SubjectAverageChart({ data }: { data: { subject: string; average: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 8, top: 22, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: "var(--text-soft)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--text-soft)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip {...chartTooltip} formatter={(value) => [String(value), "Average"]} />
          <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.average >= PASSING_GRADE ? "var(--brand)" : "var(--status-bad)"} />
            ))}
            {/* The average on each bar, so no one has to tap to read it. */}
            <LabelList dataKey="average" position="top" style={{ fill: "var(--text)", fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
