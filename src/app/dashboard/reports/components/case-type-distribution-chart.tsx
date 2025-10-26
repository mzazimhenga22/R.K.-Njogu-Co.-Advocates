"use client";

import * as React from "react";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { type Case } from "../../cases/page";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type CaseTypeDistributionChartProps = {
  cases: Case[] | null | undefined;
  /**
   * Maximum number of individual slices to show (top N). Remaining types collapse into "Other".
   * Default: 5 (so chart shows up to 5 slices + "Other" if needed).
   */
  topN?: number;
  /**
   * Minimum percentage threshold (0-100). Types under this percent will be grouped into "Other" as well.
   * Default: 2 (percent).
   */
  minPercentForIndividual?: number;
};

type ChartDatum = {
  name: string;
  value: number;
  percent: number;
};

function formatPercent(n: number) {
  // show integer percent for readability (change to 1 decimal if desired)
  return `${Math.round(n)}%`;
}

/**
 * Friendly, easy-to-read Case Type Distribution Chart.
 * Shows counts + percentages, groups small categories into "Other", and sorts by size.
 */
export function CaseTypeDistributionChart({
  cases,
  topN = 5,
  minPercentForIndividual = 2,
}: CaseTypeDistributionChartProps) {
  const { data, total } = React.useMemo(() => {
    if (!cases || cases.length === 0) return { data: [] as ChartDatum[], total: 0 };

    // Count occurrences per type
    const counts = cases.reduce((acc, c) => {
      const type = (c.caseType && String(c.caseType).trim()) || "General";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(counts).reduce((s, v) => s + v, 0);

    // Turn into array and sort descending
    const entries = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Partition into topN plus "Other", also respect minPercentForIndividual
    const top: { name: string; value: number }[] = [];
    const otherBucket = { name: "Other", value: 0 };

    for (let i = 0; i < entries.length; i++) {
      const item = entries[i];
      const pct = (item.value / total) * 100;
      const shouldGroupBecauseOfRank = top.length >= topN;
      const shouldGroupBecauseOfSmall = pct < minPercentForIndividual;
      if (shouldGroupBecauseOfRank || shouldGroupBecauseOfSmall) {
        otherBucket.value += item.value;
      } else {
        top.push(item);
      }
    }

    const final = top.slice(); // copy
    if (otherBucket.value > 0) {
      final.push(otherBucket);
    }

    const chartData: ChartDatum[] = final.map((d) => ({
      name: d.name,
      value: d.value,
      percent: total > 0 ? (d.value / total) * 100 : 0,
    }));

    return { data: chartData, total };
  }, [cases, topN, minPercentForIndividual]);

  // legend formatter — appends count and percent to each label in the legend
  const legendFormatter = (value: string) => {
    const datum = data.find((d) => d.name === value);
    if (!datum) return value;
    return `${value} — ${datum.value} (${formatPercent(datum.percent)})`;
  };

  // custom tooltip to present friendly info
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload as ChartDatum;
    return (
      <div
        style={{
          background: "hsl(var(--background))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--foreground))",
          padding: 8,
          borderRadius: 6,
          fontSize: 13,
          minWidth: 160,
        }}
      >
        <div style={{ fontWeight: 600 }}>{p.name}</div>
        <div style={{ marginTop: 6 }}>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
          <span style={{ color: "hsl(var(--muted))", marginLeft: 8 }}>
            ({formatPercent(p.percent)})
          </span>
        </div>
        <div style={{ marginTop: 6, color: "hsl(var(--muted))", fontSize: 12 }}>
          of all cases
        </div>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
        No case types to display yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
        <Legend verticalAlign="bottom" formatter={legendFormatter} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius={100}
          innerRadius={40}
          paddingAngle={2}
          // label shows name + percent (keeps label compact)
          label={({ name, percent, index }) =>
            `${name} ${formatPercent(data[index]?.percent ?? percent * 100)}`
          }
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
