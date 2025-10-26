
"use client"

import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { type File as FileType } from "../../files/page";

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type AdvocateWorkloadChartProps = {
    cases: FileType[];
    advocates: UserProfile[];
}

export function AdvocateWorkloadChart({ cases: files, advocates }: AdvocateWorkloadChartProps) {
    const workloadData = React.useMemo(() => {
        if (!files || !advocates) return [];

        const activeFiles = files.filter(f => f.status === "Open" || f.status === "In Progress");

        const workload = advocates.map(advocate => {
            const advocateName = `${advocate.firstName} ${advocate.lastName}`;
            const assignedFileCount = activeFiles.filter(f => f.assignedLawyerId === advocate.id).length;
            return {
                name: advocateName,
                "Active Files": assignedFileCount,
            }
        });

        return workload;
    }, [files, advocates]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={workloadData} layout="vertical">
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis 
            type="category" 
            dataKey="name"
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            width={80}
        />
        <Tooltip
            cursor={{fill: 'hsl(var(--muted))'}}
            contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
        />
        <Legend />
        <Bar dataKey="Active Files" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

    