import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { CHART_COLORS } from '../../utils/chartHelpers';

export default function VelocityAreaChart({ data = [], title }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="bg-gray-900 border border-gray-850 rounded-xl p-5 w-full flex flex-col h-[380px] justify-between">
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        </div>
      )}

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-800 rounded-lg bg-gray-950/20">
          <svg
            className="h-8 w-8 text-gray-600 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <p className="text-xs text-gray-500 font-medium">No velocity data available</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAdditions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDeletions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={CHART_COLORS.grid}
              />
              <XAxis
                dataKey="date"
                stroke={CHART_COLORS.text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke={CHART_COLORS.text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  borderColor: '#374151',
                  borderRadius: '0.75rem',
                  color: '#f9fafb',
                  fontSize: '12px'
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: '12px',
                  color: '#f9fafb',
                  paddingBottom: '10px'
                }}
              />
              <Area
                type="monotone"
                dataKey="additions"
                name="Lines Added"
                stroke={CHART_COLORS.success}
                fillOpacity={1}
                fill="url(#colorAdditions)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="deletions"
                name="Lines Deleted"
                stroke={CHART_COLORS.danger}
                fillOpacity={1}
                fill="url(#colorDeletions)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
