
"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts"
import { type File as FileType } from "../files/page";

const statusColors: { [key: string]: string } = {
  "Open": "hsl(var(--primary))",
  "In Progress": "hsl(var(--accent))",
  "On Hold": "hsl(var(--secondary-foreground))",
  "Closed": "hsl(var(--muted-foreground))",
};

type FileStatusChartProps = {
    cases: FileType[]; // Keep prop name for compatibility, but it contains files
}

export function CaseStatusChart({ cases: files }: FileStatusChartProps) {
    const fileStatusData = React.useMemo(() => {
        if (!files) return [];
        const statusCounts = files.reduce((acc, currentFile) => {
            acc[currentFile.status] = (acc[currentFile.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([status, count]) => ({
            status,
            value: count,
            fill: statusColors[status] || "hsl(var(--primary))",
        }));
    }, [files]);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Tooltip
            cursor={{fill: 'hsl(var(--muted))'}}
            contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
        />
        <Pie
          data={fileStatusData}
          dataKey="value"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          label={({
            cx,
            cy,
            midAngle,
            innerRadius,
            outerRadius,
            value,
            percent,
            index,
          }) => {
            const RADIAN = Math.PI / 180
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5
            const x = cx + radius * Math.cos(-midAngle * RADIAN)
            const y = cy + radius * Math.sin(-midAngle * RADIAN)

            return (
              <text
                x={x}
                y={y}
                fill="hsl(var(--card-foreground))"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-xs font-bold"
              >
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            )
          }}
          labelLine={false}
        >
          {fileStatusData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

    