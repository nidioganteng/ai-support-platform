'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface VolumeData {
  date: string;
  count: number;
}

interface StatusData {
  status: string;
  count: number;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#a1a1aa',
  PENDING_HUMAN: '#f59e0b',
  RESOLVED: '#ffffff',
  CLOSED: '#3f3f46',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  PENDING_HUMAN: 'Pending Human',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function VolumeChart({ data }: { data: VolumeData[] }) {
  const formatted = data.map((d) => ({ ...d, label: formatDate(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#52525b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#52525b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#e4e4e7',
          }}
          itemStyle={{ color: '#e4e4e7' }}
          labelStyle={{ color: '#71717a' }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#ffffff"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, fill: '#ffffff', strokeWidth: 0 }}
          name="Conversations"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: StatusData[] }) {
  if (data.length === 0) return (
    <div className="flex h-[220px] items-center justify-center text-xs text-neutral-600">
      No data yet
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] ?? '#52525b'}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#e4e4e7',
          }}
          formatter={(value, name) => [
            value,
            STATUS_LABELS[String(name)] ?? String(name),
          ]}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#71717a', fontSize: '11px' }}>
              {STATUS_LABELS[value] ?? value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
