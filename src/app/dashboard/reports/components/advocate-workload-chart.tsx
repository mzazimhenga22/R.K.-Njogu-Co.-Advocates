
"use client"

import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { type Case } from "../../cases/page";

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type AdvocateWorkloadChartProps = {
    cases: Case[];
    advocates: UserProfile[];
}

export function AdvocateWorkloadChart({ cases, advocates }: AdvocateWorkloadChartProps) {
    const workloadData = React.useMemo(() => {
        if (!cases || !advocates) return [];

        const activeCases = cases.filter(c => c.status === "Open" || c.status === "In Progress");

        const workload = advocates.map(advocate => {
            const advocateName = `${advocate.firstName} ${advocate.lastName}`;
            const assignedCaseCount = activeCases.filter(c => c.assignedLawyerId === advocate.id).length;
            return {
                name: advocateName,
                "Active Cases": assignedCaseCount,
            }
        });

        return workload;
    }, [cases, advocates]);

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
        <Bar dataKey="Active Cases" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
