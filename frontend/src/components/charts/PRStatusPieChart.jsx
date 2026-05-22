import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { calculatePRStatusDistribution, CHART_COLORS } from '../../utils/chartHelpers';

export default function PRStatusPieChart({ pullRequests, summaryData, title }) {
  const chartData = calculatePRStatusDistribution(pullRequests || summaryData);
  const hasData = chartData.length > 0 && chartData.some(item => item.value > 0);

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
              d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
            />
          </svg>
          <p className="text-xs text-gray-500 font-medium">No PR status data available</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full flex flex-col justify-center">
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
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
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: '11px',
                  color: '#f9fafb'
                }}
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
