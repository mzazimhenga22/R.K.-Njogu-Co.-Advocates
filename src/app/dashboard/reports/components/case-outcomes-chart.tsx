"use client";

import * as React from "react";
import { Pie, PieChart, ResponsiveContainer, Cell, Legend } from "recharts";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

type OutcomeDatum = {
  outcome: string;
  value: number;
  fill: string;
};

const DEFAULT_COLORS: Record<string, string> = {
  Win: "#16a34a", // green
  Loss: "#ef4444", // red
  Settled: "#f97316", // orange
  Dismissed: "#6b7280", // gray
  Other: "#3b82f6", // blue
  Unknown: "#7c3aed", // purple
};

/**
 * Helper to pick a color for an outcome. If the outcome is unknown, use "Unknown".
 * Any unexpected outcome gets a deterministic fallback color from DEFAULT_COLORS.Other.
 */
function colorForOutcome(outcome: string) {
  if (!outcome) return DEFAULT_COLORS.Unknown;
  const key =
    outcome === "Win" ||
    outcome === "Loss" ||
    outcome === "Settled" ||
    outcome === "Dismissed" ||
    outcome === "Other" ||
    outcome === "Unknown"
      ? outcome
      : outcome;
  return DEFAULT_COLORS[key] ?? DEFAULT_COLORS.Other;
}

export function CaseOutcomesChart() {
  const firestore = useFirestore();
  const [data, setData] = React.useState<OutcomeDatum[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!firestore) {
        setError("Firestore not available");
        setLoading(false);
        return;
      }

      try {
        // Only fetch closed cases to compute outcomes
        const casesRef = collection(firestore, "cases");
        const closedQ = query(casesRef, where("status", "==", "Closed"));
        const snaps = await getDocs(closedQ);

        const counts = new Map<string, number>();

        snaps.forEach((s) => {
          const d = s.data() as any;
          // closedOutcome might be undefined/null — bucket that as "Unknown"
          const outcome = (d.closedOutcome ?? "Unknown") as string;
          const key = outcome && typeof outcome === "string" ? outcome : "Unknown";
          counts.set(key, (counts.get(key) ?? 0) + 1);
        });

        if (cancelled) return;

        // convert to array sorted by value desc
        const arr: OutcomeDatum[] = Array.from(counts.entries())
          .map(([outcome, value]) => ({
            outcome,
            value,
            fill: colorForOutcome(outcome),
          }))
          .sort((a, b) => b.value - a.value);

        setData(arr);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to load case outcomes", err);
        setError(err?.message ? String(err.message) : "Failed to load outcomes");
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [firestore]);

  if (loading) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading case outcomes…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-sm text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          No closed cases found yet — outcomes will appear here once cases are closed.
        </div>
      </div>
    );
  }

  // Custom label renderer (keeps your previous label placement logic)
  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
    index,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = 25 + innerRadius + (outerRadius - innerRadius);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // avoid accessing global placeholder array — use local data
    const datum = data[index];
    const label = datum ? `${datum.outcome} (${value})` : `${value}`;

    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        style={{ fontSize: 12 }}
      >
        {label}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="outcome"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={renderLabel}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
