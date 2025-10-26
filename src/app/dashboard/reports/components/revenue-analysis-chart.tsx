
"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { type Invoice } from "../../invoices/page";
import { format } from "date-fns";

type RevenueAnalysisChartProps = {
  invoices: Invoice[];
};

export function RevenueAnalysisChart({ invoices }: RevenueAnalysisChartProps) {
  const revenueData = React.useMemo(() => {
    const monthlyData: {
      [key: string]: {
        month: string;
        Revenue: number;
        Pending: number;
      };
    } = {};

    invoices.forEach((invoice) => {
      const month = format(new Date(invoice.invoiceDate), "MMM yyyy");
      if (!monthlyData[month]) {
        monthlyData[month] = { month, Revenue: 0, Pending: 0 };
      }
      if (invoice.paymentStatus === "Paid") {
        monthlyData[month].Revenue += invoice.amount;
      } else {
        monthlyData[month].Pending += invoice.amount;
      }
    });
    
    const sortedData = Object.values(monthlyData).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return sortedData;
  }, [invoices]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={revenueData}>
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
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
          }}
          formatter={(value) => `KSH ${Number(value).toLocaleString()}`}
        />
        <Legend />
        <Bar
          dataKey="Revenue"
          stackId="a"
          fill="hsl(var(--primary))"
          radius={[0, 0, 4, 4]}
        />
        <Bar
          dataKey="Pending"
          stackId="a"
          fill="hsl(var(--secondary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
