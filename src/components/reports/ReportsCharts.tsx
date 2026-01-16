'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface ChartData {
  dailyActivity: Array<{
    date: string;
    hours: number;
    sessions: number;
  }>;
  taskDistribution: Array<{
    task: string;
    hours: number;
    percentage: number;
  }>;
  weeklyComparison: Array<{
    week: string;
    hours: number;
  }>;
  summary: {
    totalHours: number;
    totalSessions: number;
    averageDailyHours: number;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#84CC16'];

interface ReportsChartsProps {
  userId: string;
}

export function ReportsCharts({ userId }: ReportsChartsProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching chart data for userId:', userId);
        const response = await fetch(`/api/reports/chart-data/${userId}`, {
          credentials: 'include',
        });

        console.log('Chart data response status:', response.status);
        console.log('Chart data response ok:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Chart data API error:', errorText);
          throw new Error(`Failed to fetch chart data: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('Chart data received:', data);
        setChartData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data';
        setError(errorMessage);
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchChartData();
    }
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const formatTooltipValue = (value: number | undefined, name: string | undefined) => {
    if (!value || !name) return [0, name || ''];
    if (name === 'hours') {
      return [formatHours(value), 'Hours'];
    }
    if (name === 'sessions') {
      return [value, 'Sessions'];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="theme-card rounded-xl shadow-sm border p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className="theme-card rounded-xl shadow-sm border p-6">
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-500">{error || 'Failed to load chart data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="text-sm opacity-90">Total Hours (30d)</div>
          <div className="text-2xl font-bold">{formatHours(chartData.summary.totalHours)}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="text-sm opacity-90">Total Sessions</div>
          <div className="text-2xl font-bold">{chartData.summary.totalSessions}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="text-sm opacity-90">Daily Average</div>
          <div className="text-2xl font-bold">{formatHours(chartData.summary.averageDailyHours)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <div className="theme-card rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold theme-text-primary mb-4">Daily Activity</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.dailyActivity}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={formatHours}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelFormatter={(date) => formatDate(date as string)}
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Chart */}
        <div className="theme-card rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold theme-text-primary mb-4">Task Distribution (Last 30 Days)</h3>
          <div className="h-80">
            {chartData.taskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.taskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="hours"
                  >
                    {chartData.taskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number | undefined) => value ? [formatHours(value), 'Hours'] : [0, 'Hours']}
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No task data available
              </div>
            )}
          </div>
          {chartData.taskDistribution.length > 0 && (
            <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
              {chartData.taskDistribution.slice(0, 5).map((task, index) => (
                <div key={task.task} className="flex items-center text-sm">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="flex-1 truncate theme-text-secondary">{task.task}</span>
                  <span className="font-medium theme-text-primary">{formatHours(task.hours)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Comparison */}
        <div className="xl:col-span-2">
          <div className="theme-card rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4">Weekly Comparison</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.weeklyComparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis tickFormatter={formatHours} fontSize={12} />
                  <Tooltip 
                    formatter={(value: number | undefined) => value ? [formatHours(value), 'Hours'] : [0, 'Hours']}
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="hours" 
                    fill="#3B82F6"
                    name="Hours Worked"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {chartData.weeklyComparison.length >= 2 && (
              <div className="mt-4 text-center">
                {(() => {
                  const thisWeek = chartData.weeklyComparison.find(w => w.week === 'This Week')?.hours || 0;
                  const lastWeek = chartData.weeklyComparison.find(w => w.week === 'Last Week')?.hours || 0;
                  const diff = thisWeek - lastWeek;
                  const percentChange = lastWeek > 0 ? ((diff / lastWeek) * 100) : 0;
                  
                  if (Math.abs(percentChange) < 1) {
                    return (
                      <span className="text-sm theme-text-secondary">
                        Similar activity compared to last week
                      </span>
                    );
                  }
                  
                  return (
                    <span className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diff >= 0 ? '↗' : '↘'} {Math.abs(percentChange).toFixed(1)}% {diff >= 0 ? 'increase' : 'decrease'} from last week
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}