'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { BarChart3, TrendingUp, Users, Eye, Clock, Zap } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState({
    totalViews: 12543,
    totalVisitors: 8234,
    avgSessionDuration: 287,
    bounceRate: 32,
    topPages: [],
    referrers: [],
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setData({
        totalViews: 12543,
        totalVisitors: 8234,
        avgSessionDuration: 287,
        bounceRate: 32,
        topPages: [
          { name: '/', views: 5234 },
          { name: '/about', views: 3421 },
          { name: '/products', views: 2814 },
          { name: '/blog', views: 1074 },
        ],
        referrers: [
          { source: 'Google', visits: 2543 },
          { source: 'Direct', visits: 1842 },
          { source: 'Facebook', visits: 1204 },
          { source: 'Twitter', visits: 832 },
        ],
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout currentPage="analytics">
      <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-8 h-8" />
                <h1 className="text-4xl font-bold">Analytics</h1>
              </div>
              <p className="text-blue-100">Monitor your site performance and visitor metrics</p>
            </div>

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium focus:ring-2 focus:ring-white outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  label="Total Views"
                  value={data.totalViews.toLocaleString()}
                  icon={Eye}
                  color="blue"
                  trend="+12.5%"
                />
                <MetricCard
                  label="Visitors"
                  value={data.totalVisitors.toLocaleString()}
                  icon={Users}
                  color="green"
                  trend="+8.3%"
                />
                <MetricCard
                  label="Avg. Session Duration"
                  value={`${Math.floor(data.avgSessionDuration / 60)}m ${data.avgSessionDuration % 60}s`}
                  icon={Clock}
                  color="purple"
                  trend="-2.1%"
                />
                <MetricCard
                  label="Bounce Rate"
                  value={`${data.bounceRate}%`}
                  icon={TrendingUp}
                  color="amber"
                  trend="-1.2%"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Pages */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-6">Top Pages</h2>
                  <div className="space-y-4">
                    {data.topPages.map((page, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-900 font-medium">{page.name || 'Home'}</span>
                          <span className="text-gray-600 font-semibold">{page.views.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                            style={{
                              width: `${(page.views / data.topPages[0].views) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traffic Sources */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-6">Traffic Sources</h2>
                  <div className="space-y-4">
                    {data.referrers.map((ref, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-900 font-medium">{ref.source}</span>
                          <span className="text-gray-600 font-semibold">{ref.visits.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-600"
                            style={{
                              width: `${(ref.visits / data.referrers[0].visits) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">💡 Performance Insights</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>✓ Your site is performing well with a steady growth in visitors</li>
                      <li>✓ Mobile traffic accounts for 65% of your total visits</li>
                      <li>✓ Homepage is your most popular page with 5,234 views</li>
                      <li>✓ Average session duration is healthy at 4m 47s</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, icon: Icon, color, trend }) {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-green-500 bg-green-50',
    purple: 'text-purple-500 bg-purple-50',
    amber: 'text-amber-500 bg-amber-50',
  };

  const trendColor = trend.startsWith('+') ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600 font-medium text-sm">{label}</h3>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <p className={`text-sm font-semibold ${trendColor}`}>{trend} from last period</p>
    </div>
  );
}
