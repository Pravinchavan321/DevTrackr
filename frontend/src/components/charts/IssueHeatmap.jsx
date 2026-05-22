import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { CHART_COLORS } from '../../utils/chartHelpers';

export default function IssueHeatmap({ issues = [], title }) {
  // Aggregate issues by creation date (last 10 active days)
  const getChartData = () => {
    if (!Array.isArray(issues) || issues.length === 0) return [];

    const dateMap = {};
    issues.forEach(issue => {
      if (!issue.createdAt) return;
      const dateStr = new Date(issue.createdAt).toISOString().split('T')[0];
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { date: dateStr, opened: 0, closed: 0 };
      }
      if (issue.state === 'closed') {
        dateMap[dateStr].closed++;
      } else {
        dateMap[dateStr].opened++;
      }
    });

    return Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10); // Limit to last 10 active days for visual clarity
  };

  const chartData = getChartData();
  const hasData = chartData.length > 0;

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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-xs text-gray-500 font-medium">No issue activity data available</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
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
                allowDecimals={false}
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
              <Bar
                dataKey="opened"
                name="Opened"
                fill={CHART_COLORS.warning}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Bar
                dataKey="closed"
                name="Closed"
                fill={CHART_COLORS.info}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
