"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";

interface Props {
  attendanceOverTime: { date: string; rate: number }[];
  revenue: { month: string; paid: number; unpaid: number }[];
}

const TEAL = "#0d9488";
const GREEN = "#16a34a";
const AMBER = "#d97706";

export default function DashboardCharts({ attendanceOverTime, revenue }: Props) {
  return (
    <div className="space-y-6">
      {attendanceOverTime.length > 0 && (
        <Card>
          <h2 className="mb-4 font-medium">Attendance trend</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceOverTime} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Attendance %"
                  stroke={TEAL}
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {revenue.length > 0 && (
        <Card>
          <h2 className="mb-4 font-medium">Revenue: paid vs outstanding</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="paid" name="Paid" stackId="a" fill={GREEN} radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="unpaid"
                  name="Unpaid"
                  stackId="a"
                  fill={AMBER}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {attendanceOverTime.length === 0 && revenue.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No data yet. Mark some attendance and finalize an invoice to see
          charts here.
        </p>
      )}
    </div>
  );
}
