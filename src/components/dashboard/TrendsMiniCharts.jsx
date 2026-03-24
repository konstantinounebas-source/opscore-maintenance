import React from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, ChevronRight } from "lucide-react";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { failureTypeDistribution, groupByMonth } from "@/components/analytics/kpiUtils";

function ChartCard({ title, href, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-700">{title}</p>
        <Link to={href} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
          Details <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function buildLast30Days(items, dateFn) {
  const end = new Date();
  const start = subDays(end, 29);
  const days = eachDayOfInterval({ start, end });
  const buckets = {};
  days.forEach(d => { buckets[format(d, "MMM d")] = 0; });
  items.forEach(item => {
    const d = dateFn(item);
    if (!d) return;
    const key = format(new Date(d), "MMM d");
    if (key in buckets) buckets[key]++;
  });
  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

export default function TrendsMiniCharts({ incidents, workOrders }) {
  const incidentTrend = buildLast30Days(incidents, i => i.reported_date);
  const woTrend = buildLast30Days(workOrders, w => w.created_date);
  const failureTypes = failureTypeDistribution(incidents);

  // Show only every 7th label on x-axis
  const tickFormatter = (val, idx) => idx % 7 === 0 ? val : "";

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-900">Trends (Last 30 Days)</h2>
        <Link to="/Analytics" className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 font-medium">Full Analytics →</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ChartCard title="Incidents Over Time" href="/Incidents">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={incidentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={tickFormatter} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Work Orders Over Time" href="/WorkOrders">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={woTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={tickFormatter} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Failure Types" href="/Analytics">
          {failureTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={failureTypes}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-24 flex items-center justify-center text-xs text-slate-400">No failure data</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}