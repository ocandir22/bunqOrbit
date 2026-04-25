import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, Clock } from 'lucide-react';

const chartData = [
  { name: 'Jan', balance: 12000, expenses: 4000 },
  { name: 'Feb', balance: 15000, expenses: 3800 },
  { name: 'Mar', balance: 14000, expenses: 5200 },
  { name: 'Apr', balance: 18000, expenses: 4100 },
  { name: 'May', balance: 22000, expenses: 4500 },
  { name: 'Jun', balance: 25000, expenses: 6000 }, // Projected tax month
];

export const Insights = ({ insights, recentPayments }: { insights: any, recentPayments: any[] }) => {
  // Directly use the deterministic forecast from backend
  const activeChartData = React.useMemo(() => {
    if (insights?.forecast && insights.forecast.length > 0) {
      return insights.forecast.map((f: any) => ({ 
        name: f.month, 
        balance: f.balance,
        type: f.type // 'actual' or 'predicted'
      }));
    }
    return [];
  }, [insights]);

  return (
    <div className="bg-transparent rounded-2xl h-full flex flex-col min-h-[400px]">
      <h2 className="text-xl font-black mb-6 text-white flex items-center gap-3">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <TrendingUp className="text-indigo-400 w-5 h-5" />
        </div>
        Cash-Flow Forecast
      </h2>
      
      <div className="flex-grow h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af'}} axisLine={false} tickLine={false} />
            <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af'}} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {insights && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center bg-gray-800/80 p-4 rounded-xl border border-gray-700/50">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Runway</p>
              <p className="text-2xl font-bold text-white">{insights.runwayMonths?.toFixed(1) || insights.runway_months} <span className="text-sm font-normal text-gray-500">Months</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Monthly Burn</p>
              <p className="text-2xl font-bold text-white">{insights.currency || '€'}{insights.monthlyBurn || insights.monthly_burn}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {(insights.insights || []).map((tip: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-xl flex gap-3 items-start border ${
                tip.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-indigo-500/10 border-indigo-500/30'
              }`}>
                <AlertCircle className={`${tip.type === 'warning' ? 'text-amber-400' : 'text-indigo-400'} w-5 h-5 shrink-0 mt-0.5`} />
                <p className={`text-sm leading-relaxed ${tip.type === 'warning' ? 'text-amber-100' : 'text-indigo-100'}`}>
                  <span className="font-bold">{tip.title}:</span> {tip.description}
                </p>
              </div>
            ))}
            {!insights.insights && insights.suggestion && (
               <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl flex gap-3 items-start">
                <AlertCircle className="text-purple-400 w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm text-purple-100 leading-relaxed">{insights.suggestion}</p>
               </div>
            )}
          </div>
        </div>
      )}

      {recentPayments && recentPayments.length > 0 && (
        <div className="mt-6 border-t border-gray-800 pt-6">
          <h3 className="text-lg font-medium mb-4 text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" /> Recent Activity
          </h3>
          <div className="space-y-3 max-h-40 overflow-y-auto hide-scrollbar">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                <div>
                  <p className="text-sm font-medium text-white">{payment.description}</p>
                  <p className="text-xs text-gray-400">{new Date(payment.created).toLocaleDateString()}</p>
                </div>
                <div className={`font-bold ${parseFloat(payment.amount.value) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {parseFloat(payment.amount.value) > 0 ? '+' : ''}{parseFloat(payment.amount.value).toFixed(2)} {payment.amount.currency}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
