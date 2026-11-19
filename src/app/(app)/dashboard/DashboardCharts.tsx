"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
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
  revenue: {
    month: string;
    paid: number;
    unpaid: number;
    projected: number;
    cumulative: number;
  }[];
}

// Brand hue for single-series charts; status hues (good/warning/muted) for
// the paid/unpaid/projected breakdown, matching the tone used on the stat
// tiles above (StatTile "success"/"warning").
const TEAL = "#0d9488";
const GOOD = "#0ca30c";
const WARNING = "#d97706";
const MUTED = "#a1a1aa";

const GRID_STROKE = "#9ca3af";

const currency = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

function TooltipCard({
  label,
  rows,
}: {
  label: string;
  rows: { name: string; value: string; color: string }[];
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-1.5 font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span
                className="inline-block h-[2px] w-3 flex-none rounded-full"
                style={{ backgroundColor: row.color }}
              />
              {row.name}
            </span>
            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipCard
      label={label ?? ""}
      rows={[{ name: "Attendance", value: `${payload[0].value}%`, color: TEAL }]}
    />
  );
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const byKey = new Map(payload.map((p) => [p.dataKey, p.value]));
  const rows = [
    { key: "paid", name: "Paid", color: GOOD },
    { key: "unpaid", name: "Unpaid", color: WARNING },
    { key: "projected", name: "Projected", color: MUTED },
  ]
    .filter((r) => byKey.get(r.key))
    .map((r) => ({ name: r.name, color: r.color, value: currency.format(byKey.get(r.key) ?? 0) }));
  return <TooltipCard label={label ?? ""} rows={rows} />;
}

function CumulativeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipCard
      label={label ?? ""}
      rows={[{ name: "Cumulative revenue", value: currency.format(payload[0].value), color: TEAL }]}
    />
  );
}

function compactCurrency(value: number): string {
  if (value >= 1000) return `RM${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `RM${value}`;
}

export default function DashboardCharts({ attendanceOverTime, revenue }: Props) {
  const hasRevenueData = revenue.some((r) => r.paid || r.unpaid || r.projected);

  return (
    <div className="space-y-6">
      {attendanceOverTime.length > 0 && (
        <Card>
          <h2 className="mb-4 font-medium">Attendance trend</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceOverTime} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.15} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  className="text-zinc-500 dark:text-zinc-400"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  className="text-zinc-500 dark:text-zinc-400"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<AttendanceTooltip />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Attendance %"
                  stroke={TEAL}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {hasRevenueData && (
        <Card>
          <h2 className="mb-1 font-medium">Monthly revenue</h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Paid, unpaid, and projected (not yet invoiced) per month.
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue} margin={{ left: 4 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.15} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  className="text-zinc-500 dark:text-zinc-400"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={56}
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  className="text-zinc-500 dark:text-zinc-400"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compactCurrency}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: GRID_STROKE, opacity: 0.08 }} />
                <Legend
                  iconType="plainline"
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => <span className="text-zinc-600 dark:text-zinc-300">{value}</span>}
                />
                <Bar dataKey="paid" name="Paid" stackId="a" fill={GOOD} maxBarSize={24} radius={[3, 3, 0, 0]} />
                <Bar
                  dataKey="unpaid"
                  name="Unpaid"
                  stackId="a"
                  fill={WARNING}
                  maxBarSize={24}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="projected"
                  name="Projected"
                  stackId="a"
                  fill={MUTED}
                  maxBarSize={24}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {hasRevenueData && (
        <Card>
          <h2 className="mb-4 font-medium">Cumulative revenue</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue} margin={{ left: 4 }}>
                <defs>
                  <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={0.15} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  className="text-zinc-500 dark:text-zinc-400"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={56}
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  className="text-zinc-500 dark:text-zinc-400"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compactCurrency}
                />
                <Tooltip content={<CumulativeTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative revenue"
                  stroke={TEAL}
                  strokeWidth={2}
                  fill="url(#cumulativeFill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {attendanceOverTime.length === 0 && !hasRevenueData && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No data yet. Mark some attendance and finalize an invoice to see
          charts here.
        </p>
      )}
    </div>
  );
}
