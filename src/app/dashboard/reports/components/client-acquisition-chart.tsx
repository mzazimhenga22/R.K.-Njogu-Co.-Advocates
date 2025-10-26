
"use client"

import * as React from "react"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { type Client } from "../../clients/page";
import { format } from "date-fns";

type ClientAcquisitionChartProps = {
    clients: Client[];
}

export function ClientAcquisitionChart({ clients }: ClientAcquisitionChartProps) {
  const acquisitionData = React.useMemo(() => {
    const monthlyData: { [key: string]: { month: string, "New Clients": number } } = {};

    clients.forEach(client => {
        if (client.createdAt) { // Only process clients with a createdAt date
            const month = format(new Date(client.createdAt), "MMM yyyy");
            if (!monthlyData[month]) {
                monthlyData[month] = { month, "New Clients": 0 };
            }
            monthlyData[month]["New Clients"] += 1;
        }
    });
    
    const sortedData = Object.values(monthlyData).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return sortedData;
  }, [clients]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={acquisitionData}>
        <XAxis
          dataKey="month"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
            cursor={{fill: 'hsl(var(--muted))'}}
            contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
        />
        <Legend />
        <Line type="monotone" dataKey="New Clients" stroke="hsl(var(--primary))" strokeWidth={2} dot={{r:4}} activeDot={{r:8}} />
      </LineChart>
    </ResponsiveContainer>
  )
}
