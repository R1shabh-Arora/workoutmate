"use client";

import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EmptyState } from "@/components/empty-state";
import { Scale } from "lucide-react";
import type { Tables } from "@/lib/types/database.types";

export function WeightChart({ entries, unit }: { entries: Tables<"body_measurements">[]; unit: "kg" | "lb" }) {
  if (entries.length < 2) {
    return (
      <EmptyState
        icon={Scale}
        title="Not enough data yet"
        description="Log your weight a few times to see your trend appear here."
        className="py-10"
      />
    );
  }

  const data = entries.map((e) => ({
    date: e.measured_at,
    label: format(new Date(e.measured_at), "MMM d"),
    weight: unit === "lb" ? Math.round(e.weight_kg * 2.20462 * 10) / 10 : e.weight_kg,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          domain={["dataMin - 2", "dataMax + 2"]}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 13,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 500, marginBottom: 2 }}
          formatter={(value) => [`${value} ${unit}`, "Weight"]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
