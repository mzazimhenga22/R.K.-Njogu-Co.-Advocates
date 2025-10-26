"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { type Invoice } from "../../invoices/page";
import * as React from "react";
import { format } from "date-fns";

type FinancialChartProps = {
    invoices: Invoice[];
}

export function FinancialChart({ invoices }: FinancialChartProps) {
  const financialData = React.useMemo(() => {
    const monthlyData: { [key: string]: { month: string, revenue: number } } = {};

    invoices.forEach(invoice => {
        if (invoice.paymentStatus === 'Paid') {
            const month = format(new Date(invoice.invoiceDate), "MMM yyyy");
            if (!monthlyData[month]) {
                monthlyData[month] = { month, revenue: 0 };
            }
            monthlyData[month].revenue += invoice.amount;
        }
    });

    const sortedData = Object.values(monthlyData).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return sortedData;
  }, [invoices]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={financialData}>
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
          tickFormatter={(value) => `KSH ${Number(value) / 1000}k`}
        />
        <Tooltip
            cursor={{fill: 'hsl(var(--muted))'}}
            contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
            formatter={(value) => `KSH ${Number(value).toLocaleString()}`}
        />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
