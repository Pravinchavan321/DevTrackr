import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatContributorsForRadar, CHART_COLORS } from '../../utils/chartHelpers';

export default function ContributorRadarChart({ contributors = [], title }) {
  const chartData = formatContributorsForRadar(contributors, 5);
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
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <p className="text-xs text-gray-500 font-medium">No contributor data available</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full flex justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke={CHART_COLORS.grid} />
              <PolarAngleAxis
                dataKey="name"
                stroke={CHART_COLORS.text}
                tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 'auto']}
                stroke={CHART_COLORS.grid}
                tick={{ fill: CHART_COLORS.text, fontSize: 9 }}
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
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{
                  fontSize: '11px',
                  color: '#f9fafb'
                }}
              />
              <Radar
                name="Commits"
                dataKey="commits"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                fillOpacity={0.25}
              />
              <Radar
                name="Files Changed"
                dataKey="filesChanged"
                stroke={CHART_COLORS.success}
                fill={CHART_COLORS.success}
                fillOpacity={0.15}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
