
"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts"
import { type Invoice } from "../../invoices/page";

const statusColors: { [key: string]: string } = {
  "Paid": "hsl(var(--primary))",
  "Unpaid": "hsl(var(--accent))",
  "Overdue": "hsl(var(--destructive))",
};

type InvoiceStatusChartProps = {
    invoices: Invoice[];
}

export function InvoiceStatusChart({ invoices }: InvoiceStatusChartProps) {
    const invoiceStatusData = React.useMemo(() => {
        if (!invoices) return [];
        const statusCounts = invoices.reduce((acc, currentInvoice) => {
            acc[currentInvoice.paymentStatus] = (acc[currentInvoice.paymentStatus] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([status, count]) => ({
            status,
            value: count,
            fill: statusColors[status] || "hsl(var(--muted))",
        }));
    }, [invoices]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Tooltip
            cursor={{fill: 'hsl(var(--muted))'}}
            contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
        />
        <Pie
          data={invoiceStatusData}
          dataKey="value"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
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
                className="text-sm font-bold"
              >
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            )
          }}
          labelLine={false}
        >
          {invoiceStatusData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill}/>
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
